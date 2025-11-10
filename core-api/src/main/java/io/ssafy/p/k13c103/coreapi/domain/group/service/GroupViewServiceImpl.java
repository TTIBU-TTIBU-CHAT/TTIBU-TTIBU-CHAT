package io.ssafy.p.k13c103.coreapi.domain.group.service;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.domain.group.entity.GroupView;
import io.ssafy.p.k13c103.coreapi.domain.group.repository.GroupViewRepository;
import io.ssafy.p.k13c103.coreapi.domain.member.entity.Member;
import io.ssafy.p.k13c103.coreapi.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupViewServiceImpl implements GroupViewService {

    private final MemberRepository memberRepository;
    private final GroupViewRepository groupViewRepository;

    @Override
    @Transactional
    public void updateGroupView(Long memberId, String contentJson) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ApiException(ErrorCode.MEMBER_NOT_FOUND));

        GroupView groupView = groupViewRepository.findByMember(member)
                .map(existing -> {
                    existing.updateContent(contentJson);
                    return existing;
                })
                .orElseGet(() -> GroupView.create(member, contentJson));

        groupViewRepository.save(groupView);

        log.info("[GROUP_VIEW] 그룹 뷰 JSON 저장 완료 → memberId={}, length={}", memberId, contentJson.length());
    }
}
