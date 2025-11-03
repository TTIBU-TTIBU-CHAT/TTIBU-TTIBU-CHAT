package io.ssafy.p.k13c103.coreapi.domain.chat.service;

import io.ssafy.p.k13c103.coreapi.domain.chat.dto.AiSummaryKeywordResponseDto;

public interface AiSummaryService {

    AiSummaryKeywordResponseDto generateSummaryAndKeywords(String text);
}
