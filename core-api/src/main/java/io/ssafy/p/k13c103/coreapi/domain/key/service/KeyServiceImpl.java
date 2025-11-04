package io.ssafy.p.k13c103.coreapi.domain.key.service;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.domain.key.entity.Key;
import io.ssafy.p.k13c103.coreapi.domain.key.repository.KeyRepository;
import io.ssafy.p.k13c103.coreapi.domain.key.dto.KeyRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.key.dto.KeyResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.llm.LiteLlmCatalogLoader;
import io.ssafy.p.k13c103.coreapi.domain.llm.LiteLlmClient;
import io.ssafy.p.k13c103.coreapi.domain.member.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class KeyServiceImpl implements KeyService {

    @Value("${ttibu.crypto.secret}")
    private String secret;
    private final SecureRandom secureRandom = new SecureRandom();

    private final LiteLlmClient liteLlmClient;
    private final LiteLlmCatalogLoader catalogLoader;

    private final MemberRepository memberRepository;
    private final KeyRepository keyRepository;

    @Override
    @Transactional
    public KeyResponseDto.RegisteredKeyInfo register(Long memberUid, KeyRequestDto.RegisterKey request) {

        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        if (!catalogLoader.existsProvider(request.provider()))
            throw new ApiException(ErrorCode.PROVIDER_NOT_FOUND);

        // 1. 제공사에 해당하는 모델이 있는지 확인
        List<String> models = catalogLoader.models(request.provider());
        if (models.isEmpty())
            throw new ApiException(ErrorCode.MODEL_CATALOG_EMPTY);

        // 2. 중복 키 체크
        if (keyRepository.existsByMember_MemberUidAndProvider(memberUid, request.provider()))
            throw new ApiException(ErrorCode.DUPLICATED_KEY);

        // 3. 1토큰 테스트
//        String testModel = request.provider() + "/" + models.get(0); // FIXME: 운영 환경에서 주석 해제
        String testModel = models.get(0); // FIXME: 운영 환경에서 주석 처리
        liteLlmClient.test(request.key(), testModel); // 문제 있다면 에러 발생

        // 4. 키 암호화 후 저장
        Key key = Key.builder()
                .member(memberRepository.getReferenceById(memberUid))
                .provider(request.provider())
                .encryptedKey(encryptKey(request.key()))
                .isActive(request.isActive())
                .expirationAt(request.expirationAt())
                .build();
        keyRepository.save(key);

        return KeyResponseDto.RegisteredKeyInfo.builder()
                .keyUid(key.getKeyUid())
                .build();
    }

    @Override
    @Transactional
    public KeyResponseDto.EditKeyInfo edit(Long memberUid, KeyRequestDto.EditKey request) {

        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        if (!catalogLoader.existsProvider(request.provider()))
            throw new ApiException(ErrorCode.PROVIDER_NOT_FOUND);

        Key key = keyRepository.findByKeyUid(request.keyUid())
                .orElseThrow(() -> new ApiException(ErrorCode.KEY_NOT_FOUND));

        if (!key.getProvider().equals(request.provider())
                && keyRepository.existsByMember_MemberUidAndProvider(memberUid, request.provider())) {
            throw new ApiException(ErrorCode.DUPLICATED_KEY);
        }

        if (!decryptKey(key.getEncryptedKey()).equals(request.key())) {

            List<String> models = catalogLoader.models(request.provider());
            if (models.isEmpty())
                throw new ApiException(ErrorCode.MODEL_CATALOG_EMPTY);

//        String testModel = request.provider() + "/" + models.get(0); // FIXME: 운영 환경에서 주석 해제
            String testModel = models.get(0); // FIXME: 운영 환경에서 주석 처리
            liteLlmClient.test(request.key(), testModel); // 문제 있다면 에러 발생
        }

        key.update(request.provider(), encryptKey(request.key()), request.isActive(), request.expirationAt());

        return KeyResponseDto.EditKeyInfo.builder()
                .keyUid(key.getKeyUid())
                .build();
    }

    @Override
    @Transactional
    public void delete(Long memberUid, Long keyUid) {

        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        Key key = keyRepository.findByKeyUid(keyUid)
                .orElseThrow(() -> new ApiException(ErrorCode.KEY_NOT_FOUND));

        keyRepository.delete(key);
    }

    private String encryptKey(String plainKey) {
        try {
            byte[] iv = new byte[12];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec(), new GCMParameterSpec(128, iv));
            byte[] ciphers = cipher.doFinal(plainKey.getBytes(StandardCharsets.UTF_8));

            ByteBuffer bb = ByteBuffer.allocate(iv.length + ciphers.length);
            bb.put(iv).put(ciphers);
            return Base64.getEncoder().encodeToString(bb.array());
        } catch (Exception e) {
            throw new ApiException(ErrorCode.KEY_CRYPTO_ERROR);
        }
    }

    private String decryptKey(String encodedKey) {
        try {
            byte[] all = Base64.getDecoder().decode(encodedKey);
            ByteBuffer bb = ByteBuffer.wrap(all);
            byte[] iv = new byte[12];
            bb.get(iv);
            byte[] ciphers = new byte[bb.remaining()];
            bb.get(ciphers);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, keySpec(), new GCMParameterSpec(128, iv));
            byte[] plain = cipher.doFinal(ciphers);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new ApiException(ErrorCode.KEY_CRYPTO_ERROR);
        }
    }

    private SecretKeySpec keySpec() {
        try {
            byte[] seed = secret.getBytes(StandardCharsets.UTF_8);
            byte[] k = MessageDigest.getInstance("SHA-256").digest(seed);
            return new SecretKeySpec(k, "AES");
        } catch (Exception e) {
            throw new ApiException(ErrorCode.KEY_CRYPTO_ERROR);
        }
    }
}