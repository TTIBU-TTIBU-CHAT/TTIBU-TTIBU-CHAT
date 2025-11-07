package io.ssafy.p.k13c103.coreapi.domain.group.entity;

import io.ssafy.p.k13c103.coreapi.common.entity.BaseTimeEntity;
import io.ssafy.p.k13c103.coreapi.domain.member.Member;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "group")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Group extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "group_uid")
    private Long groupUid;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private Member owner;

    @Column(nullable = false)
    private String name;

    @Column
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String keywords;

    public static Group create(Member owner, String name) {
        return Group.builder()
                .owner(owner)
                .name(name)
                .build();
    }

    /**
     * 이름 변경
     */
    public void updateName(String newName) {
        if (newName != null && !newName.isBlank()) {
            this.name = newName;
        }
    }

    /**
     * 요약 + 키워드 변경
     */
    public void updateSummaryAndKeywords(String summary, String keywords) {
        this.summary = summary;
        this.keywords = keywords;
    }
}
