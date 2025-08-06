// src/api/index.ts
import axios from 'axios';
import Constants from 'expo-constants';
import { getStoredToken } from '../utils/storage'; // 假设已实现

// 从 expo-constants 获取 API 基础 URL (在 app.json 或 eas.json 中配置)
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8080/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 JWT Token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getStoredToken(); // 从 SecureStore 获取
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token for request:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理通用错误 (可选)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 可以在这里处理 401 (未授权) 等通用错误
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
