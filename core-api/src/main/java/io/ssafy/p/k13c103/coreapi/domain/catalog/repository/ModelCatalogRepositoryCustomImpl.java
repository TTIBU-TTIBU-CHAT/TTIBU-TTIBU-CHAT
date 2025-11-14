package io.ssafy.p.k13c103.coreapi.domain.catalog.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

public class ModelCatalogRepositoryCustomImpl implements ModelCatalogRepositoryCustom {

    @PersistenceContext
    private EntityManager em;

    /**
     * 모델 UPSERT
     */
    @Override
    public void upsert(Long providerUid, String modelCode, String modelName) {
        em.createNativeQuery("""
                        INSERT INTO model_catalog (provider_catalog_uid, code, name, is_active, created_at, updated_at)
                        VALUES (:pid, :code, :name, TRUE, NOW(), NOW())
                        ON CONFLICT (provider_catalog_uid, code)
                        DO UPDATE SET
                            name       = EXCLUDED.name,
                            is_active  = TRUE,
                            updated_at = NOW()
                        WHERE
                            model_catalog.name      IS DISTINCT FROM EXCLUDED.name
                         OR model_catalog.is_active IS DISTINCT FROM TRUE
                        """)
                .setParameter("pid", providerUid)
                .setParameter("code", modelCode)
                .setParameter("name", modelName)
                .executeUpdate();
    }
}
