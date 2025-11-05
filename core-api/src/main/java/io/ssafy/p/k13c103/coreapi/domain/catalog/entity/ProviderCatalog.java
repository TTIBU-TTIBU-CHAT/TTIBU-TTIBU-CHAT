package io.ssafy.p.k13c103.coreapi.domain.catalog.entity;

import io.ssafy.p.k13c103.coreapi.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderCatalog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "provider_uid")
    private Long providerUid;

    @Column(name = "code", nullable = false)
    private String code;

    @Builder.Default
    @Column(name="is_active")
    private Boolean isActive = true;
}
