package io.ssafy.p.k13c103.coreapi.domain.catalog.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

public class ProviderCatalogRepositoryImpl implements ProviderCatalogRepositoryCustom {

    @PersistenceContext
    private EntityManager em;

    @Override
    public Long upsertReturningId(String providerCode) {
        Object id = em.createNativeQuery("""
            INSERT INTO provider_catalog (code, is_active, updated_at)
            VALUES (:code, true, now())
            ON CONFLICT (code)
            DO UPDATE SET is_active = true, updated_at = now()
            RETURNING provider_uid
        """)
                .setParameter("code", providerCode)
                .getSingleResult();

        return ((Number) id).longValue();
    }
}
