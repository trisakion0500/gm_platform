import { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Form, Input, Modal, Space, Spin } from 'antd';
import type { AxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmModal from '../../../components/common/ConfirmModal';
import PageHeader from '../../../components/common/PageHeader';
import PermissionGuard from '../../../components/common/PermissionGuard';
import StatusBadge from '../../../components/common/StatusBadge';
import * as userApi from '../../../api/user.api';
import type { ApiFailure, UserRow } from '../../../types';
import { ROLE } from '../../../types';

const STATUS_MAP = {
  0: { label: '승인대기', color: 'gold' },
  1: { label: '정상', color: 'green' },
  2: { label: '반려', color: 'red' },
  3: { label: '사용중지', color: 'default' },
};

interface UserEditFormValues {
  user_name: string;
  email: string;
  phone_number: string;
  department?: string;
  position?: string;
}

interface ResetPasswordFormValues {
  new_password: string;
}

type ConfirmAction = 'approve' | 'reject' | 'suspend' | 'resume';

const CONFIRM_CONTENT: Record<ConfirmAction, { title: string; content: string; danger?: boolean }> = {
  approve: { title: '가입 승인', content: '이 사용자의 가입을 승인하시겠습니까?' },
  reject: { title: '가입 반려', content: '이 사용자의 가입을 반려하시겠습니까?', danger: true },
  suspend: { title: '사용 중지', content: '이 사용자를 사용 중지 처리하시겠습니까?', danger: true },
  resume: { title: '재개', content: '이 사용자를 다시 정상 상태로 전환하시겠습니까?' },
};

function UserDetailPage() {
  const { user_id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  function loadUser(): void {
    setLoading(true);
    userApi
      .getUser(Number(user_id))
      .then(setUser)
      .catch((err: AxiosError<ApiFailure>) => {
        setErrorMessage(err.response?.data?.message ?? '사용자 정보를 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user_id]);

  async function handleSave(values: UserEditFormValues): Promise<void> {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const updated = await userApi.updateUser(Number(user_id), values);
      setUser(updated);
      setEditing(false);
    } catch (err) {
      const message = (err as AxiosError<ApiFailure>).response?.data?.message ?? '사용자 수정에 실패했습니다.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmAction(): Promise<void> {
    if (!confirmAction)
      return;
    setSubmitting(true);
    try {
      if (confirmAction === 'approve')
        await userApi.approveUser(Number(user_id));
      else if (confirmAction === 'reject')
        await userApi.rejectUser(Number(user_id));
      else if (confirmAction === 'suspend')
        await userApi.updateUser(Number(user_id), { status: 3 });
      else if (confirmAction === 'resume')
        await userApi.updateUser(Number(user_id), { status: 1 });
      setConfirmAction(null);
      loadUser();
    } catch (err) {
      const message = (err as AxiosError<ApiFailure>).response?.data?.message ?? '처리에 실패했습니다.';
      setErrorMessage(message);
      setConfirmAction(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(values: ResetPasswordFormValues): Promise<void> {
    setSubmitting(true);
    try {
      await userApi.resetPassword(Number(user_id), values.new_password);
      setResetPasswordOpen(false);
    } catch (err) {
      const message = (err as AxiosError<ApiFailure>).response?.data?.message ?? '비밀번호 초기화에 실패했습니다.';
      setErrorMessage(message);
      setResetPasswordOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <Spin />;

  if (errorMessage && !user) {
    return (
      <>
        <PageHeader title="사용자 상세" />
        <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />
        <Button onClick={() => navigate('/admin/users')}>목록으로</Button>
      </>
    );
  }

  if (!user)
    return null;

  if (editing) {
    return (
      <>
        <PageHeader title="사용자 수정" />
        {errorMessage && <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />}
        <Form<UserEditFormValues>
          layout="vertical"
          style={{ maxWidth: 480 }}
          initialValues={{
            user_name: user.user_name,
            email: user.email,
            phone_number: user.phone_number,
            department: user.department ?? undefined,
            position: user.position ?? undefined,
          }}
          onFinish={handleSave}
          disabled={submitting}
        >
          <Form.Item label="로그인ID">
            <Input value={user.login_id} disabled />
          </Form.Item>
          <Form.Item
            name="user_name"
            label="이름"
            rules={[{ required: true, message: '이름을 입력하세요.' }, { max: 100, message: '이름은 최대 100자입니다.' }]}
          >
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
          <Form.Item
            name="phone_number"
            label="휴대폰번호"
            rules={[
              { required: true, message: '휴대폰번호를 입력하세요.' },
              { max: 20, message: '휴대폰번호는 최대 20자입니다.' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="department" label="부서" rules={[{ max: 100, message: '부서는 최대 100자입니다.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="position" label="직급" rules={[{ max: 100, message: '직급은 최대 100자입니다.' }]}>
            <Input />
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
        title="사용자 상세"
        extra={
          <Space>
            <PermissionGuard allow={[ROLE.SUPER_ADMIN]}>
              {user.status === 0 && (
                <>
                  <Button onClick={() => setConfirmAction('approve')}>승인</Button>
                  <Button danger onClick={() => setConfirmAction('reject')}>
                    반려
                  </Button>
                </>
              )}
              {user.status === 1 && (
                <Button danger onClick={() => setConfirmAction('suspend')}>
                  사용중지
                </Button>
              )}
              {user.status === 3 && <Button onClick={() => setConfirmAction('resume')}>재개</Button>}
              <Button onClick={() => setResetPasswordOpen(true)}>비밀번호 초기화</Button>
              <Button onClick={() => setEditing(true)}>수정</Button>
            </PermissionGuard>
            <Button onClick={() => navigate('/admin/users')}>목록으로</Button>
          </Space>
        }
      />
      {errorMessage && <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />}
      <Descriptions bordered column={1} labelStyle={{ width: 160 }}>
        <Descriptions.Item label="로그인ID">{user.login_id}</Descriptions.Item>
        <Descriptions.Item label="이름">{user.user_name}</Descriptions.Item>
        <Descriptions.Item label="이메일">{user.email}</Descriptions.Item>
        <Descriptions.Item label="휴대폰번호">{user.phone_number}</Descriptions.Item>
        <Descriptions.Item label="부서">{user.department ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="직급">{user.position ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="소속회사">{user.company_name}</Descriptions.Item>
        <Descriptions.Item label="상태">
          <StatusBadge status={user.status} map={STATUS_MAP} />
        </Descriptions.Item>
        <Descriptions.Item label="최근 로그인">{user.last_login_at ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="가입일">{user.created_at}</Descriptions.Item>
        <Descriptions.Item label="수정일">{user.updated_at}</Descriptions.Item>
      </Descriptions>

      {confirmAction && (
        <ConfirmModal
          open
          title={CONFIRM_CONTENT[confirmAction].title}
          content={CONFIRM_CONTENT[confirmAction].content}
          danger={CONFIRM_CONTENT[confirmAction].danger}
          confirmLoading={submitting}
          onOk={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <Modal
        open={resetPasswordOpen}
        title="비밀번호 강제 초기화"
        confirmLoading={submitting}
        onCancel={() => setResetPasswordOpen(false)}
        destroyOnClose
        footer={null}
      >
        <Form<ResetPasswordFormValues> layout="vertical" onFinish={handleResetPassword} disabled={submitting}>
          <Form.Item
            name="new_password"
            label="새 비밀번호"
            rules={[
              { required: true, message: '새 비밀번호를 입력하세요.' },
              { min: 4, message: '비밀번호는 최소 4자 이상이어야 합니다.' },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                초기화
              </Button>
              <Button onClick={() => setResetPasswordOpen(false)}>취소</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default UserDetailPage;
