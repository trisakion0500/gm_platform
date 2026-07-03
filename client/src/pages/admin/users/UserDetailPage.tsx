import { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Form, Input, Modal, Select, Space, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmModal from '../../../components/common/ConfirmModal';
import PageHeader from '../../../components/common/PageHeader';
import PermissionGuard from '../../../components/common/PermissionGuard';
import StatusBadge from '../../../components/common/StatusBadge';
import { usePermission } from '../../../hooks/usePermission';
import * as userApi from '../../../api/user.api';
import * as userRoleApi from '../../../api/userRole.api';
import * as projectApi from '../../../api/project.api';
import type { ApiFailure, ProjectRow, UserRoleRow, UserRow } from '../../../types';
import { ROLE, ROLE_LABEL } from '../../../types';

const STATUS_MAP = {
  0: { label: '승인대기', color: 'gold' },
  1: { label: '정상', color: 'green' },
  2: { label: '반려', color: 'red' },
  3: { label: '사용중지', color: 'default' },
};

const ROLE_STATUS_MAP = {
  1: { label: '활성', color: 'green' },
  0: { label: '비활성', color: 'default' },
};

const ASSIGNABLE_ROLE_OPTIONS = [
  { value: ROLE.DEVELOPER, label: ROLE_LABEL[ROLE.DEVELOPER] },
  { value: ROLE.APPROVER, label: ROLE_LABEL[ROLE.APPROVER] },
  { value: ROLE.OPERATOR, label: ROLE_LABEL[ROLE.OPERATOR] },
];

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

interface CreateRoleFormValues {
  project_id: number;
  role_code: number;
}

interface EditRoleFormValues {
  role_code: number;
  status: number;
}

const ROLE_COLUMNS: ColumnsType<UserRoleRow> = [
  { title: '프로젝트코드', dataIndex: 'project_code' },
  { title: '프로젝트명', dataIndex: 'project_name' },
  { title: '역할', dataIndex: 'role_code', render: (roleCode: number) => ROLE_LABEL[roleCode as keyof typeof ROLE_LABEL] ?? roleCode },
  { title: '상태', dataIndex: 'status', render: (status: number) => <StatusBadge status={status} map={ROLE_STATUS_MAP} /> },
  { title: '등록일', dataIndex: 'created_at' },
];

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
  const isSuperAdmin = usePermission([ROLE.SUPER_ADMIN]);
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [assignableProjects, setAssignableProjects] = useState<ProjectRow[]>([]);
  const [editingRole, setEditingRole] = useState<UserRoleRow | null>(null);

  function loadUserRoles(): void {
    setRolesLoading(true);
    userRoleApi
      .getUserRoleList({ user_id: Number(user_id) })
      .then(setUserRoles)
      .finally(() => setRolesLoading(false));
  }

  useEffect(() => {
    loadUserRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user_id]);

  async function openCreateRoleModal(): Promise<void> {
    if (!user)
      return;
    const result = await projectApi.getProjectList(1, 100, user.company_id, 1);
    const assignedProjectIds = new Set(userRoles.map((r) => r.project_id));
    setAssignableProjects(result.items.filter((p) => !assignedProjectIds.has(p.project_id)));
    setCreateRoleOpen(true);
  }

  async function handleCreateRole(values: CreateRoleFormValues): Promise<void> {
    setSubmitting(true);
    try {
      await userRoleApi.createUserRole({ user_id: Number(user_id), project_id: values.project_id, role_code: values.role_code });
      setCreateRoleOpen(false);
      loadUserRoles();
    } catch (err) {
      const message = (err as AxiosError<ApiFailure>).response?.data?.message ?? '권한 등록에 실패했습니다.';
      setErrorMessage(message);
      setCreateRoleOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRole(values: EditRoleFormValues): Promise<void> {
    if (!editingRole)
      return;
    setSubmitting(true);
    try {
      await userRoleApi.updateUserRole(Number(user_id), editingRole.project_id, values);
      setEditingRole(null);
      loadUserRoles();
    } catch (err) {
      const message = (err as AxiosError<ApiFailure>).response?.data?.message ?? '권한 수정에 실패했습니다.';
      setErrorMessage(message);
      setEditingRole(null);
    } finally {
      setSubmitting(false);
    }
  }

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

  const roleColumns: ColumnsType<UserRoleRow> = isSuperAdmin
    ? [
        ...ROLE_COLUMNS,
        {
          title: '관리',
          key: 'action',
          render: (_, record) => <Button size="small" onClick={() => setEditingRole(record)}>수정</Button>,
        },
      ]
    : ROLE_COLUMNS;

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

      <PageHeader
        title="권한 (User Role)"
        extra={
          <PermissionGuard allow={[ROLE.SUPER_ADMIN]}>
            <Button onClick={openCreateRoleModal}>권한 등록</Button>
          </PermissionGuard>
        }
      />
      <Table<UserRoleRow>
        columns={roleColumns}
        dataSource={userRoles}
        rowKey="project_id"
        loading={rolesLoading}
        pagination={false}
      />

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

      <Modal
        open={createRoleOpen}
        title="권한 등록"
        confirmLoading={submitting}
        onCancel={() => setCreateRoleOpen(false)}
        destroyOnClose
        footer={null}
      >
        <Form<CreateRoleFormValues> layout="vertical" onFinish={handleCreateRole} disabled={submitting}>
          <Form.Item name="project_id" label="프로젝트" rules={[{ required: true, message: '프로젝트를 선택하세요.' }]}>
            <Select
              options={assignableProjects.map((p) => ({ value: p.project_id, label: p.project_name }))}
              placeholder="프로젝트 선택"
            />
          </Form.Item>
          <Form.Item name="role_code" label="역할" rules={[{ required: true, message: '역할을 선택하세요.' }]}>
            <Select options={ASSIGNABLE_ROLE_OPTIONS} placeholder="역할 선택" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting}>
                등록
              </Button>
              <Button onClick={() => setCreateRoleOpen(false)}>취소</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!editingRole}
        title={`권한 수정 - ${editingRole?.project_name ?? ''}`}
        confirmLoading={submitting}
        onCancel={() => setEditingRole(null)}
        destroyOnClose
        footer={null}
      >
        {editingRole && (
          <Form<EditRoleFormValues>
            layout="vertical"
            initialValues={{ role_code: editingRole.role_code, status: editingRole.status }}
            onFinish={handleUpdateRole}
            disabled={submitting}
          >
            <Form.Item name="role_code" label="역할" rules={[{ required: true, message: '역할을 선택하세요.' }]}>
              <Select options={ASSIGNABLE_ROLE_OPTIONS} />
            </Form.Item>
            <Form.Item name="status" label="상태" rules={[{ required: true, message: '상태를 선택하세요.' }]}>
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
                <Button onClick={() => setEditingRole(null)}>취소</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
}

export default UserDetailPage;
