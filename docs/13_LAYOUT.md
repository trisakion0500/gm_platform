# 13_LAYOUT.md

# 공통 레이아웃 구조

---

# 1. 레이아웃 타입

| 타입 | 적용 Route | 사이드바 | 비고 |
| ----------- | ----------------------------------------- | -------- | -------------------- |
| AuthLayout | `/login`, `/signup` | 없음 | 미인증 전용 |
| MainLayout | `/apis`, `/executions`, `/code-groups` 등 | 비관리 메뉴 | 기본 레이아웃 |
| AdminLayout | `/admin/*` | 관리 메뉴 | OPERATOR 접근 불가 |

---

# 2. 공통 Header

MainLayout, AdminLayout에서 동일하게 사용한다.

```
┌──────────────────────────────────────────────────────────────────┐
│  [GM Platform]  [회사 ▼]  [프로젝트 ▼]          [관리] [홍길동 ▼] │
└──────────────────────────────────────────────────────────────────┘
```

## 2.1 요소별 동작

| 요소 | 동작 |
| -------------- | ------------------------------------------------------------ |
| 로고 | 클릭 시 `/apis` 이동 |
| 회사 선택 | SUPER_ADMIN: 전체 회사 목록 드롭다운 / 그 외: 본인 회사 고정 (비활성) |
| 프로젝트 선택 | 선택된 회사 기준 프로젝트 목록 / 회사 변경 시 초기화 |
| [관리] 버튼 | OPERATOR 제외 노출. 클릭 시 `/admin` 이동 |
| 사용자명 드롭다운 | 내 계정(`/my-account`) / 로그아웃 |

## 2.2 역할별 Header 노출

| 요소 | SUPER_ADMIN | DEVELOPER | APPROVER | OPERATOR |
| -------------------- | :---------: | :-------: | :------: | :------: |
| 회사 선택 (드롭다운) | O | - (고정) | - (고정) | - (고정) |
| 프로젝트 선택 | O | O | O | O |
| [관리] 버튼 | O | O | O | - |

---

# 3. MainLayout

비관리 업무 화면의 기본 레이아웃.

```
┌──────────────────────────────────────────────────────┐
│ Header                                               │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│ Sidebar  │ Content                                   │
│          │                                           │
│ API      │                                           │
│ 실행이력 │                                           │
│ 승인대기 │                                           │
│ 코드     │                                           │
│ ──────── │                                           │
│ 내 계정  │                                           │
│          │                                           │
├──────────┴───────────────────────────────────────────┤
│ Footer                                               │
└──────────────────────────────────────────────────────┘
```

## 3.1 Sidebar 메뉴 및 역할별 노출

| 메뉴 | Route | SUPER_ADMIN | DEVELOPER | APPROVER | OPERATOR |
| -------- | ---------------------- | :---------: | :-------: | :------: | :------: |
| API | `/apis` | O | O | O | O |
| 실행이력 | `/executions` | O | O | O | O |
| 승인대기 | `/executions/pending` | O | O | O | - |
| 코드 | `/code-groups` | O | O | O | O |
| 내 계정 | `/my-account` | O | O | O | O |

---

# 4. AdminLayout

관리 업무 화면의 레이아웃. OPERATOR 접근 불가.

```
┌──────────────────────────────────────────────────────┐
│ Header                                               │
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│ Sidebar  │ Content                                   │
│          │                                           │
│ 회사     │                                           │
│ 프로젝트 │                                           │
│ 사용자   │                                           │
│ 감사로그 │                                           │
│          │                                           │
├──────────┴───────────────────────────────────────────┤
│ Footer                                               │
└──────────────────────────────────────────────────────┘
```

## 4.1 Sidebar 메뉴 및 역할별 노출

| 메뉴 | Route | SUPER_ADMIN | DEVELOPER | APPROVER | OPERATOR |
| -------- | ----------------------- | :---------: | :-------: | :------: | :------: |
| 회사 | `/admin/companies` | O | O | - | - |
| 프로젝트 | `/admin/projects` | O | O | - | - |
| 사용자 | `/admin/users` | O | O | - | - |
| 감사로그 | `/admin/audit-logs` | O | O | O | - |

