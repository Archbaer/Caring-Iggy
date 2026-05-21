package com.caringiggy.user.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new RateLimitInterceptor(5))
                .addPathPatterns("/api/auth/login");
        registry.addInterceptor(new RateLimitInterceptor(3))
                .addPathPatterns("/api/auth/signup");
    }
}
