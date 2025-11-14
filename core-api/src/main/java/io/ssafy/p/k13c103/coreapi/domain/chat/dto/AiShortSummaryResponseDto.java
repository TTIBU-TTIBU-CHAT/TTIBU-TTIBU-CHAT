package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Schema(description = "짧은 제목형 요약 응답 DTO")
@Getter
@Setter
@NoArgsConstructor
public class AiShortSummaryResponseDto {

    @Schema(description = "생성된 제목형 요약", example = "SSAFY 15기 모집")
    private String title;

    @Schema(description = "처리 소요 시간 (ms)", example = "770")
    private Integer processingTimeMs;

}
