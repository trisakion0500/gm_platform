import { useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Select, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import * as apiApi from '../../../api/api.api';
import { useGlobalStore } from '../../../stores/globalStore';
import { APPROVAL_OPTIONS, RESPONSE_VIEW_TYPE_OPTIONS } from '../../../constants/apiMeta';
import { getErrorMessage } from '../../../utils/error';
import { API_CODE_PATTERN, API_CODE_PATTERN_MESSAGE } from '../../../constants/validation';

interface ApiFormValues {
  api_code: string;
  api_name: string;
  endpoint: string;
  description?: string;
  is_required_approval: number;
  response_view_type: number;
  display_order?: number;
}

function ApiNewPage() {
  const navigate = useNavigate();
  const projectId = useGlobalStore((state) => state.selectedProjectId);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(values: ApiFormValues): Promise<void> {
    if (!projectId)
      return;
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const api = await apiApi.createApi({ ...values, project_id: projectId });
      navigate(`/admin/apis/${api.api_id}`);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'API 등록에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!projectId) {
    return (
      <>
        <PageHeader title="API 등록" />
        <Alert type="info" showIcon message="헤더에서 프로젝트를 선택하세요." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="API 등록" />
      <Card style={{ maxWidth: 560 }}>
        {errorMessage && <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />}
        <Form<ApiFormValues>
          layout="vertical"
          onFinish={handleSubmit}
          disabled={submitting}
          initialValues={{ is_required_approval: 1, response_view_type: 1, display_order: 0 }}
        >
          <Form.Item
            name="api_code"
            label="API코드"
            rules={[
              { required: true, message: 'API코드를 입력하세요.' },
              { pattern: API_CODE_PATTERN, message: API_CODE_PATTERN_MESSAGE },
            ]}
          >
            <Input autoFocus />
          </Form.Item>
          <Form.Item name="api_name" label="API명" rules={[{ required: true, message: 'API명을 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="endpoint" label="Endpoint" rules={[{ required: true, message: 'Endpoint를 입력하세요.' }]}>
            <Input placeholder="/v1/game/give-item" />
          </Form.Item>
          <Form.Item name="description" label="설명">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="is_required_approval" label="승인 필요 여부" rules={[{ required: true }]}>
            <Select options={APPROVAL_OPTIONS} />
          </Form.Item>
          <Form.Item name="response_view_type" label="응답 표시 방식" rules={[{ required: true }]}>
            <Select options={RESPONSE_VIEW_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="display_order" label="표시 순서">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                등록
              </Button>
              <Button onClick={() => navigate('/admin/apis')}>취소</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}

export default ApiNewPage;
