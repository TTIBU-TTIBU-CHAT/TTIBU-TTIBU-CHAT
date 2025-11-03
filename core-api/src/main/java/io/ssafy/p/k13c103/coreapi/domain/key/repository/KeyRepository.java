package io.ssafy.p.k13c103.coreapi.domain.key.repository;

import io.ssafy.p.k13c103.coreapi.domain.key.entity.Key;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KeyRepository extends JpaRepository<Key, Long> {
    boolean existsByMember_MemberUidAndProvider(Long memberUid, String provider);
}