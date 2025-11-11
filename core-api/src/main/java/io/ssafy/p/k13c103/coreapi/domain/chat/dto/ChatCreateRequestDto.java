package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

import lombok.Getter;

@Getter
public class ChatCreateRequestDto {

    private String question;

    private Long parentId;

    private Long branchId;

    private String branchName;

    private String model; // modelCode

    private boolean useLlm;
}
