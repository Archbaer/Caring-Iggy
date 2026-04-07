package com.caringiggy.user.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "auth.session")
public record AuthProperties(Duration ttl, boolean cookieSecure) {
}
