package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class AiSummaryKeywordResponseDto {

    private String summary;

    private List<String> keywords;

    private Integer processingTimeMs;
}
