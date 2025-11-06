package io.ssafy.p.k13c103.coreapi.domain.key.entity;

import io.ssafy.p.k13c103.coreapi.common.entity.BaseTimeEntity;
import io.ssafy.p.k13c103.coreapi.domain.catalog.entity.ProviderCatalog;
import io.ssafy.p.k13c103.coreapi.domain.member.entity.Member;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Key extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "key_uid")
    private Long keyUid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_uid", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_catalog_uid", nullable = false)
    private ProviderCatalog provider;

    @Column(name = "encrypted_key", nullable = false, columnDefinition = "TEXT")
    private String encryptedKey;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "token_usage", nullable = false)
    private Integer tokenUsage = 0;

    @Column(name = "expiration_at", nullable = false)
    private LocalDate expirationAt;

    public void update(ProviderCatalog provider, String encryptedKey, Boolean isActive, LocalDate expirationAt) {
        if (provider != null) this.provider = provider;
        if (encryptedKey != null) this.encryptedKey = encryptedKey;
        if (isActive != null) this.isActive = isActive;
        if (expirationAt != null) this.expirationAt = expirationAt;
    }
}