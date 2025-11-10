package io.ssafy.p.k13c103.coreapi.domain.group.service;

import io.ssafy.p.k13c103.coreapi.domain.group.dto.*;

public interface GroupService {

    GroupResponseDto createGroup(Long memberId, GroupCreateRequestDto request);

    GroupResponseDto updateGroup(Long groupId, GroupUpdateRequestDto request);

    GroupRenameResponseDto updateGroupName(Long groupId, GroupRenameRequestDto request);

}
