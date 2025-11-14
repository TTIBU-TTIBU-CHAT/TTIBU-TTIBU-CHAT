package io.ssafy.p.k13c103.coreapi.config.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "litellm")
public class LiteLlmProperties {

    private String baseUrl;

    private String apiKey;

    private String model;
}
