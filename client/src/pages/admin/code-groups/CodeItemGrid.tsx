import { useEffect, useState } from 'react';
import { Alert, Button, Input, InputNumber, Select, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import * as codeItemApi from '../../../api/codeItem.api';
import { getErrorMessage } from '../../../utils/error';
import type { CodeItemRow } from '../../../types';

interface EditableItemRow {
  _key: string;
  code_item_id: number | null;
  code_value: string;
  code_name: string;
  description: string;
  display_order: number;
  status: number;
  _dirty: boolean;
  _error?: string;
}

function toEditable(row: CodeItemRow): EditableItemRow {
  return {
    _key: String(row.code_item_id),
    code_item_id: row.code_item_id,
    code_value: row.code_value,
    code_name: row.code_name,
    description: row.description ?? '',
    display_order: row.display_order,
    status: row.status,
    _dirty: false,
  };
}

let tempKeySeq = 0;
function blankRow(): EditableItemRow {
  tempKeySeq += 1;
  return {
    _key: `new-item-${tempKeySeq}`,
    code_item_id: null,
    code_value: '',
    code_name: '',
    description: '',
    display_order: 0,
    status: 1,
    _dirty: true,
  };
}

interface CodeItemGridProps {
  codeGroupId: number;
  editable: boolean;
}

function CodeItemGrid({ codeGroupId, editable }: CodeItemGridProps) {
  const [rows, setRows] = useState<EditableItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [errorSummary, setErrorSummary] = useState<string[]>([]);

  function load(): void {
    setLoading(true);
    codeItemApi
      .getCodeItemList(codeGroupId)
      .then((items) => setRows(items.map(toEditable)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeGroupId]);

  function updateCell(key: string, patch: Partial<EditableItemRow>): void {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch, _dirty: true, _error: undefined } : r)));
  }

  function handleAddRow(): void {
    setRows((prev) => [...prev, blankRow()]);
  }

  async function handleApply(): Promise<void> {
    setApplying(true);
    const errors: string[] = [];
    const targets = rows.filter((r) => r.code_item_id === null || r._dirty);

    for (const row of targets) {
      try {
        if (row.code_item_id === null) {
          if (!row.code_value.trim() || !row.code_name.trim())
            throw new Error('코드값/코드명은 필수입니다.');
          await codeItemApi.createCodeItem({
            code_group_id: codeGroupId,
            code_value: row.code_value,
            code_name: row.code_name,
            description: row.description || undefined,
            display_order: row.display_order,
          });
        } else {
          await codeItemApi.updateCodeItem(row.code_item_id, {
            code_name: row.code_name,
            description: row.description,
            display_order: row.display_order,
            status: row.status,
          });
        }
      } catch (err) {
        const message = getErrorMessage(err, '저장에 실패했습니다.');
        errors.push(`${row.code_value || '(신규 행)'}: ${message}`);
        setRows((prev) => prev.map((r) => (r._key === row._key ? { ...r, _error: message } : r)));
      }
    }

    setErrorSummary(errors);
    if (errors.length === 0)
      load();
    setApplying(false);
  }

  const columns: ColumnsType<EditableItemRow> = [
    {
      title: '코드값',
      dataIndex: 'code_value',
      width: 140,
      render: (value: string, record) =>
        editable && record.code_item_id === null
          ? <Input value={value} maxLength={100} onChange={(e) => updateCell(record._key, { code_value: e.target.value })} />
          : value,
    },
    {
      title: '코드명',
      dataIndex: 'code_name',
      width: 160,
      render: (value: string, record) =>
        editable
          ? <Input value={value} maxLength={200} onChange={(e) => updateCell(record._key, { code_name: e.target.value })} />
          : value,
    },
    {
      title: '설명',
      dataIndex: 'description',
      render: (value: string, record) =>
        editable
          ? <Input value={value} maxLength={1000} onChange={(e) => updateCell(record._key, { description: e.target.value })} />
          : (value || '-'),
    },
    {
      title: '순서',
      dataIndex: 'display_order',
      width: 90,
      render: (value: number, record) =>
        editable
          ? <InputNumber value={value} min={0} onChange={(v) => updateCell(record._key, { display_order: v ?? 0 })} />
          : value,
    },
    {
      title: '상태',
      dataIndex: 'status',
      width: 100,
      render: (value: number, record) =>
        editable
          ? (
            <Select
              value={value}
              style={{ width: 90 }}
              options={[{ value: 1, label: '사용' }, { value: 0, label: '중지' }]}
              onChange={(v) => updateCell(record._key, { status: v })}
            />
          )
          : (value === 1 ? '사용' : '중지'),
    },
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      {errorSummary.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 8 }}
          message="일부 항목 저장 실패"
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {errorSummary.map((e) => <li key={e}>{e}</li>)}
            </ul>
          }
        />
      )}
      <Table<EditableItemRow>
        size="small"
        rowKey="_key"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        rowClassName={(r) => (r._error ? 'editable-row-error' : '')}
      />
      {editable && (
        <Space style={{ marginTop: 8 }}>
          <Button onClick={handleAddRow}>아이템 추가</Button>
          <Button type="primary" onClick={handleApply} loading={applying}>적용</Button>
        </Space>
      )}
    </div>
  );
}

export default CodeItemGrid;
