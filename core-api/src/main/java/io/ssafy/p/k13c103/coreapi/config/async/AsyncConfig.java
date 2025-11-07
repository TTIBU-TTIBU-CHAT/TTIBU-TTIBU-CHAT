package io.ssafy.p.k13c103.coreapi.config.async;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * AI 비동기 작업용 스레드풀
     * - ChatServiceImpl 등에서 @Async("aiTaskExecutor")로 사용
     * - 예: FastAPI 요청, 요약/키워드 분석 등
     */
    @Bean(name = "aiTaskExecutor")
    public Executor aiTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);    // 최소 스레드 수
        executor.setMaxPoolSize(20);    // 최대 스레드 수
        executor.setQueueCapacity(100); // 대기 큐 용량
        executor.setThreadNamePrefix("AI-Async-");
        executor.initialize();
        return executor;
    }
}
