package io.ssafy.p.k13c103.coreapi.domain.catalog.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

public class ProviderCatalogRepositoryCustomImpl implements ProviderCatalogRepositoryCustom {

    @PersistenceContext
    private EntityManager em;

    /**
     * 제공사 code를 UPSERT 하고 PK 반환
     *
     * 동일 code 행이 존재하고 is_active가 TRUE로 바뀌어야 하는 경우에만 UPDATE
     * 이번 트랜잭션에서 update가 없었고 기존 행도 없을 때만 INSERT
     * update에서 PK가 있으면 반환, 없으면 INSERT의 PK 반환, 둘다 없으면 기존 행의 PK 반환
     */
    @Override
    public Long upsertReturningId(String providerCode) {
        Object id = em.createNativeQuery("""
                        WITH upd AS (
                          UPDATE provider_catalog
                             SET is_active = TRUE,
                                 updated_at = NOW()
                           WHERE code = :code
                             AND (is_active IS DISTINCT FROM TRUE)
                           RETURNING provider_catalog_uid
                        ),
                        ins AS (
                          INSERT INTO provider_catalog (code, is_active, created_at, updated_at)
                          SELECT :code, TRUE, NOW(), NOW()
                          WHERE NOT EXISTS (SELECT 1 FROM upd)             
                            AND NOT EXISTS (
                                  SELECT 1 FROM provider_catalog WHERE code = :code
                                )
                          RETURNING provider_catalog_uid
                        )
                        SELECT provider_catalog_uid FROM upd
                        UNION ALL
                        SELECT provider_catalog_uid FROM ins
                        UNION ALL
                        SELECT provider_catalog_uid FROM provider_catalog WHERE code = :code
                        LIMIT 1
                        """)
                .setParameter("code", providerCode)
                .getSingleResult();

        return ((Number) id).longValue();
    }
}