package io.ssafy.p.k13c103.coreapi.chat.repository;

import io.ssafy.p.k13c103.coreapi.chat.entity.Chat;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRepository extends JpaRepository<Chat, Long> {

}