import { useState } from 'react';
import { Alert, Button, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/common/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import PageSizeSelect from '../../../components/common/PageSizeSelect';
import PermissionGuard from '../../../components/common/PermissionGuard';
import StatusBadge from '../../../components/common/StatusBadge';
import * as apiApi from '../../../api/api.api';
import { useGlobalStore } from '../../../stores/globalStore';
import { useListFilterStore } from '../../../stores/listFilterStore';
import { API_STAGE_LABEL, API_STAGE_OPTIONS, API_STATUS_MAP } from '../../../constants/apiMeta';
import type { ApiRow } from '../../../types';
import { ROLE } from '../../../types';

const COLUMNS: ColumnsType<ApiRow> = [
  { title: 'API코드', dataIndex: 'api_code' },
  { title: 'API명', dataIndex: 'api_name' },
  { title: 'Endpoint', dataIndex: 'endpoint' },
  { title: '운영단계', dataIndex: 'api_stage', render: (stage: number) => API_STAGE_LABEL[stage] ?? stage },
  { title: '상태', dataIndex: 'status', render: (status: number) => <StatusBadge status={status} map={API_STATUS_MAP} /> },
  { title: '등록일', dataIndex: 'created_at' },
];

function ApiListPage() {
  const navigate = useNavigate();
  const projectId = useGlobalStore((state) => state.selectedProjectId);
  const status = useListFilterStore((state) => state.apiListStatus);
  const setStatus = useListFilterStore((state) => state.setApiListStatus);
  const stage = useListFilterStore((state) => state.apiListStage);
  const setStage = useListFilterStore((state) => state.setApiListStage);
  const [pageSize, setPageSize] = useState(20);

  return (
    <>
      <PageHeader
        title="API 목록"
        extra={
          <PermissionGuard allow={[ROLE.SUPER_ADMIN, ROLE.DEVELOPER]}>
            <Button type="primary" onClick={() => navigate('/admin/apis/new')}>
              등록
            </Button>
          </PermissionGuard>
        }
      />
      {!projectId && <Alert type="info" showIcon message="헤더에서 프로젝트를 선택하세요." />}
      {projectId && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Select
              style={{ width: 160 }}
              value={status ?? 'ALL'}
              onChange={(value) => setStatus(value === 'ALL' ? undefined : (value as number))}
              options={[
                { value: 'ALL', label: '전체 상태' },
                { value: 1, label: '사용' },
                { value: 0, label: '중지' },
              ]}
            />
            <Select
              style={{ width: 160 }}
              value={stage ?? 'ALL'}
              onChange={(value) => setStage(value === 'ALL' ? undefined : (value as number))}
              options={[{ value: 'ALL', label: '전체 단계' }, ...API_STAGE_OPTIONS]}
            />
            <div style={{ marginLeft: 'auto' }}>
              <PageSizeSelect value={pageSize} onChange={setPageSize} />
            </div>
          </div>
          <DataTable<ApiRow>
            key={`${projectId}-${status ?? 'all'}-${stage ?? 'all'}`}
            columns={COLUMNS}
            rowKey="api_id"
            pageSize={pageSize}
            fetcher={(page, pageSize) => apiApi.getApiList(page, pageSize, projectId, status, stage)}
            onRowClick={(record) => navigate(`/admin/apis/${record.api_id}`)}
          />
        </>
      )}
    </>
  );
}

export default ApiListPage;
