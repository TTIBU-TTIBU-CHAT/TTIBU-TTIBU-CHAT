package io.ssafy.p.k13c103.coreapi.domain.room.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.common.sse.SseEmitterManager;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ModelCatalog;
import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ModelCatalogRepository;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.AiSummaryKeywordsResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatSseEvent;
import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatSseEventType;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatStatus;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatType;
import io.ssafy.p.k13c103.coreapi.domain.chat.repository.ChatRepository;
import io.ssafy.p.k13c103.coreapi.domain.chat.service.ChatService;
import io.ssafy.p.k13c103.coreapi.domain.group.entity.Group;
import io.ssafy.p.k13c103.coreapi.domain.group.repository.GroupRepository;
import io.ssafy.p.k13c103.coreapi.domain.llm.AiSummaryClient;
import io.ssafy.p.k13c103.coreapi.domain.member.entity.Member;
import io.ssafy.p.k13c103.coreapi.domain.member.repository.MemberRepository;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.NodeInfo;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.room.entity.Room;
import io.ssafy.p.k13c103.coreapi.domain.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RoomServiceImpl implements RoomService {

    private final ChatService chatService;
    private final RoomRepository roomRepository;
    private final ChatRepository chatRepository;
    private final GroupRepository groupRepository;
    private final MemberRepository memberRepository;
    private final ModelCatalogRepository modelCatalogRepository;
    private final SseEmitterManager sseEmitterManager;
    private final AiSummaryClient aiSummaryClient;
    private final ObjectMapper objectMapper;

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

        ModelCatalog modelCatalog = null;
        if (request.getModel() != null && request.getProvider() != null) {
            modelCatalog = modelCatalogRepository
                    .findByProvider_NameAndCode(request.getProvider(), request.getModel())
                    .orElse(null);
        }

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
                        } else if (node.getType() == ChatType.GROUP){
                            log.info("[ROOM] 그룹 요약 노드 생성 요청 - groupId={}", node.getId());

                            // 기존 그룹 조회
                            Group originGroup = groupRepository.findById(node.getId())
                                    .orElseThrow(() -> new ApiException(ErrorCode.GROUP_NOT_FOUND));

                            // 그룹 내 채팅들 조회
                            List<Chat> groupChats = chatRepository.findAllByGroup_GroupUid(originGroup.getGroupUid());
                            if (groupChats.isEmpty()) {
                                log.warn("[ROOM] 그룹 내 채팅이 없음 - groupId={}", originGroup.getGroupUid());
                            }

                            // 그룹 내 요약문들 수집
                            List<String> summaries = groupChats.stream()
                                    .map(Chat::getSummary)
                                    .filter(Objects::nonNull)
                                    .filter(s -> !s.isBlank())
                                    .toList();

                            // FastAPI 요약 + 키워드 호출
                            AiSummaryKeywordsResponseDto aiResult;

                            if (summaries.isEmpty()) {
                                aiResult = new AiSummaryKeywordsResponseDto();
                                aiResult.setSummary("요약할 내용이 없는 그룹입니다.");
                                aiResult.setKeywords(List.of());
                                aiResult.setProcessingTimeMs(0);
                            } else {
                                String combinedText = summaries.stream()
                                                .map(String::trim)
                                                        .collect(Collectors.joining("\n\n"));

                                aiResult = aiSummaryClient.summarizeGroupText(combinedText);
                            }

                            // 새로운 Chat (스냅샷 노드) 생성
                            Chat snapshot = Chat.builder()
                                    .room(room)
                                    .group(originGroup)
                                    .summary(aiResult.getSummary())
                                    .keywords(convertToJson(aiResult.getKeywords()))
                                    .status(ChatStatus.SUMMARY_KEYWORDS)
                                    .chatType(ChatType.CHAT)
                                    .build();

                            chatRepository.save(snapshot);
                            createdChats.add(snapshot);

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

        // SSE: ROOM_CREATED
        sendRoomCreatedEvent(room, createdChats, request.getBranchId());

        // 트랜잭션 커밋 이후 비동기 실행하도록 분리
        triggerAsyncChatProcessing(newChat, request);

        return room.getRoomUid();
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

    private void sendRoomCreatedEvent(Room room, List<Chat> createdChats, Long branchId) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("room_id", room.getRoomUid());
            payload.put("branch_id", branchId);
            payload.put("created_at", room.getCreatedAt());

            payload.put("nodes", createdChats.stream()
                    .map(chat -> Map.of(
                            "chat_id", chat.getChatUid(),
                            "type", chat.getChatType().name(),
                            "summary", chat.getSummary(),
                            "keywords", parseKeywords(chat),
                            "question", chat.getQuestion(),
                            "answer", chat.getAnswer(),
                            "created_at", chat.getCreatedAt()
                    ))
                    .collect(Collectors.toList()));

            sseEmitterManager.sendEvent(
                    room.getRoomUid(),
                    new ChatSseEvent<>(ChatSseEventType.ROOM_CREATED, payload)
            );

            log.info("[SSE] ROOM_CREATED 이벤트 전송 완료 → roomId={}, nodes={}", room.getRoomUid(), createdChats.size());
        } catch (Exception e) {
            log.warn("[SSE] ROOM_CREATED 이벤트 전송 실패 → roomId={}, error={}", room.getRoomUid(), e.getMessage());
        }
    }

    /** 비동기 AI 처리 (트랜잭션 이후 실행) */
    @Async
    protected void triggerAsyncChatProcessing(Chat newChat, RoomCreateRequestDto request) {
        try {
            chatService.processChatAsync(
                    newChat.getChatUid(),
                    request.getBranchId(),
                    request.getApiKey(),
                    request.getModel(),
                    request.getProvider(),
                    request.isUseLlm()
            );
        } catch (Exception e) {
            log.error("[ASYNC] processChatAsync 실행 실패: {}", e.getMessage());
        }
    }

    private List<String> parseKeywords(Chat chat) {
        if (chat.getKeywords() == null || chat.getKeywords().isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(chat.getKeywords(), new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("[ROOM] 키워드 JSON 파싱 실패: chatId={}, value={}", chat.getChatUid(), chat.getKeywords());
            return Collections.emptyList();
        }
    }

    /**
     * 키워드 직렬화
     */
    private String convertToJson(List<String> keywords) {
        try {
            return objectMapper.writeValueAsString(keywords);
        } catch (JsonProcessingException e) {
            log.warn("[ChatService] 키워드 직렬화 실패: {}", e.getMessage());
            return "[]";
        }
    }
}
