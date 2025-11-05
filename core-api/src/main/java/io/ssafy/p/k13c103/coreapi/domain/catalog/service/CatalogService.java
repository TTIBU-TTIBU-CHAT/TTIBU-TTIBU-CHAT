package io.ssafy.p.k13c103.coreapi.domain.catalog.service;

import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ModelCatalogRepository;
import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ProviderCatalogRepository;
import io.ssafy.p.k13c103.coreapi.domain.llm.YamlConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final ProviderCatalogRepository providerCatalogRepository;
    private final ModelCatalogRepository modelCatalogRepository;

    @Transactional
    public void apply(YamlConfig yamlConfig) {

        Set<String> providers = new HashSet<>();
        Set<String> models = new HashSet<>();

        for (YamlConfig.YamlModel m : yamlConfig.model_list()) {
            String full = m.litellm_params().model();
            String parts[] = full.split("/", 2);
            if (parts.length != 2) continue;

            String providerCode = parts[0].trim();
            String modelCode = parts[1].trim();
            String modelName = m.model_name();

            Long providerId = providerCatalogRepository.upsertReturningId(providerCode);
            modelCatalogRepository.upsert(providerId, modelCode, modelName);

            providers.add(providerCode);
            models.add(providerCode + "|" + modelCode);
        }

        if (!providers.isEmpty())
            providerCatalogRepository.softDeleteNotIn(providers);
        if (!models.isEmpty())
            modelCatalogRepository.softDeleteNotInKeys(models);
    }
}
