package io.ssafy.p.k13c103.coreapi.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChatCreateRequest {

    private Long roomID;        // 채팅방 ID (nullable)

    private Long branchId;      // 브랜치 ID (nullable)

    private String branchName;  // 브랜치 별칭 (nullable)

    private Long parentId;      // 부모 노드 ID (nullable)

    @NotBlank(message = "질문 내용은 비어 있을 수 없습니다.")
    private String question;    // 사용자 질문

    @NotNull(message = "모델 ID는 반드시 필요합니다.")
    private Long modelId;       // 사용 모델 ID
}
