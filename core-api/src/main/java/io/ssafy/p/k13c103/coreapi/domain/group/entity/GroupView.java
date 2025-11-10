package io.ssafy.p.k13c103.coreapi.domain.group.entity;

import io.ssafy.p.k13c103.coreapi.common.entity.BaseTimeEntity;
import io.ssafy.p.k13c103.coreapi.domain.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "group_view")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class GroupView extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "group_view_uid")
    private Long groupViewUid;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(columnDefinition = "TEXT")
    private String content;

    public static GroupView create(Member member, String content) {
        return GroupView.builder()
                .member(member)
                .content(content)
                .build();
    }

    public void updateContent(String newContent) {
        this.content = newContent;
    }
}
