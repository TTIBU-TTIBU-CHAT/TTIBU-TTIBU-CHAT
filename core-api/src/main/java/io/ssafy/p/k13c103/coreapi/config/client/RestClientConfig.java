package io.ssafy.p.k13c103.coreapi.config.client;

import io.ssafy.p.k13c103.coreapi.config.properties.SummaryApiProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@RequiredArgsConstructor
public class RestClientConfig {

    private final SummaryApiProperties summaryApiProperties;

    @Bean
    public RestClient restClient() {
        return RestClient.builder()
                .baseUrl(summaryApiProperties.getBaseUrl())
                .build();
    }
}
