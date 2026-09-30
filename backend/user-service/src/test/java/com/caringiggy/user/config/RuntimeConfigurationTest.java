package com.caringiggy.user.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class RuntimeConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withInitializer(new ConfigDataApplicationContextInitializer())
            .withPropertyValues(
                    "DB_SSLMODE=require",
                    "DB_POOL_MAX=5",
                    "DB_POOL_MIN_IDLE=1",
                    "LOGGING_LEVEL_COM_CARINGIGGY=INFO",
                    "LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_JDBC=INFO",
                    "MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE=health,info");

    @Test
    void acceptsProductionRuntimeOverrides() {
        contextRunner.run(context -> {
            assertThat(context.getEnvironment().getProperty("spring.datasource.url"))
                    .endsWith("?sslmode=require");
            assertThat(context.getEnvironment().getProperty("spring.datasource.hikari.maximum-pool-size"))
                    .isEqualTo("5");
            assertThat(context.getEnvironment().getProperty("spring.datasource.hikari.minimum-idle"))
                    .isEqualTo("1");
            assertThat(context.getEnvironment().getProperty("logging.level.com.caringiggy"))
                    .isEqualTo("INFO");
            assertThat(context.getEnvironment().getProperty("logging.level.org.springframework.jdbc"))
                    .isEqualTo("INFO");
            assertThat(context.getEnvironment().getProperty("management.endpoints.web.exposure.include"))
                    .isEqualTo("health,info");
        });
    }
}
