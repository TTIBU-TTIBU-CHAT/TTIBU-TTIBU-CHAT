package io.ssafy.p.k13c103.coreapi.domain.group.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatType;
import io.ssafy.p.k13c103.coreapi.domain.chat.repository.ChatRepository;
import io.ssafy.p.k13c103.coreapi.domain.group.entity.Group;
import io.ssafy.p.k13c103.coreapi.domain.group.repository.GroupRepository;
import io.ssafy.p.k13c103.coreapi.domain.llm.AiAsyncClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupSummaryServiceImpl implements GroupSummaryService {

    private final GroupRepository groupRepository;
    private final ChatRepository chatRepository;
    private final AiAsyncClient aiAsyncClient;

    @Async("aiTaskExecutor")
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void generateSummaryAsync(Long groupId) {
        log.info("[GROUP_SUMMARY] 그룹 요약 비동기 처리 시작 -> groupId={}", groupId);

        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ApiException(ErrorCode.GROUP_NOT_FOUND));

        // 그룹에 포함된 모든 복제 Chat 내용 병합
        String mergedText = chatRepository.findAllByGroup_GroupUidAndChatType(groupId, ChatType.GROUP)
                .stream()
                .map(chat -> {
                    String content;
                    if (chat.getSummary() != null && !chat.getSummary().isBlank()) {
                        content = chat.getSummary();
                    } else if (chat.getAnswer() != null && !chat.getAnswer().isBlank()) {
                        content = chat.getAnswer();
                    } else {
                        content = "";
                    }

                    return content.trim();
                })
                .filter(text -> !text.isEmpty())
                .collect(Collectors.joining("\n\n"));

        if (mergedText.isBlank()) {
            log.warn("[GROUP_SUMMARY] 그룹 내에 요약/답변 데이터가 없습니다 → groupId={}", groupId);
            return;
        }

        aiAsyncClient.summarizeAsync(mergedText)
                .thenAccept(result -> {
                    try {
                        Group refreshed = groupRepository.findById(groupId)
                                .orElseThrow(() -> new ApiException(ErrorCode.GROUP_NOT_FOUND));

                        refreshed.updateSummaryAndKeywords(
                                result.getSummary(),
                                new ObjectMapper().writeValueAsString(result.getKeywords())
                        );

                        groupRepository.save(refreshed);

                        log.info("[GROUP_SUMMARY] 요약/키워드 생성 완료 → groupId={}", groupId);
                    } catch (Exception e) {
                        log.error("[GROUP_SUMMARY] 그룹 요약 저장 실패: {}", e.getMessage());
                    }
                })
                .exceptionally(e -> {
                    log.error("[GROUP_SUMMARY] FastAPI 호출 실패: {}", e.getMessage());
                    return null;
                });
    }
}
