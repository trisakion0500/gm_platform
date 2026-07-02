import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Spin, Typography } from 'antd';
import type { AxiosError } from 'axios';
import * as authApi from '../../api/auth.api';
import { useAuthStore } from '../../stores/authStore';
import type { ApiFailure } from '../../types';

interface LoginFormValues {
  login_id: string;
  password: string;
}

function LoginPage() {
  const { accessToken, roleCode, user, setTokens, setUser, clear } = useAuthStore();
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // user는 저장하지 않으므로, 새로고침 시 남아있는 accessToken으로 /auth/me를 재조회해 세션을 복원한다
  useEffect(() => {
    if (!accessToken) {
      setCheckingSession(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => clear())
      .finally(() => setCheckingSession(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(values: LoginFormValues): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const { access_token, refresh_token, role_code } = await authApi.login(values.login_id, values.password);
      setTokens(access_token, role_code, refresh_token);
      const me = await authApi.me();
      setUser(me);
    } catch (err) {
      const message = (err as AxiosError<ApiFailure>).response?.data?.message ?? '로그인에 실패했습니다.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession)
    return <Spin fullscreen />;

  if (user) {
    return (
      <Card style={{ maxWidth: 400, margin: '80px auto' }}>
        <Typography.Title level={4}>로그인 됨</Typography.Title>
        <Typography.Paragraph>
          {user.user_name} ({user.login_id}) — role_code: {roleCode}
        </Typography.Paragraph>
        <Button onClick={clear}>로그아웃 (임시)</Button>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 360, margin: '80px auto' }}>
      <Typography.Title level={4}>GM Platform 로그인</Typography.Title>
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
      </Form>
    </Card>
  );
}

export default LoginPage;
