package com.yyz.comp390.controller;

import com.yyz.comp390.entity.ApiResult;
import com.yyz.comp390.entity.User;
import com.yyz.comp390.entity.dto.LoginDTO;
import com.yyz.comp390.entity.vo.LoginVO;
import com.yyz.comp390.jwt.JwtProperties;
import com.yyz.comp390.jwt.JwtUtil;
import com.yyz.comp390.service.UserService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/user")
@Slf4j
public class UserController {

    @Resource
    private UserService userService;
    @Resource
    private JwtProperties jwtProperties;

    @PostMapping("/login")
    public ApiResult<LoginVO> login(@RequestBody LoginDTO loginDTO) {
        User user = userService.login(loginDTO);

        Map<String, Object> claims = new HashMap<>();
        claims.put("id", user.getId());
        claims.put("role", user.getRole());
        String token = JwtUtil.createJWT(
                jwtProperties.getSecretKey(),
                jwtProperties.getTtl(),
                claims
        );
        LoginVO loginVO = new LoginVO();
        loginVO.setToken(token);
        loginVO.setId(user.getId());
        loginVO.setUsername(user.getUsername());
        loginVO.setRole(user.getRole());
        return ApiResult.success(loginVO);
    }

}
