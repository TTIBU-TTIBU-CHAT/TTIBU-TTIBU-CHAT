package io.ssafy.p.k13c103.coreapi.domain.room.entity;

import io.ssafy.p.k13c103.coreapi.common.entity.BaseTimeEntity;
import io.ssafy.p.k13c103.coreapi.domain.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "room")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Room extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_uid")
    private Long roomUid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private Member owner;

    @Column(nullable = false)
    private String name;

    @Column(name = "branch_view", columnDefinition = "TEXT", nullable = false)
    private String branchView;

    @Column(name = "chat_info", columnDefinition = "TEXT", nullable = false)
    private String chatInfo;

    /**
     * 새 채팅방 생성
     */
    public static Room create(Member owner, String name) {
        return Room.builder()
                .owner(owner)
                .name(name != null ? name : "새 대화방")
                .branchView("{}")
                .chatInfo("{}")
                .build();
    }

    /**
     * 채팅방 이름 수정
     */
    public void updateName(String name) {
        if (name != null && !name.isBlank()) {
            this.name = name;
        }
    }

    /**
     * 브랜치 뷰 / 채팅 정보 갱신
     */
    public void updateViews(String branchView, String chatInfo) {
        this.branchView = branchView;
        this.chatInfo = chatInfo;
    }
}
