import axiosInstance, { unwrap } from './axios';
import type { PaginatedResponse, UserRow } from '../types';

export function getUserList(
  page: number,
  pageSize: number,
  status?: number,
  companyId?: number,
): Promise<PaginatedResponse<UserRow>> {
  return axiosInstance
    .get('/users', { params: { page, page_size: pageSize, status, company_id: companyId } })
    .then(unwrap<PaginatedResponse<UserRow>>);
}

export function getUser(userId: number): Promise<UserRow> {
  return axiosInstance.get(`/users/${userId}`).then(unwrap<UserRow>);
}

export interface UpdateUserPayload {
  user_name?: string;
  email?: string;
  phone_number?: string;
  department?: string;
  position?: string;
  status?: number;
}

export function updateUser(userId: number, payload: UpdateUserPayload): Promise<UserRow> {
  return axiosInstance.patch(`/users/${userId}`, payload).then(unwrap<UserRow>);
}

export function approveUser(userId: number): Promise<null> {
  return axiosInstance.post(`/users/${userId}/approve`).then(unwrap<null>);
}

export function rejectUser(userId: number): Promise<null> {
  return axiosInstance.post(`/users/${userId}/reject`).then(unwrap<null>);
}

export function resetPassword(userId: number, newPassword: string): Promise<null> {
  return axiosInstance.post(`/users/${userId}/reset-password`, { new_password: newPassword }).then(unwrap<null>);
}
