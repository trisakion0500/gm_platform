# 04_PROJECT_STRUCTURE.md

# 프로젝트 폴더 구조

---

# 1. 전체 구조

```
gm_platform/
├── client/              # Frontend (React + Vite)
├── server/              # Backend (Express + TypeScript)
├── rag_server/           # 자연어 검색 전용 독립 서비스 — 문서(gm_docs)/API 정의(gm_apis)/감사로그(gm_logs) 3개 컬렉션, Qdrant + 로컬 임베딩. 상세: 21_RAG_SERVER.md
├── mcp_server_dev/       # GM Platform REST API를 tool로 감싸는 stdio MCP 서버 — 실행/승인/조회/검색 13개 tool, 로그인 계정 role_code로 게이팅. 상세: 19_MCP_SERVER_DEV.md
├── mcp_server_pc/        # mcp_server_dev 확장판 — 위 13개 + 회사/프로젝트/사용자/역할배정 admin CRUD 20개(총 33개), SUPER_ADMIN이 회사를 넘나들며 관리. 상세: 20_MCP_SERVER_PC.md
├── test_game_server/     # API 실행/승인 워크플로우를 실제 외부 서비스 대상으로 검증하기 위한 독립 게임서버(포트 3100). 상세: 18_TEST_GAME_SERVER.md
├── database/             # 메인 DB(gm_platform) 스크립트
│   ├── tables/           # DDL SQL 파일
│   ├── procedures/       # Stored Procedure SQL 파일
│   └── functions/        # Function SQL 파일
├── database_log/         # 감사 로그 전용 DB(gm_platform_log) 스크립트 — 메인 DB와 물리적으로 분리
│   ├── tables/           # log_audit + api_index_sync_queue/log_audit_index_sync_queue DDL + 통합 스크립트
│   ├── procedures/       # log_audit 관련 SP + 통합 스크립트
│   └── functions/        # FN_HAS_LOG_AUDIT_ACCESS 등 + 통합 스크립트
└── docs/                 # 설계 문서
```

---

# 2. Backend (`server/`)

