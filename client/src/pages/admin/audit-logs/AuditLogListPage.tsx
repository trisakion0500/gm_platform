import { useState } from 'react';
import { DatePicker, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/common/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import PageSizeSelect from '../../../components/common/PageSizeSelect';
import StatusBadge from '../../../components/common/StatusBadge';
import * as logAuditApi from '../../../api/logAudit.api';
import { useGlobalStore } from '../../../stores/globalStore';
import { useListFilterStore } from '../../../stores/listFilterStore';
import { LOG_AUDIT_ACTION_TYPE_MAP as ACTION_TYPE_MAP, LOG_AUDIT_TABLE_NAME_OPTIONS as TABLE_NAME_OPTIONS, LOG_AUDIT_TABLE_NAME_LABEL as TABLE_NAME_LABEL } from '../../../constants/statusMaps';
import type { LogAuditRow } from '../../../types';

const COLUMNS: ColumnsType<LogAuditRow> = [
  { title: '로그ID', dataIndex: 'log_audit_id' },
  { title: '테이블', dataIndex: 'table_name', render: (tableName: string) => TABLE_NAME_LABEL[tableName] ?? tableName },
  { title: '대상명', dataIndex: 'target_name' },
  { title: '작업유형', dataIndex: 'action_type', render: (actionType: number) => <StatusBadge status={actionType} map={ACTION_TYPE_MAP} /> },
  { title: '프로젝트', dataIndex: 'project_name', render: (projectName: string | null) => projectName ?? '-' },
  { title: '작업자', dataIndex: 'created_by_name', render: (name: string | null) => name ?? '-' },
  { title: '작업일시', dataIndex: 'created_at' },
];

function AuditLogListPage() {
  const navigate = useNavigate();
  // 회사·프로젝트 필터는 헤더의 전역 선택을 그대로 사용 (SUPER_ADMIN만 "전체"=null 선택 가능)
  const companyId = useGlobalStore((state) => state.selectedCompanyId);
  const projectId = useGlobalStore((state) => state.selectedProjectId);
  const filter = useListFilterStore((state) => state.auditLogFilter);
  const setFilter = useListFilterStore((state) => state.setAuditLogFilter);
  const [pageSize, setPageSize] = useState(20);

  const dateRange: [Dayjs, Dayjs] | null =
    filter.fromDate && filter.toDate ? [dayjs(filter.fromDate), dayjs(filter.toDate)] : null;

  return (
    <>
      <PageHeader title="감사 로그" />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          style={{ width: 160 }}
          value={filter.tableName ?? 'ALL'}
          onChange={(value) => setFilter({ ...filter, tableName: value === 'ALL' ? undefined : (value as string) })}
          options={[{ value: 'ALL', label: '전체' }, ...TABLE_NAME_OPTIONS]}
        />
        <Select
          style={{ width: 140 }}
          value={filter.actionType ?? 'ALL'}
          onChange={(value) => setFilter({ ...filter, actionType: value === 'ALL' ? undefined : (value as number) })}
          options={[
            { value: 'ALL', label: '전체' },
            { value: 10, label: '생성' },
            { value: 20, label: '수정' },
            { value: 30, label: '상태변경' },
          ]}
        />
        <DatePicker.RangePicker
          showTime
          value={dateRange}
          onChange={(range) =>
            setFilter({
              ...filter,
              fromDate: range?.[0] ? range[0].format('YYYY-MM-DD HH:mm:ss') : undefined,
              toDate: range?.[1] ? range[1].format('YYYY-MM-DD HH:mm:ss') : undefined,
            })
          }
        />
        <div style={{ marginLeft: 'auto' }}>
          <PageSizeSelect value={pageSize} onChange={setPageSize} />
        </div>
      </div>
      <DataTable<LogAuditRow>
        key={`${companyId ?? 'all'}-${projectId ?? 'all'}-${filter.tableName ?? 'all'}-${filter.actionType ?? 'all'}-${filter.fromDate ?? ''}-${filter.toDate ?? ''}`}
        columns={COLUMNS}
        rowKey="log_audit_id"
        pageSize={pageSize}
        fetcher={(page, pageSize) =>
          logAuditApi.getLogAuditList(page, pageSize, {
            company_id: companyId ?? undefined,
            project_id: projectId ?? undefined,
            table_name: filter.tableName,
            action_type: filter.actionType,
            from_created_at: filter.fromDate,
            to_created_at: filter.toDate,
          })
        }
        onRowClick={(record) => navigate(`/admin/audit-logs/${record.log_audit_id}`)}
      />
    </>
  );
}

export default AuditLogListPage;
