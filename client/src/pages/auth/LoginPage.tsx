import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import type { AxiosError } from 'axios';
import { Link } from 'react-router-dom';
import * as authApi from '../../api/auth.api';
import { useAuthStore } from '../../stores/authStore';
import type { ApiFailure } from '../../types';

interface LoginFormValues {
  login_id: string;
  password: string;
}

function LoginPage() {
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 성공 시 accessToken이 채워지면 GuestGuard가 /apis로 리다이렉트한다 — 여기서 직접 navigate하지 않음
  async function handleSubmit(values: LoginFormValues): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const { access_token, refresh_token, role_code } = await authApi.login(values.login_id, values.password);
      setTokens(access_token, role_code, refresh_token);
      setUser(await authApi.me());
    } catch (err) {
      const message = (err as AxiosError<ApiFailure>).response?.data?.message ?? '로그인에 실패했습니다.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card style={{ maxWidth: 360, margin: '80px auto' }}>
      <Typography.Title level={4} style={{ textAlign: 'center' }}>
        {import.meta.env.VITE_APP_NAME}
      </Typography.Title>
      {errorMessage && (
        <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />
      )}
      <Form<LoginFormValues> layout="vertical" onFinish={handleSubmit} disabled={submitting}>
        <Form.Item
          name="login_id"
          label="아이디"
          rules={[{ required: true, message: '아이디를 입력하세요.' }]}
        >
          <Input autoFocus />
        </Form.Item>
        <Form.Item
          name="password"
          label="비밀번호"
          rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            로그인
          </Button>
        </Form.Item>
        <Typography.Paragraph style={{ textAlign: 'center', marginBottom: 0 }}>
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </Typography.Paragraph>
      </Form>
    </Card>
  );
}

export default LoginPage;
