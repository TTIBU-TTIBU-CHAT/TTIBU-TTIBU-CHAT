package io.ssafy.p.k13c103.coreapi.common.jsend;

public record JFail<T> (T data) implements JSend {
    @Override
    public String status() {
        return "fail";
    }
}