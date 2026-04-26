package com.yyz.comp390.jwt;

import com.yyz.comp390.context.BaseContext;
import io.jsonwebtoken.Claims;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Component
@Slf4j
public class JwtInterceptor implements HandlerInterceptor {

    @Resource
    private JwtProperties jwtProperties;

    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }

        String token = request.getHeader(jwtProperties.getTokenName());
        if (token == null || token.isBlank()) {
            response.setStatus(401);
            return false;
        }

        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        try {
            Claims claims = JwtUtil.parseJWT(jwtProperties.getSecretKey(), token);
            Long userId = Long.valueOf(claims.get("id").toString());
            String role = String.valueOf(claims.get("role"));

            if (!isAuthorized(request.getRequestURI(), role)) {
                response.setStatus(403);
                return false;
            }

            BaseContext.setCurrentId(userId);
            BaseContext.setCurrentRole(role);
            return true;
        } catch (Exception ex) {
            response.setStatus(401);
            return false;
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        BaseContext.removeCurrentId();
        BaseContext.removeCurrentRole();
    }

    private boolean isAuthorized(String uri, String role) {
        if (uri.startsWith("/admin/")) {
            return "ADMIN".equals(role);
        }
        if (uri.startsWith("/file/")) {
            return hasAnyRole(role, "ADMIN", "CURATOR", "USER");
        }
        if (uri.startsWith("/algorithm/")) {
            if (uri.endsWith("/getAlgorithms") || uri.contains("/getAlgorithm/")) {
                return hasAnyRole(role, "ADMIN", "CURATOR", "USER");
            }
            return hasAnyRole(role, "ADMIN", "CURATOR");
        }
        if (uri.startsWith("/query/")) {
            return hasAnyRole(role, "ADMIN", "CURATOR", "USER");
        }
        if (uri.startsWith("/curator/")) {
            return "CURATOR".equals(role);
        }
        if (uri.startsWith("/user/")) {
            return "USER".equals(role);
        }
        return true;
    }

    private boolean hasAnyRole(String role, String... allowed) {
        Set<String> allowedRoles = new HashSet<>(Arrays.asList(allowed));
        return allowedRoles.contains(role);
    }
}
