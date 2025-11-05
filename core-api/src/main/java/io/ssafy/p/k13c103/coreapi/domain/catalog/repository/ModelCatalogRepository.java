package io.ssafy.p.k13c103.coreapi.domain.catalog.repository;

import io.ssafy.p.k13c103.coreapi.domain.catalog.dto.CatalogModelEntry;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ModelCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface ModelCatalogRepository extends JpaRepository<ModelCatalog, Long>, ModelCatalogRepositoryCustom  {

    @Query("""
            select new io.ssafy.p.k13c103.coreapi.domain.catalog.dto.CatalogModelEntry(m.code, m.name)
            from ModelCatalog m
            join m.provider p
            where p.code = :providerCode and p.isActive = true and m.isActive = true
            order by m.name asc
            """)
    List<CatalogModelEntry> findEntriesByProviderCode(String providerCode);

    @Query("""
              select p.code
              from ProviderCatalog p
              where p.isActive = true
              order by p.code asc
            """)
    List<String> findActiveProviderCodes();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            UPDATE model_catalog m
               SET is_active = false, updated_at = now()
             WHERE (SELECT p.code || '|' || m.code
                      FROM provider_catalog p
                     WHERE p.provider_uid = m.provider_uid) NOT IN (:seenKeys)
            """, nativeQuery = true)
    int softDeleteNotInKeys(Collection<String> seenKeys);
}
