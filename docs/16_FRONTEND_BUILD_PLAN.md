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
| SCR-130 | 코드 그룹 목록 | `/code-groups` |
| SCR-131 | 코드 그룹 상세·수정 (코드 아이템 포함) | `/code-groups/:code_group_id` |

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
- 페이지네이션 미적용(배열 그대로) API: `GET /user-roles`, `GET /apis/:id`(requests/responses 포함 상세객체), `GET /code-groups?project_id=`, `GET /code-items?code_group_id=`, `GET /code-groups/:id/active-items`
- `/auth/me` 응답에는 `role_code` 없음(user 테이블 원본 컬럼만) — role_code는 프로젝트마다 다를 수 있는 값이라 로그인/재발급 응답에서만 얻을 수 있다. company_code/company_name도 없어 회사명 필요 시 globalStore의 companyList에서 조인
- 날짜 필드는 `'YYYY-MM-DD HH:mm:ss'` 문자열
- role_code: 10=SUPER_ADMIN, 20=DEVELOPER, 30=APPROVER, 40=OPERATOR. 로그인 세션의 role_code는 사용자가 가진 모든 프로젝트 중 최고 권한(MIN)이라 프로젝트마다 실제 권한과 다를 수 있음(예: A프로젝트 DEVELOPER·B프로젝트 OPERATOR → 세션 role_code는 20). API/CodeGroup/CodeItem 쓰기 API는 서버가 project_id별 실제 user_role을 재검증하므로, 사이드바·버튼 노출은 세션 role_code만으로 판단하면 "버튼은 보이는데 저장 시 20001" 같은 불일치가 생길 수 있다 — Stage 5(API/코드그룹 화면)에서 선택된 프로젝트 기준 실제 역할 조회(`GET /user-roles?user_id=&project_id=`) 반영 여부를 결정할 것

> **문서 vs 실제 라우트 차이**: 코드그룹/코드아이템 목록은 [09_API_SPEC_Part4.md](./09_API_SPEC_Part4.md) 표기(nested path)와 달리 실제로는 쿼리 파라미터 방식(`GET /code-groups?project_id=`, `GET /code-items?code_group_id=`) — CLAUDE.md와 일치하므로 이를 기준으로 구현한다.

## 2.2 레이아웃/라우트

[13_LAYOUT.md](./13_LAYOUT.md)(공통 레이아웃 구조) 그대로 따른다. 요약:

