# 08_AUTH_API.md

# 1. 개요

본 문서는 GM-Tool 인증(Authentication) API를 정의한다.

인증은 Login ID / Password 기반으로 수행한다.

인증 성공 시 Access Token을 발급한다.

가입 사용자는 승인 이후에만 로그인할 수 있다.

---

# 2. 인증 정책

## 2.1 사용자 상태

| 값  | 설명         |
| --- | ------------ |
| 0   | 가입승인대기 |
| 1   | 가입승인     |
| 2   | 가입반려     |
| 3   | 사용중지     |

---

## 2.2 로그인 가능 상태

```text
1 : 가입승인
```

---

## 2.3 로그인 불가 상태

```text
0 : 가입승인대기
2 : 가입반려
3 : 사용중지
```

---

## 2.4 토큰 정책

```text
Access Token 만료시간 : 15분 (JWT_ACCESS_EXPIRES_IN 기본값)
Refresh Token 만료시간 : 7일 (JWT_REFRESH_EXPIRES_IN 기본값)
```

---

## 2.4.1 JWT 명세

### 서명 알고리즘

```text
HS256 (HMAC SHA-256)
```

### Secret Key 관리

JWT Secret Key 는 설정 파일(환경변수)에서 관리한다. 소스코드에 하드코딩하지 않는다.

### Access Token Payload

```json
{
  "jti": "uuid-v4",
  "user_id": 1,
  "company_id": 1,
  "role_code": 40,
  "exp": 1234567890,
  "iat": 1234567890
}
```

| 필드       | 설명                                          |
| ---------- | --------------------------------------------- |
| jti        | Token 고유 식별자 (UUID v4). Session 조회 키  |
| user_id    | 사용자 ID                                     |
| company_id | 소속 회사 ID                                  |
| role_code  | 역할 코드 (10/20/30/40)                       |
| exp        | 만료 시각 (Unix timestamp)                    |
| iat        | 발급 시각 (Unix timestamp)                    |

### role_code 계산 규칙

`role_code`는 `user` 테이블의 고정 컬럼이 아니라, 로그인 시점에 `user_role`(사용자×프로젝트 역할 매핑)을 조인해 계산되는 값이다.

```text
role_code = MIN(user_role.role_code) WHERE user_id = ? AND status = 1
            배정된 활성 user_role이 없으면 40(OPERATOR)
```

사용자가 프로젝트마다 다른 역할을 가질 수 있으므로(A 프로젝트 DEVELOPER, B 프로젝트 OPERATOR 등), JWT의 `role_code`는 그중 최고 권한 하나일 뿐이다. 그래서 `project_id`를 특정하는 쓰기 API(API/Request/Response, Code Group/Item 등)는 라우트 단의 역할 검사와 별도로, 요청마다 대상 project_id에 대한 실제 `user_role`을 다시 조회해 검증한다 (미보유 시 20001). 자세한 내용은 [10_API_SPEC_Part2.md](./10_API_SPEC_Part2.md) §7, [12_API_SPEC_Part4.md](./12_API_SPEC_Part4.md) §1 참고.

#### 기본값이 40(OPERATOR)인 이유

역할 코드는 `10 < 20 < 30 < 40` 순으로 숫자가 클수록 권한이 낮다. 배정된 `user_role`이 없을 때 10/20/30 중 하나를 기본값으로 삼으면 어떤 프로젝트에도 배정되지 않은 사용자가 관리자·개발자·승인자 권한을 자동으로 갖게 되는 권한 상승 결함이 생긴다. 40은 코드 체계상 가장 낮은 권한이므로, 미배정 사용자를 가장 안전한 최소 권한으로 취급하는 fail-safe 기본값이다.

#### 미배정이 실제로 발생하는 경우

