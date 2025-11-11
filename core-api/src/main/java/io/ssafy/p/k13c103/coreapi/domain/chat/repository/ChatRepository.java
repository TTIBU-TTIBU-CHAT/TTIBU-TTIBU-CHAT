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

    @Query(value = """
        SELECT c.*
        FROM chat c
        JOIN room r ON r.room_uid = c.room_id
        WHERE r.owner_id = :memberId
          AND c.status   = 'SUMMARY_KEYWORDS'
          AND c.is_chat  = 'CHAT'
          AND NOT EXISTS (
                SELECT 1
                FROM unnest(CAST(:keywords AS text[])) AS kw(k)
                WHERE c.search_content NOT ILIKE ('%' || kw.k || '%')
          )
        ORDER BY c.created_at DESC
        """,
            countQuery = """
        SELECT COUNT(*) FROM (
          SELECT c.chat_uid
          FROM chat c
          JOIN room r ON r.room_uid = c.room_id
          WHERE r.owner_id = :memberId
            AND c.status   = 'SUMMARY_KEYWORDS'
            AND c.is_chat  = 'CHAT'
            AND NOT EXISTS (
                  SELECT 1
                  FROM unnest(CAST(:keywords AS text[])) AS kw(k)
                  WHERE c.search_content NOT ILIKE ('%' || kw.k || '%')
            )
          ORDER BY c.created_at DESC
        ) t
        """,
            nativeQuery = true)
    Page<Chat> searchByAllKeywords(Long memberId, String[] keywords, Pageable pageable);
}