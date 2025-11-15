package io.ssafy.p.k13c103.coreapi.common.jsend;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record JError(String status, String message, String code, Object data) implements JSend {
    public JError(String message, String code, Object data) {
        this("error", message, code, data);
    }
}