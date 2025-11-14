package io.ssafy.p.k13c103.coreapi.domain.group.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NodeDetail {

    private Long nodeId;

    private String question;

    private String answer;

    private String summary;

    private List<String> keywords;

}
