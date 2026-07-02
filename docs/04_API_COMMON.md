# 04_API_COMMON.md

## 개요

본 문서는 GM-Tool API 공통 규약을 정의한다.

적용 구간

```text
Frontend ↔ GM Platform API
```

---

# 1. 인증 (Authentication)

## 1.1 Authorization 헤더 형식

인증이 필요한 모든 API 요청은 아래 헤더를 포함해야 한다.

```http
Authorization: Bearer {access_token}
```

`access_token` 은 `POST /auth/login` 또는 `POST /auth/refresh` 를 통해 발급받는다.

---

## 1.2 인증 불필요 API

아래 API 는 Authorization 헤더 없이 호출 가능하다.

```text
POST /auth/signup
POST /auth/login
POST /auth/refresh
GET  /health
```

---

## 1.3 토큰 만료 처리

Access Token 만료 시 `POST /auth/refresh` 로 재발급 후 요청을 재시도한다.

```text
요청
→ 10003 (Access Token 만료) 응답
→ POST /auth/refresh 로 신규 Access Token 발급
→ 요청 재시도
```

---

## 1.4 인증 검증 순서

모든 인증 필요 API 는 아래 순서로 검증한다.

```text
1. Authorization 헤더 존재 여부 확인
2. Access Token 유효성 검증
   - 서명 검증
   - 만료 검증
3. Session 확인 (user_session.status = 1)
4. User 상태 확인 (user.status = 1 : 가입승인)
```

---

## 1.5 인증 오류 응답

| result | 설명                  |
| ------ | --------------------- |
| 10003  | Access Token 만료     |
| 10004  | 로그인 필요           |
| 10007  | 사용중지 계정         |
| 10009  | 유효하지 않은 Session |

# 2. HTTP Status Code 정책

GM-Tool API는 HTTP Status Code와 Result Code를 함께 사용한다.

클라이언트는 HTTP Status Code와 Result Code를 모두 확인해야 한다.

---

## 2.1 Result Code 범위

| Range       | Description      |
| ----------- | ---------------- |
| 0           | Success          |
| 10000~19999 | Authentication   |
| 20000~29999 | Authorization    |
| 30000~39999 | Validation       |
| 40000~49999 | State Transition |
| 50000~59999 | System           |

---

## 2.2 Validation 세부 범위

Validation 오류는 아래 범위를 사용한다.

| Range       | Description                |
| ----------- | -------------------------- |
| 30000~30999 | 입력값 오류                |
| 31000~31999 | 조회 대상 없음 (Not Found) |
| 32000~32999 | 중복 데이터                |

---

## 2.3 HTTP Status Code 매핑

| HTTP Status               | Result Range | Description            |
| ------------------------- | ------------ | ---------------------- |
| 200 OK                    | 0            | 정상 처리              |
| 400 Bad Request           | 30000~39999  | Validation             |
| 401 Unauthorized          | 10000~19999  | Authentication         |
| 403 Forbidden             | 20000~29999  | Authorization          |
| 404 Not Found             | 31000~31999  | Validation (Not Found) |
| 409 Conflict              | 40000~49999  | State Transition       |
| 500 Internal Server Error | 50000~59999  | System                 |

---

## 2.4 200 OK

정상 처리

예시

```json
{
  "result": 0,
  "data": {}
}
```

적용 대상

```text
조회 성공
등록 성공
수정 성공
상태변경 성공
로그인 성공
토큰 재발급 성공
```

---

## 2.5 400 Bad Request

입력값 오류

적용 Result 범위

```text
30000~30999
32000~32999
```

예시

```text
필수값 누락
형식 오류
길이 초과
허용되지 않은 값
```

예시 응답

```json
{
  "result": 30001,
  "message": "Invalid parameter"
}
```

---

## 2.6 401 Unauthorized

인증 실패

적용 Result 범위

```text
10000~19999
```

예시

```text
로그인 필요
Access Token 만료
유효하지 않은 Token
유효하지 않은 Session
사용중지 계정
```

예시 응답

```json
{
  "result": 10004,
  "message": "Login required"
}
```

---

## 2.7 403 Forbidden

권한 부족

적용 Result 범위

```text
20000~29999
```

예시

```text
회사 접근 권한 없음
프로젝트 접근 권한 없음
승인 권한 없음
감사 로그 조회 권한 없음
```

예시 응답

```json
{
  "result": 20001,
  "message": "Permission denied"
}
```

---

## 2.8 404 Not Found

조회 대상 없음

적용 Result 범위

```text
31000~31999
```

Validation 범주에 포함된다.

예시

```text
회사 없음
프로젝트 없음
사용자 없음
API 없음
코드 그룹 없음
코드 항목 없음
감사 로그 없음
```

예시 응답

```json
{
  "result": 31001,
  "message": "User not found"
}
```

---

## 2.9 409 Conflict

상태 전이 오류

적용 Result 범위

```text
40000~49999
```

예시

```text
이미 승인된 사용자
이미 반려된 사용자
이미 운영 상태인 API
허용되지 않은 상태 전이
```

예시 응답

```json
{
  "result": 40001,
  "message": "Invalid state transition"
}
```

---

## 2.10 500 Internal Server Error

시스템 오류

적용 Result 범위

```text
50000~59999
```

예시

```text
DB 오류
외부 시스템 호출 실패
예상하지 못한 예외
```

예시 응답

```json
{
  "result": 50000,
  "message": "Internal server error"
}
```

---

## 2.11 오류 처리 원칙

GM-Tool은 비즈니스 오류를 HTTP 200으로 반환하지 않는다.

예시

```text
사용자 없음
→ 404 Not Found

권한 없음
→ 403 Forbidden

상태 전이 불가
→ 409 Conflict
```

