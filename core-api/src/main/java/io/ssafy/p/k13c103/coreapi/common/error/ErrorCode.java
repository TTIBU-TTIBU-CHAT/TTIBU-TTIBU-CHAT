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

    /* === SSE / 인증 관련 === */
    SSE_UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "SSE 연결에는 인증이 필요합니다."),
    SSE_FORBIDDEN(HttpStatus.FORBIDDEN, "해당 채팅방에 접근할 권한이 없습니다."),

    /* === 채팅방 === */
    ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 채팅방입니다."),
    ROOM_FORBIDDEN(HttpStatus.FORBIDDEN, "해당 채팅방에 접근할 권한이 없습니다."),

    /* === 브랜치 === */
    BRANCH_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 브랜치입니다."),

    /* === 채팅 === */
    CHAT_NOT_FOUND(HttpStatus.NOT_FOUND, "채팅을 찾을 수 없습니다."),

    /* === 그룹 === */
    GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 그룹입니다."),

    /* === FastAPI === */
    EXTERNAL_API_ERROR(HttpStatus.BAD_GATEWAY, "외부 API 호출 중 알 수 없는 오류가 발생했습니다."),
    EXTERNAL_API_CONNECTION_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "외부 API 서버에 연결할 수 없습니다."),

    /* === 회원 === */
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."),
    MEMBER_EMAIL_DUPLICATED(HttpStatus.CONFLICT, "이미 존재하는 이메일입니다.");





    private final HttpStatus status;
    private final String message;

    public boolean isClientError() {
        return status.is4xxClientError();
    }
}