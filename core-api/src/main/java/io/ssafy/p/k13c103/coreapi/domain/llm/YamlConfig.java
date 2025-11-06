package io.ssafy.p.k13c103.coreapi.domain.llm;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record YamlConfig(
        /* YAML 키와 동일 */
        List<YamlModel> model_list,
        GeneralSettings general_settings
) {
    public record YamlModel(String model_name, LiteParams litellm_params) {}
    public record LiteParams(String model) {}
    public record GeneralSettings(String master_key) {}
}
