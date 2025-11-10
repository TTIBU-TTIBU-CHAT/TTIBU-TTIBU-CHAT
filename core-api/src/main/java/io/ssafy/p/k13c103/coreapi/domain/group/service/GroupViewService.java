package io.ssafy.p.k13c103.coreapi.domain.group.service;

public interface GroupViewService {

    void updateGroupView(Long memberId, String contentJson);

    String getGroupView(Long memberId);
}