`company_id`는 가입 시 필수 입력이라 항상 값이 있지만, 프로젝트별 역할(`user_role`)은 완전히 별도 절차다. `POST /auth/signup`은 `user` 테이블에만 INSERT하고, `POST /users/{user_id}/approve`도 `user.status`만 변경할 뿐 `user_role`은 건드리지 않는다 — SUPER_ADMIN이 `POST /user-roles`로 프로젝트별 역할을 별도로 배정해야 한다. 따라서 다음 두 경우 실제로 `role_code`가 40으로 계산된다.

```text
1. 가입 승인 직후 ~ 역할 배정 전 : 로그인은 가능하나 user_role 행이 0개
2. 배정된 user_role이 PATCH /user-roles/{user_id}/{project_id} 로 status=0 처리된 경우
```

이 상태에서는 회사는 있지만 연결된 프로젝트가 없어, `GET /projects`(user_role 기준 스코핑)처럼 프로젝트 단위로 스코핑되는 화면에 아무것도 표시되지 않는다.

### company_id 스코핑 규칙

`company_id` 는 사용자의 소속 회사를 나타낸다.

데이터 접근 범위는 `role_code` 기준으로 판단한다.

```text
role_code = 10 (SUPER_ADMIN) : company_id 무시, 모든 회사 접근 가능
그 외                        : company_id 소속 회사 데이터만 접근 가능
```

### Refresh Token

Refresh Token 은 UUID v4 형식의 opaque token 으로 발급하며 페이로드를 포함하지 않는다.

```text
저장 위치 : user_session.refresh_token_hash (SHA-256 해시, 원문 미저장)
```

#### Access Token(JWT)과 달리 opaque(UUID)인 이유

- **검증 방식이 이미 DB 조회를 전제로 함**: `POST /auth/refresh`는 `SP_GET_SESSION_BY_REFRESH`로 `user_session`을 무조건 조회해 `status`/`expired_at`을 확인하고 `access_token_jti`를 갱신한다. 어차피 DB round-trip이 필수라 JWT의 핵심 장점(서명 검증만으로 DB 없이 자체 검증)이 refresh token에는 의미가 없다.
- **즉시 폐기(revocation) 요구**: 로그아웃·비밀번호 변경 시 모든 세션을 즉시 종료해야 하는데(`SP_UPDATE_PASSWORD`), 스테이트리스한 JWT는 만료 전 무효화에 별도 블랙리스트가 필요하다. opaque token을 해시해 `refresh_token_hash`로 저장해두면 그 행을 지우거나 status를 바꾸는 것만으로 즉시 무효화된다.
- **정보 노출 최소화**: JWT는 서명 검증 없이도 payload를 누구나 디코딩할 수 있다. Refresh token은 access token(15분)보다 수명이 훨씬 길어(7일) 탈취 시 파급력이 큰데, opaque 랜덤값은 그 자체로는 아무 정보도 담지 않아 서버 조회 없이는 무의미하다.

즉 Access Token은 stateless 검증이 필요해 JWT를, Refresh Token은 어차피 stateful 검증을 거치므로 opaque UUID를 쓰는 역할 분리다.

---

## 2.5 비밀번호 정책

비밀번호는 bcrypt 알고리즘으로 해싱하여 저장한다.

```text
알고리즘 : bcrypt
Cost Factor (rounds) : 12
저장 컬럼 : user.password_hash VARCHAR(255)
```

### 적용 대상

```text
회원가입              (POST /auth/signup)
비밀번호 변경         (PATCH /auth/password)
관리자 비밀번호 초기화 (POST /users/{user_id}/reset-password)
초기 시드 데이터
```

### 검증 방식

로그인 및 비밀번호 변경 시 bcrypt.compare() 로 검증한다.

평문 비밀번호는 어떠한 경우에도 저장하지 않는다.

---

## 2.6 Session 정책

GM-Tool은 Access Token + Refresh Token 기반 인증을 사용한다.

로그인 성공 시 Session을 생성한다.

Session은 MySQL 기반으로 관리한다.

향후 인증 트래픽 증가 시 Redis 기반 Session 저장소로 변경 가능하도록 설계한다.

