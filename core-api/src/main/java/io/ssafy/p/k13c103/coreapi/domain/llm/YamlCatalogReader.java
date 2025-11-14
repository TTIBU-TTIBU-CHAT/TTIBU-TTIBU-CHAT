package io.ssafy.p.k13c103.coreapi.domain.llm;

import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
public class YamlCatalogReader {
    private final YAMLMapper yamlMapper = new YAMLMapper();

    public YamlConfig read(Path path) throws IOException {
        try(InputStream inputStream = Files.newInputStream(path)) {
            return yamlMapper.readValue(inputStream, YamlConfig.class);
        } catch (Exception e) {
            throw new ApiException(ErrorCode.CATALOG_LOAD_FAILED);
        }
    }
}
