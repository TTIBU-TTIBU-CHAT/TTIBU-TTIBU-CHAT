package io.ssafy.p.k13c103.coreapi.domain.group.service;

import io.ssafy.p.k13c103.coreapi.domain.group.dto.GroupCreateRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.group.dto.GroupResponseDto;

public interface GroupService {

    GroupResponseDto createGroup(Long memberId, GroupCreateRequestDto request);

}
