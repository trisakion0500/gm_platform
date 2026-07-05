import { useState } from 'react';
import { Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/common/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import PageSizeSelect from '../../../components/common/PageSizeSelect';
import StatusBadge from '../../../components/common/StatusBadge';
import { useGlobalStore } from '../../../stores/globalStore';
import { useListFilterStore } from '../../../stores/listFilterStore';
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
  // 회사 필터는 헤더의 전역 회사 선택을 그대로 사용 (SUPER_ADMIN만 "전체 회사"=null 선택 가능)
  const companyId = useGlobalStore((state) => state.selectedCompanyId);
  const status = useListFilterStore((state) => state.userListStatus);
  const setStatus = useListFilterStore((state) => state.setUserListStatus);
  const [pageSize, setPageSize] = useState(20);

  return (
    <>
      <PageHeader title="사용자 목록" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
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
        <div style={{ marginLeft: 'auto' }}>
          <PageSizeSelect value={pageSize} onChange={setPageSize} />
        </div>
      </div>
      <DataTable<UserRow>
        key={`${companyId ?? 'all'}-${status ?? 'all'}`}
        columns={COLUMNS}
        rowKey="user_id"
        pageSize={pageSize}
        fetcher={(page, pageSize) => userApi.getUserList(page, pageSize, status, companyId ?? undefined)}
        onRowClick={(record) => navigate(`/admin/users/${record.user_id}`)}
      />
    </>
  );
}

export default UserListPage;
