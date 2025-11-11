package io.ssafy.p.k13c103.coreapi.domain.room.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class RoomCreateRequestDto {

    private String sessionUuid;

    private List<NodeInfo> nodes;

    private String question;

    private Long branchId;

    private String model; // modelCode

    private boolean useLlm;
}
