import { useState } from 'react';
import { Alert, Button, Card, Descriptions, Form, Input, Space } from 'antd';
import type { AxiosError } from 'axios';
import PageHeader from '../../../components/common/PageHeader';
import * as authApi from '../../../api/auth.api';
import { useAuth } from '../../../hooks/useAuth';
import { useGlobalStore } from '../../../stores/globalStore';
import type { ApiFailure } from '../../../types';

interface PasswordFormValues {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

function MyAccountPage() {
  const { user, logout } = useAuth();
  const companyList = useGlobalStore((state) => state.companyList);
  const [form] = Form.useForm<PasswordFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const companyName = companyList.find((c) => c.company_id === user?.company_id)?.company_name ?? '-';

  async function handleChangePassword(values: PasswordFormValues): Promise<void> {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      await authApi.changePassword(values.current_password, values.new_password);
      setSuccessMessage('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
      form.resetFields();
      setTimeout(logout, 1500);
    } catch (err) {
      setErrorMessage((err as AxiosError<ApiFailure>).response?.data?.message ?? '비밀번호 변경에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user)
    return null;

  return (
    <>
      <PageHeader title="내 계정" extra={<Button onClick={logout}>로그아웃</Button>} />

      <Card title="내 정보" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2} labelStyle={{ width: 140 }}>
          <Descriptions.Item label="아이디">{user.login_id}</Descriptions.Item>
          <Descriptions.Item label="이름">{user.user_name}</Descriptions.Item>
          <Descriptions.Item label="이메일">{user.email}</Descriptions.Item>
          <Descriptions.Item label="소속 회사">{companyName}</Descriptions.Item>
          <Descriptions.Item label="최근 로그인" span={2}>
            {user.last_login_at ?? '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="비밀번호 변경">
        {errorMessage && <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />}
        {successMessage && <Alert type="success" message={successMessage} showIcon style={{ marginBottom: 16 }} />}
        <Form<PasswordFormValues> form={form} layout="vertical" onFinish={handleChangePassword} disabled={submitting} style={{ maxWidth: 360 }}>
          <Form.Item
            name="current_password"
            label="현재 비밀번호"
            rules={[{ required: true, message: '현재 비밀번호를 입력하세요.' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="new_password" label="새 비밀번호" rules={[{ required: true, message: '새 비밀번호를 입력하세요.' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="new_password_confirm"
            label="새 비밀번호 확인"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '새 비밀번호를 다시 입력하세요.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value)
                    return Promise.resolve();
                  return Promise.reject(new Error('비밀번호가 일치하지 않습니다.'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                비밀번호 변경
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}

export default MyAccountPage;
