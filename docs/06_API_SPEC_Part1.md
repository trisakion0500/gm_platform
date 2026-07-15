# GM-Tool REST API Specification

# Part 1. Company / Project / User / UserRole

---

# 1. Common Rules

## 1.1 Response Format

### Success

```json
{
  "result": 0,
  "data": {}
}
```

### Error

```json
{
  "result": 30001,
  "message": "Validation Error"
}
```

---

## 1.2 Error Code

공통 규약은 `04_API_COMMON.md` 를 따른다.

---

## 1.3 Role Definition

| Role Code | Role Name   |
| --------- | ----------- |
| 10        | SUPER_ADMIN |
| 20        | DEVELOPER   |
| 30        | APPROVER    |
| 40        | OPERATOR    |

### SUPER_ADMIN

- 모든 회사 접근 가능
- 모든 프로젝트 접근 가능
- 모든 API 접근 가능

### DEVELOPER

- 프로젝트별 API 정의 관리
- API 승인 가능
- API 실행 가능

### APPROVER

- API 승인
- API 반려

### OPERATOR

- API 실행 요청
- API 실행 결과 조회

---

# 2. Company APIs

## 2.1 Create Company

### Endpoint

```http
POST /companies
```

### Permission

- SUPER_ADMIN

### Request

```json
{
  "company_code": "GCP",
  "company_name": "Game Company",
  "description": "게임 운영 회사"
}
```

### Validation

- company_code 필수, 중복 불가, 영문/숫자/`_`/`.`/`-` 만 허용, 최대 20자
- company_name 필수, 최대 100자
- description 최대 1000자

### Response

등록 후 저장된 최종 데이터 반환

```json
{
  "result": 0,
  "data": {
    "...": "생략"
  }
}
```

---

## 2.2 Get Company List

### Endpoint

```http
GET /companies
```

### Permission

- SUPER_ADMIN
- DEVELOPER
- APPROVER
- OPERATOR

### Query Parameters

| Name      | Required | Description                    |
| --------- | -------- | ------------------------------ |
| status    | N        |                                |
| page      | Y        |                                |
| page_size | Y        | 20/30/50/100 중 선택. 기본 20     |

### Sorting

```sql
ORDER BY status DESC,
         company_name ASC
```

### Business Rules

- SUPER_ADMIN : 전체 회사 목록 반환
- 그 외 : 본인 소속 company_id 의 회사만 반환

### Response

페이지네이션 응답 형식 (`04_API_COMMON.md` 3.4 참고)

---

## 2.3 Get Company

### Endpoint

```http
GET /companies/{company_id}
```

### Permission

- SUPER_ADMIN
- DEVELOPER
- APPROVER
- OPERATOR

### Business Rules

- SUPER_ADMIN : 모든 회사 조회 가능
- 그 외 : 본인 소속 company_id 의 회사만 조회 가능

---

## 2.4 Update Company

### Endpoint

```http
PATCH /companies/{company_id}
```

### Permission

- SUPER_ADMIN

### Updatable Fields

```text
company_code
company_name
description
status
```

### Non-Updatable Fields

```text
company_id
created_at
```

### Validation

- company_code 중복체크, 영문/숫자/`_`/`.`/`-` 만 허용, 최대 20자
- company_name 최대 100자
- description 최대 1000자

### Response

저장 후 최종 데이터 반환

---

## 2.5 Get Company by Code (Lookup)

### Endpoint

```http
GET /companies/lookup?company_code={code}
```

### Permission

- 인증 불필요 (Anonymous)

### Description

회원가입 화면(SCR-002) 전용. 로그인 전이라 `GET /companies`를 호출할 수 없어 신설된 공개 엔드포인트. 활성(status=1) 회사만 조회하며, `/companies/{company_id}`보다 먼저 등록해야 하는 정적 경로다.

### Response

```json
{
  "result": 0,
  "data": {
    "company_id": 1,
    "company_name": "Game Company"
  }
}
```

`api_base_url` 등 민감정보는 반환하지 않는다. 미존재/비활성 시 31001.

---

