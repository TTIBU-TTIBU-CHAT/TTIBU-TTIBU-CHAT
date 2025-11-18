package io.ssafy.p.k13c103.coreapi.domain.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Getter
@Service
@NoArgsConstructor
@AllArgsConstructor
public class CachedPageDto { // Redis 저장용
    private List<ChatResponseDto.SearchedResultInfo> content;
    private long total;
}


