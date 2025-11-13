package io.ssafy.p.k13c103.coreapi.domain.group.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class GroupAttachResponseDto {

    private Long roomId;

    private Long newChatId;

    private Long groupId;

    private LocalDateTime createdAt;

}
