package com.yyz.comp390.service.impl;

import com.yyz.comp390.entity.User;
import com.yyz.comp390.entity.dto.LoginDTO;
import com.yyz.comp390.exception.LoginFailedException;
import com.yyz.comp390.mapper.UserMapper;
import com.yyz.comp390.service.UserService;
import jakarta.annotation.Resource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

@Service
public class UserServiceImpl implements UserService {

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    @Resource
    private UserMapper userMapper;

    @Override
    public User login(LoginDTO loginDTO) {

        String username = loginDTO.getUsername();
        String password = loginDTO.getPassword();

        User user = userMapper.getByUserName(username);

        if(user==null){
            throw new LoginFailedException("User not found! Please check username and password!");
        }
        String encoded = user.getPassword();
        boolean authenticated = PASSWORD_ENCODER.matches(password, encoded);
        if (!authenticated) {
            String md5 = DigestUtils.md5DigestAsHex(password.getBytes());
            if (md5.equals(encoded)) {
                String upgraded = PASSWORD_ENCODER.encode(password);
                userMapper.updatePasswordById(user.getId(), upgraded);
                authenticated = true;
            }
        }

        if(!authenticated) {
            throw new LoginFailedException("Username or password is incorrect!");
        }
        return user;
    }
}