# 3. Project APIs

## 3.1 Create Project

### Endpoint

```http
POST /projects
```

### Permission

- SUPER_ADMIN

### Request

```json
{
  "company_id": 1,
  "project_code": "GCP_RPG",
  "project_name": "RPG Project",
  "api_base_url": "https://gcprpg.com/gm-api",
  "description": "MMORPG 운영 프로젝트"
}
```

### Validation

- company_id 존재
- project_code 필수, 동일 company 내 중복불가, 영문/숫자/`_`/`.`/`-` 만 허용, 최대 20자
- project_name 필수, 최대 100자
- api_base_url 필수, 최대 255자
- description 최대 1000자

### Response

저장 후 최종 데이터 반환

---

## 3.2 Get Project List

### Endpoint

```http
GET /projects
```

### Permission

- SUPER_ADMIN
- DEVELOPER

### Query Parameters

| Name       | Required | Description                    |
| ---------- | -------- | ------------------------------ |
| company_id | N        |                                |
| status     | N        |                                |
| page       | Y        |                                |
| page_size  | Y        | 20/30/50/100 중 선택. 기본 20     |

### Sorting

```sql
ORDER BY status DESC,
         project_name ASC
```

### Business Rules

- SUPER_ADMIN : 전체 프로젝트 목록 반환
- DEVELOPER : 본인이 활성 user_role을 가진 프로젝트만 반환 (같은 회사 소속이어도 role 미배정 프로젝트는 제외)

### Response

페이지네이션 응답 형식 (`04_API_COMMON.md` 3.4 참고)

각 항목에 company 정보를 포함한다.

```json
{
  "result": 0,
  "data": {
    "page": 1,
    "page_size": 20,
    "total_count": 100,
    "items": [
      {
        "project_id": 10,
        "company_id": 1,
        "company_code": "GCP",
        "company_name": "Game Company",
        "project_code": "GCP_RPG",
        "project_name": "RPG Project",
        "api_base_url": "https://gcprpg.com/gm-api",
        "description": "MMORPG 운영 프로젝트",
        "status": 1,
        "has_api_key": 0,
        "created_at": "2026-06-22 10:00:00",
        "updated_at": "2026-06-22 10:00:00"
      }
    ]
  }
}
```

`has_api_key`(0=미발급, 1=발급됨)만 반환하며, 발급된 X-API-Key 평문/암호문은 목록·단건 조회 어디서도 노출되지 않는다 (`3.4C Issue Project API Key` 응답에만 1회 예외적으로 포함).

---

## 3.3 Get Project

### Endpoint

```http
GET /projects/{project_id}
```

---

## 3.4 Update Project

### Endpoint

```http
PATCH /projects/{project_id}
```

### Permission

- SUPER_ADMIN

### Updatable Fields

```text
project_code
project_name
description
status
```

### Non-Updatable Fields

```text
project_id
company_id
api_base_url  (PATCH /projects/{project_id}/connection 전용)
api_key       (POST /projects/{project_id}/api-key 전용)
```

### Validation

- project_code 중복체크 (동일 company 내), 영문/숫자/`_`/`.`/`-` 만 허용, 최대 20자
- project_name 최대 100자
- description 최대 1000자

### Business Rules

- project.company_id 수정 불가

---

## 3.4B Update Project Connection

### Endpoint

```http
PATCH /projects/{project_id}/connection
```

### Permission

- SUPER_ADMIN
- DEVELOPER (해당 project_id에 실제 활성 DEVELOPER 배정이 있어야 함 — 없으면 20001)

### Updatable Fields

```text
api_base_url  (필수)
```

### Validation

- api_base_url 최대 255자

### Business Rules

- project_code/project_name/description/status(정체성·거버넌스 필드)는 이 API의 대상이 아니다 — `3.4 Update Project`(SUPER_ADMIN 전용) 참고
- DEVELOPER 호출 시 JWT의 role_code(여러 프로젝트 중 최고 권한)가 아니라 해당 project_id의 실제 user_role을 재검증한다
- api_base_url이 변경되면 발급되어 있던 api_key는 같은 트랜잭션에서 자동으로 폐기(NULL)된다 — 대상 서버가 바뀌었는데 옛 키를 그대로 보내는 실수 방지. 폐기 후 응답의 `has_api_key`는 0이 되며, 대상 서버 호출 시 X-API-Key 헤더 없이 호출된다(재발급 전까지)

