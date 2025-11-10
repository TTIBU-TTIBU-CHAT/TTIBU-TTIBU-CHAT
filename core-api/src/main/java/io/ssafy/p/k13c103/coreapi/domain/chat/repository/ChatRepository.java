package io.ssafy.p.k13c103.coreapi.domain.chat.repository;

import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatRepository extends JpaRepository<Chat, Long> {

    List<Chat> findAllByGroup_GroupUid(Long groupUid);

    void deleteAllByGroup_GroupUid(Long groupUid);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
    delete from Chat c
    where c.group.groupUid = :groupId
      and c.chatType = io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatType.GROUP
    """)
    int deleteAllGroupCopies(@Param("groupId") Long groupId);
}