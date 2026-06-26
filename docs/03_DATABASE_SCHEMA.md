# 03_DATABASE_SCHEMA.md

## 개요

GM-Tool 데이터베이스 스키마 정의 문서

본 문서는 운영 스키마 및 Audit Log 스키마를 정의한다.

---

# 테이블 목록

## 1. company

회사 정보

### 특징

- `created_by` / `updated_by` 컬럼 없음 (의도적 설계)
  - 시드 데이터는 특정 사용자가 없는 상태에서 생성됨
  - 이후 생성/수정 주체는 항상 SUPER_ADMIN 이며 `log_audit` 로 추적

---

## 2. project

프로젝트 정보

### 특징

- Company 소속
- company_id 수정 불가
- 논리 삭제(status) 사용
- `created_by` / `updated_by` 컬럼 없음 (의도적 설계)
  - 시드 데이터는 특정 사용자가 없는 상태에서 생성됨
  - 이후 생성/수정 주체는 항상 SUPER_ADMIN 이며 `log_audit` 로 추적

---

## 3. user

플랫폼 사용자 계정

### 특징

- requested_project_id 영구 보관
- 회원가입 신청 프로젝트 변경 불가
- 가입 승인 프로세스 지원

### 상태

| 값  | 설명         |
| --- | ------------ |
| 0   | 가입승인대기 |
| 1   | 가입승인     |
| 2   | 가입반려     |
| 3   | 사용중지     |

---

## 4. user_role

사용자 프로젝트 권한 매핑

### 특징

- 프로젝트별 권한 부여
- 논리 삭제(status) 사용

### 권한

| 값  | 설명        |
| --- | ----------- |
| 10  | SUPER_ADMIN |
| 20  | DEVELOPER   |
| 30  | APPROVER    |
| 40  | OPERATOR    |

### 특수 규칙

SUPER_ADMIN은 어떤 프로젝트에 연결되어도 무관함

---

## 5. api

GM API 정의

### 특징

- 프로젝트 종속
- project_id 수정 불가
- api_code 수정 가능
- 논리 삭제(status) 사용

### 정렬

```sql
ORDER BY status DESC,
         display_order ASC
```

### API 운영 단계

| 값  | 설명 |
| --- | ---- |
| 20  | 개발 |
| 30  | 승인 |
| 40  | 운영 |

### api_stage 별 실행 가능 역할

| api_stage | 실행 가능 역할                             |
| --------- | ------------------------------------------ |
| 20 (개발) | SUPER_ADMIN, DEVELOPER                     |
| 30 (승인) | SUPER_ADMIN, DEVELOPER, APPROVER           |
| 40 (운영) | SUPER_ADMIN, DEVELOPER, APPROVER, OPERATOR |

### 실제 호출 URL 조합

```text
project.api_base_url + api.endpoint

예시)
api_base_url = https://game.com/gm-api
endpoint     = /reward/give
호출 URL     = https://game.com/gm-api/reward/give
```

---

### api_stage 전진 워크플로우

SUPER_ADMIN, DEVELOPER 가 PATCH /apis/{api_id} 로 api_stage 를 변경한다.

```text
20(개발) → 테스트 완료 후 → 30(승인) 또는 40(운영) 으로 변경
```

특정 필드 변경 시 api_stage 는 자동으로 20 으로 롤백된다.

### 응답 표시 방식

| 값  | 설명      |
| --- | --------- |
| 1   | KEY_VALUE |
| 2   | GRID      |

---

## 6. api_request

API 요청 파라미터 정의

### 특징

- 논리 삭제(status) 사용
- parameter_name 수정 가능
- code_group 연동 가능

### 정렬

```sql
ORDER BY status DESC,
         display_order ASC
```

### parameter_type

| 값  | 설명     |
| --- | -------- |
| 1   | STRING   |
| 2   | NUMBER   |
| 3   | BOOLEAN  |
| 4   | DATE     |
| 5   | DATETIME |
| 6   | JSON     |

### component_type

| 값  | 설명     |
| --- | -------- |
| 1   | TEXT     |
| 2   | NUMBER   |
| 3   | DATE     |
| 4   | DATETIME |
| 5   | SELECT   |
| 6   | RADIO    |
| 7   | CHECKBOX |

### code_group 제약

```text
component_type 가
5(SELECT)
6(RADIO)
7(CHECKBOX)

인 경우

code_group_id = 0 이면 오류
```

---

## 7. api_response

API 응답 정의

### 특징

- 논리 삭제(status) 사용
- parameter_name 수정 가능

