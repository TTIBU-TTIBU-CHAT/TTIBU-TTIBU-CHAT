package io.ssafy.p.k13c103.coreapi.domain.model.service;

import io.ssafy.p.k13c103.coreapi.common.error.ApiException;
import io.ssafy.p.k13c103.coreapi.common.error.ErrorCode;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ModelCatalog;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ProviderCatalog;
import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ModelCatalogRepository;
import io.ssafy.p.k13c103.coreapi.domain.catalog.repository.ProviderCatalogRepository;
import io.ssafy.p.k13c103.coreapi.domain.key.entity.Key;
import io.ssafy.p.k13c103.coreapi.domain.key.repository.KeyRepository;
import io.ssafy.p.k13c103.coreapi.domain.member.entity.Member;
import io.ssafy.p.k13c103.coreapi.domain.member.repository.MemberRepository;
import io.ssafy.p.k13c103.coreapi.domain.model.dto.ModelRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.model.dto.ModelResponseDto;
import io.ssafy.p.k13c103.coreapi.domain.model.entity.Model;
import io.ssafy.p.k13c103.coreapi.domain.model.repository.ModelRepository;
import jakarta.persistence.EntityManager;
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
    private final EntityManager em;

    @Override
    @Transactional
    public void select(List<ModelRequestDto.SelectModel> request, Long memberUid) {
        if (!memberRepository.existsById(memberUid))
            throw new ApiException(ErrorCode.MEMBER_NOT_FOUND);

        // 1. 선택한 모델 카탈로그 로드
        Set<Long> targetSelectedIds = new HashSet<>();
        for (ModelRequestDto.SelectModel model : request) {
            if (model.isSelected())
                targetSelectedIds.add(model.modelCatalogUid());
        }

        // 2. 선택한 모델이 실제로 존재하는지 (사용 가능한지)
        List<ModelCatalog> catalogs;
        if (targetSelectedIds.isEmpty())
            catalogs = List.of();
        else {
            catalogs = modelCatalogRepository.findAllowedActiveCatalogsForMember(memberUid, new ArrayList<>(targetSelectedIds));
            if (catalogs.size() != targetSelectedIds.size())
                throw new ApiException(ErrorCode.INVALID_MODEL_PROVIDER);
        }

        Map<Long, ModelCatalog> catalogMap = new HashMap<>(); // 빠른 조회용
        for (ModelCatalog catalog : catalogs) {
            catalogMap.put(catalog.getModelUid(), catalog);
        }

        // 3. 현재 사용자 선택 목록 로드
        List<Model> current = modelRepository.findAllByMemberUidWithCatalog(memberUid);

        // 4. 현재 선택된 카탈로그 ID 집합 생성
        Set<Long> currentIds = new HashSet<>();
        for (Model model : current)
            currentIds.add(model.getModelCatalog().getModelUid());

        // 5. 차집합 -> 생성/삭제 결정
        Set<Long> toCreate = new LinkedHashSet<>(targetSelectedIds);
        toCreate.removeAll(currentIds);
        Set<Long> toDelete = new LinkedHashSet<>(currentIds);
        toDelete.removeAll(targetSelectedIds);

        // 6. 삭제
        if (!toDelete.isEmpty())
            modelRepository.deleteByMemberUidAndCatalogIds(memberUid, toDelete);

        // 7. 생성
        if (!toCreate.isEmpty()) {
            Member memberRef = em.getReference(Member.class, memberUid);
            ArrayList<Model> creates = new ArrayList<>(toCreate.size());
            for (Long id : toCreate) {
                ModelCatalog catalog = catalogMap.get(id);
                creates.add(Model.builder()
                        .member(memberRef)
                        .modelCatalog(catalog)
                        .isDefault(false)
                        .build());
            }
            modelRepository.saveAll(creates);
        }

        // 8. 변경하지 않는 행은 그대로 유지
    }

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

            List<ModelResponseDto.ModelDetailInfo> list = new ArrayList<>();
            for (ModelCatalog catalog : catalogs) {
                list.add(ModelResponseDto.ModelDetailInfo.builder()
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