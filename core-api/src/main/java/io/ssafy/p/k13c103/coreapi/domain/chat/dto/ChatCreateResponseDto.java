package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ChatCreateResponseDto {

    private Long roomId;

    private Long nodeId;

    private Long branchId;

    private LocalDateTime createdAt;

}
