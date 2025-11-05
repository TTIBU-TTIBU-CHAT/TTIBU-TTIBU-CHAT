package io.ssafy.p.k13c103.coreapi.domain.catalog.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

public class ModelCatalogRepositoryCustomImpl implements ModelCatalogRepositoryCustom {

    @PersistenceContext
    private EntityManager em;

    @Override
    public void upsert(Long providerUid, String modelCode, String modelName) {
        em.createNativeQuery("""
            INSERT INTO model_catalog (provider_uid, code, name, is_active, updated_at)
            VALUES (:pid, :code, :name, true, now())
            ON CONFLICT (provider_uid, code)
            DO UPDATE SET name = EXCLUDED.name,
                          is_active = true,
                          updated_at = now()
        """)
                .setParameter("pid", providerUid)
                .setParameter("code", modelCode)
                .setParameter("name", modelName)
                .executeUpdate();
    }
}
