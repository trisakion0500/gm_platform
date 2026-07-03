import axiosInstance, { unwrap } from './axios';
import type { CompanyRow, PaginatedResponse } from '../types';

export function getCompanyList(page: number, pageSize: number, status?: number): Promise<PaginatedResponse<CompanyRow>> {
  return axiosInstance
    .get('/companies', { params: { page, page_size: pageSize, status } })
    .then(unwrap<PaginatedResponse<CompanyRow>>);
}

export function getCompany(companyId: number): Promise<CompanyRow> {
  return axiosInstance.get(`/companies/${companyId}`).then(unwrap<CompanyRow>);
}

export interface CreateCompanyPayload {
  company_code: string;
  company_name: string;
  description?: string;
}

export function createCompany(payload: CreateCompanyPayload): Promise<CompanyRow> {
  return axiosInstance.post('/companies', payload).then(unwrap<CompanyRow>);
}

export interface UpdateCompanyPayload {
  company_code?: string;
  company_name?: string;
  description?: string;
  status?: number;
}

export function updateCompany(companyId: number, payload: UpdateCompanyPayload): Promise<CompanyRow> {
  return axiosInstance.patch(`/companies/${companyId}`, payload).then(unwrap<CompanyRow>);
}
