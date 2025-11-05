package io.ssafy.p.k13c103.coreapi.domain.model.service;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ProviderCatalog;
import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ProviderCatalogRepository;
import io.ssafy.p.k13c103.coreapi.domain.key.entity.Key;
import io.ssafy.p.k13c103.coreapi.domain.key.repository.KeyRepository;
import io.ssafy.p.k13c103.coreapi.domain.member.repository.MemberRepository;
import io.ssafy.p.k13c103.coreapi.domain.model.dto.ModelResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.model.entity.Model;
import io.ssafy.p.k13c103.coreapi.domain.model.repository.ModelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ModelServiceImpl implements ModelService {

    private final ProviderCatalogRepository providerCatalogRepository;
    private final ModelRepository modelRepository;
    private final MemberRepository memberRepository;
    private final KeyRepository keyRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ModelResponseDto.ModelListInfo> getModels(Long memberUid) {
        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        // 1. 활성화된 키 조회
        List<Key> keys = keyRepository.findKeysByMember_MemberUidAndIsActiveIsTrue(memberUid);
        if (keys.isEmpty()) return List.of(); // 고를 수 있는 모델이 없는 경우


        List<ModelResponseDto.ModelListInfo> response = new ArrayList<>();

        for (Key key : keys) {
            if (!catalogLoader.existsProvider(key.getProvider())) { // 키는 있는데 yaml에 제공사 등록을 하지 않은 경우
                response.add(ModelResponseDto.ModelListInfo.builder()
                        .provider(key.getProvider())
                        .modelList(List.of())
                        .build());
                continue;
            }

            List<LiteLlmCatalogLoader.ModelEntry> catalogs = catalogLoader.models(key.getProvider()); // 제공사에서 제공하는 전체 모델 카탈로그

            // 2. 코드 -> 모델 매핑
            List<String> codes = catalogs.stream().map(LiteLlmCatalogLoader.ModelEntry::code).toList();
            List<Model> models = modelRepository.findAllByMember_MemberUidAndProviderAndCodeIn(memberUid, key.getProvider(), codes);
            Map<String, Model> modelByCode = new HashMap<>();
            for (Model model : models) {
                modelByCode.put(model.getCode(), model);
            }

            // 3. DTO 구성
            List<ModelResponseDto.ModelInfoDetail> list = new ArrayList<>(catalogs.size());
            for (LiteLlmCatalogLoader.ModelEntry catalog : catalogs) {

                Model found = modelByCode.get(catalog.code());
                boolean isSelected = found != null;
                boolean isDefault = isSelected && Boolean.TRUE.equals(found.getIsDefault());

                list.add(ModelResponseDto.ModelInfoDetail.builder()
                        .provider(key.getProvider())
                        .name(catalog.name())
                        .code(catalog.code())
                        .isSelected(isSelected)
                        .isDefault(isDefault)
                        .build());
            }

            list.sort(Comparator.comparing(ModelResponseDto.ModelInfoDetail::name) // 정렬: 이름 -> 코드
                    .thenComparing(ModelResponseDto.ModelInfoDetail::code));

            response.add(ModelResponseDto.ModelListInfo.builder()
                    .provider(key.getProvider())
                    .modelList(list)
                    .build());
        }
        return response;
    }

    @Transactional(readOnly = true)
    public List<String> getProviders() {
        List<ProviderCatalog> providers = providerCatalogRepository.findByIsActiveTrueOrderByCodeAsc();
        if (providers.isEmpty())
            return List.of();

        List<String> response = new ArrayList<>();
        for (ProviderCatalog provider : providers)
            response.add(provider.getCode());

        return response;
    }
}