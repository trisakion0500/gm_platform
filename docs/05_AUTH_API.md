# 05_AUTH_API.md

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

사용자가 프로젝트마다 다른 역할을 가질 수 있으므로(A 프로젝트 DEVELOPER, B 프로젝트 OPERATOR 등), JWT의 `role_code`는 그중 최고 권한 하나일 뿐이다. 그래서 `project_id`를 특정하는 쓰기 API(API/Request/Response, Code Group/Item 등)는 라우트 단의 역할 검사와 별도로, 요청마다 대상 project_id에 대한 실제 `user_role`을 다시 조회해 검증한다 (미보유 시 20001). 자세한 내용은 [07_API_SPEC_Part2.md](./07_API_SPEC_Part2.md) §7, [09_API_SPEC_Part4.md](./09_API_SPEC_Part4.md) §1 참고.

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
저장 위치 : user_session.refresh_token
```

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

## 시스템 오류

| 코드  | 설명              |
| ----- | ----------------- |
| 50000 | 시스템 오류       |
| 50001 | 데이터베이스 오류 |
