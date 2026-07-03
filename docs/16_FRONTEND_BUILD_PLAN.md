# 16_FRONTEND_BUILD_PLAN.md

# 프론트엔드 구현 계획

---

# 1. 전체 화면 목록 및 그룹 구분

[12_SCREEN_LIST.md](./12_SCREEN_LIST.md) 기준 21개 화면을 4개 그룹으로 나누고, 공통 인프라를 먼저 구축한 뒤 그룹 단위로 개발을 진행한다.

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

| 화면 ID | 화면명 | Route |
|---|---|---|
| SCR-100 | API 목록 | `/apis` |
| SCR-101 | API 등록 | `/apis/new` |
| SCR-102 | API 상세·수정 (파라미터·실행 포함) | `/apis/:api_id` |
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
- role_code: 10=SUPER_ADMIN, 20=DEVELOPER, 30=APPROVER, 40=OPERATOR. 로그인 세션의 role_code는 사용자가 가진 모든 프로젝트 중 최고 권한(MIN)이라 프로젝트마다 실제 권한과 다를 수 있음(예: A프로젝트 DEVELOPER·B프로젝트 OPERATOR → 세션 role_code는 20). API/CodeGroup/CodeItem 쓰기 API는 서버가 project_id별 실제 user_role을 재검증하므로, 사이드바·버튼 노출은 세션 role_code만으로 판단하면 "버튼은 보이는데 저장 시 20001" 같은 불일치가 생길 수 있다 — Stage 5(API/코드그룹 화면)에서 선택된 프로젝트 기준 실제 역할 조회 방법(아래 항목) 반영 여부를 결정할 것
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

## Stage 5 — 그룹 C: API 정의 · 실행 · 코드그룹

- `api/{api,apiRequest,apiResponse,apiExecution,codeGroup,codeItem}.api.ts` (코드그룹/아이템은 §2.1의 쿼리 파라미터 방식 라우트로 구현)
- `pages/admin/code-groups/*` → `pages/main/apis/*`(Tabs: 기본정보/Request/Response/실행) → `pages/main/executions/*`(+Pending)
- **코드그룹·코드아이템은 List/New/Detail 3화면 패턴을 따르지 않고 `CodeGroupPage.tsx` 한 페이지의 엑셀형 편집 그리드로 구현, 관리 라우트(`/admin/code-groups`)에 위치** — 공통코드 성격상 다건을 빠르게 등록·수정하는 게 목적이라 페이지 이동 없이 처리하는 게 낫다는 판단이고, 편집이 SUPER_ADMIN/DEVELOPER 전용이라 회사/프로젝트/사용자와 동일한 관리 라우트 가드(`RoleGuard allow={[SUPER_ADMIN, DEVELOPER]}`)를 재사용했다(처음엔 메인 메뉴에 전 역할 대상으로 뒀다가, 편집 권한 있는 역할만 접근할 수 있는 관리 화면이라는 성격에 맞춰 이동함). 프로젝트는 화면 자체 선택 없이 헤더 전역 선택(`globalStore.selectedProjectId`)을 그대로 사용. 그리드에 "행 추가"로 그룹ID 없는 신규 행(코드값 포함 모든 필드 편집 가능)을 만들고, 셀 변경은 로컬 state에만 반영하다가 "적용" 버튼을 눌러야 신규 행은 POST, 변경된 기존 행은 PATCH로 일괄 처리(셀 변경마다 즉시 저장 안 함). 그룹ID는 auto_increment라 컬럼에 노출하지 않음. 코드 아이템은 그룹 행을 expand했을 때 하단에 `CodeItemGrid.tsx`(동일한 그리드+적용 패턴)로 관리 — 미저장 신규 그룹 행은 expand 불가. "적용" 시 일부 행만 실패해도 성공한 행은 반영하고 실패한 행만 에러 메시지와 함께 편집 가능한 상태로 남김(행 배경색 강조, `client/src/index.css`의 `.editable-row-error`)
- **APPROVER/OPERATOR의 코드값 참조**: `/admin/code-groups`에 접근할 수 없으므로, 신설한 `GET /code-groups/active-with-items?project_id=`(전 역할 허용, 프로젝트의 활성 코드그룹+활성 아이템을 그룹당 1건으로 묶어 한 번에 반환하는 `SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS` 기반)를 API 상세/실행 화면에서 호출해 SELECT/RADIO/CHECKBOX 값을 조회한다. 그룹별 `active-items`를 개별 호출하는 N+1 대신 프로젝트 단위 일괄 조회로 설계.
- `api_code`/`endpoint`/`is_required_approval`/`response_view_type` 수정 시 `api_stage` 자동 롤백 경고 UI, `is_required_approval` 기반 즉시실행/승인대기 분기 UI 포함
- **검증**: 코드그룹→API등록→파라미터등록→실행(운영단계)→(OPERATOR+승인필요 시)승인대기→APPROVER 승인→상태전이까지 전체 플로우 확인. 코드그룹 그리드는 SA로 그룹+아이템 등록/수정, 중복 코드로 저장 실패 시 해당 행만 에러 표시되고 나머지는 반영되는지 확인. APPROVER/OPERATOR는 `/admin/code-groups` 직접 URL 접근 시 403, `active-with-items`로 코드값 조회는 정상 동작하는지 확인

