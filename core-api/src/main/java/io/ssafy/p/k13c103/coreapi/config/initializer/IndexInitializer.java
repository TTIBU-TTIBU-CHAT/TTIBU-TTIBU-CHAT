package io.ssafy.p.k13c103.coreapi.config.initializer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(Ordered.LOWEST_PRECEDENCE)
public class IndexInitializer implements ApplicationRunner {

    private final DataSource dataSource;

    @Value("${app.index-initializer.enabled:true}")
    private boolean enabled;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!enabled) {
            log.info("[IndexInitializer] Index initializer is disabled...SKIP");
            return;
        }

        try (Connection connection = dataSource.getConnection(); Statement st = connection.createStatement()) {
            try {
                connection.setAutoCommit(true);
            } catch (Exception e) {
                // ignore
            }

            // 검색 인덱스 (GIN)
            exec(st, "CREATE INDEX IF NOT EXISTS idx_chat_search_bigm " +
                    "ON chat USING gin (search_content gin_bigm_ops)");

            // 필터 + 정렬 인덱스
            exec(st, "CREATE INDEX IF NOT EXISTS idx_chat_room_status_type_created " +
                    "ON chat (room_id, status, is_chat, created_at DESC)");

            // 소유자 필터링 인덱스
            exec(st, "CREATE INDEX IF NOT EXISTS idx_room_owner " +
                    "ON room (owner_id)");

            log.info("[IndexInitializer] Completed");
        }
    }

    private void exec(Statement st, String sql) {
        try {
            st.execute(sql);
            log.info("[IndexInitializer] SQL EXECUTE...OK : {} ", sql);
        } catch (Exception e) {
            log.error("[IndexInitializer] SQL EXECUTE...ERROR : {} ", sql, e);
        }
    }

}
