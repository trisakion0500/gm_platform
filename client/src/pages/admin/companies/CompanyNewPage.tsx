import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Space } from 'antd';
import type { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import * as companyApi from '../../../api/company.api';
import type { ApiFailure } from '../../../types';

const COMPANY_CODE_PATTERN = /^[a-zA-Z0-9_.-]+$/;

interface CompanyFormValues {
  company_code: string;
  company_name: string;
  description?: string;
}

function CompanyNewPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(values: CompanyFormValues): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const company = await companyApi.createCompany(values);
      navigate(`/admin/companies/${company.company_id}`);
    } catch (err) {
      const message = (err as AxiosError<ApiFailure>).response?.data?.message ?? '회사 등록에 실패했습니다.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="회사 등록" />
      <Card style={{ maxWidth: 480 }}>
        {errorMessage && <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />}
        <Form<CompanyFormValues> layout="vertical" onFinish={handleSubmit} disabled={submitting}>
          <Form.Item
            name="company_code"
            label="회사코드"
            rules={[
              { required: true, message: '회사코드를 입력하세요.' },
              { pattern: COMPANY_CODE_PATTERN, message: '영문, 숫자, _, ., - 만 사용할 수 있습니다.' },
              { max: 20, message: '회사코드는 최대 20자입니다.' },
            ]}
          >
            <Input autoFocus />
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
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                등록
              </Button>
              <Button onClick={() => navigate('/admin/companies')}>취소</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}

export default CompanyNewPage;