---

## 3.4C Issue Project API Key

### Endpoint

```http
POST /projects/{project_id}/api-key
```

### Permission

- SUPER_ADMIN
- DEVELOPER (해당 project_id에 실제 활성 DEVELOPER 배정이 있어야 함 — 없으면 20001)

### Description

GM Platform이 이 프로젝트의 대상 서버(`api_base_url`) 호출에 사용할 X-API-Key를 생성해 암호화 저장한다. 이미 발급된 키가 있으면 재발급 시 덮어쓴다(기존 키는 즉시 무효화).

### Request

Body 없음 (project_id는 path parameter로만 전달).

### Response

```json
{
  "result": 0,
  "data": {
    "project_id": 10,
    "company_id": 1,
    "company_code": "GCP",
    "company_name": "Game Company",
    "project_code": "GCP_RPG",
    "project_name": "RPG Project",
    "api_base_url": "https://gcprpg.com/gm-api",
    "description": "MMORPG 운영 프로젝트",
    "status": 1,
    "has_api_key": 1,
    "created_at": "2026-06-22 10:00:00",
    "updated_at": "2026-07-15 10:00:00",
    "api_key": "a1b2c3...(64자 hex, 이 응답에만 1회 노출)"
  }
}
```

### Business Rules

- 평문 `api_key`는 이 응답에만 실린다 — 이후 `GET /projects/{project_id}`를 포함한 어떤 조회 API도 평문/암호문을 반환하지 않고 `has_api_key`만 반환한다(GitHub PAT류 one-time-reveal 패턴)
- 발급 즉시 관리자/개발자가 평문을 복사해 대상 서버(test_game_server 등)의 `X-API-Key` 설정에 직접 입력해야 한다 — 재확인 불가
- DEVELOPER 호출 시 JWT의 role_code가 아니라 해당 project_id의 실제 user_role을 재검증한다 (`3.4B`와 동일 패턴)
- 키 형식: `crypto.randomBytes(32).toString('hex')` (64자 hex), DB에는 AES-256-CBC로 암호화 저장

---

## 3.5 Get Project by Code (Lookup)

### Endpoint

```http
GET /projects/lookup?company_id={id}&project_code={code}
```

### Permission

- 인증 불필요 (Anonymous)

### Description

회원가입 화면(SCR-002) 전용. 해당 회사 소속의 활성(status=1) 프로젝트만 조회하며, `/projects/{project_id}`보다 먼저 등록해야 하는 정적 경로다.

### Response

```json
{
  "result": 0,
  "data": {
    "project_id": 10,
    "project_name": "RPG Project"
  }
}
```

`api_base_url` 등 민감정보는 반환하지 않는다. 미존재/비활성 시 31002.

---

# 4. User APIs

## 4.1 Signup

### Endpoint

```http
POST /auth/signup
```

### Permission

Anonymous

### Description

플랫폼 회원가입

### Request

```json
{
  "company_id": 1,
  "requested_project_id": 100,
  "login_id": "operator01",
  "password": "********",
  "user_name": "홍길동",
  "email": "operator01@company.com",
  "phone_number": "010-1234-5678",
  "department": "개발팀",
  "position": "사원"
}
```

### Validation

- company_id 존재
- requested_project_id 선택 (NULL 허용)
  - 값이 있는 경우 존재 여부 확인
  - 값이 있는 경우 company_id 에 속해야 함
- login_id 형식: 영문 대소문자, 숫자, `_`, `.`, `-`만 허용 (그 외 문자 포함 시 30002)
- login_id 중복 불가
- email 중복 불가
- phone_number 필수, 평문 최대 20자 (서버에서 AES-256-CBC 암호화 후 저장)
- department, position 선택 입력, 각각 최대 100자

