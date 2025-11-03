package io.ssafy.p.k13c103.coreapi.domain.room.service;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.domain.room.entity.Room;
import io.ssafy.p.k13c103.coreapi.domain.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;

    @Override
    public Room findById(Long roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> new ApiException(ErrorCode.ROOM_NOT_FOUND));
    }

    @Override
    public boolean isOwner(Long memberId, Long roomId) {
        Room room = findById(roomId);

        if (room.getOwner() == null) {
            log.error("[RoomService] Room {} has no owner assigned", roomId);
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "방의 소유자 정보가 없습니다.");
        }

        if (!room.getOwner().getMemberUid().equals(memberId)) {
            log.warn("[RoomService] Member {} attempted to access room {} without ownership",
                    memberId, roomId);
            throw new ApiException(ErrorCode.ROOM_FORBIDDEN);
        }

        return true;
    }
}
