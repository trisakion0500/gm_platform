import { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Form, Input, Select, Space, Spin } from 'antd';
import type { AxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import PermissionGuard from '../../../components/common/PermissionGuard';
import StatusBadge from '../../../components/common/StatusBadge';
import * as companyApi from '../../../api/company.api';
import { useGlobalStore } from '../../../stores/globalStore';
import type { ApiFailure, CompanyRow } from '../../../types';
import { ROLE } from '../../../types';

const STATUS_MAP = {
  1: { label: '활성', color: 'green' },
  0: { label: '비활성', color: 'default' },
};

const COMPANY_CODE_PATTERN = /^[a-zA-Z0-9_.-]+$/;

interface CompanyEditFormValues {
  company_code: string;
  company_name: string;
  description?: string;
  status: number;
}

function CompanyDetailPage() {
  const { company_id } = useParams();
  const navigate = useNavigate();
  const companyList = useGlobalStore((state) => state.companyList);
  const setCompanyList = useGlobalStore((state) => state.setCompanyList);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    companyApi
      .getCompany(Number(company_id))
      .then(setCompany)
      .catch((err: AxiosError<ApiFailure>) => {
        setErrorMessage(err.response?.data?.message ?? '회사 정보를 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, [company_id]);

  async function handleSave(values: CompanyEditFormValues): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const updated = await companyApi.updateCompany(Number(company_id), values);
      setCompany(updated);
      setCompanyList(
        companyList.map((c) => (c.company_id === updated.company_id ? { company_id: updated.company_id, company_name: updated.company_name } : c)),
      );
      setEditing(false);
    } catch (err) {
      const message = (err as AxiosError<ApiFailure>).response?.data?.message ?? '회사 수정에 실패했습니다.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <Spin />;

  if (errorMessage && !company) {
    return (
      <>
        <PageHeader title="회사 상세" />
        <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />
        <Button onClick={() => navigate('/admin/companies')}>목록으로</Button>
      </>
    );
  }

  if (!company)
    return null;

  if (editing) {
    return (
      <>
        <PageHeader title="회사 수정" />
        {errorMessage && <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />}
        <Form<CompanyEditFormValues>
          layout="vertical"
          style={{ maxWidth: 480 }}
          initialValues={{
            company_code: company.company_code,
            company_name: company.company_name,
            description: company.description ?? undefined,
            status: company.status,
          }}
          onFinish={handleSave}
          disabled={submitting}
        >
          <Form.Item
            name="company_code"
            label="회사코드"
            rules={[
              { required: true, message: '회사코드를 입력하세요.' },
              { pattern: COMPANY_CODE_PATTERN, message: '영문, 숫자, _, ., - 만 사용할 수 있습니다.' },
              { max: 20, message: '회사코드는 최대 20자입니다.' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="company_name"
            label="회사명"
            rules={[
              { required: true, message: '회사명을 입력하세요.' },
              { max: 100, message: '회사명은 최대 100자입니다.' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="설명" rules={[{ max: 1000, message: '설명은 최대 1000자입니다.' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="상태">
            <Select
              options={[
                { value: 1, label: '활성' },
                { value: 0, label: '비활성' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                저장
              </Button>
              <Button onClick={() => setEditing(false)}>취소</Button>
            </Space>
          </Form.Item>
        </Form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="회사 상세"
        extra={
          <Space>
            <PermissionGuard allow={[ROLE.SUPER_ADMIN]}>
              <Button onClick={() => setEditing(true)}>수정</Button>
            </PermissionGuard>
            <Button onClick={() => navigate('/admin/companies')}>목록으로</Button>
          </Space>
        }
      />
      <Descriptions bordered column={1} labelStyle={{ width: 160 }}>
        <Descriptions.Item label="회사코드">{company.company_code}</Descriptions.Item>
        <Descriptions.Item label="회사명">{company.company_name}</Descriptions.Item>
        <Descriptions.Item label="설명">{company.description ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="상태">
          <StatusBadge status={company.status} map={STATUS_MAP} />
        </Descriptions.Item>
        <Descriptions.Item label="등록일">{company.created_at}</Descriptions.Item>
        <Descriptions.Item label="수정일">{company.updated_at}</Descriptions.Item>
      </Descriptions>
    </>
  );
}

export default CompanyDetailPage;
