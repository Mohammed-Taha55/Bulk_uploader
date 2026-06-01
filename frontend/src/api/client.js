import axios from 'axios';

/**
 * Axios instance for all API calls.
 * In dev, Vite proxies /api → http://localhost:3001.
 * In production, set VITE_API_BASE_URL env var.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60_000,   // 60s — generous for large file uploads
  headers: { 'Content-Type': 'application/json' },
});

// Normalize error messages for the UI
apiClient.interceptors.response.use(
  res => res,
  err => {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'An unknown error occurred';
    return Promise.reject(new Error(msg));
  }
);

export default apiClient;
