import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Form, Input, Modal, Popconfirm, Space, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import StatusBadge from '../../../components/common/StatusBadge';
import { EXECUTION_STATUS_MAP } from '../../../constants/apiMeta';
import * as apiExecutionApi from '../../../api/apiExecution.api';
import { getErrorMessage } from '../../../utils/error';
import type { ApiExecutionRow } from '../../../types';

interface RejectFormValues {
  reject_reason: string;
}

function formatJson(value: unknown): string {
  if (value === undefined || value === null)
    return '-';
  return JSON.stringify(value, null, 2);
}

function ExecutionPendingDetailPage() {
  const { api_execution_id } = useParams();
  const navigate = useNavigate();
  const [execution, setExecution] = useState<ApiExecutionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function load(): void {
    setLoading(true);
    apiExecutionApi
      .getApiExecution(Number(api_execution_id))
      .then(setExecution)
      .catch((err: unknown) => {
        setErrorMessage(getErrorMessage(err, '실행 이력 정보를 불러오지 못했습니다.'));
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [api_execution_id]);

  async function handleApprove(): Promise<void> {
    if (!execution)
      return;
    try {
      await apiExecutionApi.approveApiExecution(execution.api_execution_id);
      navigate('/executions/pending');
    } catch (err) {
      setErrorMessage(getErrorMessage(err, '승인에 실패했습니다.'));
    }
  }

  async function handleReject(values: RejectFormValues): Promise<void> {
    if (!execution)
      return;
    setSubmitting(true);
    try {
      await apiExecutionApi.rejectApiExecution(execution.api_execution_id, values.reject_reason);
      navigate('/executions/pending');
    } catch (err) {
      setErrorMessage(getErrorMessage(err, '반려에 실패했습니다.'));
      setRejecting(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <Spin />;

  if (errorMessage && !execution) {
    return (
      <>
        <PageHeader title="승인 대기 상세" />
        <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />
        <Button onClick={() => navigate('/executions/pending')}>목록으로</Button>
      </>
    );
  }

  if (!execution)
    return null;

  return (
    <>
      <PageHeader
        title="승인 대기 상세"
        extra={
          <>
            {execution.status === 10 && (
              <>
                <Popconfirm title="승인하시겠습니까?" onConfirm={handleApprove}>
                  <Button type="primary">승인</Button>
                </Popconfirm>
                <Button danger onClick={() => setRejecting(true)}>
                  반려
                </Button>
              </>
            )}
            <Button onClick={() => navigate('/executions/pending')}>목록으로</Button>
          </>
        }
      />
      {errorMessage && (
        <Alert type="error" message={errorMessage} showIcon closable onClose={() => setErrorMessage(null)} style={{ marginBottom: 16 }} />
      )}

      <Descriptions bordered column={2} labelStyle={{ width: 140 }} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="실행ID">{execution.api_execution_id}</Descriptions.Item>
        <Descriptions.Item label="API명">{execution.api_name}</Descriptions.Item>
        <Descriptions.Item label="엔드포인트">{execution.endpoint}</Descriptions.Item>
        <Descriptions.Item label="상태">
          <StatusBadge status={execution.status} map={EXECUTION_STATUS_MAP} />
        </Descriptions.Item>
        <Descriptions.Item label="요청자">{execution.request_user_name}</Descriptions.Item>
        <Descriptions.Item label="승인자">{execution.approve_user_name ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="반려/취소 사유">{execution.reject_reason ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="에러 메시지">{execution.error_message ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="요청일시">{execution.requested_at}</Descriptions.Item>
        <Descriptions.Item label="승인일시">{execution.approved_at ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="실행일시">{execution.executed_at ?? '-'}</Descriptions.Item>
      </Descriptions>

      <div style={{ display: 'flex', gap: 16 }}>
        <Card title="요청 파라미터" style={{ flex: 1 }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{formatJson(execution.request_json)}</pre>
        </Card>
        <Card title="응답 데이터" style={{ flex: 1 }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{formatJson(execution.response_data)}</pre>
        </Card>
      </div>

      <Modal open={rejecting} title="실행 반려" onCancel={() => setRejecting(false)} destroyOnClose footer={null}>
        <Form<RejectFormValues> layout="vertical" onFinish={handleReject} disabled={submitting}>
          <Form.Item name="reject_reason" label="반려 사유" rules={[{ required: true, message: '반려 사유를 입력하세요.' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" danger htmlType="submit" loading={submitting}>
                반려 확정
              </Button>
              <Button onClick={() => setRejecting(false)}>닫기</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default ExecutionPendingDetailPage;
