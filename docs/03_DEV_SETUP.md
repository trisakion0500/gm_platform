# 03_DEV_SETUP.md

# 로컬 개발 환경 설정

---

# 1. 사전 요구사항

| 항목 | 버전 |
| -------- | ------------ |
| Node.js | 22 LTS |
| MySQL | 8.4 |
| Git | 최신 버전 |

---

# 2. 저장소 클론

```bash
git clone https://github.com/trisakion0500/gm_platform.git
cd gm_platform
npm install
```

루트 `npm install`은 `server`/`client`와 별개로 필요하다 — `devDependencies`의 `husky`를 설치하고 `prepare` 스크립트가 `.husky/pre-commit`(커밋 전 크리덴셜 스캔 훅)을 활성화한다. 건너뛰어도 개발 자체는 가능하지만, 실수로 크리덴셜을 커밋하는 걸 막아주는 훅이 걸리지 않는다.

---

# 3. 데이터베이스 초기화

## 3.1 DB 생성

MySQL 클라이언트에서 실행한다. `gm_platform`(메인)과 `gm_platform_log`(감사 로그 전용) 두 개를 만든다 — 두 DB는 물리적으로 다른 MySQL 인스턴스/서버에 있어도 되도록 설계돼 있다(로컬 개발에서는 같은 인스턴스에 스키마만 분리해도 무방).

```sql
CREATE DATABASE gm_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE DATABASE gm_platform_log
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE gm_platform;
```

## 3.2 테이블 생성 및 초기 데이터

```bash
mysql -u root -p gm_platform < database/tables/all_tables.sql
```

실행 결과로 아래 초기 데이터가 삽입된다.

| 테이블 | ID | code | name | 비고 |
| ------- | -- | ---- | ---- | ---- |
| company | 1 | `ADMIN` | Administrator Company | — |
| company | 2 | `DEV` | Developer Company | — |
| project | 1 | `ADMIN_PROJECT` | Administrator Company Default Project | company_id=1 |
| project | 2 | `DEV_PROJECT` | Developer Company Default Project | company_id=2 |
| user | 1 | `sa` | Super Admin | pw=`1234`, company=1, project=1, role=SUPER_ADMIN(10) |
| user | 2 | `dev` | Developer | pw=`1234`, company=2, project=2, role=DEVELOPER(20) |
| user | 3 | `apv` | Approver | pw=`1234`, company=2, project=2, role=APPROVER(30) |
| user | 4 | `op` | Operator | pw=`1234`, company=2, project=2, role=OPERATOR(40) |

## 3.3 스토어드 프로시저 및 함수 생성

```bash
mysql -u root -p gm_platform < database/functions/all_functions.sql
mysql -u root -p gm_platform < database/procedures/all_procedures.sql
```

`database/functions/all_functions.sql`은 `database/functions/*.sql`(함수 5개: `FN_GET_PROJECT_ROLE_CODE`/`FN_HAS_COMPANY_ROLE`/`FN_HAS_PROJECT_ROLE`/`FN_IS_PROJECT_DEVELOPER`/`FN_IS_SUPER_ADMIN`)을, `database/procedures/all_procedures.sql`은 `database/procedures/*.sql`(SP 68개)을 각각 알파벳순으로 이어붙인 통합 스크립트다(`all_tables.sql`과 동일 패턴). 프로시저가 내부에서 함수를 참조하므로 함수를 먼저 생성한다.

이 단계를 건너뛰면 테이블만 있고 SP/함수가 없는 상태가 되어, `callSP()`를 거치는 모든 API 호출이 `Table/Procedure doesn't exist` 오류로 실패한다.

## 3.4 로그 DB 초기화 (`gm_platform_log`)

감사 로그(`log_audit`)는 메인 DB가 아닌 별도 DB에 산다 — `database_log/`가 그 전용 스크립트 모음이다. 3.1에서 만든 `gm_platform_log`에 실행한다.

```bash
mysql -u root -p gm_platform_log < database_log/tables/all_log_tables.sql
mysql -u root -p gm_platform_log < database_log/functions/all_functions_log.sql
mysql -u root -p gm_platform_log < database_log/procedures/all_procedures_log.sql
```

`database_log/functions/all_functions_log.sql`(`FN_HAS_LOG_AUDIT_ACCESS`)·`database_log/procedures/*.sql`은 메인 DB의 어떤 테이블·함수(`FN_HAS_PROJECT_ROLE` 등)도 참조하지 않는다 — 물리적으로 접근할 수 없는 DB이기 때문이다. 대신 조회 권한 판정(호출자가 어떤 프로젝트의 로그를 볼 수 있는지)은 서버(`logAudit.service.ts`)가 메인 DB를 먼저 조회해 계산한 뒤 파라미터로 넘긴다. 3.3(메인 DB)과는 완전히 독립적이라 순서를 바꿔도 무방하지만, 이 섹션 안에서는 프로시저가 `FN_HAS_LOG_AUDIT_ACCESS`를 참조하므로 함수를 먼저 생성해야 한다.

이 단계를 건너뛰면 `log_audit` 테이블 자체가 없어 감사 로그 기록(`POST`/`PATCH` 계열 API 전체)과 조회(`GET /log-audits`)가 모두 실패한다 — 단, 감사 로그 기록은 fire-and-forget(`logAudit.service.ts`)이라 이 실패가 원래 API 응답 자체를 막지는 않는다. 함수 생성을 건너뛰면 테이블·프로시저는 정상이어도 조회(`GET /log-audits`, `GET /log-audits/:id`)가 `FUNCTION FN_HAS_LOG_AUDIT_ACCESS does not exist` 오류로 실패한다.

