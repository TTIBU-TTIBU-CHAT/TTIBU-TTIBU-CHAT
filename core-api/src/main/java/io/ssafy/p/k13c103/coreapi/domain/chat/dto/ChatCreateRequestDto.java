package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class ChatCreateRequestDto {

    private String question;

    private List<Long> parents;

    private Long branchId;

    private String branchName;

    private String model; // modelCode

    private boolean useLlm;
}