### Response

저장 후 최종 데이터 반환

```json
{
  "result": 0,
  "data": {
    "...": "생략"
  }
}
```

---

## 4.2 Get User List

### Endpoint

```http
GET /users
```

### Permission

- SUPER_ADMIN
- DEVELOPER

### Query Parameters

| Name                 | Required | Description                    |
| -------------------- | -------- | ------------------------------ |
| company_id           | N        | SUPER_ADMIN만 유효 (DEVELOPER는 항상 본인 소속 회사로 고정 스코핑) |
| status               | N        | DEVELOPER도 자유롭게 필터 가능 (본인 소속 회사 스코핑은 별개로 적용) |
| page                 | Y        |                                |
| page_size            | Y        | 20/30/50/100 중 선택. 기본 20     |

### Sorting

기본 조회
user.status 의 정렬은 타 테이블과 성격이 틀리기때문에 ASC로 한다.

```sql
ORDER BY status ASC,
         user_name ASC
```

---

## 4.3 Get Pending Signup Users

### Endpoint

```http
GET /users?status=0
```

### Permission

- SUPER_ADMIN : 전체 status 조회 가능
- DEVELOPER : 본인 소속 회사 사용자에 한해 전체 status 조회 가능

### Description

가입 승인 대기 사용자 조회

이 API는 동일한 /users 이며 `status` 파라메터의 유무만 틀림

### Business Rules

- 가입 승인 화면에서 사용
- requested_project_id 확인 가능

### Sorting

```sql
ORDER BY status ASC,
         user_name ASC
```

### Response

페이지네이션 응답 형식 (`04_API_COMMON.md` 3.4 참고)

---

## 4.4 Get User

### Endpoint

```http
GET /users/{user_id}
```

---

## 4.5 Approve User

### Endpoint

```http
POST /users/{user_id}/approve
```

### Permission

- SUPER_ADMIN

### State Transition

```text
0 → 1
```

### Business Rules

- 가입 승인

### Response

저장 후 최종 데이터 반환

---

## 4.6 Reject User

### Endpoint

```http
POST /users/{user_id}/reject
```

### Permission

- SUPER_ADMIN

### State Transition

```text
0 → 2
```

### Request

```json
{}
```

### Validation

- 없음

### Response

저장 후 최종 데이터 반환

---

## 4.7 Update User

### Endpoint

```http
PATCH /users/{user_id}
```

### Permission

- SUPER_ADMIN

### Updatable Fields

```text
user_name
email
phone_number
department
position
status
```

### Non-Updatable Fields

```text
user_id
company_id
requested_project_id
login_id
```

### State Transition

```text
0 → 1 : 가입승인 절차이므로 제외됨
0 → 2 : 가입승인 절차이므로 제외됨
0 → 3 : 불가
1 → 2 : 가입승인 절차이므로 제외됨
1 → 3 : 가능
3 → 1 : 가능
```

> `SP_UPDATE_USER`는 status 값에 대한 전이 검증을 하지 않는다(COALESCE로 그대로 반영). 위 표는 프론트엔드(UserDetailPage)가 상태별로 노출하는 액션 버튼 기준의 설계 의도이며, API를 직접 호출하면 임의의 status 값 전달이 가능하다.

### Business Rules

- status = 3 (사용중지) 변경 시 해당 사용자의 모든 활성 Session 즉시 종료
- 비밀번호 변경 시 해당 사용자의 모든 활성 Session 즉시 종료

---

## 4.8 Reset User Password

### Endpoint

```http
POST /users/{user_id}/reset-password
```

### Permission

- SUPER_ADMIN

### Description

관리자가 특정 사용자의 비밀번호를 강제 초기화한다.

본인 비밀번호 변경(`PATCH /auth/password`)과 달리 현재 비밀번호 검증 없이 즉시 변경한다.

### Request

```json
{
  "new_password": "1234"
}
```

### Validation

- new_password 필수

### Business Rules

- current_password 검증 없이 즉시 변경
- 변경 후 해당 사용자의 모든 활성 Session 즉시 종료
  ```text
  user_session.status = 0 WHERE user_id = ? AND status = 1
  ```
