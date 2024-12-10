import axios from 'axios';

const API_BASE_URL = `http://localhost:${import.meta.env.VITE_API_PORT || '3000'}/api/v1`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-Internal-Request': 'true'
  }
});

// 添加响应拦截器来处理错误
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // 服务器返回错误状态码
      console.error('API Error:', error.response.data);
      throw new Error(error.response.data.error || '请求失败');
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('Network Error:', error.request);
      throw new Error('无法连接到服务器，请检查网络连接');
    } else {
      // 请求配置出错
      console.error('Request Error:', error.message);
      throw new Error('请求配置错误');
    }
  }
);

export default api;