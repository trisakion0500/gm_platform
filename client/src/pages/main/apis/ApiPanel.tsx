import { useEffect, useState } from 'react';
import { Alert, Button, Card, Checkbox, DatePicker, Descriptions, Form, Input, InputNumber, Radio, Select, Space, Table, Tag, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import * as apiApi from '../../../api/api.api';
import { useApiWorkspaceStore } from '../../../stores/apiWorkspaceStore';
import { useAuthStore } from '../../../stores/authStore';
import { getErrorMessage } from '../../../utils/error';
import { ROLE } from '../../../types';
import type { ActiveCodeGroupWithItems, ApiDetail, ApiRequestRow, ApiResponseRow } from '../../../types';

interface ApiPanelProps {
  apiId: number;
  detail: ApiDetail;
  codeGroupMap: Record<number, ActiveCodeGroupWithItems>;
}

// api_request.component_type에 따른 입력 컨트롤 — SELECT/RADIO/CHECKBOX는 code_group_id로 옵션을 가져온다.
const FIELD_WIDTH = 240;

function renderFieldControl(request: ApiRequestRow, codeGroupMap: Record<number, ActiveCodeGroupWithItems>) {
  const options = (codeGroupMap[request.code_group_id]?.items ?? []).map((item) => ({ value: item.code_value, label: item.code_name }));
  switch (request.component_type) {
    case 2: // NUMBER
      return <InputNumber style={{ width: FIELD_WIDTH }} />;
    case 3: // DATE
      return <DatePicker style={{ width: FIELD_WIDTH }} format="YYYY-MM-DD" />;
    case 4: // DATETIME
      return <DatePicker style={{ width: FIELD_WIDTH }} showTime format="YYYY-MM-DD HH:mm:ss" />;
    case 5: // SELECT
      return <Select options={options} allowClear style={{ width: FIELD_WIDTH }} />;
    case 6: // RADIO
      return <Radio.Group options={options} />;
    case 7: // CHECKBOX
      return <Checkbox.Group options={options} />;
    default: // 1: TEXT
      return <Input style={{ width: FIELD_WIDTH }} />;
  }
}

// DatePicker가 돌려주는 Dayjs 객체를 실행 요청 전 문자열로 변환 — 나머지 컴포넌트는 이미 전송 가능한 원시값을 반환한다.
function formatSubmitValues(requests: ApiRequestRow[], rawValues: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  requests.forEach((r) => {
    const value = rawValues[r.parameter_name];
    if (value === undefined)
      return;
    if (r.component_type === 3 && value)
      result[r.parameter_name] = (value as Dayjs).format('YYYY-MM-DD');
    else if (r.component_type === 4 && value)
      result[r.parameter_name] = (value as Dayjs).format('YYYY-MM-DD HH:mm:ss');
    else
      result[r.parameter_name] = value;
  });
  return result;
}

// code_group_id가 0이 아니면 실제 값을 code_item.code_name으로 치환, 매칭되는 코드가 없으면 원래 값 그대로 노출
function resolveCodeName(codeGroupId: number, value: unknown, codeGroupMap: Record<number, ActiveCodeGroupWithItems>): string {
  if (!codeGroupId)
    return value === undefined || value === null ? '-' : String(value);
  const found = codeGroupMap[codeGroupId]?.items.find((item) => item.code_value === String(value));
  return found ? found.code_name : value === undefined || value === null ? '-' : String(value);
}

interface ResponseViewProps {
  responses: ApiResponseRow[];
  data: unknown;
  codeGroupMap: Record<number, ActiveCodeGroupWithItems>;
}

// 외부 API는 모두 { result, message, data: [...] } 봉투로 응답하기로 합의됨 — data는 항상 배열.
// KEY_VALUE는 data[0]을 단일 객체로, GRID는 data 전체를 행 목록으로 사용한다.
function unwrapDataArray(raw: unknown): Record<string, unknown>[] {
  if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as { data: unknown }).data))
    return (raw as { data: Record<string, unknown>[] }).data;
  if (Array.isArray(raw))
    return raw as Record<string, unknown>[];
  return [];
}

