# 15_PROJECT_STRUCTURE.md

# 프로젝트 폴더 구조

---

# 1. 전체 구조

```
gm_platform/
├── client/              # Frontend (React + Vite)
├── server/              # Backend (Express + TypeScript)
├── database/
│   ├── tables/          # DDL SQL 파일
│   ├── procedures/      # Stored Procedure SQL 파일
│   └── functions/       # Function SQL 파일
└── docs/                # 설계 문서
```

---

# 2. Backend (`server/`)

```
server/
├── src/
│   ├── config/
│   │   ├── db.ts            # mysql2 커넥션 풀 설정, callSP() 래퍼
│   │   ├── env.ts           # 환경변수 로드 및 검증
│   │   └── swagger.ts       # Swagger UI 설정 및 공통 컴포넌트 스키마 (SWAGGER_ENABLED=true 시에만 require)
│   │
│   ├── constants/
│   │   ├── errors.ts        # ERROR_MAP, toAppError(), toDBError()
│   │   └── roles.ts         # ROLE 상수 (10/20/30/40)
│   │
│   ├── middleware/
│   │   ├── auth.ts          # JWT 검증, req.user에 사용자 정보 주입
│   │   ├── role.ts          # requireRole() — 라우트 단위 역할 권한 검사
│   │   ├── errorHandler.ts  # 전역 에러 처리 (Express 에러 미들웨어)
│   │   └── requestLogger.ts # HTTP 요청/응답 로깅 (log4js)
│   │
│   ├── routes/
│   │   ├── index.ts         # 전체 라우터 통합 및 앱에 등록
│   │   ├── auth.ts          # /auth — 로그인, 회원가입, 토큰, 세션
│   │   ├── company.ts       # /companies — 회사 관리 (lookup은 회원가입 화면 전용, 인증 불필요)
│   │   ├── project.ts       # /projects — 프로젝트 관리 (lookup은 회원가입 화면 전용, 인증 불필요)
│   │   ├── user.ts          # /users — 사용자 관리
│   │   ├── userRole.ts      # /user-roles — 사용자 권한 관리
│   │   ├── api.ts           # /apis — API 정의 및 실행
│   │   ├── apiRequest.ts    # /api-requests — Request 파라미터 관리
│   │   ├── apiResponse.ts   # /api-responses — Response 파라미터 관리
│   │   ├── apiExecution.ts  # /api-executions — 실행 이력 및 승인 워크플로우
│   │   ├── codeGroup.ts     # /code-groups — 코드 그룹 관리 (+ /active-with-items 전 역할 조회 전용)
│   │   ├── codeItem.ts      # /code-items — 코드 아이템 관리
│   │   └── logAudit.ts      # /log-audits — 감사 로그 조회
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts          # 로그인 / 회원가입 / 토큰 재발급 / 로그아웃 / 내 정보 / 비밀번호 변경
│   │   ├── company.controller.ts       # 회사 목록 / 상세 / 등록 / 수정 / 코드조회(lookup)
│   │   ├── project.controller.ts       # 프로젝트 목록 / 상세 / 등록 / 수정 / 코드조회(lookup)
│   │   ├── user.controller.ts          # 사용자 목록 / 상세 / 수정 / 가입 승인·반려 / 비밀번호 초기화
│   │   ├── userRole.controller.ts      # 권한 목록 / 등록 / 수정
│   │   ├── api.controller.ts           # API 목록 / 상세 / 등록 / 수정 / 실행
│   │   ├── apiRequest.controller.ts    # Request 파라미터 등록 / 수정
│   │   ├── apiResponse.controller.ts   # Response 파라미터 등록 / 수정
│   │   ├── apiExecution.controller.ts  # 실행 이력 목록 / 상세 / 승인 / 반려 / 취소
│   │   ├── codeGroup.controller.ts     # 코드 그룹 목록 / 상세 / 등록 / 수정
│   │   ├── codeItem.controller.ts      # 코드 아이템 목록 / 등록 / 수정
│   │   └── logAudit.controller.ts      # 감사 로그 목록 / 상세
│   │
│   ├── services/
│   │   ├── auth.service.ts          # 인증 비즈니스 로직 (JWT 발급, 세션 관리, 비밀번호 검증)
│   │   ├── company.service.ts       # 회사 비즈니스 로직 (역할별 스코핑 포함)
│   │   ├── project.service.ts       # 프로젝트 비즈니스 로직
│   │   ├── projectRole.service.ts   # assertProjectRole() — project_id 단위 실제 user_role 재검증 공통 함수
│   │   ├── user.service.ts          # 사용자 비즈니스 로직 (가입 승인 워크플로우)
│   │   ├── userRole.service.ts      # 사용자 권한 비즈니스 로직
│   │   ├── api.service.ts           # API / Request / Response 파라미터 비즈니스 로직 (핵심 필드 수정 시 api_stage 롤백) — apiRequest/apiResponse 전용 service 파일은 없고 여기에 통합됨
│   │   ├── apiExecution.service.ts  # 실행 비즈니스 로직 (즉시 실행 / 승인 워크플로우 분기)
│   │   ├── codeGroup.service.ts     # 코드 그룹 비즈니스 로직
│   │   ├── codeItem.service.ts      # 코드 아이템 비즈니스 로직
│   │   └── logAudit.service.ts      # 감사 로그 비즈니스 로직 (Append-Only)
│   │
│   ├── db/
│   │   ├── auth.db.ts          # 세션 조회 / 생성 / 상태 변경 SP·FN 호출
│   │   ├── company.db.ts       # 회사 조회 / 등록 / 수정 SP·FN 호출
│   │   ├── project.db.ts       # 프로젝트 조회 / 등록 / 수정 SP·FN 호출
│   │   ├── user.db.ts          # 사용자 조회 / 등록 / 수정 SP·FN 호출
│   │   ├── userRole.db.ts      # 권한 조회 / 등록 / 수정 SP·FN 호출
│   │   ├── api.db.ts           # API / Request / Response 파라미터 조회·등록·수정 SP·FN 호출 (apiRequest/apiResponse 전용 db 파일은 없고 여기에 통합됨)
│   │   ├── apiExecution.db.ts  # 실행 이력 조회 / 등록 / 상태 변경 SP·FN 호출
│   │   ├── codeGroup.db.ts     # 코드 그룹 조회 / 등록 / 수정 SP·FN 호출
│   │   ├── codeItem.db.ts      # 코드 아이템 조회 / 등록 / 수정 SP·FN 호출
│   │   └── logAudit.db.ts      # 감사 로그 조회 / 등록 SP·FN 호출
│   │
│   ├── types/
│   │   ├── express.d.ts     # req.user 등 Express Request 타입 확장
│   │   └── index.ts         # 공통 타입 정의 (User, Company, Project, ApiExecution 등)
│   │
│   ├── utils/
│   │   ├── jwt.ts           # Access Token / Refresh Token 발급 및 검증
│   │   ├── bcrypt.ts        # 비밀번호 해시 생성 및 비교
│   │   ├── crypto.ts        # AES-256-CBC 암호화/복호화 (user.phone_number 등 개인정보)
│   │   ├── mask.ts          # 로그 등에서 민감 값 마스킹
│   │   ├── response.ts      # 공통 응답 포맷 생성 (success / error)
│   │   └── logger.ts        # log4js 인스턴스 (콘솔 + 파일 출력)
│   │
│   ├── scripts/
│   │   └── encrypt.ts       # `npm run encrypt -- "평문"` — ENCRYPTION_KEY로 값을 암호화해 출력 (시드 데이터 생성용)
│   │
│   └── app.ts               # Express 앱 초기화, DB 연결 확인, 서버 기동
│
├── .env                     # 환경변수 (Git 제외)
├── .env.example             # 환경변수 샘플
├── package.json
└── tsconfig.json
```

