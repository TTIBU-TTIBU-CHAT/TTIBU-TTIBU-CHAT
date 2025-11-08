package io.ssafy.p.k13c103.coreapi.domain.catalog.repository;

import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ProviderCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface ProviderCatalogRepository extends JpaRepository<ProviderCatalog, Long>, ProviderCatalogRepositoryCustom  {
    List<ProviderCatalog> findByIsActiveTrueOrderByCodeAsc();

    /**
     * 비활성화 될 대상 제공사들에 대해 soft delete 후 대상 모델 id 리스트 반환
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
        update provider_catalog p
           set is_active = false
         where is_active = true
           and code not in (:providerCodes)
        returning provider_catalog_uid
    """, nativeQuery = true)
    List<Long> softDeleteNotInReturningIds(Collection<String> providerCodes);
}
