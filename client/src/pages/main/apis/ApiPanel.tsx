import { useState } from 'react';
import { Alert, Button, Card, Checkbox, DatePicker, Descriptions, Form, Input, InputNumber, Radio, Select, Space, Table, Tag, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { AxiosError } from 'axios';
import type { Dayjs } from 'dayjs';
import * as apiApi from '../../../api/api.api';
import { useApiWorkspaceStore } from '../../../stores/apiWorkspaceStore';
import { useAuthStore } from '../../../stores/authStore';
import { ROLE } from '../../../types';
import type { ActiveCodeGroupWithItems, ApiDetail, ApiFailure, ApiRequestRow, ApiResponseRow } from '../../../types';

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
      setErrorMessage((err as AxiosError<ApiFailure>).response?.data?.message ?? '실행 요청에 실패했습니다.');
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
          ) : detail.api.response_view_type === 2 ? (
            <Table
              size="small"
              columns={activeResponses.map((r) => ({ title: r.parameter_label, dataIndex: r.parameter_name, key: r.parameter_name }))}
              dataSource={[]}
              pagination={false}
              locale={{ emptyText: '실행 전' }}
            />
          ) : (
            <Descriptions size="small" column={1} bordered>
              {activeResponses.map((r) => (
                <Descriptions.Item key={r.api_response_id} label={r.parameter_label}>
                  <span style={{ color: '#999' }}>(실행 전)</span>
                </Descriptions.Item>
              ))}
            </Descriptions>
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
          (detail.api.response_view_type === 2 ? (
            <GridResponseView responses={activeResponses} data={executionResult.response_data} codeGroupMap={codeGroupMap} />
          ) : (
            <KeyValueResponseView responses={activeResponses} data={executionResult.response_data} codeGroupMap={codeGroupMap} />
          ))}
      </div>
    </Card>
  );
}

export default ApiPanel;