## 2.1 레이어 역할

| 레이어 | 역할 |
| ----------- | ------------------------------------------ |
| routes | URL 매핑, 미들웨어 적용, controller 호출 |
| controllers | 요청 파싱, 유효성 검사, 응답 반환 |
| services | 비즈니스 로직, 트랜잭션 조율 |
| db | SP / FN 호출 (Native SQL 직접 작성 금지) |

---

# 3. Frontend (`client/`)

```
client/
├── src/
│   ├── api/
│   │   ├── axios.ts             # Axios 인스턴스 (baseURL, 인터셉터, 토큰 자동 갱신)
│   │   ├── auth.api.ts          # 로그인 / 회원가입 / 토큰 재발급 / 로그아웃 / 내 정보
│   │   ├── company.api.ts       # 회사 목록 / 상세 / 등록 / 수정
│   │   ├── project.api.ts       # 프로젝트 목록 / 상세 / 등록 / 수정
│   │   ├── user.api.ts          # 사용자 목록 / 상세 / 수정 / 가입 승인·반려 / 비밀번호 초기화
│   │   ├── userRole.api.ts      # 권한 목록 / 등록 / 수정
│   │   ├── api.api.ts           # API 목록 / 상세 / 등록 / 수정 / 실행
│   │   ├── apiRequest.api.ts    # Request 파라미터 등록 / 수정
│   │   ├── apiResponse.api.ts   # Response 파라미터 등록 / 수정
│   │   ├── apiExecution.api.ts  # 실행 이력 목록 / 상세 / 승인 / 반려 / 취소
│   │   ├── codeGroup.api.ts     # 코드 그룹 목록 / 상세 / 등록 / 수정
│   │   ├── codeItem.api.ts      # 코드 아이템 목록 / 등록 / 수정
│   │   └── logAudit.api.ts      # 감사 로그 목록 / 상세
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── DataTable.tsx        # Ant Design Table 래퍼 — 페이지네이션, ResizeObserver 기반 동적 높이 산정
│   │   │   ├── StatusBadge.tsx      # status 값을 색상 뱃지로 표시
│   │   │   ├── FormModal.tsx        # (미사용) React Hook Form 연동 모달 스캐폴딩 — 실제 등록/수정 화면은 antd Form 직접 사용
│   │   │   ├── ConfirmModal.tsx     # 승인 / 반려 / 삭제 확인 모달
│   │   │   ├── PageHeader.tsx       # 페이지 제목 + 우측 액션 버튼 영역
│   │   │   └── PermissionGuard.tsx  # role 조건 충족 시만 children 렌더링
│   │   │
│   │   └── layout/
│   │       ├── AuthLayout.tsx       # 로그인 / 회원가입 전용 레이아웃 (사이드바·헤더 없음, Footer만 공통 적용)
│   │       ├── MainLayout.tsx       # 비관리 메뉴 레이아웃 (Header + Sidebar + Footer)
│   │       ├── AdminLayout.tsx      # 관리 메뉴 레이아웃 (Header + Sidebar + Footer)
│   │       ├── Header.tsx           # 공통 헤더 (로고, 회사/프로젝트 선택, 관리 버튼, 사용자 메뉴)
│   │       ├── Sidebar.tsx          # 사이드바 (역할별 메뉴 노출 제어)
│   │       └── Footer.tsx           # 공통 푸터 (버전, 문의)
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx        # 로그인 ID / 비밀번호 입력, 상태별 오류 메시지
│   │   │   └── SignupPage.tsx       # 회사코드 / 프로젝트코드(선택) 입력(드롭다운 아님, GET /companies·/projects가 인증 필수라 사용 불가), 사용자 정보 입력, 가입 후 승인 대기 안내
│   │   │
│   │   ├── errors/
│   │   │   ├── ForbiddenPage.tsx    # 403 — 권한 없는 role의 route 접근 시
│   │   │   └── NotFoundPage.tsx     # 404 — 정의되지 않은 route 접근 시
│   │   ├── admin/
│   │   │   ├── companies/
│   │   │   │   ├── CompanyListPage.tsx    # 회사 목록 조회 (상태 필터, 페이지네이션)
│   │   │   │   ├── CompanyNewPage.tsx     # 회사 등록 폼
│   │   │   │   └── CompanyDetailPage.tsx  # 회사 상세 조회 및 수정 (SUPER_ADMIN)
│   │   │   ├── projects/
│   │   │   │   ├── ProjectListPage.tsx    # 프로젝트 목록 조회 (상태 필터 — 회사 필터는 헤더 전역 선택 사용)
│   │   │   │   ├── ProjectNewPage.tsx     # 프로젝트 등록 폼
│   │   │   │   └── ProjectDetailPage.tsx  # 프로젝트 상세 조회 및 수정 (SUPER_ADMIN)
│   │   │   ├── users/
│   │   │   │   ├── UserListPage.tsx       # 사용자 목록 (상태 콤보박스 필터)
│   │   │   │   └── UserDetailPage.tsx     # 사용자 상세 / 수정 / 승인·반려 / 권한 관리
│   │   │   ├── audit-logs/
│   │   │   │   ├── AuditLogListPage.tsx   # 감사 로그 목록 (로그ID / 테이블 / 작업유형 / 작업자 / 기간 필터, 회사·프로젝트는 헤더 전역 선택 사용)
│   │   │   │   └── AuditLogDetailPage.tsx # before_json / after_json 비교 조회
│   │   │   └── code-groups/
│   │   │       ├── CodeGroupPage.tsx      # 코드그룹 엑셀형 편집 그리드(조회/등록/수정 한 페이지, 등록/상세 라우트 없음). SUPER_ADMIN/DEVELOPER 전용
│   │   │       └── CodeItemGrid.tsx       # 코드그룹 행 expand 시 하단에 표시되는 코드 아이템 편집 그리드
│   │   │
│   │   └── main/
│   │       ├── apis/
│   │       │   ├── ApiListPage.tsx        # API 목록 (api_stage / 상태 필터)
│   │       │   ├── ApiNewPage.tsx         # API 등록 폼
│   │       │   └── ApiDetailPage.tsx      # API 상세 / 수정 / 파라미터 관리 / 실행 (APPROVER/OPERATOR는 GET /code-groups/active-with-items로 코드값 참조)
│   │       ├── executions/
│   │       │   ├── ExecutionListPage.tsx          # 실행 이력 목록 (API / 상태 / 요청자 / 승인 필요 건만 필터)
│   │       │   ├── ExecutionDetailPage.tsx        # 실행 상세 조회 전용 (요청 파라미터 / 응답 데이터 / 상태 이력)
│   │       │   ├── ExecutionPendingListPage.tsx   # 승인 대기 목록 (조회 전용, 승인/반려 버튼 없음)
│   │       │   └── ExecutionPendingDetailPage.tsx # 승인 대기 상세 — 승인 / 반려는 이 화면에서만 처리
│   │       └── my-account/
│   │           └── MyAccountPage.tsx        # 내 정보 조회 / 비밀번호 변경 / 로그아웃
│   │
│   ├── stores/
│   │   ├── authStore.ts        # 로그인 사용자 정보 (user, accessToken, refreshToken, roleCode) — 일부 필드만 localStorage persist
│   │   ├── globalStore.ts      # 헤더 전역 선택 상태 (selectedCompanyId, selectedProjectId, projectRoleCode, 목록 캐시)
│   │   └── listFilterStore.ts  # 목록 화면 검색조건(상태 필터 등) — local state 대신 저장해 등록/상세 이동 후에도 유지, 로그아웃 시 초기화
│   │
│   ├── hooks/
│   │   ├── useAuth.ts        # authStore 접근 및 인증 관련 액션 추상화
│   │   └── usePermission.ts  # 현재 사용자 role 기반 권한 확인 유틸 훅
│   │
│   ├── router/
│   │   ├── index.tsx         # React Router 전체 라우트 정의
│   │   ├── AuthGuard.tsx     # 미인증 상태로 보호 Route 접근 시 /login 리다이렉트
│   │   ├── GuestGuard.tsx    # 인증 상태로 /login, /signup 접근 시 /apis 리다이렉트
│   │   └── RoleGuard.tsx     # 권한 없는 role 접근 시 403 페이지 처리
│   │
│   ├── types/
│   │   └── index.ts          # 공통 타입 정의 (User, Company, Project, Api, ApiExecution 등)
│   │
│   ├── utils/
│   │   └── format.ts         # 날짜 / 숫자 / 상태값 포맷 변환 함수
│   │
│   ├── App.tsx               # 라우터 마운트, 전역 Provider 설정
│   ├── index.css             # 전역 CSS 리셋 (html/body/#root margin·height) — 브라우저 기본 body 마진으로 인한 잔여 스크롤 방지
│   └── main.tsx              # 앱 진입점, React DOM 렌더링
│
├── .env                      # 환경변수 (Git 제외)
├── .env.example              # 환경변수 샘플
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 3.1 디렉터리 역할

| 디렉터리 | 역할 |
| ----------- | ------------------------------------------- |
| api/ | 백엔드 API 호출 함수 모음 |
| components/ | 재사용 가능한 UI 컴포넌트 |
| pages/ | Route에 매핑되는 화면 컴포넌트 |
| stores/ | Zustand 전역 상태 |
| hooks/ | 상태/로직 추상화 커스텀 훅 |
| router/ | 라우트 정의 및 가드 |
| types/ | TypeScript 타입 정의 |
| utils/ | 포맷, 변환 등 순수 유틸 함수 |
