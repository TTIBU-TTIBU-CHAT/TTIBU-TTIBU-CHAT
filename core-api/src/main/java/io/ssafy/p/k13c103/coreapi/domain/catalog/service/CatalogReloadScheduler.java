package io.ssafy.p.k13c103.coreapi.domain.catalog.service;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.domain.llm.YamlCatalogReader;
import io.ssafy.p.k13c103.coreapi.domain.llm.YamlConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;

@Slf4j
@Component
@RequiredArgsConstructor
public class CatalogReloadScheduler { // 카탈로그 파일(litellm-config.yaml)의 변경을 감지해 DB로 UPSERT 하는 스케줄러

    private final YamlCatalogReader reader;
    private final CatalogService catalogService;

    private volatile String lastSha = ""; // YAML 파일의 SHA-256 체크섬 계산

    @Value("${ttibu.litellm.config-path}")
    private String yamlPath;

    @Scheduled(fixedDelayString = "${ttibu.litellm.poll-ms}")
    public void pollAndApplyIfChanged() {
        Path path = Path.of(yamlPath.replace("file:", ""));
        String sha = safeSha256(path);

        /*
        마지막으로 적용했던 체크섬과
        같으면 ---> 종료
        다르면 ---> YAML 파싱해 upsert
        */
        if (sha.isEmpty() || sha.equals(lastSha)) return;
        try {
            YamlConfig cfg = reader.read(path);
            catalogService.apply(cfg);
            lastSha = sha; // 반영 완료 시 갱신
        } catch (Exception e) {
            throw new ApiException(ErrorCode.CATALOG_LOAD_FAILED);
        }
    }

    private static String safeSha256(Path path) { // 체크섬 계산
        try {
            if (!Files.exists(path)) return "";
            byte[] bytes = Files.readAllBytes(path);
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(bytes));
        } catch (Exception e) {
            return "";
        }
    }
}