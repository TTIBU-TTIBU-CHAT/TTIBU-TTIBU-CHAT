package io.ssafy.p.k13c103.coreapi.config.client;

import io.netty.channel.ChannelOption;
import io.ssafy.p.k13c103.coreapi.config.properties.LiteLlmProperties;
import io.ssafy.p.k13c103.coreapi.config.properties.SummaryApiProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
@RequiredArgsConstructor
public class WebClientConfig {

    private final LiteLlmProperties liteLlmProperties;

    private final SummaryApiProperties summaryApiProperties;

    @Bean(name = "liteLlmClient")
    public WebClient liteLlmWebClient(WebClient.Builder builder) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 3000)
                .responseTimeout(Duration.ofSeconds(5));

        return builder
                .baseUrl(liteLlmProperties.getBaseUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .codecs(c -> c.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
                .build();
    }

    /**
     * WebClient를 전역 Bean으로 등록
     * - 비동기 HTTP 요청용
     * - FastAPI, 외부 AI 서버 등에 공통 사용 가능
     */
    @Bean(name = "aiWebClient")
    public WebClient aiWebClient(WebClient.Builder builder) {
        return builder
                .baseUrl(summaryApiProperties.getBaseUrl())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
}