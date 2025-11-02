package io.ssafy.p.k13c103.coreapi.chat.service;

import io.ssafy.p.k13c103.coreapi.branch.entity.Branch;
import io.ssafy.p.k13c103.coreapi.branch.repository.BranchRepository;
import io.ssafy.p.k13c103.coreapi.chat.dto.ChatCreateRequest;
import io.ssafy.p.k13c103.coreapi.chat.dto.ChatCreateResponse;
import io.ssafy.p.k13c103.coreapi.chat.dto.ChatSseEvent;
import io.ssafy.p.k13c103.coreapi.chat.entity.Chat;
import io.ssafy.p.k13c103.coreapi.chat.enums.ChatSseEventType;
import io.ssafy.p.k13c103.coreapi.chat.repository.ChatRepository;
import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.common.sse.SseEmitterManager;
import io.ssafy.p.k13c103.coreapi.room.entity.Room;
import io.ssafy.p.k13c103.coreapi.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Override
    public ChatCreateResponse createChat(ChatCreateRequest request, Long memberId) {
        // Room 검증
        Room room = roomRepository.findById(request.getRoomID())
                .orElseThrow(() -> new ApiException(ErrorCode.ROOM_NOT_FOUND));

        // Branch 검증 or 생성
        Branch branch;
        if (request.getBranchId() != null) {
            // 기존 브랜치가 존재하는 경우
            branch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new ApiException(ErrorCode.BRANCH_NOT_FOUND));
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

        // DB 저장
        Chat savedChat = chatRepository.save(chat);

        // SSE 전송: CHAT_CREATED
        ChatCreateResponse response = ChatCreateResponse.from(savedChat);
        ChatSseEvent<ChatCreateResponse> event = new ChatSseEvent<>(
                ChatSseEventType.CHAT_CREATED,
                response
        );
        sseEmitterManager.sendEvent(room.getRoomUid(), event);

        return response;
    }

    // TODO: 추후 수정
    public void processAiAnswer(Long chatId, Long modelId) {
        // Chat 검증
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ApiException(ErrorCode.CHAT_NOT_FOUND));

        // AI 서버 호출: 질문 -> AI 모델
        String aiAnswer = aiAnswerService.generateAnswer(chat.getQuestion(), modelId);

        // Chat 엔티티에 답변 저장
        chat.updateAnswer(aiAnswer);
        chatRepository.save(chat);

        // SSE 이벤트 전송: CHAT_ANSWERED
        ChatCreateResponse response = ChatCreateResponse.from(chat);
        ChatSseEvent<ChatCreateResponse> event = new ChatSseEvent<>(
                ChatSseEventType.CHAT_ANSWERED,
                response
        );
        sseEmitterManager.sendEvent(chat.getBranch().getRoom().getRoomUid(), event);
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
        ChatSseEvent<ChatCreateResponse> event = new ChatSseEvent<>(
                ChatSseEventType.CHAT_UPDATED,
                ChatCreateResponse.from(chat)
        );
        sseEmitterManager.sendEvent(chat.getBranch().getRoom().getRoomUid(), event);
    }
}
