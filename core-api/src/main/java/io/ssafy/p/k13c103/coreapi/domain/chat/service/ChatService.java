package io.ssafy.p.k13c103.coreapi.domain.chat.service;

public interface ChatService {

    void processChatAsync(Long chatId, Long branchId);
}
