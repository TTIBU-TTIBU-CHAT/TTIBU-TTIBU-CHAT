package io.ssafy.p.k13c103.coreapi.domain.catalog.repository;

import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ProviderCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProviderCatalogRepository extends JpaRepository<ProviderCatalog, Long>, ProviderCatalogRepositoryCustom  {
    List<ProviderCatalog> findByIsActiveTrueOrderByCodeAsc();

    boolean existsByCodeAndIsActiveTrue(String code);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
        UPDATE provider_catalog
           SET is_active = false, updated_at = now()
         WHERE code NOT IN (:codes)
        """, nativeQuery = true)
    int softDeleteNotIn(Collection<String> codes);
}
