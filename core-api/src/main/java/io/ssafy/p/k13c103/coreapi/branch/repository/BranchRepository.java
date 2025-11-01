package io.ssafy.p.k13c103.coreapi.branch.repository;

import io.ssafy.p.k13c103.coreapi.room.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchRepository extends JpaRepository<Room, Long> {

}
