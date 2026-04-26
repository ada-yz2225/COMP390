package com.yyz.comp390.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yyz.comp390.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    @Select("select * from user where username = #{username} and del_flag = 'NOT_DELETE'")
    User getByUserName(String username);

    @Update("update user set password = #{password} where id = #{id}")
    void updatePasswordById(@Param("id") Long id, @Param("password") String password);
}