> APPROVER는 감사로그만 접근 가능. `/admin` 진입 시 `/admin/audit-logs`로 리다이렉트.

---

# 5. AuthLayout

미인증 사용자 전용. 사이드바·헤더·푸터 없이 중앙 정렬.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│               ┌──────────────────┐                  │
│               │  로그인 / 회원가입 │                  │
│               │       폼          │                  │
│               └──────────────────┘                  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- 인증 후 접근 시 `/apis`로 리다이렉트.

---

# 6. Footer

MainLayout, AdminLayout 하단 공통.

```
© 2025 GM Platform  |  v1.0.0  |  문의: support@example.com
```

---

# 7. Route 구조

```
/login                        → AuthLayout   (미인증 전용)
/signup                       → AuthLayout   (미인증 전용)
/                             → redirect → /apis

/apis                         → MainLayout
/apis/new                     → MainLayout
/apis/:api_id                 → MainLayout
/executions                   → MainLayout
/executions/pending           → MainLayout
/executions/:api_execution_id → MainLayout
/code-groups                  → MainLayout
/code-groups/:code_group_id   → MainLayout
/my-account                   → MainLayout

/admin                        → AdminLayout  (역할별 첫 메뉴로 redirect)
/admin/companies              → AdminLayout
/admin/companies/new          → AdminLayout
/admin/companies/:company_id  → AdminLayout
/admin/projects               → AdminLayout
/admin/projects/new           → AdminLayout
/admin/projects/:project_id   → AdminLayout
/admin/users                  → AdminLayout
/admin/users/:user_id         → AdminLayout
/admin/audit-logs             → AdminLayout
/admin/audit-logs/:log_audit_id → AdminLayout
```

---

# 8. 라우트 가드

| 조건 | 처리 |
| ----------------------------------------- | ------------------------------------------------- |
| 미인증 상태로 인증 필요 Route 접근 | `/login` 리다이렉트 |
| 인증 상태로 `/login`, `/signup` 접근 | `/apis` 리다이렉트 |
| OPERATOR가 `/admin/*` 접근 | 403 페이지 |
| APPROVER가 `/admin/companies`, `/admin/projects`, `/admin/users` 접근 | 403 페이지 |
| `/admin` 접근 시 역할별 첫 메뉴 redirect | SUPER_ADMIN / DEVELOPER → `/admin/companies` / APPROVER → `/admin/audit-logs` |

---

# 9. 전역 상태 (Zustand)

## authStore

| 필드 | 타입 | 설명 |
| --------------- | -------------- | ---------------------------- |
| user | User \| null | 로그인 사용자 정보 (id, name, role) |
| accessToken | string \| null | JWT Access Token |
| isAuthenticated | boolean | 인증 여부 |

## globalStore

| 필드 | 타입 | 설명 |
| ----------------- | -------------- | ------------------------------ |
| selectedCompanyId | number \| null | 헤더에서 선택된 회사 |
| selectedProjectId | number \| null | 헤더에서 선택된 프로젝트 |
| companyList | Company[] | 회사 목록 캐시 |
| projectList | Project[] | 선택 회사 기준 프로젝트 목록 캐시 |

---

# 10. 공통 컴포넌트

| 컴포넌트 | 설명 |
| -------------- | ------------------------------------------------ |
| PermissionGuard | role 조건 충족 시만 children 렌더링 |
| PageHeader | 페이지 제목 + 우측 액션 버튼 영역 |
| DataTable | Ant Design Table 래퍼 (페이지네이션 / 로딩 / 빈 상태 공통 처리) |
| StatusBadge | status 값을 색상 뱃지로 표시 |
| FormModal | 등록/수정 공통 모달 (React Hook Form 연동) |
| ConfirmModal | 승인 / 반려 / 삭제 등 확인 모달 |
