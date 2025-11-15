package io.ssafy.p.k13c103.coreapi.domain.room.dto;

import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatType;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class NodeInfo {

    private ChatType type;

    private Long id;

    private int order;

    @Override
    public String toString() {
        return String.format("NodeInfo[type=%s, id=%d, order=%d]", type, id, order);
    }
}
