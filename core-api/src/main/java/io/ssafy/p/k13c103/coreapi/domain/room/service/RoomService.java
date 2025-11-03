package io.ssafy.p.k13c103.coreapi.domain.room.service;

import io.ssafy.p.k13c103.coreapi.domain.room.entity.Room;

public interface RoomService {

    /* roomId로 채팅방 조회 */
    Room findById(Long roomId);

    /* 특정 회원이 해당 채팅방의 소유자인지 여부 확인 */
    boolean isOwner(Long memberId, Long roomId);
}
