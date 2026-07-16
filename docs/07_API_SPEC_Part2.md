# GM-Tool REST API Specification

# Part 2. API / API Request / API Response

---

# 1. API APIs

## 1.1 Create API

### Endpoint

```http
POST /apis
```

### Permission

- SUPER_ADMIN
- DEVELOPER

### Request

```json
{
  "project_id": 10,
  "api_code": "SEND_MAIL",
  "api_name": "메일 발송",
  "endpoint": "/api/mail/send",
  "description": "메일 발송 API",
  "is_required_approval": 1,
  "response_view_type": 1,
  "display_order": 100
}
```

### Validation

- project_id 존재
- api_code 필수
- api_name 필수
- endpoint 필수
- project_id + api_code 중복 불가

### Initial Value

```text
api_stage = 20 (개발)
status = 1 (사용)
```

### Response

저장 후 최종 데이터 반환

---

## 1.2 Get API List

### Endpoint

```http
GET /apis
```

### Permission

- SUPER_ADMIN
- DEVELOPER
- APPROVER
- OPERATOR

### Query Parameters

| Name       | Required | Description                    |
| ---------- | -------- | ------------------------------ |
| project_id | Y        |                                |
| status     | N        |                                |
| api_stage  | N        |                                |
| page       | Y        |                                |
| page_size  | Y        | 20/30/50/100 중 선택. 기본 20     |

### Sorting

```sql
ORDER BY status DESC,
         display_order ASC
```

### Business Rules

- SUPER_ADMIN : 전체 조회 가능
- 일반 사용자 : 권한 있는 프로젝트만 조회 가능

---

## 1.2B Get Active API List

### Endpoint

```http
GET /apis/active?project_id={id}
```

### Permission

- 전 역할 (SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR)

### Description

사이드바 API 메뉴 전용. 프로젝트의 활성(status=1) API 전체를 페이지네이션 없이 반환한다. 기존엔 사이드바가 `GET /apis`를 `page_size=100` 고정으로 호출해 100건을 넘으면 조용히 누락되는 문제가 있어(헤더 콤보박스와 동일한 원인, `2.6 Get Active Header Data` 참고) 신설했다. `/apis/{api_id}`보다 먼저 등록해야 하는 정적 경로다.

### Response

```json
{
  "result": 0,
  "data": [
    { "api_id": 1, "api_name": "메일 발송", "api_stage": 30 }
  ]
}
```

`api_id`/`api_name`/`api_stage`만 반환한다.

---

## 1.3 Get API

### Endpoint

```http
GET /apis/{api_id}
```

### Response

```json
{
  "result": 0,
  "data": {
    "api": {
      "...": "생략"
    },
    "requests": ["... 생략 ..."],
    "responses": ["... 생략 ..."]
  }
}
```

### Business Rules

API 상세 조회 시

- api
- api_request
- api_response

전체 반환

---

## 1.4 Update API

### Endpoint

```http
PATCH /apis/{api_id}
```

### Permission

- SUPER_ADMIN
- DEVELOPER

### Updatable Fields

```text
api_code
api_name
endpoint
description
api_stage
is_required_approval
response_view_type
display_order
status
```

### Non-Updatable Fields

```text
api_id
project_id
created_by
created_at
```

### Stage Rollback Rules

아래 컬럼 수정 시

```text
api_code
endpoint
is_required_approval
response_view_type
```

자동 처리

```text
api_stage = 20
```

단,

```text
api_name
description
display_order
status
```

변경 시에는 api_stage 유지

### Response

저장 후 최종 데이터 반환

---

# 2. API Request APIs

## 2.1 Create API Request

### Endpoint

```http
POST /apis/{api_id}/requests
```

### Permission

- SUPER_ADMIN
- DEVELOPER

### Request

```json
{
  "parameter_name": "user_id",
  "parameter_label": "유저 ID",
  "parameter_type": 2,
  "component_type": 2,
  "code_group_id": 0,
  "is_required": 1,
  "description": "대상 유저 ID",
  "display_order": 100
}
```

### Validation

- api_id 존재
- parameter_name 중복 불가(api별)
- parameter_name 필수
- parameter_label 필수

### Component Type

| Value | Description |
| ----- | ----------- |
| 1     | TEXT        |
| 2     | NUMBER      |
| 3     | DATE        |
| 4     | DATETIME    |
| 5     | SELECT      |
| 6     | RADIO       |
| 7     | CHECKBOX    |