- 감사 로그(log_audit) 기록 — password_hash 는 `"***"` 로 마스킹

### Response

저장 후 최종 데이터 반환

---

# 5. User Status

| Status | Description  |
| ------ | ------------ |
| 0      | 가입승인대기 |
| 1      | 가입승인     |
| 2      | 가입반려     |
| 3      | 사용중지     |

### Allowed State Transition

```text
0 → 1
0 → 2
1 → 3
3 → 1
```

---

# 6. User Role APIs

## 6.1 Create User Role

### Endpoint

```http
POST /user-roles
```

### Permission

- SUPER_ADMIN

### Request

```json
{
  "user_id": 100,
  "project_id": 10,
  "role_code": 40
}
```

### Validation

- user_id 존재
- project_id 존재
- user와 project의 company_id 일치 필요 (다른 회사 소속 프로젝트에는 등록 불가)
- role_code = 20,30,40

### Business Rules

- SUPER_ADMIN 등록 불가
- 동일 user_id + project_id 중복 등록 불가

### Response

저장 후 최종 데이터 반환

---

## 6.2 Get User Role List

### Endpoint

```http
GET /user-roles
```

### Permission

- SUPER_ADMIN
- DEVELOPER (본인 소속 회사로 스코핑)

### Query Parameters

| Name       | Required |
| ---------- | -------- |
| user_id    | N        |
| project_id | N        |
| role_code  | N        |
| status     | N        |

### Sorting

```sql
ORDER BY status DESC,
         role_code ASC,
         user_id ASC
```

---

## 6.3 Update User Role

### Endpoint

```http
PATCH /user-roles/{user_id}/{project_id}
```

### Permission

- SUPER_ADMIN

### Updatable Fields

```text
role_code
status
```

### Non-Updatable Fields

```text
user_id
project_id
```

### Business Rules

- 물리 삭제 없음
- status=0 으로 권한 중지
- role_code를 10(SUPER_ADMIN)으로 변경 불가 (30003)

### Response

저장 후 최종 데이터 반환

---

## 6.4 Get My Role

### Endpoint

```http
GET /user-roles/me
```

### Permission

- 전체 역할 (본인 role_code만 조회 가능, 관리 목적 아님)

### Query Parameters

| Name       | Required |
| ---------- | -------- |
| project_id | Y        |

### Business Rules

- SUPER_ADMIN : user_role 배정 여부와 무관하게 항상 `role_code: 10` 반환
- 그 외 : 호출자 본인의 해당 project_id 활성 user_role의 role_code 반환, 없으면 `role_code: null` (오류 아님)
- 다른 사용자의 role_code는 조회 불가 (user_id 파라미터 없음 — 항상 토큰의 본인 user_id 기준)

### Response

```json
{
  "result": 0,
  "data": {
    "role_code": 20
  }
}
```

### 용도

로그인 세션의 role_code(여러 프로젝트 중 최고 권한, [05_AUTH_API.md](./05_AUTH_API.md) §2.4.1 참고)는 특정 프로젝트에서의 실제 권한과 다를 수 있다. 프론트엔드가 헤더에서 프로젝트를 선택했을 때, 그 프로젝트에 대한 실제 role_code를 이 API로 조회해 메뉴·버튼 노출을 결정한다.

---

# 7. User Role Status

| Status | Description |
| ------ | ----------- |
| 1      | 사용        |
| 0      | 중지        |

---

# 8. Data Visibility Rules

## SUPER_ADMIN

모든 데이터 조회 가능

## 일반 사용자

자신의 company_id 에 속한 프로젝트만 접근 가능

## 프로젝트 접근 권한

user_role.status = 1 인 프로젝트만 접근 가능
단, user 는 status = 0 조회 불가

## 중지 데이터 조회

| Role        | status=0 조회 |
| ----------- | ------------- |
| SUPER_ADMIN | 가능          |
| DEVELOPER   | 가능          |
| APPROVER    | 불가          |
| OPERATOR    | 불가          |
