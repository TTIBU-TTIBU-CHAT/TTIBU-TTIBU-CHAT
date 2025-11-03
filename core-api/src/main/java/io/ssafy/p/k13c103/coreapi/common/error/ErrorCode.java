package io.ssafy.p.k13c103.coreapi.common.error;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum ErrorCode {

    /* === 공통 === */
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생하였습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),

    /* === 회원 === */
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."),
    MEMBER_EMAIL_DUPLICATED(HttpStatus.CONFLICT, "이미 존재하는 이메일입니다."),

    /* === LiteLLM === */
    INVALID_KEY(HttpStatus.UNAUTHORIZED, "유효하지 않은 API 키입니다."),
    KEY_CRYPTO_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "키 암·복호화 처리에 실패했습니다."),
    DUPLICATED_KEY(HttpStatus.CONFLICT, "해당 제공사의 키가 이미 등록되어 있습니다."),

    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "외부 API 호출 한도를 초과했습니다."),
    UPSTREAM_ERROR(HttpStatus.BAD_GATEWAY, "외부 모델 서버 오류가 발생했습니다."),

    PROVIDER_NOT_FOUND(HttpStatus.NOT_FOUND, "제공사를 찾을 수 없습니다."),
    MODEL_CATALOG_EMPTY(HttpStatus.BAD_REQUEST, "해당 제공사의 유효한 모델이 존재하지 않습니다."),
    CATALOG_LOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "카탈로그 로드에 실패했습니다.");

    private final HttpStatus status;
    private final String message;

    public boolean isClientError() {
        return status.is4xxClientError();
    }
}