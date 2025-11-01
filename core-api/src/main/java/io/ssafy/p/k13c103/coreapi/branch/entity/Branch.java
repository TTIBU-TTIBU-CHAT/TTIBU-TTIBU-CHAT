package io.ssafy.p.k13c103.coreapi.branch.entity;

import io.ssafy.p.k13c103.coreapi.chat.entity.Chat;
import io.ssafy.p.k13c103.coreapi.common.entity.BaseTimeEntity;
import io.ssafy.p.k13c103.coreapi.room.entity.Room;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "branch")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Branch extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long branchUid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(nullable = false)
    private String name;

    @OneToMany(mappedBy = "branch", cascade = CascadeType.ALL)
    private List<Chat> chats = new ArrayList<>();
}
