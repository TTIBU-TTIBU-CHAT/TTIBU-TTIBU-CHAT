package io.ssafy.p.k13c103.coreapi.domain.room.service;

import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.chat.dto.ChatCreateResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomRenameRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomRenameResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomResponseDto;

import java.util.List;

public interface RoomService {

    Long createRoom(Long memberId, RoomCreateRequestDto request);

    List<RoomResponseDto.RoomListInfo> getList(Long memberUid);

    void delete(Long roomUid, Long memberUid);

    void isOwner(Long memberId, Long roomId);

    RoomRenameResponseDto updateRoomName(Long memberId, Long roomId, RoomRenameRequestDto request);

    ChatCreateResponseDto createChatInRoom(Long memberId, Long roomId, ChatCreateRequestDto request);
}