- `AuthLayout`(/login, /signup, 사이드바 없음) / `MainLayout`(/apis, /executions, /code-groups, /my-account) / `AdminLayout`(/admin/*, OPERATOR 접근불가)
- Header: 로고→/apis, 회사선택(SUPER_ADMIN만 드롭다운), 프로젝트선택(회사기준, 회사변경시 초기화), [관리]버튼(OPERATOR 제외), 사용자명 드롭다운(내계정/로그아웃)
- 가드: 미인증→/login, 인증상태로 /login·/signup→/apis, OPERATOR가 /admin/*→403, APPROVER가 companies/projects/users→403, `/admin` 진입 시 역할별 첫 메뉴로 리다이렉트(SA/DEV→/admin/companies, APV→/admin/audit-logs)

## 2.3 API 스펙

51개 엔드포인트(Auth 6 / Company 4 / Project 4 / User 6 / UserRole 3 / API 4 / ApiRequest 3 / ApiResponse 3 / ApiExecution 7 / CodeGroup 4 / CodeItem 4+active-items 1 / LogAudit 2)의 요청/응답 필드는 [04_API_COMMON.md](./04_API_COMMON.md), [05_AUTH_API.md](./05_AUTH_API.md), [06_API_SPEC_Part1.md](./06_API_SPEC_Part1.md)~[10_API_SPEC_Part5.md](./10_API_SPEC_Part5.md) 기준. `*.api.ts` 작성 시 문서보다 실제 서버 컨트롤러/서비스 코드를 우선 신뢰한다.

---

# 3. 그룹별 실행 계획

## Stage 0 — 공통 인프라: 프로젝트 스캐폴딩 ✅ 완료

- `package.json`, `vite.config.ts`(port 5173, proxy 미사용), `tsconfig.json`/`tsconfig.node.json`, `index.html`, `.env`/`.env.example`
- 의존성: react, react-dom, react-router-dom, antd, @ant-design/icons, axios, zustand, react-hook-form, dayjs
- `npm audit` 취약점 대응: axios 1.18.1, react-router-dom 6.30.4, vite 5.4.21로 상향(esbuild dev-server-only moderate 취약점 1건은 vite 메이저 업그레이드 필요해 보류)
- `types/index.ts` 골격(ApiSuccess/PaginatedResponse/ROLE), `api/axios.ts` 최소 버전(baseURL만)
- **검증 완료**: `npm run dev` 정상 기동, 서버·클라이언트 동시 기동 시 CORS preflight/실요청 정상, `npm run build` 프로덕션 빌드 통과

## Stage 1 — 공통 인프라: 인증 처리

> 그룹 D(인증·내 계정)의 회원가입·내 계정 화면은 Stage 6에서 완성하지만, **로그인만은 예외적으로 여기서 최소 기능(ID/PW 입력, 에러 메시지 표시)으로 먼저 만든다.** 이후 모든 Stage의 검증이 로그인 없이는 불가능하기 때문이다. 폼 디자인 다듬기·회원가입 연동 등 완성도를 높이는 작업만 Stage 6으로 미룬다.

- `stores/authStore.ts` (zustand + persist: accessToken/refreshToken만 localStorage 저장, user는 부팅 시 `/auth/me` 재조회)
- `api/auth.api.ts` (login/refresh/me/logout/password)
- `api/axios.ts` 인터셉터 완성: 요청 시 토큰 첨부, 응답 401(`10003`) 시 refresh 후 재시도(동시 다발 요청 큐잉, `/auth/login`·`/auth/refresh` 자체는 재시도 로직 제외)
- `pages/auth/LoginPage.tsx` 최소 버전 (선행 구현)
- **검증**: 시드 계정(`sa/dev/apv/op`, pw `1234`)으로 로그인 → localStorage 토큰 저장 및 새로고침 시 세션 유지 확인. `JWT_ACCESS_EXPIRES_IN`을 서버 `.env`에서 일시적으로 `10s`로 낮춰 자동 refresh 동작을 네트워크 탭에서 확인 후 원복

## Stage 2 — 공통 인프라: 라우터 · 레이아웃 · 가드 · 공통 컴포넌트

- `router/{index,AuthGuard,RoleGuard}.tsx` + GuestGuard(인증 상태로 auth 라우트 접근 차단) — [13_LAYOUT.md](./13_LAYOUT.md) §7 라우트 테이블 전체 등록(페이지는 placeholder 가능)
- `components/layout/{AuthLayout,MainLayout,AdminLayout,Header,Sidebar,Footer}.tsx`
- `stores/globalStore.ts`(selectedCompanyId/selectedProjectId/companyList/projectList), `hooks/{useAuth,usePermission}.ts`
- `components/common/{PermissionGuard,PageHeader,StatusBadge,DataTable,FormModal,ConfirmModal}.tsx`
  - `DataTable`: `fetcher(page, pageSize) => Promise<PaginatedResponse<T>>`를 받아 `items/page/page_size/total_count`를 antd `Table` pagination으로 변환하는 공통 래퍼 — 이후 모든 목록 화면이 파싱 로직 재작성 없이 재사용
- **검증**: 4개 역할 계정으로 각각 로그인 → 사이드바/헤더 메뉴 노출이 역할별 스펙과 일치하는지 확인. 미인증 상태 라우트 접근, OPERATOR의 `/admin` 접근 차단 확인

## Stage 3 — 그룹 A: 회사 · 프로젝트 관리 (List/New/Detail 표준 패턴 확정)

- `api/company.api.ts`, `api/project.api.ts`
- `pages/admin/companies/*`, `pages/admin/projects/*`
- List(PageHeader+필터+DataTable) / New(Form) / Detail(조회↔수정 토글) 패턴을 여기서 최종 확정 — 이후 그룹 B/C는 이 패턴을 반복 적용
- **검증**: SA로 등록→목록→상세→수정→상태변경 end-to-end, DEV 계정은 등록 버튼 비노출·조회만 가능한지 확인

## Stage 4 — 그룹 B: 사용자 · 권한 · 감사로그

- `api/user.api.ts`, `api/userRole.api.ts`, `api/logAudit.api.ts`
- `pages/admin/users/*`(목록 내 승인대기 탭), `pages/admin/audit-logs/*`
- User Role 등록/수정은 UserDetailPage 내 서브 테이블로 구현
- **검증**: 가입승인/반려, 비밀번호 강제초기화, 정지↔재개(1↔3) 전이, 권한부여가 동작하는지, 감사로그에 방금 액션이 기록되는지 확인

## Stage 5 — 그룹 C: API 정의 · 실행 · 코드그룹

- `api/{api,apiRequest,apiResponse,apiExecution,codeGroup,codeItem}.api.ts` (코드그룹/아이템은 §2.1의 쿼리 파라미터 방식 라우트로 구현)
- `pages/main/code-groups/*` → `pages/main/apis/*`(Tabs: 기본정보/Request/Response/실행) → `pages/main/executions/*`(+Pending)
- `api_code`/`endpoint`/`is_required_approval`/`response_view_type` 수정 시 `api_stage` 자동 롤백 경고 UI, `is_required_approval` 기반 즉시실행/승인대기 분기 UI 포함
- **검증**: 코드그룹→API등록→파라미터등록→실행(운영단계)→(OPERATOR+승인필요 시)승인대기→APPROVER 승인→상태전이까지 전체 플로우 확인

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

---

# 5. 검증 방법

각 Stage마다 `cd server && npm run dev` + `cd client && npm run dev` 동시 기동 후 브라우저(`localhost:5173`)에서 시드 계정(`sa/dev/apv/op`, 각 pw `1234`)으로 실제 시나리오를 수행하여 확인한다. Stage 완료 후 다음 Stage 진행 여부를 사용자에게 확인받는다.
