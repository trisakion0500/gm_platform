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

| 테이블 | 데이터 |
| ------- | ------------------------------------------- |
| company | company_id=1, company_code=`ADMIN` |
| project | project_id=1, project_code=`ADMIN_PROJECT` |

## 3.3 SUPER_ADMIN 계정 생성

**① 회원가입 API 호출**

서버 기동 후 아래 요청으로 계정을 생성한다.

```http
POST /api/auth/signup
Content-Type: application/json

{
  "company_id": 1,
  "requested_project_id": 1,
  "login_id": "admin",
  "password": "설정할비밀번호",
  "user_name": "Super Admin",
  "email": "admin@example.com"
}
```

**② DB에서 승인 및 역할 부여**

응답의 `user_id`를 확인 후 아래 SQL을 실행한다.

```sql
USE gm_platform;

-- $USER_ID 를 ①에서 생성된 user_id로 대체
UPDATE user SET status = 1 WHERE user_id = $USER_ID;

INSERT INTO user_role (user_id, project_id, role_code, status)
VALUES ($USER_ID, 1, 10, 1);
```

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
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=gm_platform

JWT_SECRET=your_jwt_secret_key

CORS_ALLOWED_ORIGINS=http://localhost:5173
```

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

## 5.1 패키지 설치

```bash
cd client
npm install
```

## 5.2 환경변수 설정

`client/.env` 파일을 생성하고 아래 항목을 설정한다.

```env
VITE_API_BASE_URL=http://localhost:3000
```

## 5.3 실행

```bash
npm run dev
```

브라우저 확인: `http://localhost:5173`

---

# 7. 실행 확인

| 항목 | 확인 방법 |
| ----------- | --------------------------------------- |
| DB 연결 | 서버 기동 로그에서 DB 연결 성공 메시지 확인 |
| 로그인 | `admin` 계정으로 `/login` 접속 |
| SUPER_ADMIN | 로그인 후 `[관리]` 버튼 노출 확인 |
