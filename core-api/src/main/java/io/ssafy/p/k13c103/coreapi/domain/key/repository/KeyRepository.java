package io.ssafy.p.k13c103.coreapi.domain.key.repository;

import io.ssafy.p.k13c103.coreapi.domain.key.entity.Key;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface KeyRepository extends JpaRepository<Key, Long> {
    Optional<Key> findByKeyUid(Long keyUid);

    Optional<Key> findByKeyUidAndMember_MemberUid(Long keyUid, Long memberUid);

    boolean existsByMember_MemberUidAndProvider(Long memberUid, String provider);
}