## Stage 6 — 그룹 D: 회원가입 + 내 계정

- `pages/auth/SignupPage.tsx`, `pages/main/my-account/MyAccountPage.tsx`
- **검증**: 신규가입→로그인 시 10005(승인대기) 에러 확인→SA 승인→재로그인→비밀번호 변경→재로그인

## Stage 7 — 마무리

- 403/404 페이지, 전체 ERROR_MAP 메시지 매핑 점검
- 21개 화면 × 4역할 접근 매트릭스 재대조([11_MENU_PERMISSION.md](./11_MENU_PERMISSION.md), [12_SCREEN_LIST.md](./12_SCREEN_LIST.md), [13_LAYOUT.md](./13_LAYOUT.md)와 실제 동작 비교)
- `npm run build` 프로덕션 빌드 통과 확인

---

# 4. 핵심 설계 요약 (Stage 1~2에서 구현)

**axios 인터셉터**: 요청 인터셉터에서 authStore의 accessToken을 헤더에 첨부. 응답 인터셉터에서 `result===10003`이면 `isRefreshing` 플래그로 동시 요청을 대기열에 쌓고 refresh 1회만 수행 후 큐에 쌓인 요청 모두 재시도. `10004/10005/10006/10007/10009`는 즉시 로그아웃 처리 + `/login` 리다이렉트. `/auth/login`, `/auth/refresh` 요청 자체는 이 재시도 로직에서 제외.

**타입 전략**: 백엔드 응답 필드명(snake_case)을 camelCase로 변환하지 않고 그대로 타입 단언 — API 계약과 1:1 대응시켜 유지보수 용이성 확보. `unwrap<T>()` 헬퍼로 모든 `*.api.ts`가 `.data.data`만 리턴하도록 통일.

**authStore의 roleCode**: `/auth/me`가 role_code를 반환하지 않으므로(위 §2.1), `AuthUser` 타입에는 role_code가 없다. 대신 `roleCode`를 accessToken/refreshToken과 같은 레벨의 별도 상태로 두고 login()/refresh() 응답의 role_code로 `setTokens(accessToken, roleCode, refreshToken?)`에서 함께 갱신·persist한다. JWT를 클라이언트에서 디코딩하지 않는 이유는 프론트가 토큰 내부 구조를 몰라도 되게 하기 위함 — role_code는 응답 바디의 평범한 필드로만 다룬다.

**가드 3종 구분**: `AuthGuard`(라우트 레벨, 미인증 차단) / `RoleGuard`(라우트 레벨, allow 배열 기반 403) / `PermissionGuard`(컴포넌트 레벨, 버튼·섹션 단위 조건부 렌더링).

**세션 roleCode vs 프로젝트 roleCode**: `authStore.roleCode`는 로그인 세션 전체에 고정된 값(사용자가 가진 프로젝트 중 최고 권한)이라 헤더의 회사/프로젝트 선택 가능 여부(`isSuperAdmin`)·관리 버튼 노출(`canManage`) 판단에는 적합하지만, "지금 선택한 프로젝트에서 실제 권한"과는 다르다. `globalStore.projectRoleCode`는 `selectedProjectId`가 바뀔 때마다 `GET /user-roles/me`로 다시 조회한 값으로, 헤더의 `[역할]이름` 표시는 반드시 이 값을 사용해야 한다(세션 roleCode를 쓰면 프로젝트를 바꿔도 라벨이 갱신되지 않는 버그가 된다).

---

# 5. 검증 방법

각 Stage마다 `cd server && npm run dev` + `cd client && npm run dev` 동시 기동 후 브라우저(`localhost:5173`)에서 시드 계정(`sa/dev/apv/op`, 각 pw `1234`)으로 실제 시나리오를 수행하여 확인한다. Stage 완료 후 다음 Stage 진행 여부를 사용자에게 확인받는다.
