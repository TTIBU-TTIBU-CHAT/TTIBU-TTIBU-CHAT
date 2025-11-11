package io.ssafy.p.k13c103.coreapi.domain.group.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatType;
import io.ssafy.p.k13c103.coreapi.domain.chat.repository.ChatRepository;
import io.ssafy.p.k13c103.coreapi.domain.group.dto.*;
import io.ssafy.p.k13c103.coreapi.domain.group.entity.Group;
import io.ssafy.p.k13c103.coreapi.domain.group.repository.GroupRepository;
import io.ssafy.p.k13c103.coreapi.domain.member.entity.Member;
import io.ssafy.p.k13c103.coreapi.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupServiceImpl implements GroupService {

    private final MemberRepository memberRepository;
    private final ChatRepository chatRepository;
    private final GroupRepository groupRepository;
    private final GroupSummaryService groupSummaryService;

    @Override
    @Transactional
    public GroupResponseDto createGroup(Long memberId, GroupCreateRequestDto request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(ErrorCode.MEMBER_NOT_FOUND));

        List<Chat> originChats = chatRepository.findAllById(request.getNodes());
        if (originChats.isEmpty()) {
            throw new ApiException(ErrorCode.GROUP_NOT_FOUND);
        }

        Group group = Group.create(member, request.getName());
        groupRepository.save(group);

        List<Chat> copiedChats;
        copiedChats = originChats.stream()
                .map(origin -> {
                    Chat copy = Chat.builder()
                            .modelCatalog(origin.getModelCatalog())
                            .question(origin.getQuestion())
                            .answer(origin.getAnswer())
                            .summary(origin.getSummary())
                            .keywords(origin.getKeywords())
                            .originId(origin.getChatUid())
                            .status(origin.getStatus())
                            .chatType(ChatType.GROUP)
                            .group(group)
                            .answeredAt(origin.getAnsweredAt())
                            .build();

                    copy.setTimestamps(origin.getCreatedAt(), origin.getUpdatedAt());
                    return chatRepository.save(copy);
                })
                .toList();

        log.info("[GROUP] 그룹 생성 완료 → groupId={}, name={}, chats={}", group.getGroupUid(), group.getName(), copiedChats.size());

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                groupSummaryService.generateSummaryAsync(group.getGroupUid());
            }
        });

        return GroupResponseDto.builder()
                .groupId(group.getGroupUid())
                .name(group.getName())
                .originNodes(originChats.stream().map(Chat::getChatUid).toList())
                .copiedNodes(copiedChats.stream().map(Chat::getChatUid).toList())
                .createdAt(group.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public GroupResponseDto updateGroup(Long groupId, GroupUpdateRequestDto request) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ApiException(ErrorCode.GROUP_NOT_FOUND));

        if (request.getName() != null && !request.getName().isBlank()) {
            group.updateName(request.getName());
        }

        if (request.getNodes() != null && !request.getNodes().isEmpty()) {
            chatRepository.deleteAllGroupCopies(groupId);

            List<Chat> originChats = chatRepository.findAllById(request.getNodes());
            List<Chat> copiedChats = originChats.stream()
                    .map(origin -> {
                        Chat copy = Chat.builder()
                                .modelCatalog(origin.getModelCatalog())
                                .question(origin.getQuestion())
                                .answer(origin.getAnswer())
                                .summary(origin.getSummary())
                                .keywords(origin.getKeywords())
                                .originId(origin.getChatUid())
                                .status(origin.getStatus())
                                .chatType(ChatType.GROUP)
                                .group(group)
                                .answeredAt(origin.getAnsweredAt())
                                .build();

                        copy.setTimestamps(origin.getCreatedAt(), origin.getUpdatedAt());
                        return chatRepository.save(copy);
                    })
                    .toList();

            log.info("[GROUP_UPDATE] 그룹 채팅 복제 완료 → {}개", copiedChats.size());
        }

        if (Boolean.TRUE.equals(request.getSummaryRegen())) {
            log.info("[GROUP_UPDATE] 그룹 요약 재생성 요청 → groupId={}", groupId);
            groupSummaryService.generateSummaryAsync(groupId);
        }

        groupRepository.save(group);

        List<Long> originIds = request.getNodes() != null ? request.getNodes() : List.of();
        List<Long> copiedIds = chatRepository
                .findAllByGroup_GroupUidAndChatType(groupId, ChatType.GROUP)
                .stream()
                .map(Chat::getChatUid)
                .toList();

        return GroupResponseDto.builder()
                .groupId(group.getGroupUid())
                .name(group.getName())
                .originNodes(originIds)
                .copiedNodes(copiedIds)
                .createdAt(group.getUpdatedAt())
                .build();
    }

    @Override
    @Transactional
    public GroupRenameResponseDto updateGroupName(Long groupId, GroupRenameRequestDto request) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ApiException(ErrorCode.GROUP_NOT_FOUND));

        group.updateName(request.getName());
        groupRepository.save(group);

        log.info("[GROUP_NAME_UPDATE] 그룹 이름 변경 완료 → groupId={}, newName={}", groupId, request.getName());

        return GroupRenameResponseDto.builder()
                .groupId(group.getGroupUid())
                .name(group.getName())
                .updatedAt(group.getUpdatedAt())
                .build();
    }

    @Override
    @Transactional
    public void deleteGroup(Long memberId, Long groupId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ApiException(ErrorCode.GROUP_NOT_FOUND));

        if (!group.getOwner().getMemberUid().equals(memberId)) {
            log.warn("[GROUP_DELETE] 권한 없는 사용자 요청 → memberId={}, groupId={}", memberId, groupId);
            throw new ApiException(ErrorCode.GROUP_FORBIDDEN);
        }

        int deletedCount = chatRepository.deleteAllGroupCopies(groupId);
        log.info("[GROUP_DELETE] 복제 채팅 {}개 삭제 완료 → groupId={}", deletedCount, groupId);

        groupRepository.delete(group);
        log.info("[GROUP_DELETE] 그룹 삭제 완료 → groupId={}", groupId);
    }

    @Override
    public List<GroupListResponseDto> getGroups(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(ErrorCode.MEMBER_NOT_FOUND));

        List<Group> groups = groupRepository.findAllByOwnerOrderByUpdatedAtDesc(member);

        return groups.stream()
                .map(group -> GroupListResponseDto.builder()
                        .groupId(group.getGroupUid())
                        .name(group.getName())
                        .summary(group.getSummary())
                        .keyword(parseKeywords(group.getKeywords()))
                        .updatedAt(group.getUpdatedAt())
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public GroupDetailResponseDto getGroupDetail(Long memberId, Long groupId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ApiException(ErrorCode.GROUP_NOT_FOUND));

        if (!group.getOwner().getMemberUid().equals(memberId)) {
            throw new ApiException(ErrorCode.GROUP_FORBIDDEN);
        }

        List<Chat> copiedChats = chatRepository.findAllByGroup_GroupUidAndChatType(groupId, ChatType.GROUP);

        return GroupDetailResponseDto.builder()
                .groupId(group.getGroupUid())
                .name(group.getName())
                .originNodes(copiedChats.stream().map(Chat::getOriginId).toList())
                .copiedNodes(copiedChats.stream().map(Chat::getChatUid).toList())
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .originNodeDetails(copiedChats.stream()
                        .map(chat -> NodeDetail.builder()
                                .nodeId(chat.getOriginId())
                                .question(chat.getQuestion())
                                .answer(chat.getAnswer())
                                .summary(chat.getSummary())
                                .keywords(parseKeywords(chat.getKeywords()))
                                .build())
                        .toList()
                )
                .build();
    }

    private List<String> parseKeywords(String keywordsJson) {
        if (keywordsJson == null || keywordsJson.isBlank()) return List.of();
        try {
            return new ObjectMapper().readValue(keywordsJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("[GROUP_LIST] 키워드 파싱 실패: {}", keywordsJson);
            return List.of();
        }
    }
}
