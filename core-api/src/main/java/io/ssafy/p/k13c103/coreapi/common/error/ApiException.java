package io.ssafy.p.k13c103.coreapi.common.error;

import lombok.Getter;

/**
 * Jsend Fail인 경우에만 사용
 * */
@Getter
public class ApiException extends RuntimeException {
    private final ErrorCode errorCode;

    public ApiException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public ApiException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}