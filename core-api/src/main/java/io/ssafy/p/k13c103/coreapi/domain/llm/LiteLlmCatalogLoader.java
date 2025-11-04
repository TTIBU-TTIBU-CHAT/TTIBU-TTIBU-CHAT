package io.ssafy.p.k13c103.coreapi.domain.llm;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ResourceLoaderAware;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.util.*;

@Slf4j
@Service
public class LiteLlmCatalogLoader implements ResourceLoaderAware {

    private final Yaml yaml = new Yaml();
    private ResourceLoader resourceLoader;

    private volatile Map<String, List<String>> byProvider = Map.of();

    @Value("${ttibu.litellm.config-path}")
    private String configPath;

    @PostConstruct
    public void init() {
        reload(configPath);
    }

    @Override
    public void setResourceLoader(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    public synchronized void reload(String path) {
        Map<String, List<String>> tmp = new LinkedHashMap<>();

        try (InputStream inputStream = resourceLoader.getResource(path).getInputStream()) {
            Map<String, Object> root = yaml.load(inputStream);
            if (root == null) {
                log.warn("[LiteLLM-Catalog] EMPTY YAML: {}", path);
                return;
            }

            List<Map<String, Object>> modelList = (List<Map<String, Object>>) root.getOrDefault("model_list", List.of());

            for (Map<String, Object> model : modelList) {
                Map<String, Object> params = (Map<String, Object>) model.get("litellm_params");
                if (params == null) continue;

                Object modelObj = params.get("model");
                if (modelObj == null) continue;

                String full = String.valueOf(modelObj).trim(); // ex. openai/gpt-4o
                String parts[] = full.split("/", 2);
                if (parts.length != 2) continue;

                String provider = parts[0].trim(); // ex. openai
                String code = parts[1].trim(); // ex.gpt-4o

                tmp.computeIfAbsent(provider, k -> new ArrayList<>()).add(code);
            }

            tmp.replaceAll((k, v) -> List.copyOf(v));
            this.byProvider = Collections.unmodifiableMap(tmp);

        } catch (Exception e) {
            throw new ApiException(ErrorCode.CATALOG_LOAD_FAILED);
        }
    }

    public List<String> providers() {
        return List.copyOf(byProvider.keySet());
    }

    public List<String> models(String provider) {
        return byProvider.getOrDefault(provider, List.of());
    }

    public boolean existsProvider(String provider) {
        return byProvider.containsKey(provider);
    }
}
