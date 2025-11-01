package io.ssafy.p.k13c103.coreapi.chat.entity;

import io.ssafy.p.k13c103.coreapi.branch.entity.Branch;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Chat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long chatUid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

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

    /* 추후에 BaseTimeEntity 상속으로 변경하며 삭제할 것 */
    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
