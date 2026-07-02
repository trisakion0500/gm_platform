import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiFailure, ApiSuccess, RoleCode } from '../types';
import { useAuthStore } from '../stores/authStore';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// 모든 *.api.ts가 response.data.data만 취급하도록 통일 — result===0 성공 응답 전제
export function unwrap<T>(response: AxiosResponse<ApiSuccess<T>>): T {
  return response.data.data;
}

axiosInstance.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken)
    config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// 세션이 완전히 끊긴 상태 — 재시도 불가, 즉시 로그아웃 후 /login 이동
const SESSION_TERMINATED_CODES = [10004, 10005, 10006, 10007, 10009];

// access token 동시 만료 시 refresh를 1회만 수행하고 나머지 요청은 대기열에 쌓아 재시도한다
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (token)
      resolve(token);
    else
      reject(error);
  });
  refreshQueue = [];
}

function redirectToLogin(): void {
  useAuthStore.getState().clear();
  window.location.href = '/login';
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiFailure>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = originalRequest?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (!error.response || !originalRequest || isAuthEndpoint)
      return Promise.reject(error);

    const resultCode = error.response.data?.result;

    if (resultCode === 10003) {
      if (originalRequest._retry)
        return Promise.reject(error);

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        });
      }

      const { refreshToken, setTokens } = useAuthStore.getState();
      if (!refreshToken) {
        redirectToLogin();
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const res = await axiosInstance.post<
          ApiSuccess<{ access_token: string; expired_at: string; role_code: RoleCode }>
        >('/auth/refresh', { refresh_token: refreshToken });
        const { access_token: newAccessToken, role_code: roleCode } = res.data.data;
        setTokens(newAccessToken, roleCode);
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (resultCode !== undefined && SESSION_TERMINATED_CODES.includes(resultCode))
      redirectToLogin();

    return Promise.reject(error);
  },
);

export default axiosInstance;
