package com.caringiggy.reporting.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class RuntimeConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withInitializer(new ConfigDataApplicationContextInitializer())
            .withPropertyValues(
                    "LOGGING_LEVEL_COM_CARINGIGGY=INFO",
                    "MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE=health,info");

    @Test
    void acceptsProductionRuntimeOverrides() {
        contextRunner.run(context -> {
            assertThat(context.getEnvironment().getProperty("logging.level.com.caringiggy"))
                    .isEqualTo("INFO");
            assertThat(context.getEnvironment().getProperty("management.endpoints.web.exposure.include"))
                    .isEqualTo("health,info");
        });
    }
}
