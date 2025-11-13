package io.ssafy.p.k13c103.coreapi.domain.group.service;

import io.ssafy.p.k13c103.coreapi.domain.group.dto.*;

import java.util.List;

public interface GroupService {

    GroupResponseDto createGroup(Long memberId, GroupCreateRequestDto request);

    GroupResponseDto updateGroup(Long groupId, GroupUpdateRequestDto request);

    GroupRenameResponseDto updateGroupName(Long groupId, GroupRenameRequestDto request);

    void deleteGroup(Long memberId, Long groupId);

    List<GroupListResponseDto> getGroups(Long memberId);

    GroupDetailResponseDto getGroupDetail(Long memberId, Long groupId);

    GroupAttachResponseDto attachGroup(Long roomId, Long memberId, GroupAttachRequestDto request);
}