---

## Session 생성 정책

로그인 성공 시 새로운 Session Row를 생성한다.

```text
로그인
→ Session INSERT
→ Access Token 발급
→ Refresh Token 발급
```

사용자당 여러 개의 Session 생성이 가능하다.

예시

```text
회사 PC 로그인
노트북 로그인
개인 PC 로그인
```

---

## Session 상태

| 값  | 설명     |
| --- | -------- |
| 1   | 사용     |
| 0   | 로그아웃 |
| 2   | 만료     |

---

## Session 검증 정책

모든 인증 API 요청은 아래 순서로 검증한다.

```text
1. Access Token 검증
   - 서명 검증
   - 만료 검증

2. Session 확인
   user_session.status = 1

3. User 확인
   user.status = 1 : 가입승인
```

---

## User 상태 변경 정책

사용중지(3) 처리 시 해당 사용자의 모든 활성 Session 을 즉시 종료한다.

```text
user.status = 3
→ user_session.status = 0 WHERE user_id = ? AND status = 1
```

그 외 상태 변경은 Session 을 종료하지 않는다.

인증 시 user.status 를 검증하여 접근을 차단한다.

---

## 강제 로그아웃 정책

아래 상황에서는 모든 활성 Session을 종료할 수 있다.

```text
관리자 강제 로그아웃
비밀번호 유출 의심
보안 사고 대응
```

처리

```text
UPDATE user_session
SET status = 0
WHERE user_id = ?
  AND status = 1
```

---

## 향후 확장 정책

현재 버전

```text
MySQL Session 저장소 사용
```

향후 버전

```text
Redis Session 저장소 사용 가능
```

Session 조회 기준은 access_token_jti를 사용한다.

이를 통해 Session 저장소를 MySQL에서 Redis로 변경하더라도 인증 로직 수정 없이 확장 가능하도록 설계한다.

---

## 2.7 요청 제한(Rate Limit) 정책

`POST /auth/signup`, `POST /auth/login`은 인증 없이 호출 가능한 API 중 반복 요청 시 브루트포스 피해가 있는 유일한 엔드포인트라 IP 기준 요청 제한을 적용한다.

```text
기준   : IP당 windowMs 동안 max회 (기본 15분/10회, LOGIN_RATE_LIMIT_WINDOW_MS/LOGIN_RATE_LIMIT_MAX)
초과 시 : 429 Too Many Requests, result 40001
```

`POST /auth/refresh`는 유효한 refresh_token 보유가 전제되어야 해 대상에서 제외한다. 자세한 내용은 [07_API_COMMON.md](./07_API_COMMON.md) §6.3 참고.

---

# 3. API 목록

| Method | URI            | 설명                |
| ------ | -------------- | ------------------- |
| POST   | /auth/signup   | 회원가입            |
| POST   | /auth/login    | 로그인              |
| POST   | /auth/logout   | 로그아웃            |
| POST   | /auth/refresh  | Access Token 재발급 |
| GET    | /auth/me       | 내 정보 조회        |
| PATCH  | /auth/password | 비밀번호 변경       |

---

# 4. 회원가입

## POST /auth/signup

### Request

```json
{
  "company_id": 1,
  "requested_project_id": 100,
  "login_id": "trisakion",
  "password": "생략",
  "user_name": "홍길동",
  "email": "test@test.com",
  "phone_number": "010-1234-5678",
  "department": "개발팀",
  "position": "사원"
}
```

### 처리 정책

```text
user.status = 0
(가입승인대기)
```

`login_id`는 영문(a-z, A-Z), 숫자(0-9), `_`, `.`, `-`만 허용한다. 그 외 문자 포함 시 30002(INVALID_FORMAT).
`phone_number`는 필수이며 서버에서 AES-256-CBC로 암호화되어 저장된다(평문 최대 20자). `department`/`position`은 선택 입력.

IP당 요청 제한이 적용된다 (2.7 참고).

### Response

