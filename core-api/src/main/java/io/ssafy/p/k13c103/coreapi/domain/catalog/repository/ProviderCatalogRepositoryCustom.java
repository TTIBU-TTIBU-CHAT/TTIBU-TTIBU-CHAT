package io.ssafy.p.k13c103.coreapi.domain.catalog.repository;

public interface ProviderCatalogRepositoryCustom {

    Long upsertReturningId(String providerCode);
}