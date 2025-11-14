package io.ssafy.p.k13c103.coreapi.domain.group.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;

import java.util.List;

@Getter
public class GroupCreateRequestDto {

    @NotEmpty(message = "노드 리스트는 비어 있을 수 없습니다.")
    private List<Long> nodes;

    @NotBlank(message = "그룹 이름은 필수입니다.")
    private String name;
}