생성된 User 전체 정보 반환

---

# 5. 로그인

## POST /auth/login

### Request

```json
{
  "login_id": "trisakion",
  "password": "생략"
}
```

### Response

```json
{
  "result": 0,
  "data": {
    "access_token": "생략",
    "refresh_token": "생략",
    "expired_at": "2026-06-22 12:00:00",
    "role_code": 10
  }
}
```

`role_code`는 사용자가 활성 상태(`user_role.status=1`)로 배정된 모든 프로젝트 중 최고 권한(`MIN(role_code)`, 미배정 시 40)이다. JWT 페이로드에도 동일 값이 포함되며 세션 내내 고정된다.

IP당 요청 제한이 적용된다 (2.7 참고).

### 처리 정책

```text
last_login_at 갱신
user_session 생성
access_token 발급
refresh_token 발급
```

---

# 6. 로그아웃

## POST /auth/logout

현재 Session 종료

### 처리 정책

```text
user_session.status = 0
```

---

# 7. Access Token 재발급

## POST /auth/refresh

### Request

```json
{
  "refresh_token": "생략"
}
```

### Response

```json
{
  "result": 0,
  "data": {
    "access_token": "생략",
    "expired_at": "2026-06-22 12:30:00",
    "role_code": 10
  }
}
```

`role_code`는 로그인 시점에 계산되어 `user_session`에 저장된 값을 그대로 반환한다. 재발급 시 재계산하지 않는다.

### 처리 정책

```text
Refresh Token 검증
Session 상태 검증
User 상태 검증
신규 Access Token 발급
```

---

# 8. 내 정보 조회

## GET /auth/me

현재 로그인 사용자 정보 조회

### Response

```json
{
  "result": 0,
  "data": {
    "user_id": 1,
    "company_id": 1,
    "requested_project_id": 100,
    "login_id": "trisakion",
    "user_name": "홍길동",
    "email": "test@test.com",
    "phone_number": "010-1234-5678",
    "department": "개발팀",
    "position": "사원",
    "status": 1,
    "last_login_at": "2026-06-22 10:00:00",
    "created_at": "2026-06-20 10:00:00",
    "updated_at": "2026-06-22 10:00:00"
  }
}
```

`user` 테이블 원본 컬럼만 반환하며 `role_code`는 포함하지 않는다. `role_code`는 프로젝트마다 다를 수 있어 user 엔티티의 고정 속성이 아니기 때문이다 (2.4.1 참고). 필요하면 로그인/재발급 응답의 `role_code`(세션 고정값)를 사용한다.

---

# 9. 비밀번호 변경

## PATCH /auth/password

### Request

```json
{
  "current_password": "생략",
  "new_password": "생략"
}
```

### 처리 정책

```text
기존 비밀번호 검증
신규 비밀번호 저장

모든 활성 Session 종료
user_session.status = 0 WHERE user_id = ? AND status = 1
```

---

# 10. 오류 코드

## 인증 오류

| 코드  | 설명                  |
| ----- | --------------------- |
| 10001 | 로그인 실패           |
| 10002 | 비밀번호 불일치       |
| 10003 | Access Token 만료     |
| 10004 | 로그인 필요           |
| 10005 | 가입승인대기          |
| 10006 | 가입반려              |
| 10007 | 사용중지 계정         |
| 10008 | Refresh Token 만료    |
| 10009 | 유효하지 않은 Session |

---

## 입력값 오류

| 코드  | 설명             |
| ----- | ---------------- |
| 30001 | 필수 입력값 누락 |
| 30002 | 입력값 형식 오류 |
| 30003 | 허용되지 않은 값 |

---

## 요청 제한 오류

| 코드  | 설명           |
| ----- | -------------- |
| 40001 | 요청 제한 초과 |

---

## 시스템 오류

| 코드  | 설명              |
| ----- | ----------------- |
| 50000 | 시스템 오류       |
| 50001 | 데이터베이스 오류 |
