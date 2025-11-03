package io.ssafy.p.k13c103.coreapi.domain.branch.repository;

import io.ssafy.p.k13c103.coreapi.domain.branch.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchRepository extends JpaRepository<Branch, Long> {

}
