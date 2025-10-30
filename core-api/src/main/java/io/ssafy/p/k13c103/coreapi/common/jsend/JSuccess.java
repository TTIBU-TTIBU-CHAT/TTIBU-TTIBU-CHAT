package io.ssafy.p.k13c103.coreapi.common.jsend;

public record JSuccess<T> (T data) implements JSend {
    @Override
    public String status() {
        return "success";
    }
}