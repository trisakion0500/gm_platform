# GM-Tool REST API Specification

# Part 5. Audit Log

---

# 1. 개요

본 문서는 GM-Tool 감사 로그(Audit Log) 조회 API 명세를 정의한다.

감사 로그는 운영 데이터 변경 이력을 추적하기 위한 Append-Only 데이터이며, 시스템에 의해 자동 생성된다.

사용자는 감사 로그를 조회할 수만 있으며 직접 생성, 수정, 삭제할 수 없다.

---

# 2. 공통 정책

## 2.1 감사 대상 테이블

감사 로그 생성 대상

```text
company
project
user
user_role
api
api_request
api_response
code_group
code_item
```

감사 로그 생성 제외 대상

```text
api_execution
log_audit
```

---

## 2.2 작업 유형(Action Type)

| 값  | 설명          |
| --- | ------------- |
| 10  | CREATE        |
| 20  | UPDATE        |
| 30  | STATUS_CHANGE |

---

## 2.3 저장 정책

모든 감사 로그는 생성 시점의 데이터를 JSON 스냅샷 형태로 저장한다.

CREATE

```text
before_json = NULL
after_json = 생성 후 전체 Row
```

UPDATE

```text
before_json = 수정 전 전체 Row
after_json = 수정 후 전체 Row
```

STATUS_CHANGE

```text
before_json = 상태 변경 전 전체 Row
after_json = 상태 변경 후 전체 Row
```

---

## 2.4 민감 필드 마스킹 규칙

before_json / after_json 저장 시 아래 필드는 보안상 마스킹하여 저장한다.

| table_name | 마스킹 필드   | 저장 값 |
| ---------- | ------------- | ------- |
| user       | password_hash | `"***"` |

`PATCH /auth/password` 호출 시 user 테이블 UPDATE 감사 로그가 생성되며, 이 때 password_hash 는 마스킹된다.

---

## 2.5 수정 및 삭제 정책

감사 로그는 Append-Only 정책을 따른다.

지원하지 않는 기능

```text
생성 API
수정 API
삭제 API
상태변경 API
```

감사 로그는 시스템 내부에서만 생성된다.

---

# 3. 권한 정책

## SUPER_ADMIN

모든 감사 로그 조회 가능

---

## DEVELOPER

본인 Company 소속 데이터만 조회 가능

---

## APPROVER

본인 Company 소속 데이터만 조회 가능

---

## OPERATOR

감사 로그 조회 불가

---

# 4. API 목록

| Method | URI                        | 설명                |
| ------ | -------------------------- | ------------------- |
| GET    | /log-audits                | 감사 로그 목록 조회 |
| GET    | /log-audits/{log_audit_id} | 감사 로그 상세 조회 |

특정 대상의 변경 이력 조회 또는 최신 이력 조회는 `/log-audits` 목록 API의 Query Parameter로 처리한다.

---

# 5. 감사 로그 목록 조회

## Endpoint

```http
GET /log-audits
```

## Query Parameters

| 이름            | 필수 | 설명                                               |
| --------------- | ---- | -------------------------------------------------- |
| company_id      | N    | 회사 ID                                            |
| project_id      | N    | 프로젝트 ID                                        |
| table_name      | N    | 대상 테이블명                                      |
| target_id       | N    | 대상 식별자                                        |
| action_type     | N    | 작업 유형 (10:CREATE, 20:UPDATE, 30:STATUS_CHANGE) |
| created_by      | N    | 작업자 ID                                          |
| from_created_at | N    | 시작 일시                                          |
| to_created_at   | N    | 종료 일시                                          |
| page            | Y    | 페이지 번호                                        |
| page_size       | Y    | 20/50/100 중 선택. 기본 20                         |

## 사용 패턴

특정 대상 전체 변경 이력 조회

```http
GET /log-audits?table_name=api&target_id=100
```

특정 대상 최신 변경 이력 조회

```http
GET /log-audits?table_name=api&target_id=100&page=1&page_size=1
```

---

## Response

```json
{
  "result": 0,
  "data": {
    "page": 1,
    "page_size": 100,
    "total_count": 2,
    "items": [
      {
        "log_audit_id": 1001,
        "company_id": 1,
        "project_id": 100,
        "table_name": "api",
        "target_id": "100",
        "target_name": "Get User List",
        "action_type": 20,
        "created_by": 10,
        "created_at": "2026-06-22 10:00:00"
      }
    ]
  }
}
```

---

## Sorting

```sql
ORDER BY created_at DESC
```

---

# 6. 감사 로그 상세 조회

## Endpoint

```http
GET /log-audits/{log_audit_id}
```

## Path Parameter

| 이름         | 설명         |
| ------------ | ------------ |
| log_audit_id | 감사 로그 ID |

---

## Response

```json
{
  "result": 0,
  "data": {
    "log_audit_id": 1001,
    "company_id": 1,
    "project_id": 100,
    "table_name": "api",
    "target_id": "100",
    "target_name": "Get User List",
    "action_type": 20,
    "before_json": {
      "...": "생략"
    },
    "after_json": {
      "...": "생략"
    },
    "created_by": 10,
    "created_at": "2026-06-22 10:00:00"
  }
}
```

---

# 7. 오류 코드

## 권한 오류

| 코드  | 설명      |
| ----- | --------- |
| 20001 | 권한 없음 |

---

## 시스템 오류

| 코드  | 설명              |
| ----- | ----------------- |
| 50000 | 시스템 오류       |
| 50001 | 데이터베이스 오류 |
