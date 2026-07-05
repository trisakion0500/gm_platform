# 13_LAYOUT.md

# 공통 레이아웃 구조

---

# 1. 레이아웃 타입

| 타입 | 적용 Route | 사이드바 | 비고 |
| ----------- | ----------------------------------------- | -------- | -------------------- |
| AuthLayout | `/login`, `/signup` | 없음 | 미인증 전용, 공통 Footer만 적용 |
| MainLayout | `/apis`, `/executions` 등 | 비관리 메뉴 | 기본 레이아웃 |
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
| 회사 선택 | SUPER_ADMIN: 전체 회사 목록 드롭다운("전체 회사" 옵션 포함) / 그 외: 본인 회사 고정 (비활성) |
| 프로젝트 선택 | 선택된 회사 기준 프로젝트 목록 / 회사 변경 시 초기화. SUPER_ADMIN만 "전체 프로젝트" 선택 가능 |
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
│ ▾ API    │                                           │
│   ☑ API1 │                                           │
│   ☐ API2 │                                           │
│ 실행이력 │                                           │
│ 승인대기 │                                           │
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

> "API"는 다른 항목과 달리 펼치기/접기가 가능한 항목이라 클릭 영역이 둘로 나뉜다 — 캐럿 아이콘(항상 보이는 원형 배경, 호버에 의존하지 않음 — 터치 기기 대응)을 누르면 펼치기/접기만 되고, "API" 텍스트를 누르면 펼침 상태를 유지한 채 `/apis`로 이동한다. 펼치면 현재 선택된 프로젝트의 활성 API가 체크박스 목록으로 나타나고(실행 불가능한 `api_stage`의 API는 숨김, §3.2 기준 역할별 실행 가능 여부로 필터), 체크하면 `/apis`로 이동하며 우측 작업영역에 해당 API 패널이 열린다. 상세 내용은 `12_SCREEN_LIST.md` SCR-100 참고.

> 내 계정(`/my-account`)은 사이드바가 아니라 헤더 우측 아바타 드롭다운에서 접근한다(§2.1) — 같은 화면으로 가는 진입점을 사이드바에 중복 등록하지 않기 위함.

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
│ 코드그룹 │                                           │
│ API      │                                           │
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
| 코드그룹 | `/admin/code-groups` | O | O | - | - |
| API | `/admin/apis` | O | O | - | - |
| 감사로그 | `/admin/audit-logs` | O | O | O | - |

> APPROVER는 감사로그만 접근 가능. `/admin` 진입 시 `/admin/audit-logs`로 리다이렉트.

> 프로젝트 목록·사용자 목록 화면은 자체 회사 필터 콤보박스를 두지 않고, §2.1의 헤더 회사 선택을 그대로 필터 조건으로 사용한다(중복 UI 방지). SUPER_ADMIN이 헤더에서 "전체 회사"를 선택하면 두 화면 모두 전체 조회로 전환된다.

> 코드그룹은 원래 메인 메뉴(전 역할 접근)에 있었으나, 편집이 SUPER_ADMIN/DEVELOPER 전용이라 회사/프로젝트/사용자와 동일한 관리 라우트 가드로 옮겼다. APPROVER/OPERATOR는 이 화면에 접근하지 못하는 대신 `GET /code-groups/active-with-items`로 API 화면에서 코드값을 조회한다.

---

# 5. AuthLayout

