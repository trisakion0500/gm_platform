# GM-Tool REST API Specification

# Part 3. API Execution / Approval Workflow

---

# 1. Overview

API 실행은 모두 `api_execution` 테이블을 기준으로 관리한다.

실행 이력은 물리 삭제하지 않는다.

모든 API 호출은 반드시 실행 이력이 생성된다.

---

# 2. Execution Status

| Value | Status   |
| ----- | -------- |
| 10    | PENDING  |
| 20    | APPROVED |
| 30    | REJECTED |
| 40    | SUCCESS  |
| 50    | FAILED   |
| 60    | CANCELED |

---

# 3. Execution Permission & State Transition

## 3.1 실행 권한 및 상태 전이 규칙

| 조건 | 결과 |
| ---- | ---- |
| `is_required_approval = 0` + 모든 역할 | 즉시 실행 |
| `is_required_approval = 1` + SUPER_ADMIN / DEVELOPER / APPROVER | 즉시 실행 (승인 단계 생략) |
| `is_required_approval = 1` + OPERATOR | PENDING 생성 후 승인 대기 |

---

## 3.2 즉시 실행 상태 전이

```text id="e2"
10 → 40 (SUCCESS)
10 → 50 (FAILED)
10 → 60 (CANCELED)
```

---

## 3.3 승인 필요 상태 전이 (OPERATOR)

```text id="e4"
10 → 20 → 40 (승인 후 성공)
10 → 20 → 50 (승인 후 실패)
10 → 30      (반려)
10 → 60      (취소)
```

---

## 3.4 SP 흐름 다이어그램

```
                              ┌─────────────────────────────┐
                              │   SP_CREATE_API_EXECUTION   │
                              │         status = 10         │
                              └──────────────┬──────────────┘
                                             │
                          ┌──────────────────┴──────────────────┐
                    is_immediate=1                          is_immediate=0
                    (승인 불필요 or SA/DEV/APP)            (OPERATOR + 승인필요)
                          │                                      │
                          ▼                                      ▼
                   [HTTP 호출]                    ┌──────────────────────────────┐
                          │                       │ SP_GET_API_EXECUTION_PENDING │
                          │                       │         status = 10          │
                          │                       └──────┬───────────────────────┘
                          │                              │
                          │               ┌──────────────┼──────────────┐
                          │            승인(SA/DEV/APP) 반려          취소(본인)
                          │               │              │              │
                          │               ▼              ▼              ▼
                          │  SP_APPROVE_API_EXECUTION  SP_REJECT   SP_CANCEL
                          │       status = 20          status=30   status=60
                          │               │
                          │          [HTTP 호출]
                          │               │
                          └───────────────┘
                                          │
                              ┌───────────┴───────────┐
                            성공                     실패
                              │                       │
                              ▼                       ▼
              SP_UPDATE_API_EXECUTION_RESULT  SP_UPDATE_API_EXECUTION_RESULT
                        status = 40                status = 50
```

---

# 4. Execute API

## Endpoint

```http id="e11"
POST /apis/{api_id}/execute
```

### Permission

- SUPER_ADMIN
- DEVELOPER
- APPROVER
- OPERATOR

---

### Request

request_json 은 반드시 저장한다.

```json id="e12"
{
  "request_json": {
    "...": "생략"
  }
}
```

---

### Validation

- API 존재
- API status=1
- api_stage 에 따른 역할 접근 권한 확인
- 프로젝트 접근 권한 존재

---

### Business Rules

실행 시점 기준 아래 정보를 Snapshot 저장

```text id="e13"
api_name
endpoint
is_required_approval
request_json
```

`is_required_approval`은 관리자가 API의 승인 필요 여부를 이후에 바꾸더라도 과거 실행 이력의 판정(승인 시나리오를 탔는지)이 흔들리지 않도록 실행 시점 값을 그대로 저장한다.

실제 호출 URL 조합

```text
project.api_base_url + api.endpoint

예시)
api_base_url = https://game.com/gm-api
endpoint     = /reward/give
호출 URL     = https://game.com/gm-api/reward/give
```

`api_base_url` 은 Snapshot 저장 대상이 아니며 호출 시점의 `project.api_base_url` 을 사용한다.

요청 성공 후로부터 10초 내 응답이 없을 경우 Failure 처리하며 사유는 `Timeout Response` 로 한다.

---

### Response

```json id="e14"
{
  "result": 0,
  "data": {
    "api_execution_id": 1000,
    "...": "생략"
  }
}
```

---

# 5. Get Execution List

## Endpoint

```http id="e15"
GET /api-executions
```

### Query Parameters

| Name                    | Required | Description                                           |
| ----------------------- | -------- | ----------------------------------------------------- |
| project_id              | Y        | SUPER_ADMIN: 전체 가능 / 그 외: 자신이 속한 company의 project만 가능 |
| api_id                  | N        |                                                       |
| request_user_id         | N        | OPERATOR: 서버가 자동으로 본인 ID 강제 적용 (파라미터 무시)             |
| status                  | N        |                                                       |
| required_approval_only  | N        | 1이면 실행 시점 승인 필요(`is_required_approval=1`) 건만 반환, 생략 시 전체 |
| page                    | Y        |                                                       |
| page_size               | Y        | 20/50/100 중 선택. 기본 20                               |

### 권한별 조회 범위

| 역할 | project_id | request_user_id |
| ---- | ---------- | --------------- |
| SUPER_ADMIN (10) | 모든 company의 project 가능 | 모든 파라미터 사용 가능 |
| DEVELOPER (20) / APPROVER (30) | 자신이 속한 company의 project만 가능 | 모든 파라미터 사용 가능 |
| OPERATOR (40) | 자신이 속한 company의 project만 가능 | 서버가 본인 ID 자동 강제 적용 |

