# GM-Tool REST API Specification

# Part 4. Code Group / Code Item

---

# 1. 공통 정책

## 권한

### 조회

```text
SUPER_ADMIN
DEVELOPER
APPROVER
OPERATOR
```

프로젝트 접근 권한이 있는 경우 조회 가능

---

### 등록/수정

```text
SUPER_ADMIN
DEVELOPER
```

DEVELOPER는 대상 `project_id`(Code Item은 소속 Code Group의 `project_id`)에 대해 실제로 활성 `user_role`(role_code=20)을 보유한 경우만 가능하다. 로그인 세션의 `role_code`(여러 프로젝트 중 최고 권한, [05_AUTH_API.md](./05_AUTH_API.md) §2.4.1 참고)와 무관하게 요청마다 재검증하며, 미보유 시 20001을 반환한다. SUPER_ADMIN은 `user_role` 배정과 무관하게 항상 허용된다.

---

## 상태 정책

```text
1 : 사용
0 : 중지
```

물리 삭제는 지원하지 않는다.

모든 삭제는

status = 0

으로 처리한다.

---

# 2. Code Group

## 2.1 Code Group 등록

### Endpoint

```http
POST /code-groups
```

### Permission

```text
SUPER_ADMIN
DEVELOPER
```

### Request

```json
{
  "project_id": 100,
  "code_group_code": "ITEM_GRADE",
  "code_group_name": "아이템 등급",
  "description": "아이템 희귀도 정의"
}
```

### Validation

**code_group_code** : 필수, 프로젝트 내 유일

```sql
UNIQUE(project_id, code_group_code)
```

**code_group_name** : 필수

---

### Success Response

저장 완료된 최종 데이터 반환

```json
{
  "result": 0,
  "data": {
    "code_group_id": 1,
    "project_id": 100,
    "code_group_code": "ITEM_GRADE",
    "code_group_name": "아이템 등급",
    "description": "아이템 희귀도 정의",
    "status": 1,
    "created_at": "...생략...",
    "updated_at": "...생략..."
  }
}
```

---

## 2.2 Code Group 목록 조회

### Endpoint

```http
GET /code-groups
```

### Query Parameters

| Name       | Required | Description |
| ---------- | -------- | ----------- |
| project_id | Y        | 대상 프로젝트   |
| status     | N        | 상태 필터       |

---

### Sorting

```sql
ORDER BY status DESC,
         code_group_name ASC
```

### Response

```json
{
  "result": 0,
  "data": {
    "items": [
      { "...": "생략" }
    ]
  }
}
```

---

## 2.3 Code Group 상세 조회

### Endpoint

```http
GET /code-groups/{code_group_id}
```

### Response

Code Group 정보 반환

---

## 2.4 Code Group 수정

### Endpoint

```http
PATCH /code-groups/{code_group_id}
```

### 수정 가능

```text
code_group_name
description
status
```

### 수정 불가

```text
project_id
code_group_code
```

### Response

저장 완료된 최종 데이터 반환

---

# 3. Code Item

## 3.1 Code Item 등록

### Endpoint

```http
POST /code-items
```

### Permission

```text
SUPER_ADMIN
DEVELOPER
```

### Request

```json
{
  "code_group_id": 1,
  "code_value": "LEGEND",
  "code_name": "전설",
  "description": "최고 등급",
  "display_order": 100
}
```

### Validation

**code_value** : 필수, Code Group 내 유일

```sql
UNIQUE(code_group_id, code_value)
```

**code_name** : 필수

---

### Success Response

저장 완료된 최종 데이터 반환

```json
{
  "result": 0,
  "data": {
    "code_item_id": 1,
    "code_group_id": 1,
    "code_value": "LEGEND",
    "code_name": "전설",
    "description": "최고 등급",
    "display_order": 100,
    "status": 1,
    "created_at": "...생략...",
    "updated_at": "...생략..."
  }
}
```

---

## 3.2 Code Item 목록 조회

### Endpoint

```http
GET /code-items
```

### Query Parameters

| Name          | Required | Description |
| ------------- | -------- | ----------- |
| code_group_id | Y        | 대상 코드 그룹  |
| status        | N        | 상태 필터       |

---

### Sorting

```sql
ORDER BY status DESC,
         display_order ASC
```

### Response

```json
{
  "result": 0,
  "data": {
    "items": [
      { "...": "생략" }
    ]
  }
}
```

---

## 3.3 Code Item 상세 조회

### Endpoint

```http
GET /code-items/{code_item_id}
```

---

## 3.4 Code Item 수정

### Endpoint

```http
PATCH /code-items/{code_item_id}
```

### 수정 가능

```text
code_name
description
display_order
status
```

### 수정 불가

```text
code_group_id
code_value
```

### Response

저장 완료된 최종 데이터 반환

---

# 4. API 연동용 코드 조회

## 4.1 활성 Code 조회

### Endpoint

```http
GET /code-groups/{code_group_id}/active-items
```

### Description

API Request 컴포넌트 렌더링용

SELECT
RADIO
CHECKBOX

항목 조회

---

### Condition

```sql
status = 1
```

---

### Sorting

```sql
ORDER BY display_order ASC
```

### Response

```json
{
  "result": 0,
  "data": {
    "items": [
      { "code_value": "LEGEND", "code_name": "전설" },
      { "code_value": "UNIQUE", "code_name": "유니크" }
    ]
  }
}
```

---

## 4.2 프로젝트 단위 활성 코드그룹 + 아이템 일괄 조회

### Endpoint

```http
GET /code-groups/active-with-items?project_id={id}
```

### Permission

```text
SUPER_ADMIN
DEVELOPER
APPROVER
OPERATOR
```

### Description

코드그룹 관리 화면(`/admin/code-groups`)은 SUPER_ADMIN/DEVELOPER 전용이라 접근할 수 없는 APPROVER/OPERATOR가
API Request/Response의 SELECT/RADIO/CHECKBOX 값을 참조할 때 사용하는 조회 전용 엔드포인트.

`GET /code-groups/{code_group_id}/active-items`를 그룹 개수만큼 반복 호출하는 N+1 대신,
프로젝트 내 활성(status=1) 코드그룹 전체와 각 그룹의 활성 아이템을 한 번에 반환한다.

### Condition

```sql
code_group.status = 1
code_item.status = 1  -- 아이템이 없는 그룹도 포함(빈 배열)
```

### Sorting

```sql
ORDER BY code_group_name ASC, display_order ASC
```

### Response

```json
{
  "result": 0,
  "data": {
    "items": [
      {
        "code_group_id": 1,
        "code_group_code": "GRADE",
        "code_group_name": "등급",
        "items": [
          { "code_value": "LEGEND", "code_name": "전설" },
          { "code_value": "UNIQUE", "code_name": "유니크" }
        ]
      }
    ]
  }
}
```

---

# 5. 공통 비즈니스 규칙

## Code Group

### 수정 불가

```text
project_id
code_group_code
```

---

## Code Item

### 수정 불가

```text
code_group_id
code_value
```

---

## 삭제 정책

물리 삭제 지원 안 함

```text
status = 0
```

사용

---

## 프로젝트 접근 정책

SUPER_ADMIN 제외

모든 사용자는

프로젝트 접근 권한이 있는 경우에만

Code Group / Code Item 조회 가능
