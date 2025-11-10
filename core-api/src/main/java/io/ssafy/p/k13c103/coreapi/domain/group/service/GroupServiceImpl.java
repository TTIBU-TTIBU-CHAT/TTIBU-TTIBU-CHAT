package io.ssafy.p.k13c103.coreapi.domain.group.service;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.domain.chat.entity.Chat;
import io.ssafy.p.k13c103.coreapi.domain.chat.enums.ChatType;
import io.ssafy.p.k13c103.coreapi.domain.chat.repository.ChatRepository;
import io.ssafy.p.k13c103.coreapi.domain.group.dto.GroupCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.group.dto.GroupResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.group.entity.Group;
import io.ssafy.p.k13c103.coreapi.domain.group.repository.GroupRepository;
import io.ssafy.p.k13c103.coreapi.domain.member.entity.Member;
import io.ssafy.p.k13c103.coreapi.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
                .map(origin -> Chat.builder()
                        .modelCatalog(origin.getModelCatalog())
                        .question(origin.getQuestion())
                        .answer(origin.getAnswer())
                        .summary(origin.getSummary())
                        .keywords(origin.getKeywords())
                        .originId(origin.getChatUid())
                        .status(origin.getStatus())
                        .chatType(ChatType.GROUP)
                        .answeredAt(origin.getAnsweredAt())
                        .build())
                .map(chatRepository::save)
                .toList();

        GroupResponseDto response = GroupResponseDto.builder()
                .groupId(group.getGroupUid())
                .name(group.getName())
                .originNodes(originChats.stream().map(Chat::getChatUid).toList())
                .copiedNodes(copiedChats.stream().map(Chat::getChatUid).toList())
                .createdAt(group.getCreatedAt())
                .build();

        log.info("[GROUP] 그룹 생성 완료 → groupId={}, name={}, chats={}", group.getGroupUid(), group.getName(), copiedChats.size());

        groupSummaryService.generateSummaryAsync(group.getGroupUid());

        return response;
    }
}
