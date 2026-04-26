package com.yyz.comp390.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yyz.comp390.entity.File;
import com.yyz.comp390.entity.dto.EditFileDTO;
import com.yyz.comp390.entity.dto.GetFileDTO;
import com.yyz.comp390.entity.PrivacyBudgetKV;
import com.yyz.comp390.entity.vo.GetFileVO;
import org.apache.ibatis.annotations.*;

import java.util.List;

@Mapper
public interface FileMapper extends BaseMapper<File> {
    List<GetFileVO> getFiles(@Param("idList") List<Long> idList, @Param("getFileDTO") GetFileDTO getFileDTO);

    @Update("update file set filename = #{editFileDTO.filename}, privacy_budget = #{editFileDTO.privacyBudget}, " +
            "permission = #{editFileDTO.permission} where id = #{editFileDTO.id}")
    void editFile(@Param("editFileDTO") EditFileDTO editFileDTO);

    List<String> getFileAliasByIds(@Param("ids") List<Long> ids);

    @Select("select filename, privacy_budget, permission from file where id = #{id}")
    GetFileVO getFileById(Long id);

    @Select("select * from file where id = #{id}")
    File getFullFileById(Long id);

    @Select("select id, privacy_budget from file where permission = 'YES'")
    List<PrivacyBudgetKV> getAllPrivacyBudget();

    @Update("update file set permission = 'NO' where id = #{id}")
    void setFilePermissionNoById(Long id);
}
