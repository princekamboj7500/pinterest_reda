import axios from 'axios';
import { useAppBridge } from '@shopify/app-bridge-react';
// Create an axios instance
const apiClient = axios.create({
  baseURL: 'https://api-sandbox.pinterest.com/v5',
});
let host =new URLSearchParams(window.location.search).get('host');


// Add a request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Modify the request config (headers, params, etc.)
    config.headers.Authorization = `Bearer ${localStorage.getItem('authToken')}`;
    return config;
  },
  (error) => {
    // Handle the error before sending the request
    return Promise.reject(error);
  }
);

export default apiClient