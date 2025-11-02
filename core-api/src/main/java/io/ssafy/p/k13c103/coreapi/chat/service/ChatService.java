package io.ssafy.p.k13c103.coreapi.chat.service;

import io.ssafy.p.k13c103.coreapi.chat.dto.ChatCreateRequest;
import io.ssafy.p.k13c103.coreapi.chat.dto.ChatCreateResponse;

public interface ChatService {

    /**
     * 새로운 채팅 생성
     * @param request   사용자 입력
     * @param memberId  사용자 아이디
     * @return  생성된 채팅 정보 (요약, 키워드는 null)
     */
    ChatCreateResponse createChat(ChatCreateRequest request, Long memberId);

    /**
     * 특정 채팅을 요약 및 키워드 정보로 업데이트
     * @param chatId    채팅 아이디
     * @param summary   요약
     * @param keywords  키워드 리스트 (JSON 문자열 형태)
     */
    void updateSummaryAndKeywords(Long chatId, String summary, String keywords);
}
