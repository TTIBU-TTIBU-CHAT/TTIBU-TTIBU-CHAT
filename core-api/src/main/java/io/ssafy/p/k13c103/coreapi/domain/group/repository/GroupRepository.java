package io.ssafy.p.k13c103.coreapi.domain.group.repository;

import io.ssafy.p.k13c103.coreapi.domain.group.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupRepository extends JpaRepository<Group, Long> {
}