### Business Rules

component_type 가

```text
5
6
7
```

일 경우

```text
code_group_id > 0
```

필수

### Stage Rollback Rules

생성 시

```text
api_stage = 20
```

자동 변경

### Response

저장 후 최종 데이터 반환

---

## 2.2 Get API Request

### Endpoint

```http
GET /api-requests/{api_request_id}
```

### Permission

- SUPER_ADMIN
- DEVELOPER

> APPROVER / OPERATOR는 `GET /apis/{api_id}` 응답에 requests 목록이 포함되므로 개별 조회 불필요.

---

## 2.3 Update API Request

### Endpoint

```http
PATCH /api-requests/{api_request_id}
```

### Updatable Fields

```text
parameter_name
parameter_label
parameter_type
component_type
code_group_id
is_required
description
display_order
status
```

### Stage Rollback Rules

아래 변경 시

```text
parameter_name
parameter_type
component_type
code_group_id
is_required
```

api_stage = 20

아래 변경 시

```text
parameter_label
description
display_order
status
```

api_stage 유지

### Response

저장 후 최종 데이터 반환

---

# 3. API Response APIs

## 3.1 Create API Response

### Endpoint

```http
POST /apis/{api_id}/responses
```

### Permission

- SUPER_ADMIN
- DEVELOPER

### Request

```json
{
  "parameter_name": "result_code",
  "parameter_label": "결과 코드",
  "parameter_type": 2,
  "code_group_id": 0,
  "description": "실행 결과 코드",
  "display_order": 100
}
```

### Validation

- parameter_name 중복 불가(api별)
- parameter_name 필수
- parameter_label 필수

### Stage Rollback Rules

생성 시

```text
api_stage = 20
```

### Response

저장 후 최종 데이터 반환

---

## 3.2 Get API Response

### Endpoint

```http
GET /api-responses/{api_response_id}
```

### Permission

- SUPER_ADMIN
- DEVELOPER

> APPROVER / OPERATOR는 `GET /apis/{api_id}` 응답에 responses 목록이 포함되므로 개별 조회 불필요.

---

## 3.3 Update API Response

### Endpoint

```http
PATCH /api-responses/{api_response_id}
```

### Updatable Fields

```text
parameter_name
parameter_label
parameter_type
code_group_id
description
display_order
status
```

### Stage Rollback Rules

아래 변경 시

```text
parameter_name
parameter_type
code_group_id
```

api_stage = 20

아래 변경 시

```text
parameter_label
description
display_order
status
```

api_stage 유지

### Response

저장 후 최종 데이터 반환

---

# 4. API Stage

| Value | Description |
| ----- | ----------- |
| 20    | 개발        |
| 30    | 승인        |
| 40    | 운영        |

---

# 5. API Status

| Value | Description |
| ----- | ----------- |
| 1     | 사용        |
| 0     | 중지        |

---

# 6. Response View Type

| Value | Description |
| ----- | ----------- |
| 1     | KEY_VALUE   |
| 2     | GRID        |

---

# 7. Important Business Rules

## API 정의 변경

실제 API 동작에 영향을 주는 변경은

```text
api_stage = 20
```

으로 자동 변경한다.

api_stage 자동 롤백은 감사 로그(log_audit)를 생성하지 않는다.

## 표시 정보 변경

아래 항목은 운영 중에도 자유롭게 수정 가능하다.

```text
api_name
parameter_label
description
display_order
status
```

## 물리 삭제

지원하지 않음

## 등록/수정 응답

항상 저장 완료된 최종 데이터를 반환한다.

## 프로젝트 권한 재검증

API/API Request/API Response 등록·수정(1.1, 1.4, 2.1, 2.3, 3.1, 3.3)의 Permission에 있는 DEVELOPER는, 대상 API가 속한 `project_id`에 대해 실제로 활성 `user_role`(role_code=20)을 보유한 경우만 허용된다. 로그인 세션의 `role_code`(여러 프로젝트 중 최고 권한, [05_AUTH_API.md](./05_AUTH_API.md) §2.4.1 참고)와 무관하게 요청마다 재검증하며, 미보유 시 20001을 반환한다. SUPER_ADMIN은 `user_role` 배정과 무관하게 항상 허용된다.