```
server/
├── src/
│   ├── config/
│   │   ├── db.ts            # mysql2 커넥션 풀 설정(메인 pool + 감사로그 전용 logPool), callSP() 래퍼(pool 선택 가능), runExclusive()(MySQL advisory lock, 스케일아웃 시 크론 잡 중복 실행 방지)
│   │   ├── env.ts           # 환경변수 로드 및 검증
│   │   ├── swagger.ts       # Swagger UI 설정 및 공통 컴포넌트 스키마 (SWAGGER_ENABLED=true 시에만 require, RAG_ENABLED=false면 doc-search 관련 경로/태그도 스펙에서 제외)
│   │   ├── logger.ts        # log4js appender/category 설정(콘솔+파일, NODE_APP_INSTANCE 접미사) — utils/logger.ts가 이 설정을 import해 로거 인스턴스를 얻음
│   │   ├── redis.ts         # REDIS_ENABLED=true일 때만 연결하는 ioredis 클라이언트(REDIS_COMMAND_TIMEOUT_MS로 장애 시 빠른 실패), false면 null
│   │   ├── cache.ts         # getOrSetCache() — 참조 데이터(헤더 콤보박스 등) 캐시, Redis 있으면 Redis·없으면 인메모리 Map으로 폴백
│   │   └── sessionCache.ts  # 세션(jti) 캐시 — user 단위 generation 카운터로 로그아웃/비밀번호 변경/계정상태 변경 시 즉시 무효화
│   │
│   ├── constants/
│   │   ├── errors.ts        # ERROR_MAP, toAppError(), toDBError()
│   │   └── roles.ts         # ROLE 상수 (10/20/30/40)
│   │
│   ├── middleware/
│   │   ├── auth.ts               # JWT 검증, req.user에 사용자 정보 주입
│   │   ├── role.ts               # requireRole() — 라우트 단위 역할 권한 검사
│   │   ├── rateLimiter.ts        # loginLimiter — 로그인/회원가입 브루트포스 방지 (IP당 윈도우 요청 수 제한)
│   │   ├── redisRateLimitStore.ts # rateLimiter용 자체 Redis 스토어 — rate-limit-redis의 SCRIPT LOAD 영구 캐싱 결함을 피해 매 요청 독립 EVAL로 구현
│   │   ├── ragKeyAuth.ts         # rag_server → server/ 내부 호출(GET /internal/apis 등) 전용 X-API-Key 검증
│   │   ├── errorHandler.ts       # 전역 에러 처리 (Express 에러 미들웨어)
│   │   └── requestLogger.ts      # HTTP 요청/응답 로깅 (log4js)
│   │
│   ├── routes/
│   │   ├── index.ts          # 전체 라우터 통합 및 앱에 등록 (RAG_ENABLED=false면 docSearch/apiSearch/logAuditSearch/internal 라우트 자체를 등록하지 않음)
│   │   ├── auth.ts           # /auth — 로그인, 회원가입, 토큰, 세션
│   │   ├── company.ts        # /companies — 회사 관리 (lookup은 회원가입 화면 전용, 인증 불필요)
│   │   ├── project.ts        # /projects — 프로젝트 관리 (lookup은 회원가입 화면 전용, 인증 불필요)
│   │   ├── user.ts           # /users — 사용자 관리
│   │   ├── userRole.ts       # /user-roles — 사용자 권한 관리
│   │   ├── api.ts            # /apis — API 정의 및 실행
│   │   ├── apiRequest.ts     # /api-requests — Request 파라미터 관리
│   │   ├── apiResponse.ts    # /api-responses — Response 파라미터 관리
│   │   ├── apiExecution.ts   # /api-executions — 실행 이력 및 승인 워크플로우
│   │   ├── codeGroup.ts      # /code-groups — 코드 그룹 관리 (+ /active-with-items 전 역할 조회 전용)
│   │   ├── codeItem.ts       # /code-items — 코드 아이템 관리
│   │   ├── logAudit.ts       # /log-audits — 감사 로그 조회
│   │   ├── docSearch.ts      # /doc-search — 설계 문서 자연어 검색 (rag_server 프록시)
│   │   ├── apiSearch.ts      # /api-search — API 정의 자연어 검색 (rag_server 프록시, project_id 강제 스코핑)
│   │   ├── logAuditSearch.ts # /log-audit-search — 감사 로그 자연어 검색 (rag_server 프록시, SA/DEV/APV 전용)
│   │   └── internal.ts       # /internal/apis, /internal/log-audits — rag_server가 전체 스냅샷을 pull하는 내부 전용 라우트 (ragKeyAuth로 보호, GM Platform 사용자 인증과 무관)
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
│   │   ├── logAudit.controller.ts      # 감사 로그 목록 / 상세
│   │   ├── docSearch.controller.ts     # 설계 문서 검색 (q/top_k 검증 후 rag_server 프록시)
│   │   ├── apiSearch.controller.ts     # API 정의 검색 (q/project_id/top_k 검증 후 rag_server 프록시)
│   │   ├── logAuditSearch.controller.ts # 감사 로그 검색 (q/project_id/company_id/top_k 검증 후 rag_server 프록시)
│   │   └── internal.controller.ts      # GET /internal/apis, /internal/log-audits — rag_server 전용 전체 스냅샷 응답
│   │
│   ├── services/
│   │   ├── auth.service.ts          # 인증 비즈니스 로직 (JWT 발급, 세션 관리, 비밀번호 검증)
│   │   ├── company.service.ts       # 회사 비즈니스 로직 (역할별 스코핑 포함)
│   │   ├── companyScope.service.ts  # assertCompanyScope() — 회사 단위 쓰기 권한 재검증 (SA 외 역할로 쓰기 권한이 확장될 경우를 대비한 방어 코드)
│   │   ├── project.service.ts       # 프로젝트 비즈니스 로직
│   │   ├── user.service.ts          # 사용자 비즈니스 로직 (가입 승인 워크플로우)
│   │   ├── userRole.service.ts      # 사용자 권한 비즈니스 로직
│   │   ├── api.service.ts           # API / Request / Response 파라미터 비즈니스 로직 (핵심 필드 수정 시 api_stage 롤백) — apiRequest/apiResponse 전용 service 파일은 없고 여기에 통합됨
│   │   ├── apiExecution.service.ts  # 실행 비즈니스 로직 (즉시 실행 / 승인 워크플로우 분기, X-API-Key 첨부)
│   │   ├── codeGroup.service.ts     # 코드 그룹 비즈니스 로직
│   │   ├── codeItem.service.ts      # 코드 아이템 비즈니스 로직
│   │   ├── logAudit.service.ts      # 감사 로그 비즈니스 로직 (Append-Only, resolveAllowedProjectIds() 등 검색 서비스에서도 재사용)
│   │   ├── docSearch.service.ts     # rag_server POST /search 프록시 (실패 사유 구분 없이 50002로 통일)
│   │   ├── apiSearch.service.ts     # rag_server POST /apis/search 프록시, 호출자의 project_id별 실제 role_code로 스코핑 파라미터 구성
│   │   ├── logAuditSearch.service.ts # rag_server POST /log-audits/search 프록시, resolveAllowedProjectIds() 재사용
│   │   └── internal.service.ts      # rag_server pull용 전체 스냅샷 조립 (활성 프로젝트/API 페이지네이션 순회)
│   │
│   ├── db/
│   │   ├── auth.db.ts               # 세션 조회 / 생성 / 상태 변경 SP·FN 호출
│   │   ├── company.db.ts            # 회사 조회 / 등록 / 수정 SP·FN 호출
│   │   ├── project.db.ts            # 프로젝트 조회 / 등록 / 수정 SP·FN 호출
│   │   ├── user.db.ts               # 사용자 조회 / 등록 / 수정 SP·FN 호출
│   │   ├── userRole.db.ts           # 권한 조회 / 등록 / 수정 SP·FN 호출
│   │   ├── api.db.ts                # API / Request / Response 파라미터 조회·등록·수정 SP·FN 호출 (apiRequest/apiResponse 전용 db 파일은 없고 여기에 통합됨)
│   │   ├── apiExecution.db.ts       # 실행 이력 조회 / 등록 / 상태 변경 SP·FN 호출
│   │   ├── codeGroup.db.ts          # 코드 그룹 조회 / 등록 / 수정 SP·FN 호출
│   │   ├── codeItem.db.ts           # 코드 아이템 조회 / 등록 / 수정 SP·FN 호출
│   │   ├── logAudit.db.ts           # 감사 로그 조회 / 등록 SP·FN 호출 (logPool 사용)
│   │   ├── apiIndexSync.db.ts       # api_index_sync_queue(아웃박스) 조회/삭제/실패마킹 SP 호출
│   │   ├── logAuditIndexSync.db.ts  # log_audit_index_sync_queue(아웃박스) 조회/삭제/실패마킹 SP 호출 (logPool 사용)
│   │   └── cleanup.db.ts            # 만료 세션 정리 SP 호출 (도메인별이 아닌 "정리 작업" 성격으로 분리)
│   │
│   ├── types/
│   │   ├── express.d.ts     # req.user 등 Express Request 타입 확장
│   │   └── index.ts         # 공통 타입 정의 (User, Company, Project, ApiExecution, 검색 프록시 요청/응답 타입 등)
│   │
│   ├── utils/
│   │   ├── jwt.ts           # Access Token / Refresh Token 발급 및 검증
│   │   ├── bcrypt.ts        # 비밀번호 해시 생성 및 비교
│   │   ├── crypto.ts        # AES-256-CBC 암호화/복호화 (user.phone_number 등 개인정보)
│   │   ├── mask.ts          # 로그 등에서 민감 값 마스킹
│   │   ├── response.ts      # 공통 응답 포맷 생성 (success / error)
│   │   ├── logger.ts        # log4js 로거 인스턴스 획득 + exitAfterFlush()(정상 종료 시 flush 대기 후 process.exit)
│   │   ├── validation.ts    # 쿼리/파라미터 공통 파싱(parsePositiveInt 등)
│   │   ├── duration.ts      # "7d"/"24h"/"30m" 형태 TTL 문자열 → 밀리초 변환 (JWT 만료값 파생 등에 재사용)
│   │   └── auditDiffText.ts # before_json/after_json diff를 감사로그 검색용 문장으로 합성 (gm_logs 임베딩 텍스트)
│   │
│   ├── scripts/
│   │   ├── encrypt.ts       # `npm run encrypt -- "평문"` — ENCRYPTION_KEY로 값을 암호화해 출력 (시드 데이터 생성용)
│   │   └── fixSeedPhone.ts  # `npm run fix-seed-phone` — ENCRYPTION_KEY 교체 시 시드 계정(user_id 1~4) phone_number 재암호화
│   │
│   ├── jobs/
│   │   ├── sessionCleanup.job.ts     # node-cron 기반 만료 세션 정리 잡 (SESSION_CLEANUP_CRON 주기, runExclusive로 인스턴스 간 중복 실행 방지)
│   │   ├── apiIndexSync.job.ts       # api_index_sync_queue(아웃박스) 폴링 → rag_server(gm_apis) push (재귀 setTimeout, RAG_ENABLED=true일 때만 등록)
│   │   └── logAuditIndexSync.job.ts  # log_audit_index_sync_queue(아웃박스) 폴링 → rag_server(gm_logs) push (재귀 setTimeout, RAG_ENABLED=true일 때만 등록)
│   │
│   └── app.ts               # Express 앱 초기화, DB 연결(재시도) 확인, 크론/워커 등록, 서버 기동, SIGTERM/SIGINT 정상 종료 훅(잡 정지 → DB pool 종료)
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
│   │   ├── project.api.ts       # 프로젝트 목록 / 상세 / 등록 / 수정 / 연결정보 / API 키 발급
│   │   ├── user.api.ts          # 사용자 목록 / 상세 / 수정 / 가입 승인·반려 / 비밀번호 초기화
│   │   ├── userRole.api.ts      # 권한 목록 / 등록 / 수정
│   │   ├── api.api.ts           # API 목록 / 상세 / 등록 / 수정 / 실행
│   │   ├── apiRequest.api.ts    # Request 파라미터 등록 / 수정
│   │   ├── apiResponse.api.ts   # Response 파라미터 등록 / 수정
│   │   ├── apiExecution.api.ts  # 실행 이력 목록 / 상세 / 승인 / 반려 / 취소
│   │   ├── codeGroup.api.ts     # 코드 그룹 목록 / 상세 / 등록 / 수정
│   │   ├── codeItem.api.ts      # 코드 아이템 목록 / 등록 / 수정
│   │   ├── logAudit.api.ts      # 감사 로그 목록 / 상세
│   │   ├── docSearch.api.ts     # 설계 문서 자연어 검색
│   │   ├── apiSearch.api.ts     # API 정의 자연어 검색
│   │   └── logAuditSearch.api.ts # 감사 로그 자연어 검색
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── DataTable.tsx        # Ant Design Table 래퍼 — 페이지네이션, ResizeObserver 기반 동적 높이 산정, 네트워크 에러 Alert 표시
│   │   │   ├── PageSizeSelect.tsx   # 목록 화면 공용 페이지 크기 콤보박스 (20/30/50/100)
│   │   │   ├── StatusBadge.tsx      # status 값을 색상 뱃지로 표시
│   │   │   ├── FormModal.tsx        # (미사용) React Hook Form 연동 모달 스캐폴딩 — 실제 등록/수정 화면은 antd Form 직접 사용
│   │   │   ├── ConfirmModal.tsx     # 승인 / 반려 / 삭제 확인 모달
│   │   │   ├── PageHeader.tsx       # 페이지 제목 + 우측 액션 버튼 영역
│   │   │   └── PermissionGuard.tsx  # role 조건 충족 시만 children 렌더링
│   │   │
│   │   └── layout/
│   │       ├── AuthLayout.tsx       # 로그인 / 회원가입 전용 레이아웃 (사이드바·헤더 없음, Footer만 공통 적용)
│   │       ├── AppLayout.tsx        # 메인/관리 공통 레이아웃 (variant='main'|'admin' prop으로 분기, 기존 MainLayout/AdminLayout 통합) — Header + Sidebar + Footer
│   │       ├── Header.tsx           # 공통 헤더 (로고, 회사/프로젝트 선택, 관리 버튼, 사용자 메뉴)
│   │       ├── Sidebar.tsx          # 사이드바 (역할별 메뉴 노출 제어, API 메뉴는 체크박스 트리)
│   │       └── Footer.tsx           # 공통 푸터 (버전, 문의)
│   │
│   ├── constants/
│   │   ├── apiMeta.ts       # API/Request/Response 관련 코드값 라벨 (api_stage 등, admin/main 공통)
│   │   ├── statusMaps.ts    # 활성상태·감사로그 action_type/table_name 등 공통 상태 라벨맵
│   │   └── validation.ts    # login_id/company_code/project_code/api_code 등 공통 문자셋 검증 정규식
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
│   │   │   │   └── ProjectDetailPage.tsx  # 프로젝트 상세 조회 및 수정 / 연결정보 수정 / API 키 발급 (SUPER_ADMIN·DEVELOPER)
│   │   │   ├── users/
│   │   │   │   ├── UserListPage.tsx       # 사용자 목록 (상태 콤보박스 필터)
│   │   │   │   └── UserDetailPage.tsx     # 사용자 상세 / 수정 / 승인·반려 / 권한 관리
│   │   │   ├── apis/
│   │   │   │   ├── ApiListPage.tsx        # API 목록 (api_stage / 상태 필터) — SUPER_ADMIN/DEVELOPER 전용 CRUD, /apis(전 역할 실행 워크스페이스)와 분리됨
│   │   │   │   ├── ApiNewPage.tsx         # API 등록 폼
│   │   │   │   └── ApiDetailPage.tsx      # API 상세 / 수정 / Request·Response 파라미터 관리
│   │   │   ├── audit-logs/
│   │   │   │   ├── AuditLogListPage.tsx   # 감사 로그 목록 (로그ID / 테이블 / 작업유형 / 작업자 / 기간 필터, 회사·프로젝트는 헤더 전역 선택 사용)
│   │   │   │   ├── AuditLogDetailPage.tsx # before_json / after_json 비교 조회
│   │   │   │   └── AuditLogSearchPage.tsx # 감사 로그 자연어 검색 (SA/DEV/APV, 헤더 회사/프로젝트로 검색 범위 좁히기)
│   │   │   └── code-groups/
│   │   │       ├── CodeGroupPage.tsx      # 코드그룹 엑셀형 편집 그리드(조회/등록/수정 한 페이지, 등록/상세 라우트 없음). SUPER_ADMIN/DEVELOPER 전용
│   │   │       └── CodeItemGrid.tsx       # 코드그룹 행 expand 시 하단에 표시되는 코드 아이템 편집 그리드
│   │   │
│   │   └── main/
│   │       ├── apis/
│   │       │   ├── ApiWorkspacePage.tsx   # 사이드바에서 체크한 API들을 패널로 여는 실행 워크스페이스(/apis, 전 역할) — 옛 List/New/Detail 패턴은 /admin/apis로 분리됨
│   │       │   └── ApiPanel.tsx           # 패널 1개 — Request 입력(component_type별 컨트롤) → 실행 → Response 결과 표시
│   │       ├── api-search/
│   │       │   └── ApiSearchPage.tsx      # API 정의 자연어 검색 (전 역할, 헤더 선택 프로젝트로 강제 스코핑)
│   │       ├── doc-search/
│   │       │   └── DocSearchPage.tsx      # 설계 문서 자연어 검색 (전 역할)
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
│   │   ├── listFilterStore.ts  # 목록 화면 검색조건(상태 필터 등) — local state 대신 저장해 등록/상세 이동 후에도 유지, 로그아웃 시 초기화
│   │   └── apiWorkspaceStore.ts # /apis 워크스페이스 상태 (열린 API id 목록, 패널별 Request 입력값·실행결과, 사이드바 메뉴 펼침 상태) — 로그아웃/프로젝트 변경 시 초기화
│   │
│   ├── hooks/
│   │   ├── useAuth.ts        # authStore 접근 및 인증 관련 액션 추상화
│   │   └── usePermission.ts  # 현재 사용자 role 기반 권한 확인 유틸 훅
│   │
│   ├── router/
│   │   ├── index.tsx         # React Router 전체 라우트 정의 (페이지 컴포넌트 전부 React.lazy 코드 스플리팅, VITE_RAG_ENABLED=false면 검색 라우트 자체를 등록하지 않음)
│   │   ├── AuthGuard.tsx     # 미인증 상태로 보호 Route 접근 시 /login 리다이렉트
│   │   ├── GuestGuard.tsx    # 인증 상태로 /login, /signup 접근 시 /apis 리다이렉트
│   │   └── RoleGuard.tsx     # 권한 없는 role 접근 시 403 페이지 처리
│   │
│   ├── types/
│   │   └── index.ts          # 공통 타입 정의 (User, Company, Project, Api, ApiExecution, 검색 결과 타입 등)
│   │
│   ├── utils/
│   │   ├── format.ts         # 날짜 / 숫자 / 상태값 포맷 변환 함수
│   │   └── error.ts          # catch된 에러에서 사용자 표시용 메시지 추출 (getErrorMessage)
│   │
│   ├── App.tsx               # 라우터 마운트, 전역 Provider 설정
│   ├── index.css             # 전역 CSS 리셋 (html/body/#root margin·height) — 브라우저 기본 body 마진으로 인한 잔여 스크롤 방지
│   └── main.tsx               # 앱 진입점, React DOM 렌더링
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
| constants/ | 화면 간 공유하는 코드값 라벨·검증 정규식 |
| pages/ | Route에 매핑되는 화면 컴포넌트 |
| stores/ | Zustand 전역 상태 |
| hooks/ | 상태/로직 추상화 커스텀 훅 |
| router/ | 라우트 정의 및 가드 |
| types/ | TypeScript 타입 정의 |
| utils/ | 포맷, 변환 등 순수 유틸 함수 |
