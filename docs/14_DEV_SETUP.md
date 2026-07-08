# 14_DEV_SETUP.md

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
```

---

# 3. 데이터베이스 초기화

## 3.1 DB 생성

MySQL 클라이언트에서 실행한다.

```sql
CREATE DATABASE gm_platform
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

# 만료된 user_session 정리 크론 표현식 — 생략 시 기본값 매일 새벽 4시(0 4 * * *)
SESSION_CLEANUP_CRON=0 4 * * *
```

`ENCRYPTION_KEY`는 `phone_number` 등 개인정보를 AES-256-CBC로 암호화하는 데 사용하는 32바이트 hex 키다. 아래 명령으로 생성한다.

```bash
npm run keygen
```

출력된 64자리 hex 문자열을 그대로 `ENCRYPTION_KEY`에 붙여넣는다. 이 키가 없거나 바뀌면 기존에 암호화된 `phone_number` 값을 복호화할 수 없으므로, 팀원 간 공유 시 안전한 채널로 전달한다.

## 4.3 실행

```bash
npm run dev
```

서버 기동 확인: `http://localhost:3000`

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
```

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