모든 비정상 상황은 적절한 HTTP Status Code와 Result Code를 함께 반환해야 한다.

---

# 3. Pagination 정책

## 3.1 적용 대상

| API                          | 설명           |
| ---------------------------- | -------------- |
| GET /companies               | 회사 목록      |
| GET /projects                | 프로젝트 목록  |
| GET /users                   | 사용자 목록    |
| GET /apis                    | API 목록       |
| GET /api-executions          | 실행 이력 목록 |
| GET /api-executions/pending  | 승인 대기 목록 |
| GET /log-audits              | 감사 로그 목록 |

## 3.2 미적용 대상 (전체 로드)

| API                                          | 표현 방식                  |
| -------------------------------------------- | -------------------------- |
| GET /user-roles                              | 유저 상세 하위 데이터그리드 |
| GET /apis/{api_id}/requests                  | API 상세 하위 데이터그리드 |
| GET /apis/{api_id}/responses                 | API 상세 하위 데이터그리드 |
| GET /projects/{project_id}/code-groups       | 데이터그리드               |
| GET /code-groups/{code_group_id}/items       | 데이터그리드               |
| GET /code-groups/{code_group_id}/active-items | 데이터그리드              |

## 3.3 요청 파라미터

| Name      | Required | Description               |
| --------- | -------- | ------------------------- |
| page      | Y        | 페이지 번호 (1부터 시작)  |
| page_size | Y        | 20/50/100 중 선택. 기본 20  |

## 3.4 응답 형식

```json
{
  "result": 0,
  "data": {
    "page": 1,
    "page_size": 20,
    "total_count": 100,
    "items": [
      { "...": "생략" }
    ]
  }
}
```

---

# 4. 배열 응답 정책

배열 타입 필드는 `null` 을 허용하지 않으며 데이터가 없을 경우 빈 배열 `[]` 로 반환한다.

예시

```json
{
  "result": 0,
  "data": {
    "api": { "...": "생략" },
    "requests": [],
    "responses": []
  }
}
```

---

# 5. 날짜/시간 형식

## 5.1 형식

```text
YYYY-MM-DD HH:mm:ss
```

예시

```text
2026-06-22 10:00:00
```

## 5.2 전송 방식

날짜/시간 값은 문자열(String)로 전송한다.

## 5.3 CORS 정책

허용 오리진은 환경변수로 관리하며, 미등록 오리진의 요청은 차단한다.

---

## 5.4 타임존 정책

API 요청/응답 및 데이터베이스 저장 시 타임존 변환을 수행하지 않는다.

서비스와 데이터베이스는 동일한 타임존 환경에서 운영한다.

---

# 6. Health Check

## Endpoint

```http
GET /health
```

## Permission

Anonymous (인증 불필요)

## Response

```json
{
  "result": 0,
  "data": {
    "status": "ok"
  }
}
```

## 용도

```text
서버 기동 확인
로드밸런서 헬스체크
배포 후 정상 기동 여부 확인
```

---

# 7. 입력값 형식 제약

| 필드             | 허용 문자                           | 길이       |
| ---------------- | ----------------------------------- | ---------- |
| `login_id`       | 영문 대소문자, 숫자, `_`, `.`, `-`  | 제한 없음(DB 컬럼 100자) |
| `password`       | 제한 없음                           | 4 ~ 72자   |
| `email`          | 이메일 형식                         | 최대 200자 |
| `user_name`      | 제한 없음                           | 최대 100자 |
| `company_code`   | 영문 대문자, 숫자, 언더스코어(`_`)  | 1 ~ 20자   |
| `project_code`   | 영문 대문자, 숫자, 언더스코어(`_`)  | 1 ~ 20자   |
| `api_code`       | 영문 대문자, 숫자, 언더스코어(`_`)  | 1 ~ 100자  |
| `code_group_code`| 영문 대문자, 숫자, 언더스코어(`_`)  | 1 ~ 100자  |
| `code_value`     | 영문 대문자, 숫자, 언더스코어(`_`)  | 1 ~ 100자  |

---

# 8. 전체 오류 코드 목록

## 10000 — Authentication

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

## 20000 — Authorization

| 코드  | 설명      |
| ----- | --------- |
| 20001 | 권한 없음 |

---

## 30000 — Validation (입력값)

| 코드  | 설명                 |
| ----- | -------------------- |
| 30001 | 필수 입력값 누락     |
| 30002 | 입력값 형식 오류     |
| 30003 | 허용되지 않은 값     |

---

## 31000 — Validation (Not Found)

| 코드  | 설명                    |
| ----- | ----------------------- |
| 31001 | 회사 없음               |
| 31002 | 프로젝트 없음           |
| 31003 | 사용자 없음             |
| 31004 | 사용자 권한 없음        |
| 31005 | API 없음                |
| 31006 | API 요청 파라미터 없음  |
| 31007 | API 응답 파라미터 없음  |
| 31008 | API 실행 이력 없음      |
| 31009 | 코드 그룹 없음          |
| 31010 | 코드 항목 없음          |
| 31011 | 감사 로그 없음          |

---

## 32000 — Validation (중복)

| 코드  | 설명        |
| ----- | ----------- |
| 32001 | 중복 데이터 |

---

## 40000 — State Transition

| 코드  | 설명                    |
| ----- | ----------------------- |
| 40001 | 허용되지 않은 상태 전이 |
| 40002 | 이미 처리된 요청        |

---

## 50000 — System

| 코드  | 설명                  |
| ----- | --------------------- |
| 50000 | 시스템 오류           |
| 50001 | 데이터베이스 오류     |
| 50002 | 외부 API 호출 실패    |
