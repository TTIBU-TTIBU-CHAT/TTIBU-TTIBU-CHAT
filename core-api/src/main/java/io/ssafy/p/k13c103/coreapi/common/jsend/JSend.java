package io.ssafy.p.k13c103.coreapi.common.jsend;

public sealed interface JSend permits JSuccess, JFail, JError {

    String status();

    static <T> JSuccess<T> success(T data) {
        return new JSuccess<>(data);
    }

    static <T> JFail<T> fail(T data) {
        return new JFail<>(data);
    }

    static JError error(String message) {
        return new JError(message, null, null);
    }

    static JError error(String message, String code, Object data) {
        return new JError(message, code, data);
    }
}