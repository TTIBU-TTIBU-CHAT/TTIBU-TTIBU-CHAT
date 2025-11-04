package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Schema(description = "AI 요약 및 키워드 생성 응답 DTO")
@Getter
@Setter
@NoArgsConstructor
public class AiSummaryKeywordResponseDto {

    @Schema(description = "생성된 요약 문장", example = "AI 서비스 아키텍처 설계 핵심 요약")
    private String summary;

    @Schema(description = "추출된 키워드 목록", example = "[\"AI\", \"비동기\", \"서비스 구조\"]")
    private List<String> keywords;

    @Schema(description = "처리 소요 시간 (ms)", example = "142")
    private Integer processingTimeMs;
}
