package io.ssafy.p.k13c103.coreapi.domain.key.repository;

import io.ssafy.p.k13c103.coreapi.domain.key.entity.Key;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface KeyRepository extends JpaRepository<Key, Long> {
    Optional<Key> findByKeyUid(Long keyUid);

    Optional<Key> findByKeyUidAndMember_MemberUid(Long keyUid, Long memberUid);

    boolean existsByMember_MemberUidAndProvider_ProviderUid(Long memberUid, Long providerUid);

    List<Key> findKeysByMember_MemberUidAndIsActiveIsTrue(Long memberUid);

    List<Key> findKeysByMember_MemberUid(Long memberUid);

    /**
     * 비활성화 된 키 정리
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
                delete from Key k
                 where k.provider.providerUid in :providerUids
            """)
    int deleteAllByProviderUids(Collection<Long> providerUids);
}