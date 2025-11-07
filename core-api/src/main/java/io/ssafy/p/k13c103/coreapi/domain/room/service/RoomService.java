package io.ssafy.p.k13c103.coreapi.domain.room.service;

import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomCreateRequestDto;

public interface RoomService {

    Long createRoom(Long memberId, RoomCreateRequestDto request);

    void isOwner(Long memberId, Long roomId);
}
