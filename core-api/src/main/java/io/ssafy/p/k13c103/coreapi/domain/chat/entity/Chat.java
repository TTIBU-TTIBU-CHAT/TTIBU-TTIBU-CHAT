package io.ssafy.p.k13c103.coreapi.domain.chat.entity;

import io.ssafy.p.k13c103.coreapi.common.entity.BaseTimeEntity;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ModelCatalog;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatStatus;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatType;
import io.ssafy.p.k13c103.coreapi.domain.group.entity.Group;
import io.ssafy.p.k13c103.coreapi.domain.room.entity.Room;
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
    @Column(name = "chat_uid")
    private Long chatUid;

    // Room 삭제 시 연관된 Chat 삭제 (단, 그룹에 속하는 경우 제외)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_catalog_uid")
    private ModelCatalog modelCatalog;

    @Column(columnDefinition = "TEXT")
    private String question;

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String keywords;

    // 검색 인덱스(GIN) 적용
    @Column(name = "search_content", columnDefinition = "TEXT")
    private String searchContent;

    // N+1 방지용
    @Column(name = "model_catalog_uid", insertable = false, updatable = false)
    private Long modelCatalogUid;

    @Column(name = "origin_id")
    private Long originId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChatStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "is_chat", nullable = false)
    private ChatType chatType;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    /**
     * 새 질문 생성
     * - Room에 소속된 Chat을 생성
     * - 상태: Question
     */
    public static Chat create(Room room, String question, ModelCatalog modelCatalog) {
        return Chat.builder()
                .room(room)
                .modelCatalog(modelCatalog)
                .question(question)
                .status(ChatStatus.QUESTION)
                .chatType(ChatType.CHAT)
                .modelCatalogUid(modelCatalog.getModelUid())
                .build();
    }

    /**
     * 기존 Chat을 복사해서 Room에 연결
     * - 채팅/그룹 기반 복제 시 사용
     */
    public static Chat cloneFrom(Chat origin, Room newRoom) {
        Chat chat = Chat.builder()
                .room(newRoom)
                .group(origin.getGroup())
                .modelCatalog(origin.getModelCatalog())
                .question(origin.getQuestion())
                .answer(origin.getAnswer())
                .summary(origin.getSummary())
                .keywords(origin.getKeywords())
                .searchContent(origin.getSearchContent())
                .originId(origin.getChatUid())
                .status(origin.getStatus())
                .chatType(ChatType.CHAT)
                .modelCatalogUid(origin.getModelCatalogUid())
                .build();
        chat.createdAt = origin.createdAt;
        chat.answeredAt = origin.getAnsweredAt();
        chat.updatedAt = LocalDateTime.now();
        return chat;
    }

    public static Chat createGroupSnapshot(Room room, Group group) {
        return Chat.builder()
                .room(room)
                .group(group)
                .question("")
                .answer("")
                .summary(group.getSummary())
                .keywords(group.getKeywords())
                .chatType(ChatType.CHAT)
                .status(ChatStatus.SUMMARY_KEYWORDS)
                .build();
    }

    /**
     * 답변 업데이트
     * - LLM이 답변을 생성한 시점에 호출
     * - 상태: ANSWER
     * - answeredAt 기록
     */
    public void updateAnswer(String answer) {
        this.answer = answer;
        this.status = ChatStatus.ANSWER;
        this.answeredAt = LocalDateTime.now();
        updateSearchContent();
    }

    /**
     * 요약 및 키워드 업데이트
     * - 요약/키워드 LLM 결과 저장
     * - 상태: SUMMARY_KEYWORDS
     * - updatedAt 기록
     */
    public void updateSummaryAndKeywords(String summary, String keywords) {
        this.summary = summary;
        this.keywords = keywords;
        this.status = ChatStatus.SUMMARY_KEYWORDS;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateSearchContent() {
        this.searchContent = String.join(" ", this.question, this.answer);
    }

}