### 정렬

```sql
ORDER BY status DESC,
         display_order ASC
```

### parameter_type

| 값  | 설명     |
| --- | -------- |
| 1   | STRING   |
| 2   | NUMBER   |
| 3   | BOOLEAN  |
| 4   | DATE     |
| 5   | DATETIME |
| 6   | JSON     |

### 응답 구조 규칙

```json
{
  "result": 0,
  "message": "",
  "data": [
    ...
  ]
}
```

data 배열 구조 고정

---

## 8. api_execution

API 승인 및 실행 이력

### 특징

- request_json 무조건 저장
- 실제 요청 파라미터 전체 저장
- 승인 프로세스 지원
- 실행 결과 저장

### 상태

| 값  | 설명     |
| --- | -------- |
| 10  | PENDING  |
| 20  | APPROVED |
| 30  | REJECTED |
| 40  | SUCCESS  |
| 50  | FAILED   |
| 60  | CANCELED |

### 상태 전이

#### 승인 불필요 API

```text
is_required_approval = 0
```

즉시 실행

```text
10 → 40
10 → 50
10 → 60
```

처리 가능 권한

```text
SUPER_ADMIN
DEVELOPER
APPROVER
OPERATOR
```

---

#### 승인 필요 API

```text
is_required_approval = 1
```

SUPER_ADMIN
DEVELOPER
APPROVER

직접 실행 가능

```text
10 → 40
10 → 50
10 → 60
```

---

OPERATOR

승인 요청 생성

```text
 → 10
```

승인자

```text
SUPER_ADMIN
DEVELOPER
APPROVER
```

```text
10 → 20
10 → 30
```

---

승인 이후

```text
20 → 40
20 → 50
20 → 60
```

---

### reject_reason

필수 조건

```text
REJECTED
CANCELED
```

---

### approve_user_id

다음 경우 동일 컬럼 사용

```text
승인자
반려자
```

---

## 9. code_group

공통 코드 그룹 정의

### 특징

- 프로젝트 종속
- project_id 수정 불가
- code_group_code 수정 불가
- 논리 삭제(status) 사용

### 정렬

```sql
ORDER BY status DESC,
         code_group_name ASC
```

### UNIQUE

```sql
(project_id, code_group_code)
```

---

## 10. code_item

공통 코드 상세 정의

### 특징

- code_group 종속
- code_group_id 수정 불가
- code_value 수정 불가
- 논리 삭제(status) 사용

### 정렬

```sql
ORDER BY status DESC,
         display_order ASC
```

### UNIQUE

```sql
(code_group_id, code_value)
```

---

## 11. log_audit

시스템 설정 변경 감사 로그

### 특징

- Append-Only 테이블 (물리 수정 및 삭제 불가)
- api_execution 은 실행 이력 테이블이므로 감사 대상에서 제외
- 변경 전후 전체 Row 를 JSON 으로 저장
- FK 없음 (로그 테이블 원칙)
- company_id / project_id 는 스코핑용 (FK 없음)

### 감사 대상 테이블

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

### action_type

| 값  | 설명          |
| --- | ------------- |
| 10  | CREATE        |
| 20  | UPDATE        |
| 30  | STATUS_CHANGE |

### before_json / after_json

| action_type   | before_json | after_json |
| ------------- | ----------- | ---------- |
| CREATE        | NULL        | NOT NULL   |
| UPDATE        | NOT NULL    | NOT NULL   |
| STATUS_CHANGE | NOT NULL    | NOT NULL   |

### 민감 필드 마스킹 규칙

before_json / after_json 저장 시 아래 필드는 보안상 마스킹하여 저장한다.

| table_name | 마스킹 필드       | 저장 값 |
| ---------- | ----------------- | ------- |
| user       | password_hash     | `"***"` |

적용 대상

```text
PATCH /auth/password              — 본인 비밀번호 변경
POST  /users/{user_id}/reset-password — 관리자 비밀번호 초기화
```

두 경우 모두 user 테이블 UPDATE 감사 로그가 생성되며 password_hash 는 마스킹된다.

---

### 혼합 변경 시 감사 로그 처리 규칙

단일 PATCH 요청에서 일반 필드 변경과 status 변경이 동시에 발생한 경우 두 건을 각각 기록한다.

```text
예시) PATCH /users/{user_id} 로 user_name 과 status 를 동시에 변경한 경우

1건 : action_type = 20 (UPDATE)        — user_name 변경 기록
2건 : action_type = 30 (STATUS_CHANGE) — status 변경 기록
```

