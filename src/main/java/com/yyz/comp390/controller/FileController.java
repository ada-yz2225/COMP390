package com.yyz.comp390.controller;

import com.yyz.comp390.context.BaseContext;
import com.yyz.comp390.entity.ApiResult;
import com.yyz.comp390.entity.dto.EditFileDTO;
import com.yyz.comp390.entity.dto.GetFileDTO;
import com.yyz.comp390.entity.vo.GetFileVO;
import com.yyz.comp390.service.FileService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/file")
@Slf4j
public class FileController {

    @Resource
    private FileService fileService;

    public static String downloadPath = Paths.get(System.getProperty("user.home"), "Downloads").toAbsolutePath().toString();

    @PostMapping("/getFiles")
    public ApiResult<List<GetFileVO>> getFile(@RequestBody GetFileDTO getFileDTO) {
        return ApiResult.success(fileService.getFiles(getFileDTO));
    }

    @GetMapping("/getFile/{id}")
    public ApiResult<GetFileVO> getFile(@PathVariable Long id) {
        return ApiResult.success(fileService.getFileById(id));
    }

    @PostMapping("/editFile")
    public ApiResult editFile(@RequestBody EditFileDTO editFileDTO) {
        fileService.editFiles(editFileDTO);
        return ApiResult.success();
    }

    @Transactional
    @PostMapping("/deleteFiles")
    public ApiResult deleteFile(@RequestBody List<Long> ids){
        fileService.deleteFiles(ids);
        return ApiResult.success();
    }

    @Transactional
    @PostMapping("/uploadFile")
    public ApiResult uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("privacyBudget") Integer privacyBudget,
            @RequestParam("permission") String permission
    ){
        // If file is null or wrong format, return.
        if (file.isEmpty() || !Objects.requireNonNull(file.getOriginalFilename()).endsWith(".csv")) {
            return ApiResult.error("Invalid file format. Only csv is allowed");
        }
        // If directory doesn't exist, make a new directory.
        File directory = new File(downloadPath);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        String originalFileName = file.getOriginalFilename();
        String newFileName = UUID.randomUUID() + ".csv";
        Path filePath = Paths.get(downloadPath, newFileName);

        try {
            Files.copy(file.getInputStream(), filePath);
        } catch (IOException e){
            return ApiResult.error("File upload failed.");
        }

        com.yyz.comp390.entity.File fileEntity = new com.yyz.comp390.entity.File();
        fileEntity.setFilename(originalFileName);
        fileEntity.setAlias(newFileName);
        fileEntity.setCreateTime(LocalDateTime.now());
        fileEntity.setCreateId(BaseContext.getCurrentId());
        fileEntity.setPrivacyBudget(privacyBudget);
        fileEntity.setPermission(permission);
        fileService.uploadFile(fileEntity);

        return ApiResult.success();
    }
}
