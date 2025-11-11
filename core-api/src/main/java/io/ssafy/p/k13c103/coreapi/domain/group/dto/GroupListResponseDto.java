package io.ssafy.p.k13c103.coreapi.domain.group.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupListResponseDto {

    private Long groupId;

    private String name;

    private String summary;

    private List<String> keyword;

    private LocalDateTime updatedAt;
}
