package io.ssafy.p.k13c103.coreapi.domain.group.repository;

import io.ssafy.p.k13c103.coreapi.domain.group.entity.GroupView;
import io.ssafy.p.k13c103.coreapi.domain.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GroupViewRepository extends JpaRepository<GroupView, Long> {

    Optional<GroupView> findByMember(Member member);
}
