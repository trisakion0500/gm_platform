# 16_FRONTEND_BUILD_PLAN.md

# 프론트엔드 구현 계획

---

# 1. 전체 화면 목록 및 그룹 구분

[12_SCREEN_LIST.md](./12_SCREEN_LIST.md) 기준 22개 화면을 4개 그룹으로 나누고, 공통 인프라를 먼저 구축한 뒤 그룹 단위로 개발을 진행한다.

## 1.0 공통 인프라 (화면 아님, 선행 구축)

스캐폴딩 · 인증 토큰 처리(+ 로그인 최소 기능) · 라우터/레이아웃/가드 · 공통 컴포넌트(DataTable 등). 로그인 없이는 다른 화면을 테스트할 수 없으므로, 인증은 화면 완성도와 무관하게 가장 먼저 만든다. 모든 그룹이 이 위에서 동작하므로 전체 중 가장 먼저 완성한다.

## 1.1 그룹 A — 회사 · 프로젝트 관리

| 화면 ID | 화면명 | Route |
|---|---|---|
| SCR-010 | 회사 목록 | `/admin/companies` |
| SCR-011 | 회사 등록 | `/admin/companies/new` |
| SCR-012 | 회사 상세·수정 | `/admin/companies/:company_id` |
| SCR-020 | 프로젝트 목록 | `/admin/projects` |
| SCR-021 | 프로젝트 등록 | `/admin/projects/new` |
| SCR-022 | 프로젝트 상세·수정 | `/admin/projects/:project_id` |

## 1.2 그룹 B — 사용자 · 권한 · 감사로그

| 화면 ID | 화면명 | Route |
|---|---|---|
| SCR-030 | 사용자 목록 | `/admin/users` |
| SCR-031 | 사용자 상세·수정 (권한 관리 포함) | `/admin/users/:user_id` |
| SCR-040 | 감사 로그 목록 | `/admin/audit-logs` |
| SCR-041 | 감사 로그 상세 | `/admin/audit-logs/:log_audit_id` |

## 1.3 그룹 C — API 정의 · 실행 · 코드그룹

> SCR-100~102는 최초 계획 시 하나의 `/apis` 화면(권한별 노출 제어)으로 구상했으나, 코드그룹과 동일한 이유(정의 화면 자체를 편집 불가 역할에게 보여줄 필요가 없음)로 정의(CRUD)와 실행(워크스페이스)을 분리했다. 실제 Route/ID는 [12_SCREEN_LIST.md](./12_SCREEN_LIST.md) 최신본 기준.

| 화면 ID | 화면명 | Route |
|---|---|---|
| SCR-140 | API 목록(관리) | `/admin/apis` |
| SCR-141 | API 등록(관리) | `/admin/apis/new` |
| SCR-142 | API 상세·수정(관리, 파라미터 포함) | `/admin/apis/:api_id` |
| SCR-100 | API (실행 워크스페이스 — List/New/Detail 아님) | `/apis` |
| SCR-110 | 실행 이력 목록 | `/executions` |
| SCR-111 | 실행 이력 상세 | `/executions/:api_execution_id` |
| SCR-120 | 승인 대기 목록 | `/executions/pending` |
| SCR-130 | 코드그룹·코드아이템 (엑셀형 그리드 한 페이지) | `/admin/code-groups` (관리 라우트 — 편집이 SUPER_ADMIN/DEVELOPER 전용이라 그룹 A/B와 같은 가드 사용) |

## 1.4 그룹 D — 인증 · 내 계정

| 화면 ID | 화면명 | Route |
|---|---|---|
| SCR-001 | 로그인 | `/login` |
| SCR-002 | 회원가입 | `/signup` |
| SCR-200 | 내 계정 | `/my-account` |

> 로그인 화면(SCR-001)은 그룹 D에 속하지만, 다른 그룹을 검증하려면 로그인이 선행되어야 하므로 최소 기능(ID/PW 입력, 에러 메시지) 버전을 공통 인프라 단계에서 먼저 만들고, 회원가입과 묶어 그룹 D에서 마무리한다.

---

# 2. 백엔드 연동 기준

## 2.1 통신 규약

