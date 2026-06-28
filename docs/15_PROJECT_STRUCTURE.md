# 15_PROJECT_STRUCTURE.md

# 프로젝트 폴더 구조

---

# 1. 전체 구조

```
gm_platform/
├── client/              # Frontend (React + Vite)
├── server/              # Backend (Express + TypeScript)
├── database/
│   └── tables/          # DDL SQL 파일
└── docs/                # 설계 문서
```

---

# 2. Backend (`server/`)

```
server/
├── src/
│   ├── config/
│   │   ├── db.ts            # mysql2 커넥션 풀 설정
│   │   └── env.ts           # 환경변수 로드 및 검증
│   │
│   ├── middleware/
│   │   ├── auth.ts          # JWT 검증, 사용자 정보 주입
│   │   ├── errorHandler.ts  # 전역 에러 처리
│   │   └── requestLogger.ts # 요청 로깅 (log4js)
│   │
│   ├── routes/
│   │   ├── index.ts         # 라우터 통합
│   │   ├── auth.ts          # /auth
│   │   ├── company.ts       # /companies
│   │   ├── project.ts       # /projects
│   │   ├── user.ts          # /users
│   │   ├── userRole.ts      # /user-roles
│   │   ├── api.ts           # /apis
│   │   ├── apiRequest.ts    # /api-requests
│   │   ├── apiResponse.ts   # /api-responses
│   │   ├── apiExecution.ts  # /api-executions
│   │   ├── codeGroup.ts     # /code-groups
│   │   ├── codeItem.ts      # /code-items
│   │   └── logAudit.ts      # /log-audits
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── company.controller.ts
│   │   ├── project.controller.ts
│   │   ├── user.controller.ts
│   │   ├── userRole.controller.ts
│   │   ├── api.controller.ts
│   │   ├── apiRequest.controller.ts
│   │   ├── apiResponse.controller.ts
│   │   ├── apiExecution.controller.ts
│   │   ├── codeGroup.controller.ts
│   │   ├── codeItem.controller.ts
│   │   └── logAudit.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── company.service.ts
│   │   ├── project.service.ts
│   │   ├── user.service.ts
│   │   ├── userRole.service.ts
│   │   ├── api.service.ts
│   │   ├── apiRequest.service.ts
│   │   ├── apiResponse.service.ts
│   │   ├── apiExecution.service.ts
│   │   ├── codeGroup.service.ts
│   │   ├── codeItem.service.ts
│   │   └── logAudit.service.ts
│   │
│   ├── db/
│   │   ├── auth.db.ts
│   │   ├── company.db.ts
│   │   ├── project.db.ts
│   │   ├── user.db.ts
│   │   ├── userRole.db.ts
│   │   ├── api.db.ts
│   │   ├── apiRequest.db.ts
│   │   ├── apiResponse.db.ts
│   │   ├── apiExecution.db.ts
│   │   ├── codeGroup.db.ts
│   │   ├── codeItem.db.ts
│   │   └── logAudit.db.ts
│   │
│   ├── types/
│   │   ├── express.d.ts     # req.user 등 Express 타입 확장
│   │   └── index.ts         # 공통 타입 정의
│   │
│   ├── utils/
│   │   ├── jwt.ts           # JWT 발급 / 검증
│   │   ├── bcrypt.ts        # 비밀번호 해시 / 검증
│   │   ├── response.ts      # 공통 응답 포맷 생성
│   │   └── logger.ts        # log4js 인스턴스
│   │
│   └── app.ts               # Express 앱 초기화
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
│   │   ├── axios.ts             # Axios 인스턴스 (baseURL, 인터셉터)
│   │   ├── auth.api.ts
│   │   ├── company.api.ts
│   │   ├── project.api.ts
│   │   ├── user.api.ts
│   │   ├── userRole.api.ts
│   │   ├── api.api.ts
│   │   ├── apiRequest.api.ts
│   │   ├── apiResponse.api.ts
│   │   ├── apiExecution.api.ts
│   │   ├── codeGroup.api.ts
│   │   ├── codeItem.api.ts
│   │   └── logAudit.api.ts
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── DataTable.tsx        # Ant Design Table 래퍼
│   │   │   ├── StatusBadge.tsx      # 상태 뱃지
│   │   │   ├── FormModal.tsx        # 등록/수정 공통 모달
│   │   │   ├── ConfirmModal.tsx     # 승인/반려/삭제 확인 모달
│   │   │   ├── PageHeader.tsx       # 페이지 제목 + 액션 버튼
│   │   │   └── PermissionGuard.tsx  # 역할 기반 렌더링 제어
│   │   │
│   │   └── layout/
│   │       ├── AuthLayout.tsx       # 로그인/회원가입 레이아웃
│   │       ├── MainLayout.tsx       # 비관리 메뉴 레이아웃
│   │       ├── AdminLayout.tsx      # 관리 메뉴 레이아웃
│   │       ├── Header.tsx           # 공통 헤더
│   │       ├── Sidebar.tsx          # 사이드바 (메뉴 목록)
│   │       └── Footer.tsx           # 공통 푸터
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── SignupPage.tsx
│   │   │
│   │   ├── admin/
│   │   │   ├── companies/
│   │   │   │   ├── CompanyListPage.tsx
│   │   │   │   ├── CompanyNewPage.tsx
│   │   │   │   └── CompanyDetailPage.tsx
│   │   │   ├── projects/
│   │   │   │   ├── ProjectListPage.tsx
│   │   │   │   ├── ProjectNewPage.tsx
│   │   │   │   └── ProjectDetailPage.tsx
│   │   │   ├── users/
│   │   │   │   ├── UserListPage.tsx
│   │   │   │   └── UserDetailPage.tsx
│   │   │   └── audit-logs/
│   │   │       ├── AuditLogListPage.tsx
│   │   │       └── AuditLogDetailPage.tsx
│   │   │
│   │   └── main/
│   │       ├── apis/
│   │       │   ├── ApiListPage.tsx
│   │       │   ├── ApiNewPage.tsx
│   │       │   └── ApiDetailPage.tsx
│   │       ├── executions/
│   │       │   ├── ExecutionListPage.tsx
│   │       │   ├── ExecutionDetailPage.tsx
│   │       │   └── ExecutionPendingPage.tsx
│   │       ├── code-groups/
│   │       │   ├── CodeGroupListPage.tsx
│   │       │   └── CodeGroupDetailPage.tsx
│   │       └── my-account/
│   │           └── MyAccountPage.tsx
│   │
│   ├── stores/
│   │   ├── authStore.ts      # user, accessToken, isAuthenticated
│   │   └── globalStore.ts    # selectedCompanyId, selectedProjectId, 목록 캐시
│   │
│   ├── hooks/
│   │   ├── useAuth.ts        # 인증 상태 접근
│   │   └── usePermission.ts  # 역할 기반 권한 확인
│   │
│   ├── router/
│   │   ├── index.tsx         # React Router 라우트 정의
│   │   ├── AuthGuard.tsx     # 미인증 → /login 리다이렉트
│   │   └── RoleGuard.tsx     # 권한 없음 → 403 처리
│   │
│   ├── types/
│   │   └── index.ts          # 공통 타입 정의 (User, Company, Project 등)
│   │
│   ├── utils/
│   │   └── format.ts         # 날짜, 숫자 포맷 등
│   │
│   ├── App.tsx
│   └── main.tsx
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