before_json / after_json 은 각 로그 기록 시점의 Row 상태를 기준으로 저장한다.

```text
UPDATE 로그       : before = 변경 전 Row,        after = status 변경 전 Row
STATUS_CHANGE 로그: before = status 변경 전 Row, after = 최종 Row
```

### company_id / project_id 스코핑 규칙

| table_name  | company_id | project_id |
| ----------- | ---------- | ---------- |
| company     | O          | NULL       |
| user        | O          | NULL       |
| project     | O          | O          |
| user_role   | O          | O          |
| api         | O          | O          |
| api_request | O          | O          |
| api_response| O          | O          |
| code_group  | O          | O          |
| code_item   | O          | O          |

### target_id 형식

단일 PK

```text
100
```

복합 PK

```json
{"user_id":100,"project_id":200}
```

---

### target_name 저장 정책

| table_name   | target_name                                               |
| ------------ | --------------------------------------------------------- |
| company      | company_name                                              |
| project      | project_name                                              |
| user         | user_name                                                 |
| user_role    | `{"user_name":"홍길동","project_name":"RPG Project"}`     |
| api          | api_name                                                  |
| api_request  | parameter_name                                            |
| api_response | parameter_name                                            |
| code_group   | code_group_name                                           |
| code_item    | code_name                                                 |

복합 PK 테이블은 연관된 표시명을 JSON 형태로 저장한다.

---

# 공통 정책

## 삭제 정책

모든 업무 테이블은 물리 삭제를 지원하지 않는다.

```text
status = 0
```

으로 처리한다.

---

## 표시 정책

목록 조회 기본 정렬

```sql
ORDER BY status DESC
```

우선 적용

---

## 권한 정책

SUPER_ADMIN

```text
모든 회사
모든 프로젝트
모든 기능
```

접근 가능

---

일반 사용자

```text
소속 Company
소속 Project
```

범위 내에서만 접근 가능

---

## 비밀번호 정책

비밀번호는 bcrypt 알고리즘으로 해싱하여 `user.password_hash` 에 저장한다.

```text
알고리즘 : bcrypt
Cost Factor (rounds) : 12
```

평문 비밀번호는 DB에 저장하지 않는다.

---

## 초기 SUPER_ADMIN 계정 설정

SUPER_ADMIN은 API로 직접 생성할 수 없으므로 아래 절차로 초기화한다.

```text
1. POST /auth/signup 으로 회원가입
   - company_id : 1 (Administrator Company)
   - requested_project_id : 1 (Administrator Company Default Project)

2. DB에서 직접 가입 승인 처리
   UPDATE user SET status = 1 WHERE login_id = '{login_id}';

3. DB에서 직접 SUPER_ADMIN 권한 부여
   INSERT INTO user_role (user_id, project_id, role_code, status)
   VALUES ({user_id}, 1, 10, 1);
```

### 유의 사항

```text
- POST /user-roles API 는 role_code = 10 등록을 허용하지 않으므로 반드시 DB 직접 처리
- project_id 는 임의 값이어도 무관 (SUPER_ADMIN은 모든 프로젝트에 접근 가능)
- 초기화 후 추가 SUPER_ADMIN 계정이 필요한 경우 동일 절차 반복
```

---

# 데이터 접근 정책

## Stored Procedure / Function 전용

서버 애플리케이션은 DB에 대해 Stored Procedure(SP) 와 Function(FN) 만을 통해 접근한다.

```text
Native SQL 직접 작성 금지 (SELECT, INSERT, UPDATE, DELETE 등)
```

## 명명 규칙

```text
Stored Procedure : sp_동사_대상   예) sp_get_user, sp_create_api
Function         : fn_동사_대상   예) fn_get_user_role
```

## 위치

```text
database/procedures/   — Stored Procedure
database/functions/    — Function
```

---

# SP 코딩 컨벤션

## 기본 구조

모든 SP는 아래 순서를 따른다.

```sql
DELIMITER $

DROP PROCEDURE IF EXISTS sp_동사_대상$

CREATE PROCEDURE sp_동사_대상(
    IN  p_param1 TYPE,    -- 파라미터 설명 (한국어)
    OUT p_param2 TYPE     -- 파라미터 설명 (한국어)
)
COMMENT 'SP 한 줄 설명'
BEGIN

    -- ... 내용 ...

END$

DELIMITER ;
```

---

## 헤더 주석 블록

CREATE PROCEDURE 본문 첫 줄에 작성한다.

