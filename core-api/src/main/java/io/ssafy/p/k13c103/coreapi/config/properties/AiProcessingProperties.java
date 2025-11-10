package io.ssafy.p.k13c103.coreapi.config.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "ai.processing")
public class AiProcessingProperties {

    private double temperature = 0.7;

    private boolean streamEnabled = true;

    private int shortSummaryMaxLength = 30;

    private int shortSummaryMinLength = 5;

    private int longSummaryMaxLength = 150;

    private int longSummaryMinLength = 30;
}