미인증 사용자 전용. 사이드바·헤더 없이 중앙 정렬, 하단에는 MainLayout/AdminLayout과 동일한 공통 `Footer`(저작권·버전·문의처)만 적용한다 — 회사/프로젝트 선택·사용자 메뉴 등 헤더의 기능은 로그인 전 의미가 없어 제외하되, 로그인이 안 되는 사용자도 문의처는 볼 수 있어야 하므로 푸터는 재사용한다.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│               ┌──────────────────┐                  │
│               │   GM Platform     │                  │
│               │  로그인 / 회원가입 │                  │
│               │       폼          │                  │
│               └──────────────────┘                  │
│                                                      │
│  © 2026 GM Platform | v1.0.0 | 문의: ...             │
└──────────────────────────────────────────────────────┘
```

- 카드 상단 타이틀은 "로그인"/"회원가입" 문구 없이 `VITE_APP_NAME`(앱 이름)만 중앙 정렬로 표시한다.
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

/apis                                 → MainLayout   (List/New/Detail 아님 — 체크박스 워크스페이스, SCR-100)
/executions                          → MainLayout
/executions/pending                  → MainLayout
/executions/pending/:api_execution_id → MainLayout   (SCR-121, 승인/반려는 여기서만)
/executions/:api_execution_id        → MainLayout
/my-account                           → MainLayout

/admin                        → AdminLayout  (역할별 첫 메뉴로 redirect)
/admin/companies              → AdminLayout
/admin/companies/new          → AdminLayout
/admin/companies/:company_id  → AdminLayout
/admin/projects               → AdminLayout
/admin/projects/new           → AdminLayout
/admin/projects/:project_id   → AdminLayout
/admin/users                  → AdminLayout
/admin/users/:user_id         → AdminLayout
/admin/code-groups            → AdminLayout  (등록/상세 별도 라우트 없음 — 한 페이지 엑셀형 그리드)
/admin/apis                   → AdminLayout
/admin/apis/new                → AdminLayout
/admin/apis/:api_id           → AdminLayout
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
| APPROVER가 `/admin/companies`, `/admin/projects`, `/admin/users`, `/admin/code-groups`, `/admin/apis` 접근 | 403 페이지 |
| `/admin` 접근 시 역할별 첫 메뉴 redirect | SUPER_ADMIN / DEVELOPER → `/admin/companies` / APPROVER → `/admin/audit-logs` |

---

# 9. 전역 상태 (Zustand)

## authStore

`accessToken`/`refreshToken`/`roleCode`만 `localStorage`에 persist(`zustand/middleware`)되며, `user`는 저장하지 않고 부팅 시 `/auth/me`로 재조회한다. `isAuthenticated`라는 저장 필드는 없으며 `!!accessToken`으로 파생 계산한다(`useAuth` 훅).

| 필드 | 타입 | 설명 |
| ------------ | -------------- | ------------------------------------------- |
| user | AuthUser \| null | `/auth/me` 응답(원본 컬럼만, role_code 미포함) |
| accessToken | string \| null | JWT Access Token |
| refreshToken | string \| null | Refresh Token (UUID v4) |
| roleCode | RoleCode \| null | 로그인/재발급 응답의 role_code(세션 고정값) |

## globalStore

| 필드 | 타입 | 설명 |
| ----------------- | -------------- | ------------------------------ |
| selectedCompanyId | number \| null | 헤더에서 선택된 회사 (null=SUPER_ADMIN의 "전체 회사") |
| selectedProjectId | number \| null | 헤더에서 선택된 프로젝트 (null=SUPER_ADMIN의 "전체 프로젝트") |
| companyList | CompanyRow[] | 회사 목록 캐시 (로그인 시 1회 로드, 등록/수정 시 직접 동기화) |
| projectList | ProjectRow[] | 프로젝트 목록 캐시 (로그인 시 1회 로드, 등록/수정 시 직접 동기화) |
| projectRoleCode | RoleCode \| null | 선택된 프로젝트에서 호출자의 실제 role_code (`GET /user-roles/me`) |

---

# 10. 공통 컴포넌트

| 컴포넌트 | 설명 |
| -------------- | ------------------------------------------------ |
| RoleGuard | 라우트 단위 role 검사, 미충족 시 403 페이지로 처리 |
| PermissionGuard | role 조건 충족 시만 children 렌더링 (버튼 등 UI 요소 노출 제어) |
| PageHeader | 페이지 제목 + 우측 액션 버튼 영역 |
| DataTable | Ant Design Table 래퍼 — 페이지네이션 / 로딩 처리, `ResizeObserver` 기반 동적 높이 산정으로 flex-column 부모 내부에서만 스크롤. 헤더 타이틀은 전역 CSS(`index.css`)로 중앙정렬(데이터 셀은 그대로 좌측 정렬) |
| StatusBadge | status 값을 색상 뱃지로 표시 |
| ConfirmModal | 승인 / 반려 / 삭제 등 확인 모달 |

> 등록/수정 화면은 공통 `FormModal` 컴포넌트(React Hook Form 연동, Stage 2에서 스캐폴딩)를 사용하지 않는다. Stage 3에서 확정된 실제 패턴은 각 페이지가 antd `Form`을 직접 사용하는 것 — 등록은 별도 라우트 페이지(New), 수정은 상세 페이지 내 조회↔수정 토글이다. `FormModal.tsx`/`react-hook-form`은 코드베이스에 남아있으나 실제 화면에서는 쓰이지 않는다.
