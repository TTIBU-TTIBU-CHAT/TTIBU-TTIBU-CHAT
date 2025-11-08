package io.ssafy.p.k13c103.coreapi.domain.model.repository;

import io.ssafy.p.k13c103.coreapi.domain.model.entity.Model;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface ModelRepository extends JpaRepository<Model, Long> {
    List<Model> findAllByMember_MemberUid(Long memberUid);

    Model findModelByMember_MemberUidAndIsDefaultTrue(Long memberUid);

    Model findModelByMember_MemberUidAndModelCatalog_ModelUid(Long memberUid, Long modelCatalogUid);

    @Query("""
              select m from Model m
              join fetch m.modelCatalog mc
              where m.member.memberUid = :memberUid
            """)
    List<Model> findAllByMemberUidWithCatalog(Long memberUid);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
                delete from Model m
                where m.member.memberUid = :memberUid
                  and m.modelCatalog.modelUid in :catalogIds
            """)
    void deleteByMemberUidAndCatalogIds(Long memberUid, Collection<Long> catalogIds);

    /**
     * 비활성화 된 모델 정리
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        delete from Model m
         where m.modelCatalog.modelUid in :catalogUids
    """)
    int deleteAllByModelCatalogUids(Collection<Long> catalogUids);
}