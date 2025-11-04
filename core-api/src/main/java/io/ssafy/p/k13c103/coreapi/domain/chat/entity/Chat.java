package io.ssafy.p.k13c103.coreapi.domain.chat.entity;

import io.ssafy.p.k13c103.coreapi.common.entity.BaseTimeEntity;
import io.ssafy.p.k13c103.coreapi.domain.branch.entity.Branch;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Chat extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long chatUid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    // TODO: 그룹 추가

    @Column(nullable = false)
    private String question;

    @Column(nullable = false)
    private String answer;

    @Column
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String keyword;

    @Column
    private Long originId;

    @Column
    private LocalDateTime answeredAt;

    public static Chat create(Branch branch, String question, Long originId) {
        return Chat.builder()
                .branch(branch)
                .question(question)
                .answer("")     // 초기값
                .originId(originId)
                .build();
    }

    public static void updateSummaryAndKeywords(Chat existing, String summary, String keyword) {
        existing.summary = summary;
        existing.keyword = keyword;
    }

    public void updateAnswer(String answer) {
        this.answer = answer;
        this.answeredAt = LocalDateTime.now();
    }
}
