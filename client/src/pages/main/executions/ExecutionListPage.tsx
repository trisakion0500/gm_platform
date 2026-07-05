import { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Empty, Form, Input, Modal, Select, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/common/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import StatusBadge from '../../../components/common/StatusBadge';
import { EXECUTION_STATUS_MAP } from '../../../constants/apiMeta';
import * as apiApi from '../../../api/api.api';
import * as apiExecutionApi from '../../../api/apiExecution.api';
import { useAuthStore } from '../../../stores/authStore';
import { useGlobalStore } from '../../../stores/globalStore';
import { useListFilterStore } from '../../../stores/listFilterStore';
import type { ApiExecutionRow, ApiFailure, ApiRow } from '../../../types';

interface CancelFormValues {
  reject_reason: string;
}

function ExecutionListPage() {
  const navigate = useNavigate();
  const selectedProjectId = useGlobalStore((state) => state.selectedProjectId);
  const currentUserId = useAuthStore((state) => state.user?.user_id);
  const filter = useListFilterStore((state) => state.executionListFilter);
  const setFilter = useListFilterStore((state) => state.setExecutionListFilter);

  const [apis, setApis] = useState<ApiRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<ApiExecutionRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) {
      setApis([]);
      return;
    }
    apiApi.getApiList(1, 100, selectedProjectId).then(({ items }) => setApis(items));
  }, [selectedProjectId]);

  async function handleCancel(values: CancelFormValues): Promise<void> {
    if (!cancelTarget)
      return;
    setSubmitting(true);
    try {
      await apiExecutionApi.cancelApiExecution(cancelTarget.api_execution_id, values.reject_reason);
      setCancelTarget(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      const message = (err as AxiosError<ApiFailure>).response?.data?.message ?? '실행 취소에 실패했습니다.';
      setErrorMessage(message);
      setCancelTarget(null);
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnsType<ApiExecutionRow> = [
    { title: '실행ID', dataIndex: 'api_execution_id' },
    { title: 'API명', dataIndex: 'api_name' },
    { title: '요청자', dataIndex: 'request_user_name' },
    { title: '상태', dataIndex: 'status', render: (status: number) => <StatusBadge status={status} map={EXECUTION_STATUS_MAP} /> },
    { title: '요청일시', dataIndex: 'requested_at' },
    { title: '승인일시', dataIndex: 'approved_at', render: (value: string | null) => value ?? '-' },
    { title: '실행일시', dataIndex: 'executed_at', render: (value: string | null) => value ?? '-' },
    {
      title: '',
      key: 'actions',
      render: (_, record) =>
        record.status === 10 && record.request_user_id === currentUserId ? (
          <Button
            size="small"
            danger
            onClick={(e) => {
              e.stopPropagation();
              setCancelTarget(record);
            }}
          >
            취소
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader title="실행 이력" />
      {errorMessage && (
        <Alert type="error" message={errorMessage} showIcon closable onClose={() => setErrorMessage(null)} style={{ marginBottom: 16 }} />
      )}

      {!selectedProjectId && <Empty description="프로젝트를 선택하세요" style={{ marginTop: 80 }} />}

      {selectedProjectId && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <Select
              style={{ width: 200 }}
              value={filter.apiId ?? 'ALL'}
              onChange={(value) => setFilter({ ...filter, apiId: value === 'ALL' ? undefined : (value as number) })}
              options={[{ value: 'ALL', label: '전체 API' }, ...apis.map((api) => ({ value: api.api_id, label: api.api_name }))]}
            />
            <Select
              style={{ width: 160 }}
              value={filter.status ?? 'ALL'}
              onChange={(value) => setFilter({ ...filter, status: value === 'ALL' ? undefined : (value as number) })}
              options={[
                { value: 'ALL', label: '전체 상태' },
                ...Object.entries(EXECUTION_STATUS_MAP).map(([value, { label }]) => ({ value: Number(value), label })),
              ]}
            />
            <Checkbox
              checked={filter.requiredApprovalOnly === 1}
              onChange={(e) => setFilter({ ...filter, requiredApprovalOnly: e.target.checked ? 1 : undefined })}
            >
              승인 필요 건만
            </Checkbox>
          </div>
          <DataTable<ApiExecutionRow>
            key={`${selectedProjectId}-${filter.apiId ?? 'all'}-${filter.status ?? 'all'}-${filter.requiredApprovalOnly ?? 'all'}-${refreshKey}`}
            columns={columns}
            rowKey="api_execution_id"
            fetcher={(page, pageSize) =>
              apiExecutionApi.getApiExecutionList(
                selectedProjectId, page, pageSize, filter.apiId, undefined, filter.status, filter.requiredApprovalOnly,
              )
            }
            onRowClick={(record) => navigate(`/executions/${record.api_execution_id}`)}
          />
        </>
      )}

      <Modal open={!!cancelTarget} title="실행 취소" onCancel={() => setCancelTarget(null)} destroyOnClose footer={null}>
        <Form<CancelFormValues> layout="vertical" onFinish={handleCancel} disabled={submitting}>
          <Form.Item name="reject_reason" label="취소 사유" rules={[{ required: true, message: '취소 사유를 입력하세요.' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" danger htmlType="submit" loading={submitting}>
                취소 확정
              </Button>
              <Button onClick={() => setCancelTarget(null)}>닫기</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default ExecutionListPage;
