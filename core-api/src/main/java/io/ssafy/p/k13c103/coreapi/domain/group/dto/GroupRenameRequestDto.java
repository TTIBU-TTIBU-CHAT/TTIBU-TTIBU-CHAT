package io.ssafy.p.k13c103.coreapi.domain.group.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class GroupRenameRequestDto {

    @NotBlank(message = "그룹 이름은 비어 있을 수 없습니다.")
    private String name;
}
