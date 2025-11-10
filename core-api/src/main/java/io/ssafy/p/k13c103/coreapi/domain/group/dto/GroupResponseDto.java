package io.ssafy.p.k13c103.coreapi.domain.group.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class GroupResponseDto {

    private Long groupId;

    private String name;

    private List<Long> originNodes;

    private List<Long> copiedNodes;

    private LocalDateTime createdAt;

}
