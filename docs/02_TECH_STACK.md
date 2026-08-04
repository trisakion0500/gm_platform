# 02_TECH_STACK.md

## Backend

| 항목            | 결정                                        |
| --------------- | ------------------------------------------- |
| Runtime         | Node.js 22 LTS                              |
| Framework       | Express                                     |
| Language        | TypeScript                                  |
| Database        | MySQL 8.4 — 메인(`gm_platform`) + 감사 로그 전용(`gm_platform_log`), 물리적으로 별도 DB로 분리 가능 |
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
| `NODE_ENV` | ✗ | — | `production`일 때만 로그 레벨을 낮춤(`env.ts`가 `nodeEnv`로 집계, `config/logger.ts`가 판정) — `info` 이상만 기록, 그 외(로컬 개발 등)엔 `debug`까지 기록. `env.ts`가 검증하는 필수 목록엔 없어 값이 없어도 서버는 정상 기동(비프로덕션으로 간주). |
| `NODE_APP_INSTANCE` | ✗ | — | 사용자가 `.env`에 직접 설정하는 값이 아니라 PM2 fork mode가 인스턴스마다 런타임에 주입하는 값. 같은 VM에 여러 인스턴스를 fork mode로 띄울 때 로그 파일명 접미사(`logs/app-{N}.log`)로 써서 파일 충돌을 방지(`config/logger.ts`) — Node `cluster`/PM2 cluster mode는 log4js가 자체적으로 IPC 병합하므로 대상 아님. |
| `DB_HOST` | ✓ | — | MySQL 접속 호스트. `config/db.ts`의 mysql2 pool 생성 시 사용. |
| `DB_PORT` | ✓ | — | MySQL 접속 포트. `Number()` 변환 후 pool에 전달. |
| `DB_USER` | ✓ | — | MySQL 접속 계정. |
| `DB_PASSWORD` | ✓ | — | MySQL 접속 비밀번호. |
| `DB_NAME` | ✓ | — | 사용할 DB 스키마명. |
| `DB_CONNECTION_LIMIT` | ✗ | `10` | `config/db.ts`의 mysql2 pool `connectionLimit`(인스턴스당). 스케일아웃 시 총 커넥션 = 이 값 × 인스턴스 수이므로 MySQL `max_connections`와 맞춰 배포 단위로 조정. |
| `LOG_DB_HOST` | ✓ | — | 감사 로그 전용 DB(`gm_platform_log`) 접속 호스트. 메인 DB와 같은 VM/인스턴스라는 보장이 없어 완전히 별도로 관리(`config/db.ts`의 `logPool`). |
| `LOG_DB_PORT` | ✓ | — | 감사 로그 전용 DB 접속 포트. |
| `LOG_DB_USER` | ✓ | — | 감사 로그 전용 DB 접속 계정. |
| `LOG_DB_PASSWORD` | ✓ | — | 감사 로그 전용 DB 접속 비밀번호. |
| `LOG_DB_NAME` | ✓ | — | 감사 로그 전용 DB 스키마명. |
| `LOG_DB_CONNECTION_LIMIT` | ✗ | `10` | `logPool`의 mysql2 pool `connectionLimit`(인스턴스당). `DB_CONNECTION_LIMIT`과 동일한 목적, 별도 값. |
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
| `SESSION_CLEANUP_CRON` | ✗ | `0 4 * * *`(매일 새벽 4시) | `jobs/sessionCleanup.job.ts`가 `node-cron`으로 등록하는 만료 세션 정리 주기. `user_session`에서 `expired_at`이 지난 행을 삭제(`SP_CLEANUP_EXPIRED_SESSIONS`)해 테이블 무한 누적을 방지. 스케일아웃 시 인스턴스마다 각자 등록되므로 `config/db.ts`의 `runExclusive`(MySQL advisory lock)로 감싸 한 시점에 한 인스턴스만 실행되도록 함(§6.4 참고). |
| `REDIS_ENABLED` | ✗ | `false` | 로그인 리미터·참조 데이터 캐시·세션 캐시의 Redis 사용 여부. `false`면 리미터·참조데이터는 인메모리로, 세션 캐시는 캐시 없이 매 요청 MySQL 조회로 폴백(`config/redis.ts`가 이 값으로 `redisClient` 생성 여부 결정). |
| `REDIS_HOST` | ✗ | `127.0.0.1` | Redis 접속 호스트. |
| `REDIS_PORT` | ✗ | `6379` | Redis 접속 포트. |
| `REDIS_PASSWORD` | ✗ | — | Redis 접속 비밀번호. |
| `REDIS_KEY_PREFIX` | ✗ | `gm:` | 이 프로젝트가 쓰는 모든 Redis 키의 공통 프리픽스(`config/redis.ts`의 `redisKeys`에서 일괄 적용). |
| `REDIS_COMMAND_TIMEOUT_MS` | ✗ | `1000` | Redis 명령 타임아웃(ms). Redis 장애 시 ioredis 기본 재시도(최대 20회, 누적 최대 수십 초)를 기다리지 않고 이 시간 안에 실패로 확정시켜 API 응답 지연으로 전이되지 않게 함. 200ms처럼 너무 짧게 잡으면 부팅 시점 `rate-limit-redis`의 `SCRIPT LOAD`가 커넥션 수립과 경합해 타임아웃되고 그 실패가 캐싱돼 로그인이 프로세스 재기동 전까지 계속 실패하는 문제가 실측으로 확인돼 1000ms을 기본값으로 둠. |
| `SESSION_CACHE_TTL_SECONDS` | ✗ | `JWT_ACCESS_EXPIRES_IN`(초 환산) | 세션(jti) Redis 캐시 TTL. generation 불일치로 통상 그 즉시 무효화되지만 만약을 대비한 안전판 — Access Token 자체가 이 TTL 지나면 거부되므로 그보다 짧게 잡아도 이득이 없어 기본값을 여기 맞춤. |
| `SESSION_GEN_TTL_SECONDS` | ✗ | 위 값의 2배 | 세션 generation 카운터(무효화 시마다 갱신)의 TTL. 반드시 `SESSION_CACHE_TTL_SECONDS`보다 커야 하며, 아니면 `env.ts`가 기동 시점에 예외를 던짐(짧으면 generation 만료로 "예전 값과 우연히 일치"하는 캐시가 살아남는 구멍이 생기기 때문). |
