package io.ssafy.p.k13c103.coreapi.domain.model.service;

import io.ssafy.p.k13c103.coreapi.domain.model.dto.ModelRequestDto;
import io.ssafy.p.k13c103.coreapi.domain.model.dto.ModelResponseDto;

import java.util.List;

public interface ModelService {

    void select(List<ModelRequestDto.SelectModel> request, Long memberUid);

    void setDefault(Long memberUid, Long modelUid);

    List<ModelResponseDto.ModelOptionList> getOptions(Long memberUid);

    List<ModelResponseDto.ModelListInfo> getModels(Long memberUid);

    List<ModelResponseDto.ProviderListInfo> getProviders();
}
