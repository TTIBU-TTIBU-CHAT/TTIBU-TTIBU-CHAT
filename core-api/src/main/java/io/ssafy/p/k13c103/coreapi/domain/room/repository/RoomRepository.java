package io.ssafy.p.k13c103.coreapi.domain.room.repository;

import io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.room.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Long> {
    @Query("""
            select new io.ssafy.p.k13c103.coreapi.domain.room.dto.RoomResponseDto$RoomListInfo(
                r.roomUid,
                r.name,
                c.question,
                c.createdAt
            )
            from Room r
            join Chat c
              on c.room = r
             and c.chatUid = (
                  select max(c2.chatUid)
                  from Chat c2
                  where c2.room = r
             )
            where r.owner.memberUid = :memberUid
            order by r.roomUid asc
            """)
    List<RoomResponseDto.RoomListInfo> findRoomListWithLastChat(Long memberUid);

    int deleteByRoomUidAndOwner_MemberUid(Long roomUid, Long memberUid);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE room
            SET branch_view = CAST(:branchView AS json),
                chat_info   = CAST(:chatInfo   AS json),
                updated_at  = now()
            WHERE room_uid = :roomUid
            """, nativeQuery = true)
    int updateViews(Long roomUid, String chatInfo, String branchView);

    boolean existsByRoomUidAndOwner_MemberUid(Long roomUid, Long memberUid);
}

