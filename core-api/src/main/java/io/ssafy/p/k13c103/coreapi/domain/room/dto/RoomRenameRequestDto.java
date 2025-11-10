package io.ssafy.p.k13c103.coreapi.domain.room.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RoomRenameRequestDto {

    @NotBlank(message = "채팅방 이름은 비어 있을 수 없습니다.")
    private String name;
}
