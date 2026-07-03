import { useEffect, useState } from 'react';
import { Alert, Button, Input, Select, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import PageHeader from '../../../components/common/PageHeader';
import { usePermission } from '../../../hooks/usePermission';
import { useGlobalStore } from '../../../stores/globalStore';
import * as codeGroupApi from '../../../api/codeGroup.api';
import type { ApiFailure, CodeGroupRow } from '../../../types';
import { ROLE } from '../../../types';
import CodeItemGrid from './CodeItemGrid';

interface EditableGroupRow {
  _key: string;
  code_group_id: number | null;
  code_group_code: string;
  code_group_name: string;
  description: string;
  status: number;
  _dirty: boolean;
  _error?: string;
}

function toEditable(row: CodeGroupRow): EditableGroupRow {
  return {
    _key: String(row.code_group_id),
    code_group_id: row.code_group_id,
    code_group_code: row.code_group_code,
    code_group_name: row.code_group_name,
    description: row.description ?? '',
    status: row.status,
    _dirty: false,
  };
}

let tempKeySeq = 0;
function blankRow(): EditableGroupRow {
  tempKeySeq += 1;
  return {
    _key: `new-group-${tempKeySeq}`,
    code_group_id: null,
    code_group_code: '',
    code_group_name: '',
    description: '',
    status: 1,
    _dirty: true,
  };
}

function CodeGroupPage() {
  const projectId = useGlobalStore((state) => state.selectedProjectId);
  const canEdit = usePermission([ROLE.SUPER_ADMIN, ROLE.DEVELOPER]);
  const [rows, setRows] = useState<EditableGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [errorSummary, setErrorSummary] = useState<string[]>([]);

  function load(pid: number): void {
    setLoading(true);
    codeGroupApi
      .getCodeGroupList(pid)
      .then((items) => setRows(items.map(toEditable)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (projectId)
      load(projectId);
    else
      setRows([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function updateCell(key: string, patch: Partial<EditableGroupRow>): void {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch, _dirty: true, _error: undefined } : r)));
  }

  function handleAddRow(): void {
    setRows((prev) => [...prev, blankRow()]);
  }

  async function handleApply(): Promise<void> {
    if (!projectId)
      return;
    setApplying(true);
    const errors: string[] = [];
    const targets = rows.filter((r) => r.code_group_id === null || r._dirty);

    for (const row of targets) {
      try {
        if (row.code_group_id === null) {
          if (!row.code_group_code.trim() || !row.code_group_name.trim())
            throw new Error('코드그룹코드/코드그룹명은 필수입니다.');
          await codeGroupApi.createCodeGroup({
            project_id: projectId,
            code_group_code: row.code_group_code,
            code_group_name: row.code_group_name,
            description: row.description || undefined,
          });
        } else {
          await codeGroupApi.updateCodeGroup(row.code_group_id, {
            code_group_name: row.code_group_name,
            description: row.description,
            status: row.status,
          });
        }
      } catch (err) {
        const message = err instanceof Error && !(err as AxiosError).isAxiosError
          ? err.message
          : (err as AxiosError<ApiFailure>).response?.data?.message ?? '저장에 실패했습니다.';
        errors.push(`${row.code_group_code || '(신규 행)'}: ${message}`);
        setRows((prev) => prev.map((r) => (r._key === row._key ? { ...r, _error: message } : r)));
      }
    }

    setErrorSummary(errors);
    if (errors.length === 0)
      load(projectId);
    setApplying(false);
  }

  const columns: ColumnsType<EditableGroupRow> = [
    {
      title: '코드그룹코드',
      dataIndex: 'code_group_code',
      width: 180,
      render: (value: string, record) =>
        canEdit && record.code_group_id === null
          ? <Input value={value} maxLength={100} onChange={(e) => updateCell(record._key, { code_group_code: e.target.value })} />
          : value,
    },
    {
      title: '코드그룹명',
      dataIndex: 'code_group_name',
      width: 220,
      render: (value: string, record) =>
        canEdit
          ? <Input value={value} maxLength={200} onChange={(e) => updateCell(record._key, { code_group_name: e.target.value })} />
          : value,
    },
    {
      title: '설명',
      dataIndex: 'description',
      render: (value: string, record) =>
        canEdit
          ? <Input value={value} maxLength={1000} onChange={(e) => updateCell(record._key, { description: e.target.value })} />
          : (value || '-'),
    },
    {
      title: '상태',
      dataIndex: 'status',
      width: 120,
      render: (value: number, record) =>
        canEdit
          ? (
            <Select
              value={value}
              style={{ width: 100 }}
              options={[{ value: 1, label: '사용' }, { value: 0, label: '중지' }]}
              onChange={(v) => updateCell(record._key, { status: v })}
            />
          )
          : (value === 1 ? '사용' : '중지'),
    },
  ];

  return (
    <>
      <PageHeader title="코드그룹" />
      {!projectId && <Alert type="info" showIcon message="헤더에서 프로젝트를 선택하세요." />}
      {projectId && (
        <>
          {errorSummary.length > 0 && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message="일부 코드그룹 저장 실패"
              description={
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {errorSummary.map((e) => <li key={e}>{e}</li>)}
                </ul>
              }
            />
          )}
          <Table<EditableGroupRow>
            rowKey="_key"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={false}
            rowClassName={(r) => (r._error ? 'editable-row-error' : '')}
            expandable={{
              rowExpandable: (record) => record.code_group_id !== null,
              expandedRowRender: (record) => <CodeItemGrid codeGroupId={record.code_group_id!} editable={canEdit} />,
            }}
          />
          {canEdit && (
            <Space style={{ marginTop: 16 }}>
              <Button onClick={handleAddRow}>코드그룹 추가</Button>
              <Button type="primary" onClick={handleApply} loading={applying}>적용</Button>
            </Space>
          )}
        </>
      )}
    </>
  );
}

export default CodeGroupPage;