function KeyValueResponseView({ responses, data, codeGroupMap }: ResponseViewProps) {
  const obj = unwrapDataArray(data)[0] ?? {};
  if (responses.length === 0)
    return <pre style={{ margin: 0, background: '#fafafa', padding: 8 }}>{JSON.stringify(data, null, 2)}</pre>;
  return (
    <Descriptions size="small" column={1} bordered>
      {responses.map((r) => (
        <Descriptions.Item key={r.api_response_id} label={r.parameter_label}>
          {resolveCodeName(r.code_group_id, obj[r.parameter_name], codeGroupMap)}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
}

function GridResponseView({ responses, data, codeGroupMap }: ResponseViewProps) {
  if (responses.length === 0)
    return <pre style={{ margin: 0, background: '#fafafa', padding: 8 }}>{JSON.stringify(data, null, 2)}</pre>;
  const rows = unwrapDataArray(data);
  const columns = responses.map((r) => ({
    title: r.parameter_label,
    dataIndex: r.parameter_name,
    key: r.parameter_name,
    render: (value: unknown) => resolveCodeName(r.code_group_id, value, codeGroupMap),
  }));
  return (
    <Table
      size="small"
      columns={columns}
      dataSource={rows}
      rowKey={(_, index) => index ?? 0}
      pagination={false}
      scroll={rows.length > 20 ? { y: 400 } : undefined}
    />
  );
}

interface EditableGridRow {
  _key: string;
  values: Record<string, unknown>;
  _error?: string;
}

// api_response.parameter_type/code_group_id에 따른 편집용 초기값 변환 — DATE/DATETIME은 DatePicker가
// 다루는 Dayjs로, JSON은 원문 텍스트로(저장 시 파싱 검증), 그 외는 raw 값 그대로 둔다.
function toEditableGridRows(rows: Record<string, unknown>[], responses: ApiResponseRow[]): EditableGridRow[] {
  return rows.map((row, index) => {
    const values: Record<string, unknown> = {};
    responses.forEach((r) => {
      const raw = row[r.parameter_name];
      if (r.parameter_type === 6) // JSON
        values[r.parameter_name] = raw === undefined || raw === null ? '' : JSON.stringify(raw);
      else if ((r.parameter_type === 4 || r.parameter_type === 5) && raw)
        values[r.parameter_name] = dayjs(raw as string);
      else
        values[r.parameter_name] = raw;
    });
    return { _key: String(index), values };
  });
}

// code_group_id가 있으면 콤보박스, 없으면 parameter_type(STRING/NUMBER/BOOLEAN/DATE/DATETIME/JSON)별 편집 컨트롤.
function renderEditableCell(r: ApiResponseRow, value: unknown, onChange: (v: unknown) => void, codeGroupMap: Record<number, ActiveCodeGroupWithItems>) {
  if (r.code_group_id) {
    const options = (codeGroupMap[r.code_group_id]?.items ?? []).map((item) => ({ value: item.code_value, label: item.code_name }));
    return <Select value={value as string | undefined} options={options} allowClear style={{ width: 140 }} onChange={onChange} />;
  }
  switch (r.parameter_type) {
    case 2: // NUMBER
      return <InputNumber value={value as number | undefined} onChange={onChange} style={{ width: 120 }} />;
    case 3: // BOOLEAN
      return <Select value={value as boolean | undefined} options={[{ value: true, label: '참' }, { value: false, label: '거짓' }]} style={{ width: 90 }} onChange={onChange} />;
    case 4: // DATE
      return <DatePicker value={value as Dayjs | undefined} format="YYYY-MM-DD" onChange={onChange} style={{ width: 140 }} />;
    case 5: // DATETIME
      return <DatePicker value={value as Dayjs | undefined} showTime format="YYYY-MM-DD HH:mm:ss" onChange={onChange} style={{ width: 180 }} />;
    case 6: // JSON — raw 텍스트로 편집, 저장 시 JSON.parse 검증
      return <Input.TextArea value={value as string} autoSize={{ minRows: 1, maxRows: 4 }} style={{ minWidth: 160 }} onChange={(e) => onChange(e.target.value)} />;
    default: // 1: STRING
      return <Input value={value as string} style={{ width: 160 }} onChange={(e) => onChange(e.target.value)} />;
  }
}

interface EditableGridResponseViewProps {
  apiId: number;
  responses: ApiResponseRow[];
  data: unknown;
  codeGroupMap: Record<number, ActiveCodeGroupWithItems>;
}

// response_view_type=3 전용 — 실행 결과를 편집 가능한 그리드로 보여주고, 저장 버튼 클릭 시
// 같은 api_id를 is_update=1로 실행해 api.update_endpoint를 { data: [...전체 행] } 계약으로 호출한다.
function EditableGridResponseView({ apiId, responses, data, codeGroupMap }: EditableGridResponseViewProps) {
  const [rows, setRows] = useState<EditableGridRow[]>(() => toEditableGridRows(unwrapDataArray(data), responses));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{ status: number; api_execution_id: number; error_message: string | null } | null>(null);

  useEffect(() => {
    setRows(toEditableGridRows(unwrapDataArray(data), responses));
    setSaveResult(null);
    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function updateCell(key: string, parameterName: string, value: unknown): void {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, values: { ...r.values, [parameterName]: value }, _error: undefined } : r)));
  }

  async function handleSave(): Promise<void> {
    setSaveError(null);
    const finalRows: Record<string, unknown>[] = [];
    const nextRows = rows.map((r) => ({ ...r, _error: undefined as string | undefined }));
    let hasError = false;

    rows.forEach((row, index) => {
      const out: Record<string, unknown> = {};
      let failedLabel: string | null = null;
      try {
        responses.forEach((r) => {
          const v = row.values[r.parameter_name];
          if (r.parameter_type === 6) {
            failedLabel = r.parameter_label;
            out[r.parameter_name] = v ? JSON.parse(v as string) : null;
            failedLabel = null;
          } else if (r.parameter_type === 4 && v) {
            out[r.parameter_name] = (v as Dayjs).format('YYYY-MM-DD');
          } else if (r.parameter_type === 5 && v) {
            out[r.parameter_name] = (v as Dayjs).format('YYYY-MM-DD HH:mm:ss');
          } else {
            out[r.parameter_name] = v ?? null;
          }
        });
        finalRows.push(out);
      } catch {
        hasError = true;
        nextRows[index]._error = `${failedLabel ?? '항목'}의 JSON 형식이 올바르지 않습니다.`;
      }
    });

    setRows(nextRows);
    if (hasError)
      return;

    setSaving(true);
    try {
      const result = await apiApi.executeApi(apiId, { data: finalRows }, true);
      setSaveResult({ status: result.status, api_execution_id: result.api_execution_id, error_message: result.error_message });
    } catch (err) {
      setSaveError(getErrorMessage(err, '저장에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  }

  if (responses.length === 0)
    return <pre style={{ margin: 0, background: '#fafafa', padding: 8 }}>{JSON.stringify(data, null, 2)}</pre>;

  const columns = responses.map((r) => ({
    title: r.parameter_label,
    key: r.parameter_name,
    render: (_: unknown, record: EditableGridRow) =>
      renderEditableCell(r, record.values[r.parameter_name], (v) => updateCell(record._key, r.parameter_name, v), codeGroupMap),
  }));

  return (
    <div>
      {saveError && <Alert type="error" message={saveError} showIcon closable onClose={() => setSaveError(null)} style={{ marginBottom: 8 }} />}
      {saveResult?.status === 10 && (
        <Alert type="info" showIcon style={{ marginBottom: 8 }} message="승인요청을 하였습니다." description={`실행이력 #${saveResult.api_execution_id}`} />
      )}
      {saveResult?.status === 50 && <Alert type="error" showIcon style={{ marginBottom: 8 }} message="저장 실패" description={saveResult.error_message} />}
      {saveResult?.status === 40 && <Alert type="success" showIcon style={{ marginBottom: 8 }} message="저장되었습니다." />}
      <Table<EditableGridRow>
        size="small"
        rowKey="_key"
        columns={columns}
        dataSource={rows}
        pagination={false}
        rowClassName={(r) => (r._error ? 'editable-row-error' : '')}
        scroll={rows.length > 20 ? { y: 400 } : undefined}
      />
      <Button type="primary" onClick={handleSave} loading={saving} style={{ marginTop: 8 }}>저장</Button>
    </div>
  );
}

// 좌측 체크박스로 열린 API 1건에 대응하는 패널. Request는 실행 입력폼(+실행 버튼),
// Response는 실행 전에는 응답 필드 정의를, 실행 후에는 response_view_type에 따라 실제 결과를 보여준다.
function ApiPanel({ apiId, detail, codeGroupMap }: ApiPanelProps) {
  const [form] = Form.useForm();
  const roleCode = useAuthStore((state) => state.roleCode);
  const toggleApi = useApiWorkspaceStore((state) => state.toggleApi);
  const requestValues = useApiWorkspaceStore((state) => state.requestValues[apiId] ?? {});
  const setRequestValue = useApiWorkspaceStore((state) => state.setRequestValue);
  const executionResult = useApiWorkspaceStore((state) => state.executionResults[apiId] ?? null);
  const setExecutionResult = useApiWorkspaceStore((state) => state.setExecutionResult);
  const [executing, setExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeRequests = detail.requests.filter((r) => r.status === 1).sort((a, b) => a.display_order - b.display_order);
  const activeResponses = detail.responses.filter((r) => r.status === 1).sort((a, b) => a.display_order - b.display_order);

  async function handleExecute(): Promise<void> {
    setErrorMessage(null);
    let rawValues: Record<string, unknown>;
    try {
      rawValues = await form.validateFields();
    } catch {
      return;
    }
    setRequestValue(apiId, rawValues);
    setExecuting(true);
    try {
      const result = await apiApi.executeApi(apiId, formatSubmitValues(activeRequests, rawValues));
      setExecutionResult(apiId, result);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, '실행 요청에 실패했습니다.'));
    } finally {
      setExecuting(false);
    }
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          {detail.api.api_name}
          {detail.api.is_required_approval === 1 && roleCode === ROLE.OPERATOR && <Tag color="orange">승인필요</Tag>}
        </Space>
      }
      extra={<CloseOutlined onClick={() => toggleApi(apiId)} style={{ cursor: 'pointer' }} />}
      style={{ marginBottom: 16 }}
    >
      {errorMessage && (
        <Alert type="error" message={errorMessage} showIcon closable onClose={() => setErrorMessage(null)} style={{ marginBottom: 12 }} />
      )}

      <Typography.Text strong>Request</Typography.Text>
      <Form
        form={form}
        layout="horizontal"
        labelCol={{ style: { width: 'auto', whiteSpace: 'nowrap', paddingRight: 8 } }}
        wrapperCol={{ style: { flex: 'none' } }}
        initialValues={requestValues}
        style={{ marginTop: 8, marginBottom: 16 }}
      >
        {activeRequests.length === 0 && <div style={{ color: '#999', marginBottom: 8 }}>정의된 요청 파라미터가 없습니다.</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 12 }}>
          {activeRequests.map((r) => (
            <Form.Item
              key={r.api_request_id}
              name={r.parameter_name}
              label={r.parameter_label}
              rules={r.is_required === 1 ? [{ required: true, message: `${r.parameter_label}을(를) 입력하세요.` }] : []}
            >
              {renderFieldControl(r, codeGroupMap)}
            </Form.Item>
          ))}
        </div>
        <Button type="primary" onClick={handleExecute} loading={executing}>
          실행
        </Button>
      </Form>

      <Typography.Text strong>Response</Typography.Text>
      <div style={{ marginTop: 8 }}>
        {!executionResult &&
          (activeResponses.length === 0 ? (
            <span style={{ color: '#999' }}>정의된 응답 필드가 없습니다.</span>
          ) : detail.api.response_view_type === 1 ? (
            <Descriptions size="small" column={1} bordered>
              {activeResponses.map((r) => (
                <Descriptions.Item key={r.api_response_id} label={r.parameter_label}>
                  <span style={{ color: '#999' }}>(실행 전)</span>
                </Descriptions.Item>
              ))}
            </Descriptions>
          ) : (
            <Table
              size="small"
              columns={activeResponses.map((r) => ({ title: r.parameter_label, dataIndex: r.parameter_name, key: r.parameter_name }))}
              dataSource={[]}
              pagination={false}
              locale={{ emptyText: '실행 전' }}
            />
          ))}

        {executionResult?.status === 10 && (
          <Alert
            type="info"
            showIcon
            message="승인요청을 하였습니다."
            description={`실행이력 #${executionResult.api_execution_id}`}
          />
        )}
        {executionResult?.status === 50 && <Alert type="error" showIcon message="실행 실패" description={executionResult.error_message} />}
        {executionResult?.status === 40 &&
          (detail.api.response_view_type === 3 ? (
            detail.api.update_endpoint ? (
              <EditableGridResponseView
                apiId={apiId}
                responses={activeResponses}
                data={executionResult.response_data}
                codeGroupMap={codeGroupMap}
              />
            ) : (
              <Alert type="error" showIcon message="저장 Endpoint가 설정되지 않았습니다." />
            )
          ) : detail.api.response_view_type === 2 ? (
            <GridResponseView responses={activeResponses} data={executionResult.response_data} codeGroupMap={codeGroupMap} />
          ) : (
            <KeyValueResponseView responses={activeResponses} data={executionResult.response_data} codeGroupMap={codeGroupMap} />
          ))}
      </div>
    </Card>
  );
}

export default ApiPanel;
