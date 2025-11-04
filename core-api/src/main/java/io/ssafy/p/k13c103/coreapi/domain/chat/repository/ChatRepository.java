package io.ssafy.p.k13c103.coreapi.domain.chat.repository;

import io.ssafy.p.k13c103.coreapi.domain.branch.entity.Branch;
import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatRepository extends JpaRepository<Chat, Long> {

    @Query("SELECT c FROM Chat c WHERE c.branch = :branch ORDER BY c.createdAt DESC")
    List<Chat> findTop5ByBranchOrderByCreatedAtDesc(@Param("branch") Branch branch);

}