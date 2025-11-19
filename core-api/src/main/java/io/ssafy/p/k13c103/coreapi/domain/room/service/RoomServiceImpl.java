package io.ssafy.p.k13c103.coreapi.domain.room.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.common.sse.SseEmitterManager;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ModelCatalog;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ProviderCatalog;
import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ModelCatalogRepository;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatSseEvent;
import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatSseEventType;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatType;
import io.ssafy.p.k13c103.coreapi.domain.chat.repository.ChatRepository;
import io.ssafy.p.k13c103.coreapi.domain.group.entity.Group;
import io.ssafy.p.k13c103.coreapi.domain.group.repository.GroupRepository;
import io.ssafy.p.k13c103.coreapi.domain.key.entity.Key;
import io.ssafy.p.k13c103.coreapi.domain.key.repository.KeyRepository;
import io.ssafy.p.k13c103.coreapi.domain.key.service.KeyService;
import io.ssafy.p.k13c103.coreapi.domain.member.entity.Member;
import io.ssafy.p.k13c103.coreapi.domain.member.repository.MemberRepository;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.*;
import io.ssafy.p.k13c103.coreapi.domain.room.entity.Room;
import io.ssafy.p.k13c103.coreapi.domain.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RoomServiceImpl implements RoomService {

    private final AsyncChatProcessor asyncChatProcessor;
    private final KeyService keyService;
    private final RoomRepository roomRepository;
    private final ChatRepository chatRepository;
    private final GroupRepository groupRepository;
    private final MemberRepository memberRepository;
    private final ModelCatalogRepository modelCatalogRepository;
    private final KeyRepository keyRepository;
    private final SseEmitterManager sseEmitterManager;
    private final TransactionTemplate txTemplate;
    private final Executor aiTaskExecutor;
    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, String> redisTemplate;

    /**
     * 새로운 채팅방 생성 및 첫 질문 등록
     * - nodes 존재 시: 기존 노드 복제
     * - nodes 없을 시: 완전 새 대화 시작
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public Long createRoom(Long memberId, RoomCreateRequestDto request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(ErrorCode.MEMBER_NOT_FOUND));

        // 새 Room 생성
        Room room = Room.create(member, "새 대화방");
        roomRepository.save(room);

        List<Chat> createdChats = new ArrayList<>();

        ModelCatalog modelCatalog = modelCatalogRepository.findByCode(request.getModel())
                .orElseThrow(() -> new ApiException(ErrorCode.MODEL_NOT_FOUND));

        ProviderCatalog provider = modelCatalog.getProvider();

        Key key = keyRepository.findByMemberAndProvider(member, provider)
                .orElseThrow(() -> new ApiException(ErrorCode.KEY_NOT_FOUND));

        String decryptedKey = keyService.decrypt(key.getEncryptedKey());

        log.info("[ROOM_CREATE] memberId={}, model={}, provider={}, decryptedKey={}",
                memberId, request.getModel(), provider.getCode(), decryptedKey.substring(0, 6) + "****");

        List<String> contextParts = new ArrayList<>();

        // 기존 노드 복제 (nodes 존재 시)
        if (request.getNodes() != null && !request.getNodes().isEmpty()) {
            log.info("[ROOM] 기존 노드 기반 복제 요청 - size={}", request.getNodes().size());

            request.getNodes().stream()
                    .sorted(Comparator.comparingInt(NodeInfo::getOrder))
                    .forEach(node -> {
                        if (node.getType() == ChatType.CHAT) {
                            Chat origin = chatRepository.findById(node.getId())
                                    .orElseThrow(() -> new ApiException(ErrorCode.CHAT_NOT_FOUND));
                            Chat cloned = Chat.cloneFrom(origin, room);
                            chatRepository.save(cloned);
                            createdChats.add(cloned);

                            String a = Optional.ofNullable(origin.getAnswer()).orElse("").trim();
                            if (!a.isBlank()) contextParts.add(trimForContext(a));

                        } else if (node.getType() == ChatType.GROUP) {
                            log.info("[ROOM] 그룹 요약 노드 생성 요청 - groupId={}", node.getId());

                            // 기존 그룹 조회
                            Group originGroup = groupRepository.findById(node.getId())
                                    .orElseThrow(() -> new ApiException(ErrorCode.GROUP_NOT_FOUND));

                            Chat snapshot = Chat.createGroupSnapshot(room, originGroup);
                            chatRepository.save(snapshot);
                            snapshot.updateSearchContent();
                            createdChats.add(snapshot);

                            String groupText = bestAvailableGroupText(originGroup.getGroupUid());
                            if (!groupText.isBlank()) contextParts.add(trimForContext(groupText));

                            final Long snapshotId = snapshot.getChatUid();
                            final Long groupId = originGroup.getGroupUid();
                            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                                @Override
                                public void afterCommit() {
                                    if (isBlank(snapshot.getSummary()) || isBlank(snapshot.getKeywords())) {
                                        fillSnapshotFromGroupAsync(groupId, snapshotId, room.getRoomUid(), request.getBranchId());
                                    }
                                }
                            });

                            log.info("[ROOM] 그룹 요약 스냅샷 Chat 생성 완료 -> originGroupId={}, snapshotChatId={}", originGroup.getGroupUid(), snapshot.getChatUid());
                        }
                    });
        } else {
            log.info("[ROOM] 완전 새 대화 시작");
        }

        // 마지막 노드로 새 질문 Chat 추가
        Chat newChat = Chat.create(room, request.getQuestion(), modelCatalog);
        chatRepository.save(newChat);
        createdChats.add(newChat);

        // 복제된 채팅/그룹 스탭샷들의 요약 및 답변을 병합하여 컨텍스트 생성
        String contextPrompt = contextParts.stream()
                .filter(s -> !s.isBlank())
                .collect(Collectors.joining("\n\n"));

        String providerCode = provider.getCode();

        List<Map<String, Object>> nodePayloads = createdChats.stream().map(chat -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("chat_id", chat.getChatUid());
            m.put("type", chat.getChatType().name());
            m.put("summary", Optional.ofNullable(chat.getSummary()).orElse(""));
            m.put("keywords", parseKeywords(chat));
            m.put("question", Optional.ofNullable(chat.getQuestion()).orElse(""));
            m.put("answer", Optional.ofNullable(chat.getAnswer()).orElse(""));
            m.put("created_at", chat.getCreatedAt());
            if (chat.getGroup() != null) {
                // 트랜잭션 내부에서 미리 group_id 값을 뽑아둔다
                m.put("group_id", chat.getGroup().getGroupUid());
            }
            return m;
        }).toList();

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    if (request.getSessionUuid() != null && !request.getSessionUuid().isBlank()) {
                        sseEmitterManager.migrateSessionEmitterToRoom(request.getSessionUuid(), room.getRoomUid());
                    }

                    sendRoomCreatedEvent(room, nodePayloads, request.getBranchId());

                } catch (Exception e) {
                    log.error("[ROOM_CREATE] afterCommit SSE 처리 실패: {}", e.getMessage());
                }

                try {
                    asyncChatProcessor.processAsync(
                            newChat.getChatUid(),
                            request,
                            decryptedKey,
                            providerCode,
                            contextPrompt
                    );
                } catch (Exception e) {
                    log.error("[ROOM_CREATE] afterCommit Async 처리 실패: {}", e.getMessage());
                }
            }
        });

        return room.getRoomUid();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomResponseDto.RoomListInfo> getList(Long memberUid) {
        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        return roomRepository.findRoomListWithLastChat(memberUid);
    }

    @Override
    @Transactional
    public RoomResponseDto.ChatBranchUpdatedInfo saveChatAndBranch(Long roomUid, Long memberUid, String chatInfo, String branchView) {
        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        if (!roomRepository.existsByRoomUidAndOwner_MemberUid(roomUid, memberUid))
            throw new ApiException(ErrorCode.ROOM_NOT_FOUND);

        try {
            objectMapper.readTree(chatInfo);
            objectMapper.readTree(branchView);
        } catch (Exception e) {
            throw new ApiException(ErrorCode.INVALID_JSON);
        }

        roomRepository.updateViews(roomUid, chatInfo, branchView);

        RoomResponseDto.ChatBranchUpdatedInfo response = RoomResponseDto.ChatBranchUpdatedInfo.builder()
                .roomUid(roomUid)
                .updatedAt(roomRepository.getUpdatedAtByRoomUid(roomUid))
                .build();

        String key = roomViewKey(roomUid);
        try {
            redisTemplate.delete(key);
        } catch (Exception e) { // ignore
        }

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public RoomResponseDto.ChatBranchInfo getChatAndBranch(Long roomUid, Long memberUid) {
        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        if (!roomRepository.existsByRoomUidAndOwner_MemberUid(roomUid, memberUid))
            throw new ApiException(ErrorCode.ROOM_NOT_FOUND);

        // 캐시 조회 후 hit이면 읽어오기
        String key = roomViewKey(roomUid);
        String cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, RoomResponseDto.ChatBranchInfo.class);
            } catch (Exception e) { // ignore
            }
        }

        // 캐시 miss이면 DB 조회
        RoomRepository.RoomViewsRow info = roomRepository.findViewsByRoomUid(roomUid);

        RoomResponseDto.ChatBranchInfo response = RoomResponseDto.ChatBranchInfo.builder()
                .roomUid(roomUid)
                .chatInfo(info.getChatInfo())
                .branchView(info.getBranchView())
                .build();

        try {
            String json = objectMapper.writeValueAsString(response);
            redisTemplate.opsForValue().set(key, json);
        } catch (Exception e) { // ignore
        }

        return response;
    }

    @Override
    @Transactional
    public void delete(Long roomUid, Long memberUid) {
        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        if (!roomRepository.existsByRoomUidAndOwner_MemberUid(roomUid, memberUid))
            throw new ApiException(ErrorCode.ROOM_NOT_FOUND);

        chatRepository.detachGroupChats(roomUid);
        chatRepository.deleteChatsByRoom(roomUid);

        roomRepository.deleteByRoomUidAndOwner_MemberUid(roomUid, memberUid);
        try {
            redisTemplate.delete(roomViewKey(roomUid));
        } catch (Exception e) { // ignore
        }
    }

    @Override
    public void isOwner(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ApiException(ErrorCode.ROOM_NOT_FOUND));

        if (room.getOwner() == null) {
            log.error("[RoomService] Room {} has no owner assigned", roomId);
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "방의 소유자 정보가 없습니다.");
        }

        if (!room.getOwner().getMemberUid().equals(memberId)) {
            log.warn("[RoomService] Member {} attempted to access room {} without ownership",
                    memberId, roomId);
            throw new ApiException(ErrorCode.ROOM_FORBIDDEN);
        }
    }

    @Override
    @Transactional
    public RoomRenameResponseDto updateRoomName(Long memberId, Long roomId, RoomRenameRequestDto request) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ApiException(ErrorCode.ROOM_NOT_FOUND));

        if (!room.getOwner().getMemberUid().equals(memberId)) {
            throw new ApiException(ErrorCode.ROOM_FORBIDDEN);
        }

        room.updateName(request.getName());
        roomRepository.save(room);

        log.info("[ROOM_NAME_UPDATE] 채팅방 이름 변경 완료 → roomId={}, newName={}", roomId, request.getName());

        return RoomRenameResponseDto.builder()
                .roomId(room.getRoomUid())
                .updatedAt(room.getUpdatedAt())
                .build();
    }

    @Override
    public ChatCreateResponseDto createChatInRoom(Long memberId, Long roomId, ChatCreateRequestDto request) {
        // Room & 권한 검증
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ApiException(ErrorCode.ROOM_NOT_FOUND));
        isOwner(memberId, roomId);

        // Model 정보 조회
        ModelCatalog modelCatalog = modelCatalogRepository.findByCode(request.getModel())
                .orElseThrow(() -> new ApiException(ErrorCode.MODEL_NOT_FOUND));
        ProviderCatalog provider = modelCatalog.getProvider();

        Key key = keyRepository.findByMemberAndProvider(room.getOwner(), provider)
                .orElseThrow(() -> new ApiException(ErrorCode.KEY_NOT_FOUND));
        String decryptedKey = keyService.decrypt(key.getEncryptedKey());

        // 새 Chat 엔티티 생성
        Chat newChat = Chat.create(room, request.getQuestion(), modelCatalog);
        chatRepository.save(newChat);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("room_id", room.getRoomUid());
        payload.put("branch_id", request.getBranchId());
        if (request.getBranchName() != null && !request.getBranchName().isBlank()) {
            payload.put("branch_name", request.getBranchName());
        }
        payload.put("node_id", newChat.getChatUid());
        payload.put("type", newChat.getChatType().name());
        payload.put("question", newChat.getQuestion());
        payload.put("parents", request.getParents());
        payload.put("children", List.of());
        payload.put("created_at", newChat.getCreatedAt());

        String providerCode = provider.getCode();

        String tempPrompt = "";
        if (request.getParents() != null && !request.getParents().isEmpty()) {
            List<Chat> parentChats = chatRepository.findAllById(request.getParents());
            tempPrompt = parentChats.stream()
                    .map(parent -> Optional.ofNullable(parent.getAnswer()).orElse("").trim())
                    .filter(s -> !s.isBlank())
                    .collect(Collectors.joining("\n\n"));
        }
        final String contextPrompt = tempPrompt;

        // 트랜잭션 종료 후 비동기 LLM/GMS 처리 시작
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                sseEmitterManager.sendEvent(
                        room.getRoomUid(),
                        new ChatSseEvent<>(ChatSseEventType.QUESTION_CREATED, payload)
                );

                asyncChatProcessor.processAsync(
                        newChat.getChatUid(),
                        buildRoomRequest(request),
                        decryptedKey,
                        providerCode,
                        contextPrompt
                );
            }
        });

        // 응답 반환
        return ChatCreateResponseDto.builder()
                .roomId(room.getRoomUid())
                .nodeId(newChat.getChatUid())
                .branchId(request.getBranchId())
                .createdAt(newChat.getCreatedAt())
                .build();
    }

    private RoomCreateRequestDto buildRoomRequest(ChatCreateRequestDto request) {
        RoomCreateRequestDto dto = new RoomCreateRequestDto();
        dto.setQuestion(request.getQuestion());
        dto.setBranchId(request.getBranchId());
        dto.setModel(request.getModel());
        dto.setUseLlm(request.isUseLlm());
        return dto;
    }

    private void sendRoomCreatedEvent(Room room, List<Map<String, Object>> nodePayloads, Long branchId) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("room_id", room.getRoomUid());
            payload.put("branch_id", branchId);
            payload.put("created_at", room.getCreatedAt());
            payload.put("nodes", nodePayloads);

            sseEmitterManager.sendEvent(
                    room.getRoomUid(),
                    new ChatSseEvent<>(ChatSseEventType.ROOM_CREATED, payload)
            );

            log.info("[SSE] ROOM_CREATED 이벤트 전송 완료 → roomId={}, nodes={}", room.getRoomUid(), nodePayloads.size());
        } catch (Exception e) {
            log.warn("[SSE] ROOM_CREATED 이벤트 전송 실패 → roomId={}, error={}", room.getRoomUid(), e.getMessage());
        }
    }

    private String bestAvailableGroupText(Long groupId) {
        Group g = groupRepository.findById(groupId)
                .orElseThrow(() -> new ApiException(ErrorCode.GROUP_NOT_FOUND));

        if (!isBlank(g.getSummary())) return g.getSummary().trim();

        return chatRepository.findAllByGroup_GroupUidAndChatType(groupId, io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatType.GROUP)
                .stream()
                .map(c -> {
                    String a = Optional.ofNullable(c.getAnswer()).orElse("").trim();
                    if (!a.isBlank()) return a;
                    return Optional.ofNullable(c.getSummary()).orElse("").trim();
                })
                .filter(s -> !s.isBlank())
                .limit(10) // 과도한 길이 방지
                .collect(Collectors.joining("\n\n"));
    }

    private void fillSnapshotFromGroupAsync(Long groupId, Long snapshotChatId, Long roomId, Long branchId) {
        // "그룹 요약/키워드가 준비될 때까지" 기다렸다가 스냅샷을 채움
        CompletableFuture.runAsync(() -> {
            final int maxRetry = 100;   // 총 50초 (100 * 500ms), 필요에 맞게 조정
            final long sleepMs = 500L;
            int attempt = 0;

            while (attempt < maxRetry) {
                try {
                    // 항상 DB에서 새로 읽어서 최신 상태 확인 (지연로딩/1차캐시 문제 회피)
                    Group g = groupRepository.findById(groupId)
                            .orElseThrow(() -> new ApiException(ErrorCode.GROUP_NOT_FOUND));

                    String summary = g.getSummary();
                    String keywordsJson = g.getKeywords();

                    if (!isBlank(summary) && !isBlank(keywordsJson)) {
                        // 스냅샷 업데이트는 "새 트랜잭션"에서 안전하게 수행
                        txTemplate.execute(status -> {
                            Chat snap = chatRepository.findById(snapshotChatId)
                                    .orElseThrow(() -> new ApiException(ErrorCode.CHAT_NOT_FOUND));
                            snap.updateSummaryAndKeywords(summary, keywordsJson);
                            snap.updateSearchContent();
                            chatRepository.save(snap);
                            return null;
                        });

                        // 키워드 파싱해서 SSE로 프론트에 알림
                        List<String> keywords = parseKeywordsJson(keywordsJson);

                        Map<String, Object> sse = new LinkedHashMap<>();
                        sse.put("room_id", roomId);
                        sse.put("branch_id", branchId);
                        sse.put("chat_id", snapshotChatId);
                        sse.put("group_id", groupId);
                        sse.put("summary", summary);
                        sse.put("keywords", keywords);

                        sseEmitterManager.sendEvent(
                                roomId,
                                new ChatSseEvent<>(ChatSseEventType.GROUP_SUMMARY_KEYWORDS, sse)
                        );

                        log.info("[GROUP->SNAPSHOT] ready → snapshot filled: groupId={}, snapshotId={}", groupId, snapshotChatId);
                        return;
                    }

                    Thread.sleep(sleepMs);
                    attempt++;

                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                    return;
                } catch (Exception e) {
                    log.warn("[GROUP->SNAPSHOT] polling error: {}", e.getMessage());
                    return;
                }
            }

            log.info("[GROUP->SNAPSHOT] timeout waiting group summary/keywords → groupId={}, snapshotChatId={}", groupId, snapshotChatId);
        }, aiTaskExecutor);
    }

    private List<String> parseKeywords(Chat chat) {
        if (chat.getKeywords() == null || chat.getKeywords().isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(chat.getKeywords(), new TypeReference<>() {
            });
        } catch (Exception e) {
            log.warn("[ROOM] 키워드 JSON 파싱 실패: chatId={}, value={}", chat.getChatUid(), chat.getKeywords());
            return Collections.emptyList();
        }
    }

    private List<String> parseKeywordsJson(String keywordsJson) {
        if (keywordsJson == null || keywordsJson.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(keywordsJson, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("[ROOM] keyword parse fail: groupKeywords={}", keywordsJson);
            return Collections.emptyList();
        }
    }

    private String roomViewKey(Long roomUid) {
        return "room:view" + roomUid;
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private String trimForContext(String text) {
        if (text == null) return "";
        text = text.trim();
        if (text.length() <= 100) return text;
        return text.substring(0, 100) + "...";
    }
}