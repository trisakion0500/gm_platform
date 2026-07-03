import { Button, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/common/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import PermissionGuard from '../../../components/common/PermissionGuard';
import StatusBadge from '../../../components/common/StatusBadge';
import * as companyApi from '../../../api/company.api';
import { useListFilterStore } from '../../../stores/listFilterStore';
import type { CompanyRow } from '../../../types';
import { ROLE } from '../../../types';

const STATUS_MAP = {
  1: { label: '활성', color: 'green' },
  0: { label: '비활성', color: 'default' },
};

const COLUMNS: ColumnsType<CompanyRow> = [
  { title: '회사코드', dataIndex: 'company_code' },
  { title: '회사명', dataIndex: 'company_name' },
  { title: '설명', dataIndex: 'description' },
  { title: '상태', dataIndex: 'status', render: (status: number) => <StatusBadge status={status} map={STATUS_MAP} /> },
  { title: '등록일', dataIndex: 'created_at' },
];

function CompanyListPage() {
  const navigate = useNavigate();
  const status = useListFilterStore((state) => state.companyListStatus);
  const setStatus = useListFilterStore((state) => state.setCompanyListStatus);

  return (
    <>
      <PageHeader
        title="회사 목록"
        extra={
          <PermissionGuard allow={[ROLE.SUPER_ADMIN]}>
            <Button type="primary" onClick={() => navigate('/admin/companies/new')}>
              등록
            </Button>
          </PermissionGuard>
        }
      />
      <Select
        style={{ width: 160, marginBottom: 16 }}
        value={status ?? 'ALL'}
        onChange={(value) => setStatus(value === 'ALL' ? undefined : (value as number))}
        options={[
          { value: 'ALL', label: '전체' },
          { value: 1, label: '활성' },
          { value: 0, label: '비활성' },
        ]}
      />
      <DataTable<CompanyRow>
        key={status ?? 'all'}
        columns={COLUMNS}
        rowKey="company_id"
        fetcher={(page, pageSize) => companyApi.getCompanyList(page, pageSize, status)}
        onRowClick={(record) => navigate(`/admin/companies/${record.company_id}`)}
      />
    </>
  );
}

export default CompanyListPage;
