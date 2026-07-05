import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import StatusBadge from '../../../components/common/StatusBadge';
import { EXECUTION_STATUS_MAP } from '../../../constants/apiMeta';
import * as apiExecutionApi from '../../../api/apiExecution.api';
import { getErrorMessage } from '../../../utils/error';
import type { ApiExecutionRow } from '../../../types';

function formatJson(value: unknown): string {
  if (value === undefined || value === null)
    return '-';
  return JSON.stringify(value, null, 2);
}

function ExecutionDetailPage() {
  const { api_execution_id } = useParams();
  const navigate = useNavigate();
  const [execution, setExecution] = useState<ApiExecutionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiExecutionApi
      .getApiExecution(Number(api_execution_id))
      .then(setExecution)
      .catch((err: unknown) => {
        setErrorMessage(getErrorMessage(err, '실행 이력 정보를 불러오지 못했습니다.'));
      })
      .finally(() => setLoading(false));
  }, [api_execution_id]);

  if (loading)
    return <Spin />;

  if (errorMessage && !execution) {
    return (
      <>
        <PageHeader title="실행 이력 상세" />
        <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />
        <Button onClick={() => navigate('/executions')}>목록으로</Button>
      </>
    );
  }

  if (!execution)
    return null;

  return (
    <>
      <PageHeader title="실행 이력 상세" extra={<Button onClick={() => navigate('/executions')}>목록으로</Button>} />
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
    </>
  );
}

export default ExecutionDetailPage;
