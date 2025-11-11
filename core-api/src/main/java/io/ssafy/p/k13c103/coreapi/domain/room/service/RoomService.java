package io.ssafy.p.k13c103.coreapi.domain.room.service;

import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomRenameRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomRenameResponseDto;

public interface RoomService {

    Long createRoom(Long memberId, RoomCreateRequestDto request);

    void isOwner(Long memberId, Long roomId);

    RoomRenameResponseDto updateRoomName(Long memberId, Long roomId, RoomRenameRequestDto request);

    ChatCreateResponseDto createChatInRoom(Long memberId, Long roomId, ChatCreateRequestDto request);
}
