package io.ssafy.p.k13c103.coreapi.domain.room.repository;

import io.ssafy.p.k13c103.coreapi.domain.room.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<Room, Long> {

}

