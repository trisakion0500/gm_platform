# 02_ERD.md

## GM-Tool Entity Relationship Diagram

---

```mermaid
erDiagram

    company {
        BIGINT      company_id      PK
        VARCHAR20   company_code    UK
        VARCHAR100  company_name
        VARCHAR1000 description
        TINYINT     status
        DATETIME    created_at
        DATETIME    updated_at
    }

    project {
        BIGINT      project_id      PK
        BIGINT      company_id      FK
        VARCHAR20   project_code
        VARCHAR100  project_name
        VARCHAR255  api_base_url
        VARCHAR1000 description
        TINYINT     status
        DATETIME    created_at
        DATETIME    updated_at
    }

    user {
        BIGINT      user_id                 PK
        BIGINT      company_id              FK
        BIGINT      requested_project_id    FK "NULL허용"
        VARCHAR100  login_id                UK
        VARCHAR255  password_hash
        VARCHAR100  user_name
        VARCHAR200  email                   UK
        VARCHAR255  phone_number            "AES-256-CBC 암호화(Base64)"
        VARCHAR100  department              "NULL허용"
        VARCHAR100  position                "NULL허용"
        TINYINT     status
        DATETIME    last_login_at
        DATETIME    created_at
        DATETIME    updated_at
    }

    user_role {
        BIGINT  user_id     PK "FK→user"
        BIGINT  project_id  PK "FK→project"
        TINYINT role_code
        TINYINT status
        DATETIME created_at
        DATETIME updated_at
    }

    user_session {
        BIGINT      session_id          PK
        BIGINT      user_id             "FK없음(의도)"
        VARCHAR100  access_token_jti    UK
        VARCHAR255  refresh_token_hash
        DATETIME    expired_at
        DATETIME    last_access_at
        TINYINT     status
        DATETIME    created_at
        DATETIME    updated_at
    }

    api {
        BIGINT      api_id                  PK
        BIGINT      project_id              FK
        VARCHAR100  api_code
        VARCHAR200  api_name
        VARCHAR500  endpoint
        VARCHAR1000 description
        TINYINT     api_stage
        TINYINT     is_required_approval
        TINYINT     response_view_type
        TINYINT     status
        INT         display_order
        BIGINT      created_by              FK
        BIGINT      updated_by              FK
        DATETIME    created_at
        DATETIME    updated_at
    }

    api_request {
        BIGINT      api_request_id  PK
        BIGINT      api_id          FK
        VARCHAR100  parameter_name
        VARCHAR100  parameter_label
        TINYINT     parameter_type
        TINYINT     component_type
        INT         code_group_id   "FK없음(0=미사용)"
        TINYINT     is_required
        VARCHAR1000 description
        INT         display_order
        TINYINT     status
        BIGINT      created_by      FK
        BIGINT      updated_by      FK
        DATETIME    created_at
        DATETIME    updated_at
    }

    api_response {
        BIGINT      api_response_id PK
        BIGINT      api_id          FK
        VARCHAR100  parameter_name
        VARCHAR100  parameter_label
        TINYINT     parameter_type
        INT         code_group_id   "FK없음(0=미사용)"
        VARCHAR1000 description
        INT         display_order
        TINYINT     status
        BIGINT      created_by      FK
        BIGINT      updated_by      FK
        DATETIME    created_at
        DATETIME    updated_at
    }

    api_execution {
        BIGINT       api_execution_id    PK
        BIGINT       api_id              FK
        VARCHAR200   api_name            "스냅샷"
        VARCHAR500   endpoint            "스냅샷"
        TINYINT      is_required_approval "스냅샷"
        BIGINT       request_user_id     FK
        BIGINT       approve_user_id     FK "NULL허용"
        TINYINT      status
        LONGTEXT     request_json
        LONGTEXT     response_data
        VARCHAR1000  reject_reason
        VARCHAR2000  error_message
        DATETIME     requested_at
        DATETIME     approved_at
        DATETIME     executed_at
        DATETIME     updated_at
    }

    code_group {
        INT         code_group_id   PK
        BIGINT      project_id      FK
        VARCHAR100  code_group_code
        VARCHAR200  code_group_name
        VARCHAR1000 description
        TINYINT     status
        BIGINT      created_by      FK
        BIGINT      updated_by      FK
        DATETIME    created_at
        DATETIME    updated_at
    }

    code_item {
        BIGINT      code_item_id    PK
        INT         code_group_id   FK
        VARCHAR100  code_value
        VARCHAR200  code_name
        VARCHAR1000 description
        INT         display_order
        TINYINT     status
        BIGINT      created_by      FK
        BIGINT      updated_by      FK
        DATETIME    created_at
        DATETIME    updated_at
    }

    log_audit {
        BIGINT      log_audit_id    PK
        BIGINT      company_id      "스코핑용(FK없음)"
        BIGINT      project_id      "스코핑용(FK없음)"
        VARCHAR100  table_name
        VARCHAR100  target_id
        VARCHAR200  target_name
        TINYINT     action_type
        LONGTEXT    before_json
        LONGTEXT    after_json
        BIGINT      created_by      "FK없음(로그원칙)"
        DATETIME    created_at
    }

    %% ── 핵심 구조 관계 ──────────────────────────────
    company         ||--|{  project         : "소속"
    company         ||--|{  user            : "소속"
    project         ||--o{  user_role       : "권한부여"
    user            ||--o{  user_role       : "권한보유"
    project         ||--o{  api             : "포함"
    project         ||--o{  code_group      : "포함"
    api             ||--o{  api_request     : "파라미터"
    api             ||--o{  api_response    : "응답정의"
    api             ||--o{  api_execution   : "실행이력"
    code_group      ||--|{  code_item       : "항목"
    user            ||--o{  api_execution   : "요청(request_user_id)"
    user            ||--o{  api_execution   : "승인(approve_user_id)"

    %% ── 생성자/수정자 관계 ───────────────────────────
    user            ||--o{  api             : "생성/수정"
    user            ||--o{  api_request     : "생성/수정"
    user            ||--o{  api_response    : "생성/수정"
    user            ||--o{  code_group      : "생성/수정"
    user            ||--o{  code_item       : "생성/수정"

    %% ── 선택적 참조 ─────────────────────────────────
    project         |o--o{  user            : "가입신청(requested_project_id)"
```

