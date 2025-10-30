package io.ssafy.p.k13c103.coreapi.common.jsend;

public record JError (String message, String code, Object data) implements JSend {
    @Override
    public String status() {
        return "error";
    }
}