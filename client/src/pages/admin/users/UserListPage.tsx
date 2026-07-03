import { useState } from 'react';
import { Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/common/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import StatusBadge from '../../../components/common/StatusBadge';
import { useGlobalStore } from '../../../stores/globalStore';
import * as userApi from '../../../api/user.api';
import type { UserRow } from '../../../types';

const STATUS_MAP = {
  0: { label: '승인대기', color: 'gold' },
  1: { label: '정상', color: 'green' },
  2: { label: '반려', color: 'red' },
  3: { label: '사용중지', color: 'default' },
};

const COLUMNS: ColumnsType<UserRow> = [
  { title: '로그인ID', dataIndex: 'login_id' },
  { title: '이름', dataIndex: 'user_name' },
  { title: '이메일', dataIndex: 'email' },
  { title: '휴대폰번호', dataIndex: 'phone_number' },
  { title: '부서', dataIndex: 'department', render: (department: string | null) => department ?? '-' },
  { title: '직급', dataIndex: 'position', render: (position: string | null) => position ?? '-' },
  { title: '소속회사', dataIndex: 'company_name' },
  { title: '상태', dataIndex: 'status', render: (status: number) => <StatusBadge status={status} map={STATUS_MAP} /> },
  { title: '가입일', dataIndex: 'created_at' },
];

function UserListPage() {
  const navigate = useNavigate();
  const companyList = useGlobalStore((state) => state.companyList);
  const [companyId, setCompanyId] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<number | undefined>(undefined);

  return (
    <>
      <PageHeader title="사용자 목록" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Select
          style={{ width: 200 }}
          value={companyId ?? 'ALL'}
          onChange={(value) => setCompanyId(value === 'ALL' ? undefined : (value as number))}
          options={[
            { value: 'ALL', label: '전체 회사' },
            ...companyList.map((c) => ({ value: c.company_id, label: c.company_name })),
          ]}
        />
        <Select
          style={{ width: 160 }}
          value={status ?? 'ALL'}
          onChange={(value) => setStatus(value === 'ALL' ? undefined : (value as number))}
          options={[
            { value: 'ALL', label: '전체' },
            { value: 0, label: '승인대기' },
            { value: 1, label: '정상' },
            { value: 2, label: '반려' },
            { value: 3, label: '사용중지' },
          ]}
        />
      </div>
      <DataTable<UserRow>
        key={`${companyId ?? 'all'}-${status ?? 'all'}`}
        columns={COLUMNS}
        rowKey="user_id"
        fetcher={(page, pageSize) => userApi.getUserList(page, pageSize, status, companyId)}
        onRowClick={(record) => navigate(`/admin/users/${record.user_id}`)}
      />
    </>
  );
}

export default UserListPage;