- 응답: 성공 `{result:0, data}` / 실패 `{result:<code>, message}` — `result===0`으로 성공 판정
- API base path: 서버가 `/api`로 마운트 → axios `baseURL = http://localhost:3000/api` (`VITE_API_BASE_URL` env로 분리)
- 인증 헤더: `Authorization: Bearer <access_token>`
- 로그인 응답에는 user 상세정보 없음(access_token/refresh_token/expired_at/role_code만) — user_name·email 등은 로그인 후 별도 `GET /auth/me` 호출 필요
- refresh_token은 재발급되지 않음(최초 로그인 시 1회만 저장). `role_code`는 로그인/재발급 응답에 포함(세션 고정값)
- 401 처리: `result===10003`(AT만료) → refresh 후 원요청 재시도(동시 요청은 큐잉). `10004/10005/10006/10007/10009` → 로그아웃 후 `/login` 리다이렉트
- 목록 API 페이지네이션 응답: `data:{page, page_size, total_count, items:[]}` (필드명 고정)
- 페이지네이션 미적용(배열 그대로) API: `GET /user-roles`, `GET /apis/:id`(requests/responses 포함 상세객체), `GET /code-groups?project_id=`, `GET /code-items?code_group_id=`, `GET /code-groups/:id/active-items`, `GET /code-groups/active-with-items?project_id=`(신설 — 프로젝트의 활성 코드그룹+아이템 일괄 조회, 전 역할 허용. `/admin/code-groups`에 접근 못하는 APPROVER/OPERATOR가 API 화면에서 코드값 참조용으로 사용)
- `/auth/me` 응답에는 `role_code` 없음(user 테이블 원본 컬럼만) — role_code는 프로젝트마다 다를 수 있는 값이라 로그인/재발급 응답에서만 얻을 수 있다. company_code/company_name도 없어 회사명 필요 시 globalStore의 companyList에서 조인
- 날짜 필드는 `'YYYY-MM-DD HH:mm:ss'` 문자열
- role_code: 10=SUPER_ADMIN, 20=DEVELOPER, 30=APPROVER, 40=OPERATOR. 로그인 세션의 role_code는 사용자가 가진 모든 프로젝트 중 최고 권한(MIN)이라 프로젝트마다 실제 권한과 다를 수 있음(예: A프로젝트 DEVELOPER·B프로젝트 OPERATOR → 세션 role_code는 20). API/CodeGroup/CodeItem 쓰기 API는 서버가 project_id별 실제 user_role을 재검증하므로, 사이드바·버튼 노출은 세션 role_code만으로 판단하면 "버튼은 보이는데 저장 시 20001" 같은 불일치가 생길 수 있다.
  - **Stage 5 결정 → 이후 뒤집힘**: API 실행 워크스페이스의 `api_stage`별 목록 필터(`Sidebar.tsx`의 `canExecuteStage`)는 처음엔 세션 `role_code`를 그대로 사용했다 — 당시 `SP_CREATE_API_EXECUTION`의 실행 검사 자체가 세션 role_code(가진 프로젝트 중 최고 권한)만으로 판정했기 때문에, 화면 필터도 같은 값을 써야 "보이는 것=실행 성공하는 것"이 일치했다. 이후 이 서버 판정 자체가 "다른 프로젝트 권한으로 이 프로젝트의 stage 게이트를 통과"하는 취약점으로 드러나 `SP_CREATE_API_EXECUTION`이 `user_role`을 재조회해 프로젝트별 실제 권한으로 검사하도록 바뀌었고, 그에 맞춰 프론트 필터도 `projectRoleCode`(실제 프로젝트별 권한) 기준으로 다시 전환했다(CLAUDE.md 참고).
- **회사·프로젝트 선택 콤보박스 데이터**: `GET /companies`는 이제 4개 역할 모두 호출 가능(SUPER_ADMIN=전체, 그 외=본인 회사만). `GET /projects`는 SUPER_ADMIN 외에는 "본인이 활성 user_role을 가진 프로젝트만" 반환(같은 회사 소속이어도 role 미배정 프로젝트는 제외) — globalStore의 companyList/projectList를 이 두 API로 그대로 채우면 됨.
- **선택된 프로젝트의 실제 role_code**: `GET /user-roles/me?project_id=`로 조회한다(신설). SUPER_ADMIN은 배정 없이 항상 `role_code: 10`, 그 외는 활성 user_role 없으면 `role_code: null`. 프로젝트 변경 시(회사 변경 시 첫 프로젝트 자동 선택 포함) 이 API를 다시 호출해 globalStore의 현재 role_code를 갱신하고, 사이드바·버튼 노출은 세션 role_code가 아니라 이 값을 기준으로 판단한다.

> **문서 vs 실제 라우트 차이**: 코드그룹/코드아이템 목록은 [09_API_SPEC_Part4.md](./09_API_SPEC_Part4.md) 표기(nested path)와 달리 실제로는 쿼리 파라미터 방식(`GET /code-groups?project_id=`, `GET /code-items?code_group_id=`) — CLAUDE.md와 일치하므로 이를 기준으로 구현한다.

