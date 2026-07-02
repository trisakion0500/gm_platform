import axiosInstance, { unwrap } from './axios';
import type { AuthUser } from '../stores/authStore';
import type { RoleCode } from '../types';

export interface LoginResult {
  access_token: string;
  refresh_token: string;
  expired_at: string;
  role_code: RoleCode;
}

export interface RefreshResult {
  access_token: string;
  expired_at: string;
  role_code: RoleCode;
}

export function login(login_id: string, password: string): Promise<LoginResult> {
  return axiosInstance.post('/auth/login', { login_id, password }).then(unwrap<LoginResult>);
}

export function refresh(refresh_token: string): Promise<RefreshResult> {
  return axiosInstance.post('/auth/refresh', { refresh_token }).then(unwrap<RefreshResult>);
}

export function me(): Promise<AuthUser> {
  return axiosInstance.get('/auth/me').then(unwrap<AuthUser>);
}

export function logout(): Promise<null> {
  return axiosInstance.post('/auth/logout').then(unwrap<null>);
}

export function changePassword(current_password: string, new_password: string): Promise<null> {
  return axiosInstance
    .patch('/auth/password', { current_password, new_password })
    .then(unwrap<null>);
}
