import { useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import StatusBadge from '../../../components/common/StatusBadge';
import * as logAuditApi from '../../../api/logAudit.api';
import { getErrorMessage } from '../../../utils/error';
import { LOG_AUDIT_ACTION_TYPE_MAP as ACTION_TYPE_MAP, LOG_AUDIT_TABLE_NAME_LABEL as TABLE_NAME_LABEL } from '../../../constants/statusMaps';
import type { LogAuditRow } from '../../../types';

function formatJson(json: string | null | undefined): string {
  if (!json)
    return '-';
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

function AuditLogDetailPage() {
  const { log_audit_id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState<LogAuditRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    logAuditApi
      .getLogAudit(Number(log_audit_id))
      .then(setLog)
      .catch((err: unknown) => {
        setErrorMessage(getErrorMessage(err, '감사 로그 정보를 불러오지 못했습니다.'));
      })
      .finally(() => setLoading(false));
  }, [log_audit_id]);

  if (loading)
    return <Spin />;

  if (errorMessage && !log) {
    return (
      <>
        <PageHeader title="감사 로그 상세" />
        <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />
        <Button onClick={() => navigate('/admin/audit-logs')}>목록으로</Button>
      </>
    );
  }

  if (!log)
    return null;

  return (
    <>
      <PageHeader title="감사 로그 상세" extra={<Button onClick={() => navigate('/admin/audit-logs')}>목록으로</Button>} />
      <Descriptions bordered column={2} labelStyle={{ width: 140 }} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="로그ID">{log.log_audit_id}</Descriptions.Item>
        <Descriptions.Item label="테이블">{TABLE_NAME_LABEL[log.table_name] ?? log.table_name}</Descriptions.Item>
        <Descriptions.Item label="작업유형">
          <StatusBadge status={log.action_type} map={ACTION_TYPE_MAP} />
        </Descriptions.Item>
        <Descriptions.Item label="대상ID">{log.target_id}</Descriptions.Item>
        <Descriptions.Item label="대상명">{log.target_name}</Descriptions.Item>
        <Descriptions.Item label="회사ID">{log.company_id}</Descriptions.Item>
        <Descriptions.Item label="프로젝트">{log.project_name ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="작업자">{log.created_by_name ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="작업일시">{log.created_at}</Descriptions.Item>
      </Descriptions>

      <div style={{ display: 'flex', gap: 16 }}>
        <Card title="변경 전 (before)" style={{ flex: 1 }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{formatJson(log.before_json)}</pre>
        </Card>
        <Card title="변경 후 (after)" style={{ flex: 1 }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{formatJson(log.after_json)}</pre>
        </Card>
      </div>
    </>
  );
}

export default AuditLogDetailPage;
