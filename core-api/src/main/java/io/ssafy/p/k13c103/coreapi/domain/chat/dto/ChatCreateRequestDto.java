package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Schema(description = "채팅 생성 요청 DTO")
@Getter
@NoArgsConstructor
public class ChatCreateRequestDto {

    @Schema(description = "채팅방 ID (없을 경우 새 Room 생성)", example = "3", nullable = true)
    private Long roomID;

    @Schema(description = "브랜치 ID (없을 경우 새 Branch 생성)", example = "5", nullable = true)
    private Long branchId;

    @Schema(description = "새 브랜치 이름 (branchId가 없을 때만 사용)", example = "프로젝트 회의", nullable = true)
    private String branchName;

    @Schema(description = "부모 채팅 ID (스레드형 구조용)", example = "10", nullable = true)
    private Long parentId;

    @NotBlank(message = "질문 내용은 비어 있을 수 없습니다.")
    @Schema(description = "사용자 질문 내용", example = "AI 기반 서비스 아키텍처를 어떻게 구성하면 좋을까?")
    private String question;

    @NotNull(message = "모델 ID는 반드시 필요합니다.")
    @Schema(description = "사용할 AI 모델 ID", example = "101")
    private Long modelId;
}
