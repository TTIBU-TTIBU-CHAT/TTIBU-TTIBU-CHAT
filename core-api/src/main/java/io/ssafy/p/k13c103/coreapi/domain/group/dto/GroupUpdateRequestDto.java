package io.ssafy.p.k13c103.coreapi.domain.group.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class GroupUpdateRequestDto {

    private List<Long> nodes;

    private Boolean summaryRegen;

    private String name;
}