---

## FK 미적용 항목

| 테이블 | 컬럼 | 이유 |
|--------|------|------|
| `user_session` | `user_id` | MySQL → Redis 저장소 전환 시 인증 로직 수정 없이 확장 가능하도록 설계 |
| `api_request` | `code_group_id` | 0(미사용) 허용, 선택적 참조 |
| `api_response` | `code_group_id` | 0(미사용) 허용, 선택적 참조 |
| `log_audit` | 전체 | Append-Only 로그 테이블 원칙 — FK 없음 |

---

## 스냅샷 컬럼

`api_execution` 테이블의 아래 컬럼은 실행 시점의 값을 복사하여 저장한다.

| 컬럼 | 원본 |
|------|------|
| `api_name` | `api.api_name` |
| `endpoint` | `api.endpoint` |
| `is_required_approval` | `api.is_required_approval` |

`api_base_url` 은 스냅샷 저장하지 않으며 호출 시점의 `project.api_base_url` 을 사용한다.

---

## 상태 코드 요약

| 테이블 | 컬럼 | 값 |
|--------|------|----|
| company, project, api, api_request, api_response, code_group, code_item, user_role, user_session | status | 1:사용 / 0:중지 |
| user | status | 0:가입승인대기 / 1:가입승인 / 2:가입반려 / 3:사용중지 |
| user_session | status | 1:사용 / 0:로그아웃 / 2:만료 |
| api | api_stage | 20:개발 / 30:승인 / 40:운영 |
| api_execution | status | 10:PENDING / 20:APPROVED / 30:REJECTED / 40:SUCCESS / 50:FAILED / 60:CANCELED |
| log_audit | action_type | 10:CREATE / 20:UPDATE / 30:STATUS_CHANGE |
