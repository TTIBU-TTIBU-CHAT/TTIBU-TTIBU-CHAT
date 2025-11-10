package io.ssafy.p.k13c103.coreapi.config.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "summary-api")
public class SummaryApiProperties {

    private String baseUrl;

    private int timeoutMs;

}
