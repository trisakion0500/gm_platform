# 02_TECH_STACK.md

## Backend

| 항목            | 결정                                        |
| --------------- | ------------------------------------------- |
| Runtime         | Node.js 22 LTS                              |
| Framework       | Express                                     |
| Language        | TypeScript                                  |
| Database        | MySQL 8.4                                   |
| Data Access     | mysql2 — Stored Procedure / Function 전용 (Native SQL 직접 작성 금지) |
| Authentication  | JWT (HS256) + user_session                  |
| Password Hash   | bcrypt (rounds=12)                          |
| API Style       | REST + JSON                                 |
| Logging         | log_audit (감사 로그) + application log (log4js) |
| S2S Call        | HTTP/HTTPS POST (JSON Payload)                   |

---

## Frontend

| 항목          | 결정                  |
| ------------- | --------------------- |
| Framework     | React 18 + TypeScript |
| Build         | Vite                  |
| UI 컴포넌트   | Ant Design (antd)     |
| 폼 상태 관리  | Ant Design Form (antd `Form`, 일부 컴포넌트는 react-hook-form) |
| 상태 관리     | Zustand               |
| HTTP          | Axios                 |

---

## 환경변수 관리 항목

`server/.env` 기준. 필수 항목은 `server/src/config/env.ts`의 `required` 배열에 등록되어 있어 누락 시 서버가 기동 시점에 즉시 예외를 던진다. 나머지는 선택이며 코드 내 기본값으로 대체된다.

| 변수 | 필수 | 기본값 | 용도 / 활용처 |
| --- | --- | --- | --- |
| `NODE_ENV` | ✗ | — | `production`일 때만 로그 레벨을 낮춤(`config/logger.ts`) — `info` 이상만 기록, 그 외(로컬 개발 등)엔 `debug`까지 기록. `env.ts`가 검증하는 필수 목록엔 없어 값이 없어도 서버는 정상 기동(비프로덕션으로 간주). |
| `DB_HOST` | ✓ | — | MySQL 접속 호스트. `config/db.ts`의 mysql2 pool 생성 시 사용. |
| `DB_PORT` | ✓ | — | MySQL 접속 포트. `Number()` 변환 후 pool에 전달. |
| `DB_USER` | ✓ | — | MySQL 접속 계정. |
| `DB_PASSWORD` | ✓ | — | MySQL 접속 비밀번호. |
| `DB_NAME` | ✓ | — | 사용할 DB 스키마명. |
| `JWT_SECRET` | ✓ | — | Access/Refresh 관련 JWT 서명·검증 키(HS256). `utils/jwt.ts`에서 사용 — 유출 시 토큰 위조 가능하므로 배포 환경마다 별도 값 필요. |
| `JWT_ACCESS_EXPIRES_IN` | ✗ | `15m` | Access Token 만료 기간(jsonwebtoken `expiresIn` 포맷). 로그인/refresh 시 발급되는 토큰의 유효 기간을 결정. |
| `JWT_REFRESH_EXPIRES_IN` | ✗ | `7d` | Refresh Token(및 `user_session.expired_at`) 만료 기간. 이 값을 바꿔도 `SP_CLEANUP_EXPIRED_SESSIONS`는 `expired_at`과 `NOW()`만 비교하므로 SP 수정 없이 반영됨. |
| `ENCRYPTION_KEY` | ✓ | — | `user.phone_number`, `project.api_key` 등 AES-256-CBC 암호화에 쓰는 32바이트 hex 키(`npm run keygen`으로 생성). `utils/crypto.ts`에서 사용 — 키를 잃으면 기존 암호문은 복구 불가능, 교체 시 시드 계정 `phone_number` 복구는 `npm run fix-seed-phone` 참고. |
| `CORS_ALLOWED_ORIGINS` | ✓ | — | 허용할 Origin 목록(쉼표 구분 → 배열 파싱). `app.ts`의 CORS 미들웨어 설정에 사용. |
| `PORT` | ✗ | `3000` | Express 서버가 리슨할 포트. |
| `LOG_DEBUG_ERRORS` | ✗ | `false` | `true`일 때 500번대 오류의 스택(`AppError`의 `cause` 체인 포함)을 로그에 남김. `config/errors.ts`/`errorHandler` 계열에서 참조 — 운영 환경에서 민감한 내부 스택 노출을 막기 위한 스위치. |
| `SWAGGER_ENABLED` | ✗ | `false` | `true`일 때만 `app.ts`가 `swagger-ui-express`/`swagger-jsdoc`을 `require()`로 로드해 `/api-docs`를 노출(꺼져 있으면 모듈 자체가 메모리에 올라오지 않음). helmet의 CSP도 이 값이 `true`일 때만 비활성화(Swagger UI 인라인 스크립트/스타일 허용 목적). |
| `API_EXECUTION_TIMEOUT_MS` | ✗ | `10000` | `POST /apis/:api_id/execute`가 외부 게임서버(S2S)를 호출할 때 axios 타임아웃. 대상 서버가 응답 없을 때 실행을 FAILED로 처리하기까지 대기하는 최대 시간. |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | ✗ | `900000`(15분) | `/auth/login`·`/auth/signup`에 적용되는 `loginLimiter`(express-rate-limit)의 카운트 윈도우. 브루트포스 방지 목적. |
| `LOGIN_RATE_LIMIT_MAX` | ✗ | `10` | 위 윈도우 동안 IP당 허용되는 최대 요청 수. 초과 시 `40001`(HTTP 429). |
| `SESSION_CLEANUP_CRON` | ✗ | `0 4 * * *`(매일 새벽 4시) | `jobs/sessionCleanup.job.ts`가 `node-cron`으로 등록하는 만료 세션 정리 주기. `user_session`에서 `expired_at`이 지난 행을 삭제(`SP_CLEANUP_EXPIRED_SESSIONS`)해 테이블 무한 누적을 방지. |
