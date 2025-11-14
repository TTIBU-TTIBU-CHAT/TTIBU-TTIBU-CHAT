package io.ssafy.p.k13c103.coreapi.domain.group.repository;

import io.ssafy.p.k13c103.coreapi.domain.group.entity.Group;
import io.ssafy.p.k13c103.coreapi.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupRepository extends JpaRepository<Group, Long> {

    List<Group> findAllByOwnerOrderByUpdatedAtDesc(Member owner);

}
