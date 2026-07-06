import { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Form, Input, InputNumber, Modal, Select, Space, Spin, Table, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import StatusBadge from '../../../components/common/StatusBadge';
import * as apiApi from '../../../api/api.api';
import * as apiRequestApi from '../../../api/apiRequest.api';
import * as apiResponseApi from '../../../api/apiResponse.api';
import * as codeGroupApi from '../../../api/codeGroup.api';
import { getErrorMessage } from '../../../utils/error';
import {
  API_STAGE_LABEL,
  API_STAGE_OPTIONS,
  API_STATUS_MAP,
  APPROVAL_LABEL,
  APPROVAL_OPTIONS,
  COMPONENT_TYPE_LABEL,
  COMPONENT_TYPE_OPTIONS,
  PARAMETER_TYPE_LABEL,
  PARAMETER_TYPE_OPTIONS,
  RESPONSE_VIEW_TYPE_LABEL,
  RESPONSE_VIEW_TYPE_OPTIONS,
} from '../../../constants/apiMeta';
import { API_CODE_PATTERN, API_CODE_PATTERN_MESSAGE } from '../../../constants/validation';
import type { ApiRequestRow, ApiResponseRow, ApiRow, CodeGroupRow } from '../../../types';

interface ApiEditFormValues {
  api_code: string;
  api_name: string;
  endpoint: string;
  description?: string;
  api_stage: number;
  is_required_approval: number;
  response_view_type: number;
  display_order: number;
  status: number;
}

interface RequestFormValues {
  parameter_name: string;
  parameter_label: string;
  parameter_type: number;
  component_type: number;
  code_group_id: number;
  is_required: number;
  description?: string;
  display_order: number;
  status?: number;
}

interface ResponseFormValues {
  parameter_name: string;
  parameter_label: string;
  parameter_type: number;
  code_group_id: number;
  description?: string;
  display_order: number;
  status?: number;
}

function ApiDetailPage() {
  const { api_id } = useParams();
  const apiId = Number(api_id);
  const navigate = useNavigate();
  const [api, setApi] = useState<ApiRow | null>(null);
  const [requests, setRequests] = useState<ApiRequestRow[]>([]);
  const [responses, setResponses] = useState<ApiResponseRow[]>([]);
  const [codeGroups, setCodeGroups] = useState<CodeGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createRequestOpen, setCreateRequestOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ApiRequestRow | null>(null);
  const [createResponseOpen, setCreateResponseOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<ApiResponseRow | null>(null);

  // Request/Response 등록·수정 후에는 이미 렌더링된 Tabs를 그대로 두고 데이터만 갱신한다.
  // showSpinner=true로 loading을 토글하면 전체 화면이 <Spin/>으로 잠깐 대체되어 Tabs가 리마운트되고,
  // uncontrolled 상태로 관리되는 activeKey가 기본정보 탭으로 초기화되어버리는 문제가 있었다.
  function load(showSpinner = true): void {
    if (showSpinner)
      setLoading(true);
    apiApi
      .getApi(apiId)
      .then((detail) => {
        setApi(detail.api);
        setRequests(detail.requests);
        setResponses(detail.responses);
        return codeGroupApi.getCodeGroupList(detail.api.project_id);
      })
      .then(setCodeGroups)
      .catch((err: unknown) => {
        setErrorMessage(getErrorMessage(err, 'API 정보를 불러오지 못했습니다.'));
      })
      .finally(() => {
        if (showSpinner)
          setLoading(false);
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api_id]);

  const codeGroupOptions = [{ value: 0, label: '사용안함' }, ...codeGroups.map((g) => ({ value: g.code_group_id, label: g.code_group_name }))];
  const codeGroupLabel = (id: number) => (id === 0 ? '-' : codeGroups.find((g) => g.code_group_id === id)?.code_group_name ?? id);

  async function handleSaveBasic(values: ApiEditFormValues): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const updated = await apiApi.updateApi(apiId, values);
      setApi(updated);
      setEditing(false);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'API 수정에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateRequest(values: RequestFormValues): Promise<void> {
    setSubmitting(true);
    try {
      await apiApi.createApiRequest(apiId, values);
      setCreateRequestOpen(false);
      load(false);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Request 파라미터 등록에 실패했습니다.'));
      setCreateRequestOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRequest(values: RequestFormValues): Promise<void> {
    if (!editingRequest)
      return;
    setSubmitting(true);
    try {
      await apiRequestApi.updateApiRequest(editingRequest.api_request_id, values);
      setEditingRequest(null);
      load(false);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Request 파라미터 수정에 실패했습니다.'));
      setEditingRequest(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateResponse(values: ResponseFormValues): Promise<void> {
    setSubmitting(true);
    try {
      await apiApi.createApiResponse(apiId, values);
      setCreateResponseOpen(false);
      load(false);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Response 파라미터 등록에 실패했습니다.'));
      setCreateResponseOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateResponse(values: ResponseFormValues): Promise<void> {
    if (!editingResponse)
      return;
    setSubmitting(true);
    try {
      await apiResponseApi.updateApiResponse(editingResponse.api_response_id, values);
      setEditingResponse(null);
      load(false);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'Response 파라미터 수정에 실패했습니다.'));
      setEditingResponse(null);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <Spin />;

  if (errorMessage && !api) {
    return (
      <>
        <PageHeader title="API 상세" />
        <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />
        <Button onClick={() => navigate('/admin/apis')}>목록으로</Button>
      </>
    );
  }

  if (!api)
    return null;

  const requestColumns: ColumnsType<ApiRequestRow> = [
    { title: '파라미터명', dataIndex: 'parameter_name' },
    { title: '라벨', dataIndex: 'parameter_label' },
    { title: '타입', dataIndex: 'parameter_type', render: (v: number) => PARAMETER_TYPE_LABEL[v] ?? v },
    { title: '입력타입', dataIndex: 'component_type', render: (v: number) => COMPONENT_TYPE_LABEL[v] ?? v },
    { title: '코드그룹', dataIndex: 'code_group_id', render: (v: number) => codeGroupLabel(v) },
    { title: '필수', dataIndex: 'is_required', render: (v: number) => (v === 1 ? '필수' : '선택') },
    { title: '순서', dataIndex: 'display_order' },
    { title: '상태', dataIndex: 'status', render: (v: number) => <StatusBadge status={v} map={API_STATUS_MAP} /> },
    { title: '관리', key: 'action', render: (_, record) => <Button size="small" onClick={() => setEditingRequest(record)}>수정</Button> },
  ];

  const responseColumns: ColumnsType<ApiResponseRow> = [
    { title: '파라미터명', dataIndex: 'parameter_name' },
    { title: '라벨', dataIndex: 'parameter_label' },
    { title: '타입', dataIndex: 'parameter_type', render: (v: number) => PARAMETER_TYPE_LABEL[v] ?? v },
    { title: '코드그룹', dataIndex: 'code_group_id', render: (v: number) => codeGroupLabel(v) },
    { title: '순서', dataIndex: 'display_order' },
    { title: '상태', dataIndex: 'status', render: (v: number) => <StatusBadge status={v} map={API_STATUS_MAP} /> },
    { title: '관리', key: 'action', render: (_, record) => <Button size="small" onClick={() => setEditingResponse(record)}>수정</Button> },
  ];

  const basicInfoTab = editing ? (
    <Form<ApiEditFormValues>
      layout="vertical"
      style={{ maxWidth: 560 }}
      initialValues={{
        api_code: api.api_code,
        api_name: api.api_name,
        endpoint: api.endpoint,
        description: api.description ?? undefined,
        api_stage: api.api_stage,
        is_required_approval: api.is_required_approval,
        response_view_type: api.response_view_type,
        display_order: api.display_order,
        status: api.status,
      }}
      onFinish={handleSaveBasic}
      disabled={submitting}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="API코드 / Endpoint / 승인필요여부 / 응답표시방식을 변경하면 운영단계가 자동으로 개발(20)로 초기화됩니다."
      />
      <Form.Item
        name="api_code"
        label="API코드"
        rules={[{ required: true, message: 'API코드를 입력하세요.' }, { pattern: API_CODE_PATTERN, message: API_CODE_PATTERN_MESSAGE }]}
      >
        <Input />
      </Form.Item>
      <Form.Item name="api_name" label="API명" rules={[{ required: true, message: 'API명을 입력하세요.' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="endpoint" label="Endpoint" rules={[{ required: true, message: 'Endpoint를 입력하세요.' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label="설명">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item name="api_stage" label="운영단계" rules={[{ required: true }]}>
        <Select options={API_STAGE_OPTIONS} />
      </Form.Item>
      <Form.Item name="is_required_approval" label="승인 필요 여부" rules={[{ required: true }]}>
        <Select options={APPROVAL_OPTIONS} />
      </Form.Item>
      <Form.Item name="response_view_type" label="응답 표시 방식" rules={[{ required: true }]}>
        <Select options={RESPONSE_VIEW_TYPE_OPTIONS} />
      </Form.Item>
      <Form.Item name="display_order" label="표시 순서">
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="status" label="상태">
        <Select options={[{ value: 1, label: '사용' }, { value: 0, label: '중지' }]} />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={submitting}>저장</Button>
          <Button onClick={() => setEditing(false)}>취소</Button>
        </Space>
      </Form.Item>
    </Form>
  ) : (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={() => setEditing(true)}>수정</Button>
      </div>
      <Descriptions bordered column={1} labelStyle={{ width: 160 }}>
        <Descriptions.Item label="API코드">{api.api_code}</Descriptions.Item>
        <Descriptions.Item label="API명">{api.api_name}</Descriptions.Item>
        <Descriptions.Item label="Endpoint">{api.endpoint}</Descriptions.Item>
        <Descriptions.Item label="설명">{api.description ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="운영단계">
          <StatusBadge status={api.api_stage} map={{ 20: { label: API_STAGE_LABEL[20], color: 'default' }, 30: { label: API_STAGE_LABEL[30], color: 'blue' }, 40: { label: API_STAGE_LABEL[40], color: 'green' } }} />
        </Descriptions.Item>
        <Descriptions.Item label="승인 필요 여부">{APPROVAL_LABEL[api.is_required_approval]}</Descriptions.Item>
        <Descriptions.Item label="응답 표시 방식">{RESPONSE_VIEW_TYPE_LABEL[api.response_view_type]}</Descriptions.Item>
        <Descriptions.Item label="표시 순서">{api.display_order}</Descriptions.Item>
        <Descriptions.Item label="상태">
          <StatusBadge status={api.status} map={API_STATUS_MAP} />
        </Descriptions.Item>
        <Descriptions.Item label="등록일">{api.created_at}</Descriptions.Item>
        <Descriptions.Item label="수정일">{api.updated_at}</Descriptions.Item>
      </Descriptions>
    </>
  );

  return (
    <>
      <PageHeader
        title="API 상세"
        extra={<Button onClick={() => navigate('/admin/apis')}>목록으로</Button>}
      />
      {errorMessage && <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} closable onClose={() => setErrorMessage(null)} />}
      <Tabs
        items={[
          { key: 'basic', label: '기본정보', children: basicInfoTab },
          {
            key: 'request',
            label: 'Request',
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Button onClick={() => setCreateRequestOpen(true)}>파라미터 등록</Button>
                </div>
                <Table<ApiRequestRow> columns={requestColumns} dataSource={requests} rowKey="api_request_id" pagination={false} />
              </>
            ),
          },
          {
            key: 'response',
            label: 'Response',
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Button onClick={() => setCreateResponseOpen(true)}>파라미터 등록</Button>
                </div>
                <Table<ApiResponseRow> columns={responseColumns} dataSource={responses} rowKey="api_response_id" pagination={false} />
              </>
            ),
          },
        ]}
      />

      <Modal open={createRequestOpen} title="Request 파라미터 등록" onCancel={() => setCreateRequestOpen(false)} destroyOnClose footer={null}>
        <Form<RequestFormValues>
          layout="vertical"
          onFinish={handleCreateRequest}
          disabled={submitting}
          initialValues={{ parameter_type: 1, component_type: 1, code_group_id: 0, is_required: 1, display_order: 0 }}
        >
          <Form.Item name="parameter_name" label="파라미터명(JSON Key)" rules={[{ required: true, message: '파라미터명을 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parameter_label" label="화면 표시명" rules={[{ required: true, message: '화면 표시명을 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parameter_type" label="데이터 타입" rules={[{ required: true }]}>
            <Select options={PARAMETER_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="component_type" label="입력 컴포넌트" rules={[{ required: true }]}>
            <Select options={COMPONENT_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="code_group_id" label="코드그룹 (SELECT/RADIO/CHECKBOX 시 필수)">
            <Select options={codeGroupOptions} />
          </Form.Item>
          <Form.Item name="is_required" label="필수 여부">
            <Select options={[{ value: 1, label: '필수' }, { value: 0, label: '선택' }]} />
          </Form.Item>
          <Form.Item name="description" label="설명">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="display_order" label="표시 순서">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>등록</Button>
              <Button onClick={() => setCreateRequestOpen(false)}>취소</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={!!editingRequest} title="Request 파라미터 수정" onCancel={() => setEditingRequest(null)} destroyOnClose footer={null}>
        {editingRequest && (
          <Form<RequestFormValues>
            layout="vertical"
            onFinish={handleUpdateRequest}
            disabled={submitting}
            initialValues={{
              parameter_label: editingRequest.parameter_label,
              parameter_type: editingRequest.parameter_type,
              component_type: editingRequest.component_type,
              code_group_id: editingRequest.code_group_id,
              is_required: editingRequest.is_required,
              description: editingRequest.description ?? undefined,
              display_order: editingRequest.display_order,
              status: editingRequest.status,
            }}
          >
            <Form.Item label="파라미터명(JSON Key)">
              <Input value={editingRequest.parameter_name} disabled />
            </Form.Item>
            <Form.Item name="parameter_label" label="화면 표시명" rules={[{ required: true, message: '화면 표시명을 입력하세요.' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="parameter_type" label="데이터 타입" rules={[{ required: true }]}>
              <Select options={PARAMETER_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item name="component_type" label="입력 컴포넌트" rules={[{ required: true }]}>
              <Select options={COMPONENT_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item name="code_group_id" label="코드그룹">
              <Select options={codeGroupOptions} />
            </Form.Item>
            <Form.Item name="is_required" label="필수 여부">
              <Select options={[{ value: 1, label: '필수' }, { value: 0, label: '선택' }]} />
            </Form.Item>
            <Form.Item name="description" label="설명">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="display_order" label="표시 순서">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="status" label="상태">
              <Select options={[{ value: 1, label: '사용' }, { value: 0, label: '중지' }]} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={submitting}>저장</Button>
                <Button onClick={() => setEditingRequest(null)}>취소</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      <Modal open={createResponseOpen} title="Response 파라미터 등록" onCancel={() => setCreateResponseOpen(false)} destroyOnClose footer={null}>
        <Form<ResponseFormValues>
          layout="vertical"
          onFinish={handleCreateResponse}
          disabled={submitting}
          initialValues={{ parameter_type: 1, code_group_id: 0, display_order: 0 }}
        >
          <Form.Item name="parameter_name" label="항목명(JSON Key)" rules={[{ required: true, message: '항목명을 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parameter_label" label="화면 표시명" rules={[{ required: true, message: '화면 표시명을 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="parameter_type" label="데이터 타입" rules={[{ required: true }]}>
            <Select options={PARAMETER_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="code_group_id" label="코드그룹">
            <Select options={codeGroupOptions} />
          </Form.Item>
          <Form.Item name="description" label="설명">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="display_order" label="표시 순서">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>등록</Button>
              <Button onClick={() => setCreateResponseOpen(false)}>취소</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={!!editingResponse} title="Response 파라미터 수정" onCancel={() => setEditingResponse(null)} destroyOnClose footer={null}>
        {editingResponse && (
          <Form<ResponseFormValues>
            layout="vertical"
            onFinish={handleUpdateResponse}
            disabled={submitting}
            initialValues={{
              parameter_label: editingResponse.parameter_label,
              parameter_type: editingResponse.parameter_type,
              code_group_id: editingResponse.code_group_id,
              description: editingResponse.description ?? undefined,
              display_order: editingResponse.display_order,
              status: editingResponse.status,
            }}
          >
            <Form.Item label="항목명(JSON Key)">
              <Input value={editingResponse.parameter_name} disabled />
            </Form.Item>
            <Form.Item name="parameter_label" label="화면 표시명" rules={[{ required: true, message: '화면 표시명을 입력하세요.' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="parameter_type" label="데이터 타입" rules={[{ required: true }]}>
              <Select options={PARAMETER_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item name="code_group_id" label="코드그룹">
              <Select options={codeGroupOptions} />
            </Form.Item>
            <Form.Item name="description" label="설명">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="display_order" label="표시 순서">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="status" label="상태">
              <Select options={[{ value: 1, label: '사용' }, { value: 0, label: '중지' }]} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={submitting}>저장</Button>
                <Button onClick={() => setEditingResponse(null)}>취소</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
}

export default ApiDetailPage;