---

### Sorting

```sql id="e18"
ORDER BY requested_at DESC
```

---

# 6. Search Execution

## Endpoint

```http id="e19"
GET /api-executions/{api_execution_id}
```

### Description

실행번호 조회

---

### Response

```json id="e20"
{
  "result": 0,
  "data": {
    "api_execution_id": 1000,
    "api_id": 10,
    "api_name": "재화 지급",
    "endpoint": "/reward/give",
    "is_required_approval": 1,
    "request_user_id": 10,
    "request_user_name": "operator1",
    "approve_user_name": "approver1",
    "status": 40,
    "request_json": {
      "...": "생략"
    },
    "response_data": {
      "...": "생략"
    },
    "reject_reason": null,
    "error_message": null,
    "requested_at": "2026-06-22 10:00:00",
    "approved_at": "2026-06-22 10:01:00",
    "executed_at": "2026-06-22 10:01:01"
  }
}
```

`request_user_id`는 취소 권한 판단(요청자 본인 여부) 용도로만 raw 값을 유지하고, 그 외 사용자 표시는 `request_user_name`/`approve_user_name`을 사용한다(`approve_user_id`는 응답에 포함하지 않음).

---

# 7. Approval Queue

## Endpoint

```http id="e21"
GET /api-executions/pending
```

### Permission

- SUPER_ADMIN
- DEVELOPER
- APPROVER

### Query Parameters

| Name       | Required | Description        |
| ---------- | -------- | ------------------ |
| project_id | Y        |                    |
| page       | Y        |                    |
| page_size  | Y        | 20/50/100 중 선택. 기본 20 |

### Condition

```sql id="e22"
status = 10
```

### Sorting

```sql id="e24"
ORDER BY requested_at ASC
```

오래 기다린 요청 우선

---

# 8. Approve Execution

## Endpoint

```http id="e25"
POST /api-executions/{api_execution_id}/approve
```

### Permission

- SUPER_ADMIN
- DEVELOPER
- APPROVER

### State Transition

```text id="e26"
10 → 20
```

---

### Business Rules

승인 후 즉시 API 실행
단, 요청 성공 후로부터 10초 내 응답이 없을 경우 Failure 처리하며 사유는 `Timeout Response` 로 한다.

---

### Success

```text id="e27"
20 → 40
```

---

### Failure

```text id="e28"
20 → 50
```

---

### approve_user_id

저장

---

### approved_at

저장

---

# 9. Reject Execution

## Endpoint

```http id="e29"
POST /api-executions/{api_execution_id}/reject
```

### Permission

- SUPER_ADMIN
- DEVELOPER
- APPROVER

### State Transition

```text id="e30"
10 → 30
```

---

### Request

```json id="e31"
{
  "reject_reason": "운영 정책 위반"
}
```

---

### Validation

```text id="e32"
reject_reason 필수
```

---

### Business Rules

approve_user_id 저장

반려자 저장

---

# 10. Cancel Execution

## Endpoint

```http id="e33"
POST /api-executions/{api_execution_id}/cancel
```

### Permission

요청자 본인

---

### State Transition

```text id="e34"
10 → 60
```

---

### Validation

승인 전 상태만 가능

```text id="e35"
status = 10
```

---

### Request

```json id="e36"
{
  "reject_reason": "사용자 요청 취소"
}
```

`reject_reason` 은 반려(REJECTED) 와 취소(CANCELED) 공용 컬럼이며, 취소 사유도 동일 필드에 저장한다.

---

### Validation

```text id="e37"
reject_reason 필수
```

---

# 11. Execution Result

## Success

### State

```text id="e38"
40
```

### Save

```text id="e39"
response_data
executed_at
```

---

## Failure

### State

```text id="e40"
50
```

### Save

```text id="e41"
error_message
executed_at
```

---

# 12. Visibility Rules

## SUPER_ADMIN

모든 실행 이력 조회 가능

---

## 일반 사용자

자신의 company 에 속한 프로젝트만 조회 가능

---

## OPERATOR

본인이 요청한 건만 조회 가능

서버가 토큰의 user_id 를 기준으로 request_user_id 를 자동 강제 적용하며, 클라이언트가 전달한 request_user_id 파라미터는 무시한다.

---

## APPROVER

승인 대상 프로젝트의 모든 실행 이력 조회 가능

---

# 13. request_json Rule

request_json 은 반드시 저장한다.

실제 API 호출 원문 그대로 저장한다.

파라미터가 없는 API 의 경우에도 빈 오브젝트로 전송하며 DB 에 `{}` 로 저장한다.

```text
파라미터 없는 API 요청 예시
{ "request_json": {} }
```

파라미터가 있는 API 요청 예시

```json id="e42"
{
  "user_id": 10001,
  "item_id": 20001,
  "count": 10
}
```

---

# 14. response_data Rule

response_data 는 실제 API 응답 원문 저장

응답 포맷은 고정

```json id="e43"
{
  "result": 0,
  "data": ["... 생략 ..."]
}
```

---

# 15. Important Business Rules

### 실행 가능 조건

```text
api.status = 1
```

api_stage 별 실행 가능 역할

| api_stage | 실행 가능 역할                             |
| --------- | ------------------------------------------ |
| 20 (개발) | SUPER_ADMIN, DEVELOPER                     |
| 30 (승인) | SUPER_ADMIN, DEVELOPER, APPROVER           |
| 40 (운영) | SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR |

---

### request_json

필수 저장

---

### 물리 삭제

지원하지 않음

---

### 승인자

approve_user_id 컬럼 사용

승인자 / 반려자 공통 저장

---

### 반려

reject_reason 필수

---

### 취소

reject_reason 필수

요청자 본인만 가능
