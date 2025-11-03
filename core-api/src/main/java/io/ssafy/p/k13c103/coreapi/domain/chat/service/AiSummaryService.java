package io.ssafy.p.k13c103.coreapi.domain.chat.service;

public interface AiSummaryService {

    String generateSummary(String answer);
    String generateKeywords(String answer);
}
