package io.ssafy.p.k13c103.coreapi.domain.catalog.repository;

import io.ssafy.p.k13c103.coreapi.domain.catalog.dto.CatalogModelEntry;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ModelCatalog;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ProviderCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface ModelCatalogRepository extends JpaRepository<ModelCatalog, Long>, ModelCatalogRepositoryCustom {

    @Query("""
            select new io.ssafy.p.k13c103.coreapi.domain.catalog.dto.CatalogModelEntry(m.code, m.name)
            from ModelCatalog m
            join m.provider p
            where p.code = :providerCode and p.isActive = true and m.isActive = true
            order by m.name asc
            """)
    List<CatalogModelEntry> findEntriesByProviderCode(String providerCode);

    /**
     * 비활성화 될 대상 모델에 대해 soft delete 후 대상 모델 id 리스트 반환
     */
    @Query(value = """
                update model_catalog mc
                   set is_active = false
                  from provider_catalog p
                 where mc.provider_catalog_uid = p.provider_catalog_uid
                   and mc.is_active = true
                   and (p.code || '|' || mc.code) not in (:keys)
                returning mc.model_catalog_uid
            """, nativeQuery = true)
    List<Long> softDeleteNotInKeysReturningIds(Collection<String> keys);

    List<ModelCatalog> findModelCatalogsByProvider(ProviderCatalog provider);

    @Query("""
                select mc
                  from ModelCatalog mc
                 where mc.isActive = true
                   and mc.modelUid in :catalogIds
                   and exists (
                        select 1
                          from Key k
                         where k.member.memberUid = :memberUid
                           and k.isActive = true
                           and k.provider = mc.provider
                    )
            """)
    List<ModelCatalog> findAllowedActiveCatalogsForMember(Long memberUid, Collection<Long> catalogIds);
}