---

# 4. 백엔드 설정

## 4.1 패키지 설치

```bash
cd server
npm install
```

## 4.2 환경변수 설정

`server/.env` 파일을 생성하고 아래 항목을 설정한다.

```env
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=gm_platform

# mysql2 풀 커넥션 수(인스턴스당) — 생략 시 기본값 10. 스케일아웃 시 총 커넥션 = 이 값 × 인스턴스 수이므로 MySQL max_connections와 맞춰 조정
DB_CONNECTION_LIMIT=10

# log_audit 전용 DB(3.4에서 만든 gm_platform_log) — 메인 DB와 같은 VM/인스턴스라는 보장이 없어 완전히 별도 설정으로 관리
LOG_DB_HOST=127.0.0.1
LOG_DB_PORT=3306
LOG_DB_USER=root
LOG_DB_PASSWORD=your_log_db_password
LOG_DB_NAME=gm_platform_log
LOG_DB_CONNECTION_LIMIT=10

JWT_SECRET=your_jwt_secret_key
JWT_ACCESS_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d

ENCRYPTION_KEY=your_64_char_hex_encryption_key

CORS_ALLOWED_ORIGINS=http://localhost:5173

PORT=3000

LOG_DEBUG_ERRORS=false

SWAGGER_ENABLED=true

# API 실행(S2S) 호출 타임아웃(ms) — 생략 시 기본값 10000
API_EXECUTION_TIMEOUT_MS=10000

# 로그인/회원가입 브루트포스 방지 리미터 — 생략 시 기본값 15분(900000)/10회
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=10

# 만료된 user_session 정리 크론 표현식 — 생략 시 기본값 매일 새벽 4시(0 4 * * *)
SESSION_CLEANUP_CRON=0 4 * * *

# 로그인 리미터 등 캐시성 기능의 Redis 사용 여부 — false(기본)면 인메모리로 폴백(스케일아웃 시 인스턴스별로 분리됨)
REDIS_ENABLED=false
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_KEY_PREFIX=gm:
```

`ENCRYPTION_KEY`는 `phone_number` 등 개인정보를 AES-256-CBC로 암호화하는 데 사용하는 32바이트 hex 키다. 아래 명령으로 생성한다.

```bash
npm run keygen
```

출력된 64자리 hex 문자열을 그대로 `ENCRYPTION_KEY`에 붙여넣는다. 이 키가 없거나 바뀌면 기존에 암호화된 `phone_number` 값을 복호화할 수 없으므로, 팀원 간 공유 시 안전한 채널로 전달한다.

### 4.2.1 시드 계정 phone_number 정합성

`all_tables.sql`의 시드 데이터(`sa`/`dev`/`apv`/`op`)는 원 저장소의 `ENCRYPTION_KEY`로 암호화된 `phone_number` 값을 포함한다.
위에서 새 키를 생성했다면 이 값들은 복호화되지 않으므로, DB 초기화 직후 아래 명령으로 정리한다.

```bash
npm run fix-seed-phone
```

복호화 실패한 시드 계정만 골라 `000-0000-0000`으로 재암호화한다(실제 사용자 데이터는 대상 아님).

## 4.3 실행

```bash
npm run dev
```

서버 기동 확인: `http://localhost:3000`

`SWAGGER_ENABLED=true`인 경우 API 문서 확인: `http://localhost:3000/api/docs`

---

# 5. 코드 스타일

## 5.1 Prettier

백엔드(server)는 Prettier를 사용한다. 별도 `.prettierrc` 설정 파일 없이 VSCode Prettier 익스텐션의 기본값을 따른다.

---

# 6. 프론트엔드 설정

## 6.1 패키지 설치

```bash
cd client
npm install
```

## 6.2 환경변수 설정

`client/.env` 파일을 생성하고 아래 항목을 설정한다.

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=GM Platform
VITE_FOOTER_COPYRIGHT=© 2026 GM Platform
VITE_APP_VERSION=v1.0.0
VITE_SUPPORT_EMAIL=trisakion@gmail.com
VITE_RAG_ENABLED=false
```

`VITE_RAG_ENABLED`은 서버 `RAG_ENABLED`와 반드시 같은 값으로 맞춘다 — 빌드타임 값이라 서버 설정이 나중에 바뀌어도 자동 반영되지 않는다(불일치 시 `true`/`false`인 쪽에 따라 메뉴는 보이는데 클릭하면 404가 나거나, 반대로 기능은 켜져 있는데 메뉴가 안 보이는 상태가 될 수 있다). `false`면 사이드바 메뉴에서 "문서 검색"이 빠지고 `/doc-search` 라우트 자체가 등록되지 않아 직접 URL로 접근해도 404 페이지로 처리된다.

## 6.3 실행

```bash
npm run dev
```

브라우저 확인: `http://localhost:5173`

---

# 7. 실행 확인

| 항목 | 확인 방법 |
| ----------- | --------------------------------------- |
| DB 연결 | 서버 기동 로그에서 DB 연결 성공 메시지 확인 |
| 로그인 | `sa` 계정(pw `1234`)으로 `/login` 접속 |
| SUPER_ADMIN | 로그인 후 `[관리]` 버튼 노출 확인 |
