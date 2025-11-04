package io.ssafy.p.k13c103.coreapi.domain.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.common.sse.SseEmitterManager;
import io.ssafy.p.k13c103.coreapi.domain.branch.entity.Branch;
import io.ssafy.p.k13c103.coreapi.domain.branch.repository.BranchRepository;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.AiSummaryKeywordResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatSseEvent;
import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatSseEventType;
import io.ssafy.p.k13c103.coreapi.domain.chat.repository.ChatRepository;
import io.ssafy.p.k13c103.coreapi.domain.member.Member;
import io.ssafy.p.k13c103.coreapi.domain.room.entity.Room;
import io.ssafy.p.k13c103.coreapi.domain.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ChatServiceImpl implements ChatService {

    private final ChatRepository chatRepository;
    private final BranchRepository branchRepository;
    private final RoomRepository roomRepository;
    private final SseEmitterManager sseEmitterManager;
    private final AiAnswerService aiAnswerService;
    private final AiSummaryService aiSummaryService;

    @Override
    public ChatCreateResponseDto createChat(ChatCreateRequestDto request, Long memberId) {
        // Room 검증
        Room room;
        if (request.getRoomID()!= null) {
            // 기존 Room 조회
            room = roomRepository.findById(request.getRoomID())
                    .orElseThrow(() -> new ApiException(ErrorCode.ROOM_NOT_FOUND));

            if (!room.getOwner().getMemberUid().equals(memberId)) {
                throw new ApiException(ErrorCode.FORBIDDEN);
            }
        } else {
            Member owner = Member.builder().memberUid(memberId).build();
            room = Room.create(owner, "새 대화방");
            roomRepository.save(room);

            sendRoomSse(room, ChatSseEventType.ROOM_CREATED);

            log.info("[INFO] 새 Room 자동 생성됨 - roomId: {}", room.getRoomUid());
        }

        // Branch 검증 or 생성
        Branch branch;
        if (request.getBranchId() != null) {
            // 기존 브랜치가 존재하는 경우
            branch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new ApiException(ErrorCode.BRANCH_NOT_FOUND));

            if (!branch.getRoom().getOwner().getMemberUid().equals(memberId)) {
                throw new ApiException(ErrorCode.FORBIDDEN);
            }
        } else {
            // 새 브랜치 생성
            String branchName = request.getBranchName() != null ? request.getBranchName() : "새 브랜치";

            branch = Branch.builder()
                    .room(room)
                    .name(branchName)
                    .build();

            branchRepository.save(branch);
        }

        // Chat 생성 (답변은 비워둔 상태)
        Chat chat = Chat.create(branch, request.getQuestion(), request.getParentId());
        chatRepository.save(chat);

        // SSE 전송: CHAT_CREATED
        sendSse(chat, ChatSseEventType.CHAT_CREATED);

        // 비동기 체인 시작
        CompletableFuture.runAsync(() -> processAiAndSummary(chat.getChatUid(), request.getModelId()));

        return ChatCreateResponseDto.from(chat);
    }

    // TODO: 추후 수정
    @Async("aiTaskExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processAiAndSummary(Long chatId, Long modelId) {
        try {
            Chat chat = chatRepository.findById(chatId)
                    .orElseThrow(() -> new ApiException(ErrorCode.CHAT_NOT_FOUND));

            // AI 답변 생성
            String aiAnswer = aiAnswerService.generateAnswer(chat.getQuestion(), modelId);
            chat.updateAnswer(aiAnswer);
            chatRepository.save(chat);

            // SSE 전송: CHAT_ANSWERED
            sendSse(chat, ChatSseEventType.CHAT_ANSWERED);

            // FastAPI 요약 및 키워드 생성
            AiSummaryKeywordResponseDto result = aiSummaryService.generateSummaryAndKeywords(aiAnswer);
            Chat.updateSummaryAndKeywords(chat, result.getSummary(), new ObjectMapper().writeValueAsString(result.getKeywords()));
            chatRepository.save(chat);

            // SSE 전송: CHAT_SUMMARIZED
            sendSse(chat, ChatSseEventType.CHAT_SUMMARIZED);
        } catch (Exception e) {
            log.error("[ERROR] AI 비동기 처리 중 예외 발생: {}", e.getMessage());
        }
    }

    @Override
    public void updateSummaryAndKeywords(Long chatId, String summary, String keywords) {
        // Chat 검증
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ApiException(ErrorCode.CHAT_NOT_FOUND));

        // 요약 및 키워드 정보 업데이트
        Chat.updateSummaryAndKeywords(chat, summary, keywords);
        chatRepository.save(chat);

        // SSE 전송: CHAT_UPDATED
        ChatSseEvent<ChatCreateResponseDto> event = new ChatSseEvent<>(
                ChatSseEventType.CHAT_UPDATED,
                ChatCreateResponseDto.from(chat)
        );
        sseEmitterManager.sendEvent(chat.getBranch().getRoom().getRoomUid(), event);
    }

    @Override
    public List<String> getRecentContextForPrompt(Branch branch) {
        List<Chat> recentChats = chatRepository.findTop5ByBranchOrderByCreatedAtDesc(branch);

        return recentChats.stream()
                .map(chat -> {
                    if (chat.getSummary() != null && !chat.getSummary().isBlank()) {
                        return chat.getSummary();
                    } else if (chat.getAnswer() != null && !chat.getAnswer().isBlank()) {
                        return chat.getAnswer();
                    } else {
                        return null; // 둘 다 없으면 skip
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private void sendSse(Chat chat, ChatSseEventType type) {
        ChatSseEvent<ChatCreateResponseDto> event = new ChatSseEvent<>(type, ChatCreateResponseDto.from(chat));
        sseEmitterManager.sendEvent(chat.getBranch().getRoom().getRoomUid(), event);
    }

    private void sendRoomSse(Room room, ChatSseEventType type) {
        ChatSseEvent<String> event = new ChatSseEvent<>(type, "새 Room이 생성되었습니다: " + room.getName());
        sseEmitterManager.sendEvent(room.getRoomUid(), event);
    }
}
