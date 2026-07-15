import { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Form, Input, Modal, Select, Space, Spin, Tag, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmModal from '../../../components/common/ConfirmModal';
import PageHeader from '../../../components/common/PageHeader';
import PermissionGuard from '../../../components/common/PermissionGuard';
import StatusBadge from '../../../components/common/StatusBadge';
import * as projectApi from '../../../api/project.api';
import { useGlobalStore } from '../../../stores/globalStore';
import { getErrorMessage } from '../../../utils/error';
import { CODE_PATTERN, CODE_PATTERN_MESSAGE } from '../../../constants/validation';
import { ACTIVE_STATUS_MAP } from '../../../constants/statusMaps';
import type { ProjectRow } from '../../../types';
import { ROLE } from '../../../types';

interface ProjectEditFormValues {
  project_code: string;
  project_name: string;
  description?: string;
  status: number;
}

interface ProjectConnectionFormValues {
  api_base_url: string;
}

function ProjectDetailPage() {
  const { project_id } = useParams();
  const navigate = useNavigate();
  const projectList = useGlobalStore((state) => state.projectList);
  const setProjectList = useGlobalStore((state) => state.setProjectList);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editingConnection, setEditingConnection] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiKeyConfirmOpen, setApiKeyConfirmOpen] = useState(false);
  const [issuedApiKey, setIssuedApiKey] = useState<string | null>(null);
  const [keyRevokedNotice, setKeyRevokedNotice] = useState(false);

  useEffect(() => {
    setLoading(true);
    projectApi
      .getProject(Number(project_id))
      .then(setProject)
      .catch((err: unknown) => {
        setErrorMessage(getErrorMessage(err, '프로젝트 정보를 불러오지 못했습니다.'));
      })
      .finally(() => setLoading(false));
  }, [project_id]);

  async function handleSave(values: ProjectEditFormValues): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const updated = await projectApi.updateProject(Number(project_id), values);
      setProject(updated);
      setProjectList(
        projectList.map((p) =>
          p.project_id === updated.project_id
            ? { project_id: updated.project_id, company_id: updated.company_id, project_name: updated.project_name }
            : p,
        ),
      );
      setEditing(false);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, '프로젝트 수정에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveConnection(values: ProjectConnectionFormValues): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const updated = await projectApi.updateProjectConnection(Number(project_id), values.api_base_url);
      if (project?.has_api_key === 1 && updated.has_api_key === 0)
        setKeyRevokedNotice(true);
      setProject(updated);
      setEditingConnection(false);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, '연결 정보 수정에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleIssueApiKey(): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const updated = await projectApi.issueProjectApiKey(Number(project_id));
      setProject(updated);
      setIssuedApiKey(updated.api_key);
      setKeyRevokedNotice(false);
      setApiKeyConfirmOpen(false);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, 'API 키 발급에 실패했습니다.'));
      setApiKeyConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <Spin />;

  if (errorMessage && !project) {
    return (
      <>
        <PageHeader title="프로젝트 상세" />
        <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />
        <Button onClick={() => navigate('/admin/projects')}>목록으로</Button>
      </>
    );
  }

  if (!project)
    return null;

  if (editing) {
    return (
      <>
        <PageHeader title="프로젝트 수정" />
        {errorMessage && <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />}
        <Form<ProjectEditFormValues>
          layout="vertical"
          style={{ maxWidth: 480 }}
          initialValues={{
            project_code: project.project_code,
            project_name: project.project_name,
            description: project.description ?? undefined,
            status: project.status,
          }}
          onFinish={handleSave}
          disabled={submitting}
        >
          <Form.Item label="회사">
            <Input value={project.company_name} disabled />
          </Form.Item>
          <Form.Item
            name="project_code"
            label="프로젝트코드"
            rules={[
              { required: true, message: '프로젝트코드를 입력하세요.' },
              { pattern: CODE_PATTERN, message: CODE_PATTERN_MESSAGE },
              { max: 20, message: '프로젝트코드는 최대 20자입니다.' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="project_name"
            label="프로젝트명"
            rules={[
              { required: true, message: '프로젝트명을 입력하세요.' },
              { max: 100, message: '프로젝트명은 최대 100자입니다.' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="설명" rules={[{ max: 1000, message: '설명은 최대 1000자입니다.' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="상태">
            <Select
              options={[
                { value: 1, label: '활성' },
                { value: 0, label: '비활성' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                저장
              </Button>
              <Button onClick={() => setEditing(false)}>취소</Button>
            </Space>
          </Form.Item>
        </Form>
      </>
    );
  }

  if (editingConnection) {
    return (
      <>
        <PageHeader title="프로젝트 연결정보 수정" />
        {errorMessage && <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />}
        <Form<ProjectConnectionFormValues>
          layout="vertical"
          style={{ maxWidth: 480 }}
          initialValues={{ api_base_url: project.api_base_url }}
          onFinish={handleSaveConnection}
          disabled={submitting}
        >
          <Form.Item
            name="api_base_url"
            label="API Base URL"
            rules={[
              { required: true, message: 'API Base URL을 입력하세요.' },
              { max: 255, message: 'API Base URL은 최대 255자입니다.' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                저장
              </Button>
              <Button onClick={() => setEditingConnection(false)}>취소</Button>
            </Space>
          </Form.Item>
        </Form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="프로젝트 상세"
        extra={
          <Space>
            <PermissionGuard allow={[ROLE.SUPER_ADMIN]}>
              <Button onClick={() => setEditing(true)}>수정</Button>
            </PermissionGuard>
            <PermissionGuard allow={[ROLE.SUPER_ADMIN, ROLE.DEVELOPER]}>
              <Button onClick={() => setEditingConnection(true)}>연결정보 수정</Button>
              <Button onClick={() => setApiKeyConfirmOpen(true)}>
                {project.has_api_key === 1 ? 'API 키 재발급' : 'API 키 발급'}
              </Button>
            </PermissionGuard>
            <Button onClick={() => navigate('/admin/projects')}>목록으로</Button>
          </Space>
        }
      />
      {keyRevokedNotice && (
        <Alert
          type="warning"
          showIcon
          message="API 키가 폐기되었습니다 — 재발급 필요"
          description="API Base URL이 변경되어 기존에 발급된 API 키가 자동으로 폐기되었습니다. 대상 서버가 이 키를 사용 중이라면 재발급 후 다시 설정해야 합니다."
          style={{ marginBottom: 16 }}
        />
      )}
      <Descriptions bordered column={1} labelStyle={{ width: 160 }}>
        <Descriptions.Item label="회사">{project.company_name}</Descriptions.Item>
        <Descriptions.Item label="프로젝트코드">{project.project_code}</Descriptions.Item>
        <Descriptions.Item label="프로젝트명">{project.project_name}</Descriptions.Item>
        <Descriptions.Item label="API Base URL">{project.api_base_url}</Descriptions.Item>
        <Descriptions.Item label="API 키">
          {project.has_api_key === 1 ? <Tag color="green">발급됨</Tag> : <Tag>미발급</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="설명">{project.description ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="상태">
          <StatusBadge status={project.status} map={ACTIVE_STATUS_MAP} />
        </Descriptions.Item>
        <Descriptions.Item label="등록일">{project.created_at}</Descriptions.Item>
        <Descriptions.Item label="수정일">{project.updated_at}</Descriptions.Item>
      </Descriptions>

      <ConfirmModal
        open={apiKeyConfirmOpen}
        title={project.has_api_key === 1 ? 'API 키 재발급' : 'API 키 발급'}
        content={
          project.has_api_key === 1
            ? '재발급하면 기존 API 키는 즉시 무효화됩니다. 대상 서버에 설정된 키도 함께 갱신해야 합니다. 계속하시겠습니까?'
            : 'GM Platform이 이 프로젝트의 대상 서버 호출에 사용할 X-API-Key를 발급합니다. 발급된 키는 이번 한 번만 화면에 표시됩니다. 계속하시겠습니까?'
        }
        danger={project.has_api_key === 1}
        confirmLoading={submitting}
        onOk={handleIssueApiKey}
        onCancel={() => setApiKeyConfirmOpen(false)}
      />

      <Modal
        open={issuedApiKey !== null}
        title="API 키 발급 완료"
        onCancel={() => setIssuedApiKey(null)}
        footer={<Button type="primary" onClick={() => setIssuedApiKey(null)}>확인</Button>}
        closable={false}
        maskClosable={false}
      >
        <Alert
          type="warning"
          showIcon
          message="이 키는 지금만 확인할 수 있습니다"
          description="창을 닫으면 평문을 다시 조회할 수 없습니다. 지금 복사해 대상 서버(test_game_server 등)의 X-API-Key 설정에 붙여넣으세요."
          style={{ marginBottom: 16 }}
        />
        <Typography.Paragraph copyable={{ text: issuedApiKey ?? '' }} code style={{ wordBreak: 'break-all' }}>
          {issuedApiKey}
        </Typography.Paragraph>
      </Modal>
    </>
  );
}

export default ProjectDetailPage;
