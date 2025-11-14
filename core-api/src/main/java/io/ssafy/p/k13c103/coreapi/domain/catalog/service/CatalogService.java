package io.ssafy.p.k13c103.coreapi.domain.catalog.service;

import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ModelCatalogRepository;
import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ProviderCatalogRepository;
import io.ssafy.p.k13c103.coreapi.domain.key.repository.KeyRepository;
import io.ssafy.p.k13c103.coreapi.domain.llm.YamlConfig;
import io.ssafy.p.k13c103.coreapi.domain.model.repository.ModelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final ProviderCatalogRepository providerCatalogRepository;
    private final ModelCatalogRepository modelCatalogRepository;
    private final KeyRepository keyRepository;
    private final ModelRepository modelRepository;

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

        // 제공사
        List<Long> deactivatedProviderIds;
        if (providers.isEmpty())
            deactivatedProviderIds = List.of();
        else
            deactivatedProviderIds = providerCatalogRepository.softDeleteNotInReturningIds(providers);

        // 모델
        List<Long> deactivatedModelIds;
        if (models.isEmpty())
            deactivatedModelIds = List.of();
        else
            deactivatedModelIds = modelCatalogRepository.softDeleteNotInKeysReturningIds(models);

        // 참조 정리
        if (!deactivatedProviderIds.isEmpty())
            keyRepository.deleteAllByProviderUids(deactivatedProviderIds);
        if (!deactivatedModelIds.isEmpty())
            modelRepository.deleteAllByModelCatalogUids(deactivatedModelIds);
    }
}
