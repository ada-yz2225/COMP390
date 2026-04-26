package com.yyz.comp390.service.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONException;
import com.alibaba.fastjson2.JSONObject;
import com.yyz.comp390.entity.File;
import com.yyz.comp390.entity.PrivacyBudgetKV;
import com.yyz.comp390.entity.Subset;
import com.yyz.comp390.entity.dto.QueryDTO;
import com.yyz.comp390.entity.dto.QueryNameDTO;
import com.yyz.comp390.exception.QueryException;
import com.yyz.comp390.mapper.AlgorithmMapper;
import com.yyz.comp390.mapper.FileMapper;
import com.yyz.comp390.service.QueryService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;

@Service
@Slf4j
public class QueryServiceImpl implements QueryService {

    @Resource
    FileMapper fileMapper;

    @Resource
    AlgorithmMapper algorithmMapper;

    private final RestTemplate restTemplate;
    private final Map<Long, Double> privacyBudget = new ConcurrentHashMap<>();
    private final Map<Long, Object> budgetLocks = new ConcurrentHashMap<>();
    public static String pythonURL = "http://127.0.0.1:5000";
    private final ExecutorService executorService;

    public QueryServiceImpl() {
        this.restTemplate = new RestTemplate();
        this.executorService = new ThreadPoolExecutor(
                5,
                10,
                60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(20),
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }

    @PostConstruct
    public void initializePrivacyBudgetMap(){
        List<PrivacyBudgetKV> kv = fileMapper.getAllPrivacyBudget();
        privacyBudget.clear();
        for(PrivacyBudgetKV privacyBudgetKV : kv){
            privacyBudget.put(privacyBudgetKV.getId(), privacyBudgetKV.getPrivacyBudget().doubleValue());
            budgetLocks.computeIfAbsent(privacyBudgetKV.getId(), key -> new Object());
        }
    }

    @Scheduled(cron = "0 0 0 * * ?") // Reset privacy budget at 00:00:00 every day
    private synchronized void resetPrivacyBudget() {
        initializePrivacyBudgetMap();
    }

    public void handleUploadFile(Long id, Double budget){
        if (id == null || budget == null) {
            return;
        }
        budgetLocks.computeIfAbsent(id, key -> new Object());
        privacyBudget.put(id, budget);
    }

    private void deductPrivacyBudget(Long id, Double epsilon) {
        Object lock = budgetLocks.computeIfAbsent(id, key -> new Object());
        synchronized (lock) {
            Double current = privacyBudget.get(id);
            if (current == null) {
                throw new QueryException("File no longer available");
            }
            double remaining = current - epsilon;
            if (remaining <= 0) {
                privacyBudget.remove(id);
                fileMapper.setFilePermissionNoById(id);
                return;
            }
            privacyBudget.put(id, remaining);
        }
    }

    private Object parseResponse(String responseBody) {
        try {
            return JSON.parseArray(responseBody);
        } catch (JSONException e1) {
            return JSON.parseObject(responseBody);
        }
    }

    @Override
    public JSONObject query(QueryDTO queryDTO) {
        try{
            Future<JSONObject> future = executorService.submit(() -> executeQuery(queryDTO));
            return future.get();
        } catch (QueryException | ExecutionException e){
            throw new QueryException(e.getLocalizedMessage());
        } catch (RejectedExecutionException e) {
            throw new QueryException("Too many query requests, please try again later.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new QueryException("Query interrupted, please retry.");
        }
    }

    private JSONObject executeQuery(QueryDTO queryDTO) {
        File file = fileMapper.getFullFileById(queryDTO.getFileId());
        if (file == null || !"YES".equals(file.getPermission())) {
            throw new QueryException("File no longer available");
        }

        String filePath = resolveFilePath(file.getAlias());
        // Get python class name and function name;
        QueryNameDTO nameDTO = algorithmMapper.getQueryNamesById(queryDTO.getAlgorithmId());
        if (nameDTO == null) {
            throw new QueryException("Algorithm not available");
        }
        String className = nameDTO.getClassName();
        String functionName = nameDTO.getFunctionName();

        Map<String, Object> request = new HashMap<>();
        Double epsilon = queryDTO.getEpsilon();

        // Check epsilon and put parameters
        if(epsilon==null || epsilon == 0){
            epsilon = 1.0 - Math.random();
        } else if(epsilon >= 1.0 || epsilon <= 0){
            throw new QueryException("Epsilon must be strictly greater than 0 and smaller than 1");
        }

        Double currentBudget = privacyBudget.get(queryDTO.getFileId());
        if (currentBudget == null || currentBudget - epsilon <= 0){
            throw new QueryException("This file is no longer available!");
        }
        request.put("epsilon", epsilon);
        // For conditional query
        request.put("filters", queryDTO.getFilters());

        // If parallel composition query:
        request.put("subsets", queryDTO.getSubsets());
        // Remove public epsilon
        if(queryDTO.getSubsets() != null){
            // Find maximum epsilon to deduct budget
            List<Subset> subsets = queryDTO.getSubsets();
            if(!checkParallelComposition(subsets)){ // Check whether subsets overlap
                throw new QueryException("Check your query conditions. Parallel composition requires disjoint subsets!");
            }
            for(Subset subset : subsets){
                subset.setColumnName(queryDTO.getColumnName());
                subset.setEpsilon(epsilon);
            }
        }

        request.put("className", className);
        request.put("filePath", filePath);
        request.put("functionName", functionName);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
        try{
            ResponseEntity<String> response = restTemplate.postForEntity(pythonURL + "/analyze", entity, String.class);
            String responseBody = response.getBody();
            if(response.getStatusCode().is2xxSuccessful()){

                deductPrivacyBudget(file.getId(), epsilon);
                Object parsedResponse = parseResponse(responseBody);

                // Identify Json type, json object or json array
                if(parsedResponse instanceof JSONArray){
                    JSONArray jsonArray = (JSONArray) parsedResponse;
                    for (int i = 0; i < jsonArray.size(); i++) {
                        JSONObject jsonObject = jsonArray.getJSONObject(i);
                        jsonObject.put("index", i);
                    }
                    JSONObject jsonObject = new JSONObject();
                    jsonObject.put("result", jsonArray);
                    return jsonObject;
                } else {
                    return (JSONObject) parsedResponse;
                }
            } else {
                JSONObject errorResponse = JSON.parseObject(response.getBody());
                String errorMessage = errorResponse.getString("error");
                throw new QueryException("Query failed: " + errorMessage);
            }
        } catch (HttpStatusCodeException e){
            JSONObject errorResponse = JSON.parseObject(e.getResponseBodyAsString());
            String errorMessage = errorResponse.getString("error");
            throw new QueryException(errorMessage!=null?errorMessage:"Unexpected error.");
        }
    }

    @Override
    public List<String> getFileColumns(Long id) {

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(headers);
        File file = fileMapper.getFullFileById(id);
        if (file == null || !"YES".equals(file.getPermission())) {
            throw new QueryException("File no longer available");
        }
        String path = resolveFilePath(file.getAlias());
        String url = pythonURL + "/getFileColumns?file_path=" + path;
        ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, entity, List.class);
        if(response.getStatusCode().is2xxSuccessful()){
            return response.getBody();
        }
        else {
            throw new QueryException("File column fetch failed.");
        }

    }

    @Override
    public Double getBudget(Long id) {
        Double budget = privacyBudget.get(id);
        if (budget == null) {
            return 0d;
        }
        return budget;
    }

    private boolean checkParallelComposition(List<Subset> subsets){
        subsets.sort((a, b) -> (int) (a.getMin() - b.getMin()));
        for(int i=0; i<subsets.size()-1; i++){
            if(subsets.get(i).getMax() > subsets.get(i+1).getMin()){
                return false;
            }
        }
        return true;
    }

    private String resolveFilePath(String alias) {
        Path downloadPath = Paths.get(System.getProperty("user.home"), "Downloads").toAbsolutePath();
        return downloadPath.resolve(alias).toString();
    }
}