## 2.2 레이아웃/라우트

[13_LAYOUT.md](./13_LAYOUT.md)(공통 레이아웃 구조) 그대로 따른다. 요약:

- `AuthLayout`(/login, /signup, 사이드바 없음) / `MainLayout`(/apis, /executions, /my-account) / `AdminLayout`(/admin/*, OPERATOR 접근불가. /admin/code-groups는 APPROVER도 접근불가 — 회사/프로젝트/사용자와 동일 가드)
- Header: 로고→/apis, 회사선택(SUPER_ADMIN만 드롭다운, "전체 회사" 옵션 포함), 프로젝트선택(회사기준, 회사변경시 초기화, SUPER_ADMIN만 "전체 프로젝트" 선택 가능), [관리]버튼(OPERATOR 제외), 사용자명 드롭다운(내계정/로그아웃)
- 관리 화면 중 `/admin/projects`, `/admin/users`, `/admin/audit-logs` 목록은 회사(감사로그는 프로젝트도) 필터를 화면 자체에 두지 않고 이 헤더 선택을 그대로 사용한다(Stage 3에서 확정된 패턴)
- 가드: 미인증→/login, 인증상태로 /login·/signup→/apis, OPERATOR가 /admin/*→403, APPROVER가 companies/projects/users→403, `/admin` 진입 시 역할별 첫 메뉴로 리다이렉트(SA/DEV→/admin/companies, APV→/admin/audit-logs)

## 2.3 API 스펙

52개 엔드포인트(Auth 6 / Company 4 / Project 4 / User 6 / UserRole 4[me 포함] / API 4 / ApiRequest 3 / ApiResponse 3 / ApiExecution 7[`/apis/:id/execute` 포함] / CodeGroup 4 / CodeItem 4+active-items 1 / LogAudit 2)의 요청/응답 필드는 [04_API_COMMON.md](./04_API_COMMON.md), [05_AUTH_API.md](./05_AUTH_API.md), [06_API_SPEC_Part1.md](./06_API_SPEC_Part1.md)~[10_API_SPEC_Part5.md](./10_API_SPEC_Part5.md) 기준. `*.api.ts` 작성 시 문서보다 실제 서버 컨트롤러/서비스 코드를 우선 신뢰한다.

---

# 3. 그룹별 실행 계획

## Stage 0 — 공통 인프라: 프로젝트 스캐폴딩 ✅ 완료

- `package.json`, `vite.config.ts`(port 5173, proxy 미사용), `tsconfig.json`/`tsconfig.node.json`, `index.html`, `.env`/`.env.example`
- 의존성: react, react-dom, react-router-dom, antd, @ant-design/icons, axios, zustand, react-hook-form, dayjs
- `npm audit` 취약점 대응: axios 1.18.1, react-router-dom 6.30.4, vite 5.4.21로 상향(esbuild dev-server-only moderate 취약점 1건은 vite 메이저 업그레이드 필요해 보류)
- `types/index.ts` 골격(ApiSuccess/PaginatedResponse/ROLE), `api/axios.ts` 최소 버전(baseURL만)
- **검증 완료**: `npm run dev` 정상 기동, 서버·클라이언트 동시 기동 시 CORS preflight/실요청 정상, `npm run build` 프로덕션 빌드 통과

## Stage 1 — 공통 인프라: 인증 처리 ✅ 완료

> 그룹 D(인증·내 계정)의 회원가입·내 계정 화면은 Stage 6에서 완성하지만, **로그인만은 예외적으로 여기서 최소 기능(ID/PW 입력, 에러 메시지 표시)으로 먼저 만든다.** 이후 모든 Stage의 검증이 로그인 없이는 불가능하기 때문이다. 폼 디자인 다듬기·회원가입 연동 등 완성도를 높이는 작업만 Stage 6으로 미룬다.

- `stores/authStore.ts` (zustand + persist: accessToken/refreshToken/roleCode만 localStorage 저장, user는 부팅 시 `/auth/me` 재조회)
- `api/auth.api.ts` (login/refresh/me/logout/password)
- `api/axios.ts` 인터셉터 완성: 요청 시 토큰 첨부, 응답 401(`10003`) 시 refresh 후 재시도(동시 다발 요청 큐잉, `/auth/login`·`/auth/refresh` 자체는 재시도 로직 제외)
- `pages/auth/LoginPage.tsx` 최소 버전 (선행 구현)
- **검증 완료**: 시드 계정(`sa/dev/apv/op`, pw `1234`)으로 로그인 → localStorage 토큰 저장 및 새로고침 시 세션 유지 확인. `JWT_ACCESS_EXPIRES_IN`을 서버 `.env`에서 일시적으로 `10s`로 낮춰 자동 refresh 동작을 네트워크 탭에서 확인 후 원복

## Stage 2 — 공통 인프라: 라우터 · 레이아웃 · 가드 · 공통 컴포넌트 ✅ 완료

- `router/{index,AuthGuard,RoleGuard}.tsx` + `GuestGuard`(인증 상태로 auth 라우트 접근 차단) — [13_LAYOUT.md](./13_LAYOUT.md) §7 라우트 테이블 전체 등록(페이지는 `pages/PagePlaceholder.tsx`로 대체, `pages/errors/{ForbiddenPage,NotFoundPage}.tsx` 신설)
- `components/layout/{AuthLayout,MainLayout,AdminLayout,Header,Sidebar,Footer}.tsx`
  - `Header`: 로고(`VITE_APP_NAME`) · 회사/프로젝트 선택 · 관리 버튼 · `[역할]이름` 사용자 드롭다운. 로고 텍스트와 Footer의 저작권 문구·버전·문의 이메일은 `VITE_APP_NAME`/`VITE_FOOTER_COPYRIGHT`/`VITE_APP_VERSION`/`VITE_SUPPORT_EMAIL` 환경변수로 분리(`client/.env`)
  - `Sidebar`: `variant='main'|'admin'` prop으로 메뉴 목록 전환, roleCode 기준 필터링 + 현재 경로 기준 최장 접두사 매치로 선택 상태 표시
- `stores/globalStore.ts`(selectedCompanyId/selectedProjectId/companyList/projectList/projectRoleCode), `hooks/{useAuth,usePermission}.ts`, `api/{company,project,userRole}.api.ts`(목록 조회 전용 — 등록/수정은 Stage 3에서 추가)
- `components/common/{PermissionGuard,PageHeader,StatusBadge,DataTable,FormModal,ConfirmModal}.tsx`
  - `DataTable`: `fetcher(page, pageSize) => Promise<PaginatedResponse<T>>`를 받아 `items/page/page_size/total_count`를 antd `Table` pagination으로 변환하는 공통 래퍼 — 이후 모든 목록 화면이 파싱 로직 재작성 없이 재사용. 필터 변경 시 재조회는 컴포넌트 자체 옵션 대신 호출부가 `key` prop을 바꿔 재마운트시키는 방식으로 유도(불필요한 내부 상태 추가 방지)
- **검증 완료**: 4개 역할 계정으로 각각 로그인 → 사이드바/헤더 메뉴 노출이 역할별 스펙과 일치(Playwright로 20개 시나리오 확인). 미인증 상태 라우트 접근 → `/login` 리다이렉트, OPERATOR의 `/admin` 접근 → `/403` 확인. 프로젝트 선택 변경 시 헤더의 `[역할]` 라벨이 `GET /user-roles/me` 재조회 결과로 갱신되는지 확인(최초 구현 시 세션 전역 roleCode를 잘못 참조하던 버그를 발견해 수정)

## Stage 3 — 그룹 A: 회사 · 프로젝트 관리 (List/New/Detail 표준 패턴 확정) ✅ 완료

- `api/company.api.ts`, `api/project.api.ts`
- `pages/admin/companies/*`, `pages/admin/projects/*`
- List(PageHeader+필터+DataTable) / New(Form) / Detail(조회↔수정 토글) 패턴을 여기서 최종 확정 — 이후 그룹 B/C는 이 패턴을 반복 적용
- 목록 화면의 회사 필터는 화면 자체 콤보박스가 아니라 헤더의 전역 회사 선택(`globalStore.selectedCompanyId`)을 그대로 사용하도록 변경 — 헤더에 이미 있는 콤보박스와 중복되는 UI를 만들지 않기 위함. 상태 필터 등 화면 고유 필터만 `stores/listFilterStore.ts`(zustand)에 보관해 등록/상세 이동 후에도 유지(로그아웃 시 초기화)
- 회사/프로젝트 등록·수정 시 `globalStore.companyList`/`projectList`를 직접 동기화(각 New/Detail 페이지에서 `setCompanyList`/`setProjectList` 호출) — 그렇지 않으면 헤더 콤보박스에 새 항목이 즉시 반영되지 않는 문제가 있었음
- **검증 완료**: SA로 등록→목록→상세→수정→상태변경 end-to-end, DEV 계정은 등록 버튼 비노출·조회만 가능한지 확인. 헤더 "전체 회사" 선택 시 목록이 전체 조회로 전환되는지, 목록↔상세 이동 시 필터가 유지되는지, 로그아웃 후 재로그인 시 필터가 초기화되는지 확인

## Stage 4 — 그룹 B: 사용자 · 권한 · 감사로그 ✅ 완료

- `api/user.api.ts`, `api/userRole.api.ts`, `api/logAudit.api.ts`
- `pages/admin/users/*`, `pages/admin/audit-logs/*`
- `UserListPage`의 상태 필터는 Tabs가 아니라 Select 콤보박스(전체/승인대기/정상/반려/사용중지)로 구현 — Company/Project 목록과 동일한 패턴
- User Role 등록/수정은 계획대로 `UserDetailPage` 내 서브 테이블로 구현 — 목록(조회는 SUPER_ADMIN·DEVELOPER, 등록/수정은 SUPER_ADMIN만), 승인/반려/사용중지·재개/비밀번호 강제초기화 액션 버튼도 같은 페이지에 포함
- 회원가입 시 `phone_number`(필수, AES-256-CBC 암호화 저장)·`department`·`position`(선택) 입력이 추가됨에 따라 `UserListPage`/`UserDetailPage`에도 해당 컬럼 반영
- `AuditLogListPage`는 로그ID/테이블/작업유형/기간 필터를 제공하며, 회사·프로젝트 필터는 Stage 3와 동일하게 헤더 전역 선택을 그대로 사용(감사로그는 프로젝트 선택도 필터로 적용). 목록·상세 모두 `project_id`/`created_by` 원시 PK 대신 `SP_GET_LOG_AUDIT_LIST`/`SP_GET_LOG_AUDIT`가 `project`/`user` 테이블을 LEFT JOIN해 반환하는 `project_name`/`created_by_name`을 표시(작업자 필터는 실효성이 낮아 제거)
- **검증 완료**: 가입승인/반려, 비밀번호 강제초기화, 정지↔재개(1↔3) 전이, 권한부여(User Role 등록) 각각을 UI로 수행 후 감사로그 목록/상세에서 올바른 action_type(10=생성/20=수정/30=상태변경)으로 즉시 기록되는지 API·UI 양쪽에서 교차 확인

## Stage 5 — 그룹 C: API 정의 · 실행 · 코드그룹 ✅ 완료

- `api/{api,apiRequest,apiResponse,apiExecution,codeGroup,codeItem}.api.ts` (코드그룹/아이템은 §2.1의 쿼리 파라미터 방식 라우트로 구현)
- `pages/admin/code-groups/*`, `pages/admin/apis/*`(List/New/Detail, Tabs: 기본정보/Request/Response) → `pages/main/apis/*`(체크박스 워크스페이스) → `pages/main/executions/*`(+Pending)
- **코드그룹·코드아이템은 List/New/Detail 3화면 패턴을 따르지 않고 `CodeGroupPage.tsx` 한 페이지의 엑셀형 편집 그리드로 구현, 관리 라우트(`/admin/code-groups`)에 위치** — 공통코드 성격상 다건을 빠르게 등록·수정하는 게 목적이라 페이지 이동 없이 처리하는 게 낫다는 판단이고, 편집이 SUPER_ADMIN/DEVELOPER 전용이라 회사/프로젝트/사용자와 동일한 관리 라우트 가드(`RoleGuard allow={[SUPER_ADMIN, DEVELOPER]}`)를 재사용했다(처음엔 메인 메뉴에 전 역할 대상으로 뒀다가, 편집 권한 있는 역할만 접근할 수 있는 관리 화면이라는 성격에 맞춰 이동함). 프로젝트는 화면 자체 선택 없이 헤더 전역 선택(`globalStore.selectedProjectId`)을 그대로 사용. 그리드에 "행 추가"로 그룹ID 없는 신규 행(코드값 포함 모든 필드 편집 가능)을 만들고, 셀 변경은 로컬 state에만 반영하다가 "적용" 버튼을 눌러야 신규 행은 POST, 변경된 기존 행은 PATCH로 일괄 처리(셀 변경마다 즉시 저장 안 함). 그룹ID는 auto_increment라 컬럼에 노출하지 않음. 코드 아이템은 그룹 행을 expand했을 때 하단에 `CodeItemGrid.tsx`(동일한 그리드+적용 패턴)로 관리 — 미저장 신규 그룹 행은 expand 불가. "적용" 시 일부 행만 실패해도 성공한 행은 반영하고 실패한 행만 에러 메시지와 함께 편집 가능한 상태로 남김(행 배경색 강조, `client/src/index.css`의 `.editable-row-error`)
- **API 정의(관리, SCR-140~142)는 `/admin/apis`에 Company/Project와 동일한 List/New/Detail 패턴으로 구현** — 상세 화면은 Tabs(기본정보/Request/Response)로 구성, 편집은 SUPER_ADMIN/DEVELOPER만. `api_code`/`endpoint`/`is_required_approval`/`response_view_type` 수정 시 `api_stage` 자동 롤백 경고 UI 포함.
- **API 실행(메인, SCR-100, `/apis`)은 최초 계획했던 "탭 안에 실행 포함된 단일 상세 화면"이 아니라, 좌측 사이드바에서 여러 API를 체크박스로 동시에 열어 우측에 패널을 쌓는 워크스페이스 형태로 최종 구현했다** — `client/src/stores/apiWorkspaceStore.ts`(열린 API 목록·순서, 패널별 입력값·실행결과를 zustand로 보관, 로그아웃·프로젝트 변경 시 초기화, 페이지 이동해도 유지), `components/layout/Sidebar.tsx`의 `ApiMenuSection`(펼치기/접기 + 체크박스, `api_stage`별 실행 가능 역할에 안 맞는 API는 목록에서 필터링 — 세션 role_code 기준, `11_MENU_PERMISSION.md` §3.2 검사와 동일 규칙), `pages/main/apis/{ApiWorkspacePage,ApiPanel}.tsx`(패널 = API Name+승인필요 태그(OPERATOR에게만) → Request 실행폼(component_type별 입력 컨트롤, SELECT/RADIO/CHECKBOX는 코드그룹) → Response(실행 전 필드정의만, 실행 후 response_view_type별 KEY_VALUE/GRID, GRID 20행 초과 시 스크롤)).
- **외부 API 응답 규약**: 모든 외부 API가 `{ result, message, data: [...] }` 봉투로 응답하기로 확정 — `data`는 항상 배열이며 KEY_VALUE는 `data[0]`을 단일 객체로, GRID는 `data` 전체를 행 목록으로 사용(`ApiPanel.tsx`의 `unwrapDataArray`). `result`가 0이 아니면 HTTP 200이어도 `apiExecution.service.ts`의 `callExternalApi`가 FAILED(50) 처리하고 `message`를 `error_message`로 저장 — HTTP 레벨 실패(타임아웃/네트워크 오류)와는 별개의 검사. 테스트용 `/mock-external`(`server/src/routes/index.ts`)도 이 봉투 형태로 고정 100행을 반환하도록 맞춰둠(필드명은 테스트 API의 api_response 정의에 종속적이라 다른 API로 테스트 시 조정 필요).
- **APPROVER/OPERATOR의 코드값 참조**: `/admin/code-groups`·`/admin/apis`에 접근할 수 없으므로, 신설한 `GET /code-groups/active-with-items?project_id=`(전 역할 허용, 프로젝트의 활성 코드그룹+활성 아이템을 그룹당 1건으로 묶어 한 번에 반환하는 `SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS` 기반)를 API 실행 워크스페이스에서 호출해 SELECT/RADIO/CHECKBOX 값 + 응답 코드 치환에 사용한다. 그룹별 `active-items`를 개별 호출하는 N+1 대신 프로젝트 단위 일괄 조회로 설계.
- **알려진 계약 불일치 수정**: 초기 구현에서 `client/src/api/api.api.ts`의 `executeApi`가 body를 flat하게 보내 서버(`request_json` 래핑 기대)와 어긋나 항상 30001 에러가 났고, `apiExecution.api.ts`의 `cancelApiExecution`도 서버가 필수로 요구하는 `reject_reason`을 안 보내고 있었다 — 워크스페이스 화면 작업 착수 전에 둘 다 수정.
- **실행이력(SCR-110/111, `/executions`, 전 역할)**: `ExecutionListPage`(API/상태/"승인 필요 건만" 필터, OPERATOR는 서버가 본인 건만 스코핑, 취소 버튼은 본인의 PENDING 건에만 노출) → `ExecutionDetailPage`(읽기 전용, Descriptions+요청파라미터/응답데이터 JSON 카드, "목록으로"는 `/executions`로 복귀).
- **승인대기(SCR-120, `/executions/pending`, SA/DEV/APPROVER 전용)**: `ExecutionPendingListPage`는 조회 전용(승인/반려 버튼 없음 — 요청 파라미터를 보지 않고 처리하는 것을 막기 위해 의도적으로 제거)이고, 행 클릭 시 이동하는 `ExecutionPendingDetailPage`(`/executions/pending/:api_execution_id`)에서만 승인/반려를 처리한다. 실행이력 상세(`ExecutionDetailPage`)와 별도 페이지로 둔 이유는 "목록으로"가 원래 목록(승인대기)이 아닌 실행이력 목록으로 가버리는 문제를 막기 위함 — 승인/반려 처리 후에도 `/executions/pending`으로 돌아간다.
- **`api_execution.is_required_approval` 스냅샷 컬럼**: 관리자가 API의 승인 필요 여부를 이후에 바꿔도 과거 실행 이력의 "승인 시나리오를 탔는지" 판정이 흔들리지 않도록 실행 시점 값을 저장(`api_name`/`endpoint`와 동일 패턴). 실행이력 목록의 "승인 필요 건만" 필터가 이 컬럼 기준으로 동작.
- **검증**: 코드그룹→API등록(관리)→파라미터등록(관리)→실행(메인 워크스페이스, 즉시실행/승인필요 각각)→(OPERATOR+승인필요 시)승인대기 메시지 확인. 실행이력 목록/상세, 승인대기 목록→상세→승인/반려까지 API 실행 결과(mock 엔드포인트) 및 상태 전이 실제 확인 완료. 코드그룹 그리드는 SA로 그룹+아이템 등록/수정, 중복 코드로 저장 실패 시 해당 행만 에러 표시되고 나머지는 반영되는지 확인. APPROVER/OPERATOR는 `/admin/code-groups`·`/admin/apis` 직접 URL 접근 시 403, `active-with-items`로 코드값 조회는 정상 동작하는지 확인. OPERATOR는 `/executions/pending` 사이드바 메뉴 자체가 안 보이고 직접 URL 접근 시 403 확인.

## Stage 6 — 그룹 D: 회원가입 + 내 계정 ✅ 완료

- `pages/auth/SignupPage.tsx`, `pages/main/my-account/MyAccountPage.tsx`
- **회사/프로젝트 선택 방식 변경 — 드롭다운 대신 코드 직접 입력** — SCR-002 스펙은 `GET /companies`/`GET /projects`로 채우는 드롭다운이었으나, 이 두 라우트가 전부 `authenticate` 필수라 로그인 전 화면(회원가입)에서 호출 불가능했다. 회사 전체 목록을 인증 없이 공개하는 것도 꺼려져(내부 인원만 가입하는 폐쇄형 툴이라 사회공학적 노출 자체가 리스크), 드롭다운 대신 회사코드/프로젝트코드(선택)를 텍스트로 입력받고 "담당자에게 문의하여 코드를 받아 입력하세요" 안내 문구를 붙였다. 검증은 **입력 중이 아닌 제출 시점에만** 수행(타이핑 중 자동조회 대신, 가입 버튼을 눌렀을 때 회사→프로젝트 순서로 조회 후 실패 시 해당 필드에 인라인 에러).
- **`GET /companies/lookup`, `GET /projects/lookup` 신설(인증 불필요)** — 위 이유로 새로 만든 회원가입 전용 공개 엔드포인트. `SP_GET_COMPANY_BY_CODE`/`SP_GET_PROJECT_BY_CODE` 기반이며 `company_id`/`company_name`, `project_id`/`project_name`만 반환(그 외 민감정보 비노출), 활성(status=1) 항목만 조회 가능. 정적 경로라 `/:company_id`/`/:project_id` 동적 라우트보다 먼저 등록.
- **`MyAccountPage`는 별도 API 호출 없이 `useAuth()`의 `user`(이미 앱 전역에 로드됨)와 `globalStore.companyList`(회사명 조회용)만으로 구성** — 이름/이메일/소속회사/최근로그인 조회 전용 Descriptions + 비밀번호 변경 폼. 비밀번호 변경 성공 시 "변경 즉시 모든 세션 종료"(SP_UPDATE_PASSWORD 설계, CLAUDE.md 참고) 정책 때문에 방금 변경한 본인 세션도 무효화되므로, 성공 메시지를 보여준 뒤 곧바로 `logout()`을 호출해 재로그인을 유도한다.
- **검증**: 회원가입(잘못된 회사코드→필드 에러 확인→올바른 코드로 재제출→승인대기 안내 화면), 내 계정 정보 표시, 비밀번호 오입력 시 에러 확인, 로그아웃→보호 라우트 재접근 시 `/login` 리다이렉트까지 확인.

## Stage 7 — 마무리 ✅ 완료

- 403/404 페이지 확인, `ERROR_MAP`(서버) 전체 코드가 사용자 노출용 한국어 메시지를 갖추고 있는지 점검 — 누락 없음.
- **점검 중 발견해 함께 고친 버그 2건** (둘 다 Playwright로 백엔드를 강제 종료해 재현 → 수정 → 재현 안 됨을 확인):
  - `DataTable.tsx`의 `fetcher().then().finally()`에 `.catch()`가 없어 네트워크 에러 시 목록이 조용히 비던 문제 — `.catch()` 추가 + `Alert`로 에러 메시지 표시.
  - `useAuth.ts`가 `GET /auth/me` 실패 시 원인 구분 없이 무조건 `clear()`(로그아웃)를 호출해, 백엔드가 잠깐 다운된 순간 새로고침만 해도 유효한 토큰이 강제로 지워지던 문제 — `err.response`가 있는(서버가 실제로 인증 실패를 응답한) 경우만 `clear()`하도록 수정.
- 22개 화면 × 4역할 접근 매트릭스 재대조 — `router/index.tsx`의 `RoleGuard` allow 배열이 [11_MENU_PERMISSION.md](./11_MENU_PERMISSION.md)와 정확히 일치함을 코드 대조로 확인, 경계 케이스(APPROVER의 감사로그 허용/코드그룹·사용자·회사관리 차단, DEVELOPER의 API·사용자·코드그룹 허용, OPERATOR의 승인대기·API관리 차단)는 Playwright로 4계정 실제 로그인 후 라이브 검증까지 완료.
- `npm run build` — client(`tsc && vite build`)·server(`tsc`) 모두 정상 통과. client 번들이 500KB 경고를 내지만 내부 전용 툴 특성상 코드 스플리팅 등 최적화는 후순위로 보류.

---

# 4. 핵심 설계 요약 (Stage 1~2에서 구현)

**axios 인터셉터**: 요청 인터셉터에서 authStore의 accessToken을 헤더에 첨부. 응답 인터셉터에서 `result===10003`이면 `isRefreshing` 플래그로 동시 요청을 대기열에 쌓고 refresh 1회만 수행 후 큐에 쌓인 요청 모두 재시도. `10004/10005/10006/10007/10009`는 즉시 로그아웃 처리 + `/login` 리다이렉트. `/auth/login`, `/auth/refresh` 요청 자체는 이 재시도 로직에서 제외.

**타입 전략**: 백엔드 응답 필드명(snake_case)을 camelCase로 변환하지 않고 그대로 타입 단언 — API 계약과 1:1 대응시켜 유지보수 용이성 확보. `unwrap<T>()` 헬퍼로 모든 `*.api.ts`가 `.data.data`만 리턴하도록 통일.

**authStore의 roleCode**: `/auth/me`가 role_code를 반환하지 않으므로(위 §2.1), `AuthUser` 타입에는 role_code가 없다. 대신 `roleCode`를 accessToken/refreshToken과 같은 레벨의 별도 상태로 두고 login()/refresh() 응답의 role_code로 `setTokens(accessToken, roleCode, refreshToken?)`에서 함께 갱신·persist한다. JWT를 클라이언트에서 디코딩하지 않는 이유는 프론트가 토큰 내부 구조를 몰라도 되게 하기 위함 — role_code는 응답 바디의 평범한 필드로만 다룬다.

**가드 3종 구분**: `AuthGuard`(라우트 레벨, 미인증 차단) / `RoleGuard`(라우트 레벨, allow 배열 기반 403) / `PermissionGuard`(컴포넌트 레벨, 버튼·섹션 단위 조건부 렌더링).

**세션 roleCode vs 프로젝트 roleCode**: `authStore.roleCode`는 로그인 세션 전체에 고정된 값(사용자가 가진 프로젝트 중 최고 권한)이라 헤더의 회사/프로젝트 선택 가능 여부(`isSuperAdmin`)·관리 버튼 노출(`canManage`) 판단에는 적합하지만, "지금 선택한 프로젝트에서 실제 권한"과는 다르다. `globalStore.projectRoleCode`는 `selectedProjectId`가 바뀔 때마다 `GET /user-roles/me`로 다시 조회한 값으로, 헤더의 `[역할]이름` 표시는 반드시 이 값을 사용해야 한다(세션 roleCode를 쓰면 프로젝트를 바꿔도 라벨이 갱신되지 않는 버그가 된다).

---

# 5. 검증 방법

각 Stage마다 `cd server && npm run dev` + `cd client && npm run dev` 동시 기동 후 브라우저(`localhost:5173`)에서 시드 계정(`sa/dev/apv/op`, 각 pw `1234`)으로 실제 시나리오를 수행하여 확인한다.
