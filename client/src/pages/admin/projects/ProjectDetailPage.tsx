import { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Form, Input, Select, Space, Spin } from 'antd';
import type { AxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import PermissionGuard from '../../../components/common/PermissionGuard';
import StatusBadge from '../../../components/common/StatusBadge';
import * as projectApi from '../../../api/project.api';
import { useGlobalStore } from '../../../stores/globalStore';
import type { ApiFailure, ProjectRow } from '../../../types';
import { ROLE } from '../../../types';

const STATUS_MAP = {
  1: { label: '활성', color: 'green' },
  0: { label: '비활성', color: 'default' },
};

const PROJECT_CODE_PATTERN = /^[a-zA-Z0-9_.-]+$/;

interface ProjectEditFormValues {
  project_code: string;
  project_name: string;
  api_base_url: string;
  description?: string;
  status: number;
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    projectApi
      .getProject(Number(project_id))
      .then(setProject)
      .catch((err: AxiosError<ApiFailure>) => {
        setErrorMessage(err.response?.data?.message ?? '프로젝트 정보를 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, [project_id]);

  async function handleSave(values: ProjectEditFormValues): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const updated = await projectApi.updateProject(Number(project_id), values);
      setProject(updated);
      setProjectList(projectList.map((p) => (p.project_id === updated.project_id ? updated : p)));
      setEditing(false);
    } catch (err) {
      const message = (err as AxiosError<ApiFailure>).response?.data?.message ?? '프로젝트 수정에 실패했습니다.';
      setErrorMessage(message);
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
            api_base_url: project.api_base_url,
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
              { pattern: PROJECT_CODE_PATTERN, message: '영문, 숫자, _, ., - 만 사용할 수 있습니다.' },
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

  return (
    <>
      <PageHeader
        title="프로젝트 상세"
        extra={
          <Space>
            <PermissionGuard allow={[ROLE.SUPER_ADMIN]}>
              <Button onClick={() => setEditing(true)}>수정</Button>
            </PermissionGuard>
            <Button onClick={() => navigate('/admin/projects')}>목록으로</Button>
          </Space>
        }
      />
      <Descriptions bordered column={1} labelStyle={{ width: 160 }}>
        <Descriptions.Item label="회사">{project.company_name}</Descriptions.Item>
        <Descriptions.Item label="프로젝트코드">{project.project_code}</Descriptions.Item>
        <Descriptions.Item label="프로젝트명">{project.project_name}</Descriptions.Item>
        <Descriptions.Item label="API Base URL">{project.api_base_url}</Descriptions.Item>
        <Descriptions.Item label="설명">{project.description ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="상태">
          <StatusBadge status={project.status} map={STATUS_MAP} />
        </Descriptions.Item>
        <Descriptions.Item label="등록일">{project.created_at}</Descriptions.Item>
        <Descriptions.Item label="수정일">{project.updated_at}</Descriptions.Item>
      </Descriptions>
    </>
  );
}

export default ProjectDetailPage;
