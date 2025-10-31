package io.ssafy.p.k13c103.coreapi.common.jsend;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record JSuccess<T> (String status, T data) implements JSend {
    public JSuccess(T data) {
        this("success", data);
    }
}