package io.ssafy.p.k13c103.coreapi.domain.catalog.repository;

public interface ModelCatalogRepositoryCustom {

    void upsert(Long providerUid, String modelCode, String modelName);
}
