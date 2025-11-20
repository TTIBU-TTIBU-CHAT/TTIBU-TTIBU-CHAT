package io.ssafy.p.k13c103.coreapi.domain.chat.repository;

import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatRepository extends JpaRepository<Chat, Long> {

    List<Chat> findAllByGroup_GroupUidAndChatType(Long groupUid, ChatType chatType);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            delete from Chat c
            where c.group.groupUid = :groupId
              and c.chatType = io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatType.GROUP
            """)
    int deleteAllGroupCopies(@Param("groupId") Long groupId);

    @Query(
            value = """
                    SELECT c.*
                    FROM chat c
                    JOIN room r ON r.room_uid = c.room_id
                    WHERE r.owner_id = :memberId
                      AND c.group_id IS NULL
                      AND c.status   = 'SUMMARY_KEYWORDS'
                      AND c.is_chat  = 'CHAT'
                      AND c.search_content ILIKE ALL (CAST(:keywords AS text[]))
                    ORDER BY c.created_at DESC
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM chat c
                    JOIN room r ON r.room_uid = c.room_id
                    WHERE r.owner_id = :memberId
                      AND c.group_id IS NULL
                      AND c.status   = 'SUMMARY_KEYWORDS'
                      AND c.is_chat  = 'CHAT'
                      AND c.search_content ILIKE ALL (CAST(:keywords AS text[]))
                    """,
            nativeQuery = true
    )
    Page<Chat> searchByAllKeywords(Long memberId, String[] keywords, Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Chat c
               set c.room = null
             where c.room.roomUid = :roomUid
               and c.chatType = 'GROUP'
               and c.group.groupUid is not null
            """)
    int detachGroupChats(Long roomUid);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            delete from Chat c
             where c.room.roomUid = :roomUid
            """)
    int deleteChatsByRoom(Long roomUid);

    @Query(
            value = """
                    SELECT c.*
                    FROM chat c
                    WHERE c.status  = 'SUMMARY_KEYWORDS'
                      AND c.is_chat = 'CHAT'
                      AND c.group_id IS NULL
                      AND EXISTS (
                          SELECT 1
                          FROM room r
                          WHERE r.room_uid = c.room_id
                            AND r.owner_id = :memberId
                      )
                    ORDER BY c.created_at DESC
                    """,
            countQuery = """
                    SELECT COUNT(*)
                    FROM chat c
                    WHERE c.status  = 'SUMMARY_KEYWORDS'
                      AND c.is_chat = 'CHAT'
                      AND c.group_id IS NULL
                      AND EXISTS (
                          SELECT 1
                          FROM room r
                          WHERE r.room_uid = c.room_id
                            AND r.owner_id = :memberId
                      )
                    """,
            nativeQuery = true
    )
    Page<Chat> findAllChats(Long memberId, Pageable pageable);
}