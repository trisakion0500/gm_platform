import { Button, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/common/DataTable';
import PageHeader from '../../../components/common/PageHeader';
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
  const companyList = useGlobalStore((state) => state.companyList);
  const companyId = useListFilterStore((state) => state.projectListCompanyId);
  const status = useListFilterStore((state) => state.projectListStatus);
  const setFilter = useListFilterStore((state) => state.setProjectListFilter);

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
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Select
          style={{ width: 200 }}
          value={companyId ?? 'ALL'}
          onChange={(value) => setFilter(value === 'ALL' ? undefined : (value as number), status)}
          options={[
            { value: 'ALL', label: '전체 회사' },
            ...companyList.map((c) => ({ value: c.company_id, label: c.company_name })),
          ]}
        />
        <Select
          style={{ width: 160 }}
          value={status ?? 'ALL'}
          onChange={(value) => setFilter(companyId, value === 'ALL' ? undefined : (value as number))}
          options={[
            { value: 'ALL', label: '전체' },
            { value: 1, label: '활성' },
            { value: 0, label: '비활성' },
          ]}
        />
      </div>
      <DataTable<ProjectRow>
        key={`${companyId ?? 'all'}-${status ?? 'all'}`}
        columns={COLUMNS}
        rowKey="project_id"
        fetcher={(page, pageSize) => projectApi.getProjectList(page, pageSize, companyId, status)}
        onRowClick={(record) => navigate(`/admin/projects/${record.project_id}`)}
      />
    </>
  );
}

export default ProjectListPage;
