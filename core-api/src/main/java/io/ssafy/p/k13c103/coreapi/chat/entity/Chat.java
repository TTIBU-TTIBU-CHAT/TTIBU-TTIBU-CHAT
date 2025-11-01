package io.ssafy.p.k13c103.coreapi.chat.entity;

import io.ssafy.p.k13c103.coreapi.branch.entity.Branch;
import io.ssafy.p.k13c103.coreapi.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "chat")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Chat extends BaseTimeEntity {

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
}
