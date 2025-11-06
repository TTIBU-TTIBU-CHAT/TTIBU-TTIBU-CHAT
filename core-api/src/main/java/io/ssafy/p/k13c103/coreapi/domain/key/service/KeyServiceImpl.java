package io.ssafy.p.k13c103.coreapi.domain.key.service;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.domain.catalog.dto.CatalogModelEntry;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ProviderCatalog;
import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ModelCatalogRepository;
import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ProviderCatalogRepository;
import io.ssafy.p.k13c103.coreapi.domain.key.entity.Key;
import io.ssafy.p.k13c103.coreapi.domain.key.repository.KeyRepository;
import io.ssafy.p.k13c103.coreapi.domain.key.dto.KeyRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.key.dto.KeyResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.llm.LiteLlmClient;
import io.ssafy.p.k13c103.coreapi.domain.member.repository.MemberRepository;
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

    private final ProviderCatalogRepository providerCatalogRepository;
    private final ModelCatalogRepository modelCatalogRepository;
    private final MemberRepository memberRepository;
    private final KeyRepository keyRepository;

    @Override
    @Transactional
    public KeyResponseDto.RegisteredKeyInfo register(Long memberUid, KeyRequestDto.RegisterKey request) {

        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        // 1. 제공사에 해당하는 모델이 있는지 확인
        ProviderCatalog provider = providerCatalogRepository.findById(request.providerUid())
                .orElseThrow(() -> new ApiException(ErrorCode.PROVIDER_NOT_FOUND));

        List<CatalogModelEntry> models = modelCatalogRepository.findEntriesByProviderCode(provider.getCode());
        if (models.isEmpty())
            throw new ApiException(ErrorCode.MODEL_CATALOG_EMPTY);

        // 2. 중복 키 체크
        if (keyRepository.existsByMember_MemberUidAndProvider_ProviderUid(memberUid, request.providerUid()))
            throw new ApiException(ErrorCode.DUPLICATED_KEY);

        // 3. 1토큰 테스트
        // FIXME: 운영 환경에서 주석 해제
//        String testModel = provider.getCode() + "/" + models.get(0).code();
//        liteLlmClient.test(reques t.key(), testModel); // 문제 있다면 에러 발생

        // FIXME: 운영 환경에서 주석 처리
        String testModel = models.get(0).code();
        liteLlmClient.gmsTest(request.key(), testModel, provider.getCode());

        // 4. 키 암호화 후 저장
        Key key = Key.builder()
                .member(memberRepository.getReferenceById(memberUid))
                .provider(provider)
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

        ProviderCatalog provider = providerCatalogRepository.findById(request.providerUid())
                .orElseThrow(() -> new ApiException(ErrorCode.PROVIDER_NOT_FOUND));

        Key key = keyRepository.findByKeyUidAndMember_MemberUid(request.keyUid(), memberUid)
                .orElseThrow(() -> new ApiException(ErrorCode.KEY_NOT_FOUND));

        if (keyRepository.existsByMember_MemberUidAndProvider_ProviderUid(memberUid, provider.getProviderUid()))
            throw new ApiException(ErrorCode.DUPLICATED_KEY);

        if (!decryptKey(key.getEncryptedKey()).equals(request.key())) { // 키가 변경된 경우

            List<CatalogModelEntry> models = modelCatalogRepository.findEntriesByProviderCode(provider.getCode());
            if (models.isEmpty())
                throw new ApiException(ErrorCode.MODEL_CATALOG_EMPTY);

            // FIXME: 운영 환경에서 주석 해제
//        String testModel = provider.getCode() + "/" + models.get(0).code();
//        liteLlmClient.test(reques t.key(), testModel); // 문제 있다면 에러 발생

            // FIXME: 운영 환경에서 주석 처리
            String testModel = models.get(0).code();
            liteLlmClient.gmsTest(request.key(), testModel, provider.getCode());
        }

        key.update(provider, encryptKey(request.key()), request.isActive(), request.expirationAt());

        return KeyResponseDto.EditKeyInfo.builder()
                .keyUid(key.getKeyUid())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public KeyResponseDto.GetKeyInfo getOne(Long memberUid, Long keyUid) {
        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        Key key = keyRepository.findByKeyUidAndMember_MemberUid(keyUid, memberUid)
                .orElseThrow(() -> new ApiException(ErrorCode.KEY_NOT_FOUND));

        return KeyResponseDto.GetKeyInfo.builder()
                .keyUid(key.getKeyUid())
                .providerCode(key.getProvider().getCode())
                .key(decryptKey(key.getEncryptedKey()))
                .isActive(key.getIsActive())
                .expirationAt(key.getExpirationAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<KeyResponseDto.GetKeyShortInfo> getKeys(Long memberUid) {
        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        List<Key> keys = keyRepository.findKeysByMember_MemberUid(memberUid);
        if (keys.isEmpty())
            return List.of();

        List<KeyResponseDto.GetKeyShortInfo> response = new ArrayList<>();

        for (Key key : keys) {
            response.add(KeyResponseDto.GetKeyShortInfo.builder()
                    .keyUid(key.getKeyUid())
                    .providerCode(key.getProvider().getCode())
                    .isActive(key.getIsActive())
                    .build());
        }
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public KeyResponseDto.TokenInfo getTokens(Long memberUid) {
        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        List<Key> keys = keyRepository.findKeysByMember_MemberUid(memberUid);
        if (keys.isEmpty()) {
            return KeyResponseDto.TokenInfo.builder()
                    .totalToken(0)
                    .tokenList(List.of())
                    .build();
        }

        List<KeyResponseDto.TokenDetailInfo> response = new ArrayList<>();
        int sum = 0;
        for (Key key : keys) {
            response.add(KeyResponseDto.TokenDetailInfo.builder()
                    .providerCode(key.getProvider().getCode())
                    .token(key.getTokenUsage())
                    .build());
            sum += key.getTokenUsage();
        }

        return KeyResponseDto.TokenInfo.builder()
                .totalToken(sum)
                .tokenList(response)
                .build();
    }

    @Override
    @Transactional
    public void delete(Long memberUid, Long keyUid) {

        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        Key key = keyRepository.findByKeyUidAndMember_MemberUid(keyUid, memberUid)
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