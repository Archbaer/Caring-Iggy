package com.caringiggy.user.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${rate-limit.login-per-minute:5}")
    private int loginPerMinute;

    @Value("${rate-limit.signup-per-minute:3}")
    private int signupPerMinute;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new RateLimitInterceptor(loginPerMinute))
                .addPathPatterns("/api/auth/login");
        registry.addInterceptor(new RateLimitInterceptor(signupPerMinute))
                .addPathPatterns("/api/auth/signup");
    }
}
