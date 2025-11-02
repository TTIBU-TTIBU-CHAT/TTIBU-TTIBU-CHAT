package io.ssafy.p.k13c103.coreapi.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final ObjectMapper objectMapper;

    @Override
    public ChatCreateResponse createChat(ChatCreateRequest request, Long memberId) {
        // Room 검증
        Room room = roomRepository.findById(request.getRoomID())
                .orElseThrow(() -> new ApiException(ErrorCode.ROOM_NOT_FOUND));

        // Branch 검증 or 생성
        Branch branch;
        if (request.getBranchId() != null) {
            branch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new ApiException(ErrorCode.BRANCH_NOT_FOUND));
        } else {
            String branchName = request.getBranchName() != null ? request.getBranchName() : "새 브랜치";

            branch = Branch.builder()
                    .room(room)
                    .name(branchName)
                    .build();

            branchRepository.save(branch);
        }

        // Chat 생성
        Chat chat = Chat.create(branch, request.getQuestion(), request.getParentId());  // AI의 답변은 언제 저장??

        // DB 저장
        Chat savedChat = chatRepository.save(chat);

        ChatCreateResponse response = ChatCreateResponse.from(savedChat);
        ChatSseEvent<ChatCreateResponse> event = new ChatSseEvent<>(
                ChatSseEventType.CHAT_CREATED,
                response
        );
        sseEmitterManager.sendEvent(room.getRoomUid(), event);

        return response;
    }

    @Override
    public void updateSummaryAndKeywords(Long chatId, String summary, String keywords) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new ApiException(ErrorCode.CHAT_NOT_FOUND));

        Chat.updateSummaryAndKeywords(chat, summary, keywords);
        chatRepository.save(chat);
    }
}
