import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Select, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import * as projectApi from '../../../api/project.api';
import { useGlobalStore } from '../../../stores/globalStore';
import { getErrorMessage } from '../../../utils/error';

const PROJECT_CODE_PATTERN = /^[a-zA-Z0-9_.-]+$/;

interface ProjectFormValues {
  company_id: number;
  project_code: string;
  project_name: string;
  api_base_url: string;
  description?: string;
}

function ProjectNewPage() {
  const navigate = useNavigate();
  const companyList = useGlobalStore((state) => state.companyList);
  const projectList = useGlobalStore((state) => state.projectList);
  const setProjectList = useGlobalStore((state) => state.setProjectList);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(values: ProjectFormValues): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const project = await projectApi.createProject(values);
      setProjectList([...projectList, { project_id: project.project_id, company_id: project.company_id, project_name: project.project_name }]);
      navigate(`/admin/projects/${project.project_id}`);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, '프로젝트 등록에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="프로젝트 등록" />
      <Card style={{ maxWidth: 480 }}>
        {errorMessage && <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />}
        <Form<ProjectFormValues> layout="vertical" onFinish={handleSubmit} disabled={submitting}>
          <Form.Item name="company_id" label="회사" rules={[{ required: true, message: '회사를 선택하세요.' }]}>
            <Select
              placeholder="회사 선택"
              options={companyList.map((c) => ({ value: c.company_id, label: c.company_name }))}
            />
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
            <Input autoFocus />
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
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                등록
              </Button>
              <Button onClick={() => navigate('/admin/projects')}>취소</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}

export default ProjectNewPage;
