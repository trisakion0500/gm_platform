import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import * as companyApi from '../../../api/company.api';
import { useGlobalStore } from '../../../stores/globalStore';
import { getErrorMessage } from '../../../utils/error';
import { CODE_PATTERN, CODE_PATTERN_MESSAGE } from '../../../constants/validation';

interface CompanyFormValues {
  company_code: string;
  company_name: string;
  description?: string;
}

function CompanyNewPage() {
  const navigate = useNavigate();
  const companyList = useGlobalStore((state) => state.companyList);
  const setCompanyList = useGlobalStore((state) => state.setCompanyList);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(values: CompanyFormValues): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const company = await companyApi.createCompany(values);
      setCompanyList([...companyList, { company_id: company.company_id, company_name: company.company_name }]);
      navigate(`/admin/companies/${company.company_id}`);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, '회사 등록에 실패했습니다.'));
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
              { pattern: CODE_PATTERN, message: CODE_PATTERN_MESSAGE },
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
