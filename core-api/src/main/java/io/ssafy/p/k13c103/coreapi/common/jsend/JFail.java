package io.ssafy.p.k13c103.coreapi.common.jsend;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record JFail<T>(String status, T data) implements JSend {
    public JFail(T data) {
        this("fail", data);
    }
}