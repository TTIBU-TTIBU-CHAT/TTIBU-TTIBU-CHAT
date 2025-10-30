package io.ssafy.p.k13c103.coreapi.common.error;

import io.ssafy.p.k13c103.coreapi.common.jsend.JSend;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 코드 내부에서 직접 ApiException을 throw한 경우
     * */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<JSend> handleApiException(ApiException ex, HttpServletRequest request) {
        ErrorCode errorCode = ex.getErrorCode();

        if (errorCode.isClientError()) {
            Map<String, String> data = Map.of("reason", ex.getMessage());
            return ResponseEntity.status(errorCode.getStatus())
                    .body(JSend.fail(data));
        } else {
            String errorId = UUID.randomUUID().toString();
            Map<String, String> data = Map.of(
                    "errorId", errorId,
                    "path", request.getRequestURI()
            );
            log.error("[{}] ", errorId, ex);
            return ResponseEntity.status(errorCode.getStatus())
                    .body(JSend.error(errorCode.getMessage(), errorCode.name(), data));
        }
    }

    /**
     * @Valid 어노테이션을 통해 발생한 에러일 경우
     * */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<JSend> handleMethodArgumentNotValidException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<Map<String, Object>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> Map.of(
                        "field", e.getField(),
                        "rejected", e.getRejectedValue(),
                        "reason", e.getDefaultMessage()))
                .toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(JSend.fail(Map.of("errors", errors)));
    }
}