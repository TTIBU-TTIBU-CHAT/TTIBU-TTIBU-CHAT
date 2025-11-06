package io.ssafy.p.k13c103.coreapi.domain.model.service;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ModelCatalog;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ProviderCatalog;
import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ModelCatalogRepository;
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
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ModelServiceImpl implements ModelService {

    private final ProviderCatalogRepository providerCatalogRepository;
    private final ModelCatalogRepository modelCatalogRepository;
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

        // 2. 사용자가 선택한 모델과 카탈로그
        List<Model> models = modelRepository.findAllByMember_MemberUid(memberUid); // 사용자가 선택한 모델 리스트
        Model defaultModel = modelRepository.findModelByMember_MemberUidAndIsDefaultTrue(memberUid); // 디폴트 모델

        // 3. 비교를 위한 ID 세트
        Set<Long> selectedCatalogIds = models.stream()
                .map(m -> m.getModelCatalog().getModelUid())
                .collect(Collectors.toSet());

        Long defaultId = (defaultModel == null) ? null : defaultModel.getModelCatalog().getModelUid();

        for (Key key : keys) {
            ProviderCatalog provider = key.getProvider();

            List<ModelCatalog> catalogs = modelCatalogRepository.findModelCatalogsByProvider(provider); // 제공사에서 제공하는 모델 카탈로그
            if (catalogs.isEmpty()) continue; // 제공할 모델이 없는 경우 continue

            List<ModelResponseDto.ModelInfoDetail> list = new ArrayList<>();
            for (ModelCatalog catalog : catalogs) {
                list.add(ModelResponseDto.ModelInfoDetail.builder()
                        .modelCatalogUid(catalog.getModelUid())
                        .modelName(catalog.getName())
                        .modelCode(catalog.getCode())
                        .isSelected(selectedCatalogIds.contains(catalog.getModelUid()))
                        .isDefault(defaultId != null && defaultId.equals(catalog.getModelUid()))
                        .build());
            }
            response.add(ModelResponseDto.ModelListInfo.builder()
                    .providerCode(provider.getCode())
                    .modelList(list)
                    .build());
        }
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ModelResponseDto.ProviderListInfo> getProviders() {
        List<ProviderCatalog> providers = providerCatalogRepository.findByIsActiveTrueOrderByCodeAsc();
        if (providers.isEmpty())
            return List.of();

        providers.sort(Comparator.comparing(ProviderCatalog::getProviderUid));

        List<ModelResponseDto.ProviderListInfo> response = new ArrayList<>();
        for (ProviderCatalog provider : providers)
            response.add(ModelResponseDto.ProviderListInfo
                    .builder()
                    .providerUid(provider.getProviderUid())
                    .providerCode(provider.getCode())
                    .build());

        return response;
    }
}