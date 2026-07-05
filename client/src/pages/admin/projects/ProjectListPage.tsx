import { useState } from 'react';
import { Button, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/common/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import PageSizeSelect from '../../../components/common/PageSizeSelect';
import PermissionGuard from '../../../components/common/PermissionGuard';
import StatusBadge from '../../../components/common/StatusBadge';
import * as projectApi from '../../../api/project.api';
import { useGlobalStore } from '../../../stores/globalStore';
import { useListFilterStore } from '../../../stores/listFilterStore';
import type { ProjectRow } from '../../../types';
import { ROLE } from '../../../types';

const STATUS_MAP = {
  1: { label: '활성', color: 'green' },
  0: { label: '비활성', color: 'default' },
};

const COLUMNS: ColumnsType<ProjectRow> = [
  { title: '회사명', dataIndex: 'company_name' },
  { title: '프로젝트코드', dataIndex: 'project_code' },
  { title: '프로젝트명', dataIndex: 'project_name' },
  { title: 'API Base URL', dataIndex: 'api_base_url' },
  { title: '상태', dataIndex: 'status', render: (status: number) => <StatusBadge status={status} map={STATUS_MAP} /> },
  { title: '등록일', dataIndex: 'created_at' },
];

function ProjectListPage() {
  const navigate = useNavigate();
  // 회사 필터는 헤더의 전역 회사 선택을 그대로 사용 (SUPER_ADMIN만 "전체 회사"=null 선택 가능)
  const companyId = useGlobalStore((state) => state.selectedCompanyId);
  const status = useListFilterStore((state) => state.projectListStatus);
  const setStatus = useListFilterStore((state) => state.setProjectListStatus);
  const [pageSize, setPageSize] = useState(20);

  return (
    <>
      <PageHeader
        title="프로젝트 목록"
        extra={
          <PermissionGuard allow={[ROLE.SUPER_ADMIN]}>
            <Button type="primary" onClick={() => navigate('/admin/projects/new')}>
              등록
            </Button>
          </PermissionGuard>
        }
      />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <Select
          style={{ width: 160 }}
          value={status ?? 'ALL'}
          onChange={(value) => setStatus(value === 'ALL' ? undefined : (value as number))}
          options={[
            { value: 'ALL', label: '전체' },
            { value: 1, label: '활성' },
            { value: 0, label: '비활성' },
          ]}
        />
        <div style={{ marginLeft: 'auto' }}>
          <PageSizeSelect value={pageSize} onChange={setPageSize} />
        </div>
      </div>
      <DataTable<ProjectRow>
        key={`${companyId ?? 'all'}-${status ?? 'all'}`}
        columns={COLUMNS}
        rowKey="project_id"
        pageSize={pageSize}
        fetcher={(page, pageSize) => projectApi.getProjectList(page, pageSize, companyId ?? undefined, status)}
        onRowClick={(record) => navigate(`/admin/projects/${record.project_id}`)}
      />
    </>
  );
}

export default ProjectListPage;