### 필수 항목

```sql
/*
    명칭 : sp_동사_대상
    작성 : YYYY-MM-DD 작성자
    내용 : 동작 설명 (주요 처리 흐름 요약)
    테이블 적용 순서 : table_a → table_b → table_c
*/
```

`테이블 적용 순서`는 트랜잭션 내 테이블 처리 순서를 명시한다. 데드락 방지를 위해 모든 SP가 동일한 순서를 준수한다.

### 선택 항목

필요한 경우에만 추가한다.

```sql
/*
    명칭 : sp_동사_대상
    작성 : YYYY-MM-DD 작성자
    내용 : 동작 설명
    의도 : 특이한 설계 이유 또는 주의사항
    전제 : 이 SP 가 의존하는 사전 조건
    이력 : YYYY-MM-DD 작성자 — 변경 내용
    테이블 적용 순서 : table_a → table_b
*/
```

---

## 파라미터 규칙

모든 IN/OUT 파라미터에 인라인 한국어 주석을 필수로 작성한다.

```sql
CREATE PROCEDURE sp_create_user(
    IN  p_company_id    BIGINT,       -- 회사 ID
    IN  p_login_id      VARCHAR(100), -- 로그인 ID
    IN  p_password_hash VARCHAR(255), -- 비밀번호 해시
    OUT p_user_id       BIGINT        -- 생성된 사용자 ID (출력)
)
```

---

## 핸들러 등록

### SQLEXCEPTION 핸들러 (필수)

모든 SP에 기본 등록한다.

```sql
DECLARE sql_state     CHAR(5)       DEFAULT '00000';
DECLARE error_no      INT           DEFAULT 0;
DECLARE error_message VARCHAR(255)  DEFAULT '';
DECLARE EXIT HANDLER FOR SQLEXCEPTION
BEGIN
    GET DIAGNOSTICS CONDITION 1
        sql_state     = RETURNED_SQLSTATE,
        error_no      = MYSQL_ERRNO,
        error_message = MESSAGE_TEXT;
    ROLLBACK;
    SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
END;
```

- `RESULT = 99` 는 시스템 오류(DB 예외)를 의미한다.
- ROLLBACK 후 오류 정보를 반드시 반환한다.

### NOT FOUND 핸들러 (필요 시 추가)

```sql
DECLARE CONTINUE HANDLER FOR NOT FOUND
BEGIN
    SET v_not_found = 1;
END;
```

---

## 트랜잭션 블록

메인 로직은 반드시 `transaction_block` 레이블로 감싼다.

```sql
transaction_block: BEGIN
    START TRANSACTION;

    -- 처리 로직

    COMMIT;
    SELECT 0 AS RESULT;
END;
```

트랜잭션 없이 조회만 하는 SP도 동일하게 적용한다. 중간 탈출이 필요한 경우 `LEAVE transaction_block` 을 사용한다.

---

## 결과 반환 규칙

- 모든 SP의 최종 SELECT 는 반드시 `RESULT` 컬럼을 포함한다.
- `RESULT = 0` 은 성공을 의미한다.
- `RESULT = 99` 는 시스템 오류(SQLEXCEPTION 핸들러 자동 반환)를 의미한다.
- 그 외 값은 비즈니스 오류 코드로 사용한다 (`04_API_COMMON.md` 오류 코드 체계 참조).

```sql
-- 성공
SELECT 0 AS RESULT;

-- 조회 결과 없음
SELECT 31003 AS RESULT;

-- 시스템 오류 (SQLEXCEPTION 핸들러에서 자동 반환)
SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
```

---

## 전체 SP 템플릿

```sql
DELIMITER $

DROP PROCEDURE IF EXISTS sp_동사_대상$

CREATE PROCEDURE sp_동사_대상(
    IN  p_param1 BIGINT,      -- 파라미터 설명
    IN  p_param2 VARCHAR(100) -- 파라미터 설명
)
COMMENT 'SP 한 줄 설명'
BEGIN
    /*
        명칭 : sp_동사_대상
        작성 : YYYY-MM-DD 작성자
        내용 : 처리 내용 설명
        테이블 적용 순서 : table_a → table_b
    */

    DECLARE sql_state     CHAR(5)       DEFAULT '00000';
    DECLARE error_no      INT           DEFAULT 0;
    DECLARE error_message VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    transaction_block: BEGIN
        START TRANSACTION;

        -- 처리 로직

        COMMIT;
        SELECT 0 AS RESULT;
    END;

END$

DELIMITER ;
```
