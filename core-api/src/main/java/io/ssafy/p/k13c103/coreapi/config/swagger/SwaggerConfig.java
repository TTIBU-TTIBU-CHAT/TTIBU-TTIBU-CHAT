package io.ssafy.p.k13c103.coreapi.config.swagger;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        Info info = new Info()
                .title("TTIBU-TTIBU-CHAT API Documentation")
                .version("1.0")
                .description("띠부띠부챗의 API 사용 방법을 안내합니다.");

        SecurityScheme securityScheme = new SecurityScheme()
                .type(SecurityScheme.Type.APIKEY)
                .in(SecurityScheme.In.COOKIE)
                .name("JSESSIONID");

        return new OpenAPI()
                .info(info)
                .components(new Components().addSecuritySchemes("cookie", securityScheme))
                .addSecurityItem(new SecurityRequirement().addList("cookie"));
    }
}
