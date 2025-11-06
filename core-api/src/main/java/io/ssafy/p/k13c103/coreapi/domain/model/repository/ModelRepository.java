package io.ssafy.p.k13c103.coreapi.domain.model.repository;

import io.ssafy.p.k13c103.coreapi.domain.model.entity.Model;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModelRepository extends JpaRepository<Model, Long> {
    List<Model> findAllByMember_MemberUid(Long memberUid);
    Model findModelByMember_MemberUidAndIsDefaultTrue(Long memberUid);
}
