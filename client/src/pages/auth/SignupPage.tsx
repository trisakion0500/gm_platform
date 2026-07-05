import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Result, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../../api/auth.api';
import * as companyApi from '../../api/company.api';
import * as projectApi from '../../api/project.api';
import { getErrorMessage } from '../../utils/error';

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9_.-]+$/;

interface SignupFormValues {
  company_code: string;
  project_code?: string;
  login_id: string;
  user_name: string;
  email: string;
  phone_number: string;
  department?: string;
  position?: string;
  password: string;
  password_confirm: string;
}

function SignupPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm<SignupFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(values: SignupFormValues): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      let companyId: number;
      try {
        companyId = (await companyApi.getCompanyByCode(values.company_code.trim())).company_id;
      } catch (err) {
        form.setFields([
          { name: 'company_code', errors: [getErrorMessage(err, '회사코드를 확인하세요.')] },
        ]);
        return;
      }

      let projectId: number | undefined;
      if (values.project_code?.trim()) {
        try {
          projectId = (await projectApi.getProjectByCode(companyId, values.project_code.trim())).project_id;
        } catch (err) {
          form.setFields([
            { name: 'project_code', errors: [getErrorMessage(err, '프로젝트코드를 확인하세요.')] },
          ]);
          return;
        }
      }

      await authApi.signup({
        company_id: companyId,
        requested_project_id: projectId,
        login_id: values.login_id,
        password: values.password,
        user_name: values.user_name,
        email: values.email,
        phone_number: values.phone_number,
        department: values.department || undefined,
        position: values.position || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setErrorMessage(getErrorMessage(err, '회원가입에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card style={{ maxWidth: 420, margin: '80px auto' }}>
        <Result
          status="success"
          title="가입 신청이 완료되었습니다"
          subTitle="관리자 승인 후 로그인할 수 있습니다."
          extra={
            <Button type="primary" onClick={() => navigate('/login')}>
              로그인 화면으로
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 420, margin: '40px auto' }}>
      <Typography.Title level={4} style={{ textAlign: 'center' }}>
        {import.meta.env.VITE_APP_NAME}
      </Typography.Title>
      {errorMessage && <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />}
      <Form<SignupFormValues> form={form} layout="vertical" onFinish={handleSubmit} disabled={submitting}>
        <Form.Item
          name="company_code"
          label="회사코드"
          extra="담당자에게 문의하여 회사코드를 받아 입력하세요."
          rules={[{ required: true, message: '회사코드를 입력하세요.' }]}
        >
          <Input autoFocus />
        </Form.Item>
        <Form.Item name="project_code" label="프로젝트코드 (선택)" extra="담당자에게 문의하여 프로젝트코드를 받아 입력하세요.">
          <Input />
        </Form.Item>
        <Form.Item
          name="login_id"
          label="아이디"
          rules={[
            { required: true, message: '아이디를 입력하세요.' },
            { pattern: LOGIN_ID_PATTERN, message: '영문, 숫자, _, ., - 만 사용할 수 있습니다.' },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="user_name" label="이름" rules={[{ required: true, message: '이름을 입력하세요.' }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="email"
          label="이메일"
          rules={[
            { required: true, message: '이메일을 입력하세요.' },
            { type: 'email', message: '이메일 형식이 올바르지 않습니다.' },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="phone_number" label="휴대폰번호" rules={[{ required: true, message: '휴대폰번호를 입력하세요.' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="department" label="부서 (선택)">
          <Input />
        </Form.Item>
        <Form.Item name="position" label="직급 (선택)">
          <Input />
        </Form.Item>
        <Form.Item name="password" label="비밀번호" rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="password_confirm"
          label="비밀번호 확인"
          dependencies={['password']}
          rules={[
            { required: true, message: '비밀번호를 다시 입력하세요.' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value)
                  return Promise.resolve();
                return Promise.reject(new Error('비밀번호가 일치하지 않습니다.'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            가입 신청
          </Button>
        </Form.Item>
        <Typography.Paragraph style={{ textAlign: 'center', marginBottom: 0 }}>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </Typography.Paragraph>
      </Form>
    </Card>
  );
}

export default SignupPage;
