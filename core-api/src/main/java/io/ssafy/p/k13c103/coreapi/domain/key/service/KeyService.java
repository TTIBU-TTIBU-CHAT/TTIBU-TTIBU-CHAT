package io.ssafy.p.k13c103.coreapi.domain.key.service;

import io.ssafy.p.k13c103.coreapi.domain.key.dto.KeyRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.key.dto.KeyResponseDto;

public interface KeyService {
    KeyResponseDto.RegisteredKeyInfo register(Long memberUid, KeyRequestDto.RegisterKey request);
    KeyResponseDto.EditKeyInfo edit(Long memberUid, KeyRequestDto.EditKey request);
    void delete(Long memberUid, Long keyUid);
}
