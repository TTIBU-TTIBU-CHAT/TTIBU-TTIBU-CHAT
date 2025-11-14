package io.ssafy.p.k13c103.coreapi.domain.key.service;

import io.ssafy.p.k13c103.coreapi.domain.key.dto.KeyRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.key.dto.KeyResponseDto;

import java.util.List;

public interface KeyService {
    KeyResponseDto.RegisteredKeyInfo register(Long memberUid, KeyRequestDto.RegisterKey request);
    KeyResponseDto.EditedKeyInfo edit(Long memberUid, KeyRequestDto.EditKey request);
    void delete(Long memberUid, Long keyUid);
    KeyResponseDto.KeyInfo getOne(Long memberUid, Long keyUid);
    List<KeyResponseDto.KeyListInfo> getKeys(Long memberUid);
    KeyResponseDto.TokenInfo getTokens(Long memberUid);
    String decrypt(String encryptedKey);
}
