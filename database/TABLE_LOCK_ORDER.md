# 메인 DB(gm_platform) 테이블 잠금 순서

trisakion-dev-convention-skill 4.7절 "데드락 방지" 규칙에 따라, 이 DB(`gm_platform`) 안에서 여러 테이블을
쓰는(INSERT/UPDATE/DELETE) SP는 전부 아래 전역 순서를 따른다. 두 SP가 같은 테이블 쌍을 서로 반대 순서로
잠그면 각자 나름대로는 일관돼도 데드락이 날 수 있으므로, 새 SP를 작성하기 전에 반드시 이 순서표를 먼저
확인한다. 새 테이블을 추가하면 그 테이블이 FK로 참조하는 테이블 뒤에, 참조당하는 테이블 앞에 끼워 넣는다.

이 순서는 "테이블 접근 순서"이지 "SELECT 조회 순서"가 아니다 — 잠금 없는 일반 SELECT(FN_HAS_PROJECT_ROLE/
FN_GET_PROJECT_ROLE_CODE가 내부에서 하는 `user_role` 조회 등, `FOR UPDATE`가 없는 조회)는 MVCC 스냅샷
읽기라 행 잠금을 잡지 않으므로 이 순서의 적용 대상이 아니다. 대상은 같은 트랜잭션(`START TRANSACTION`~
`COMMIT`) 안에서 실제로 INSERT/UPDATE/DELETE(또는 `SELECT ... FOR UPDATE`)하는 테이블들이다.

## 전역 순서

1. `company`
2. `project`
3. `user`
4. `user_session`
5. `user_role`
6. `code_group`
7. `code_item`
8. `api_request`
9. `api_response`
10. `api`
11. `api_execution`
12. `api_index_sync_queue`

## 근거

기본 골격은 FK 참조 관계(부모 → 자식)를 그대로 따른다.

```
company
  └─ project (fk_project_company_id)
       └─ user (fk_user_company_id, fk_user_requested_project)
            ├─ user_session (FK 없음 — 물리적으로 삭제됐지만 user_id 종속 관계는 동일)
            ├─ user_role (fk_user_role_project, fk_user_role_user)
            ├─ code_group (fk_code_group_project, fk_code_group_created_by/updated_by)
            │    └─ code_item (fk_code_item_code_group, fk_code_item_created_by/updated_by)
            └─ api (fk_api_project, fk_api_created_by/updated_by)
                 ├─ api_request (fk_api_request_api, ...)
                 ├─ api_response (fk_api_response_api, ...)
                 ├─ api_execution (fk_api_execution_api, fk_api_execution_request_user/approve_user)
                 └─ api_index_sync_queue (fk_api_index_sync_queue_api)
```

단 한 곳, **`api_request`/`api_response`는 FK 부모인 `api`보다 먼저** 온다 — "부모 먼저" 원칙의 예외다.
실제 쓰기 SP들이 이 순서로 이미 만들어져 있고(아래 "실제 다중 테이블 SP" 참고), 이 SP들의 본질이
"api_request/api_response 행을 쓰고, 그 부수효과로 소속 api의 api_stage를 롤백시키는" 흐름이라 주 대상
테이블을 먼저, 부수효과 대상을 나중에 잠그는 편이 자연스럽기 때문이다. 이 예외는 이미 코드에 고정된
사실이므로 순서표도 실제 코드에 맞춘다 — 앞으로 이 세 테이블(`api_request`/`api_response`/`api`)을 함께
쓰는 SP를 새로 추가할 때도 반드시 이 순서(자식 먼저 → api → api_index_sync_queue)를 그대로 따른다.

`api_index_sync_queue`는 항상 최하위(마지막)다 — RAG 동기화 아웃박스 큐로, 이 순서표에 있는 어떤 테이블도
이 큐를 참조하지 않고 이 큐만 `api`를 참조한다.

## 실제 다중 테이블 SP (검증된 순서)

아래 SP들은 실제로 두 개 이상 테이블을 같은 트랜잭션에서 쓰며, 파일 상단 주석에 "테이블 적용 순서"를
명시해뒀다 — 전부 위 전역 순서와 일치한다.

| SP | 순서 |
|----|------|
| `SP_CREATE_LOGIN_SESSION` | `user` → `user_session` |
| `SP_UPDATE_PASSWORD` | `user` → `user_session` |
| `SP_CREATE_API` | `api` → `api_index_sync_queue` |
| `SP_UPDATE_API` | `api` → `api_index_sync_queue` |
| `SP_CREATE_API_REQUEST` | `api_request` → `api` → `api_index_sync_queue` |
| `SP_UPDATE_API_REQUEST` | `api_request` → `api`(조건부, 롤백 트리거 시만) → `api_index_sync_queue` |
| `SP_CREATE_API_RESPONSE` | `api_response` → `api` → `api_index_sync_queue` |
| `SP_UPDATE_API_RESPONSE` | `api_response` → `api`(조건부, 롤백 트리거 시만) → `api_index_sync_queue` |

그 외 쓰기 SP(`SP_CREATE/UPDATE_COMPANY`, `SP_CREATE/UPDATE_PROJECT`, `SP_UPDATE_PROJECT_CONNECTION`,
`SP_ISSUE_PROJECT_API_KEY`, `SP_APPROVE/REJECT_USER`, `SP_UPDATE_USER`, `SP_SIGNUP_USER`,
`SP_CREATE/UPDATE_USER_ROLE`, `SP_CREATE/UPDATE_CODE_GROUP`, `SP_CREATE/UPDATE_CODE_ITEM`,
`SP_CREATE/APPROVE/REJECT/CANCEL_API_EXECUTION`, `SP_UPDATE_API_EXECUTION_RESULT`,
`SP_UPDATE_SESSION_JTI`, `SP_LOGOUT_SESSION`, `SP_LOGOUT_ALL_SESSIONS`, `SP_CLEANUP_EXPIRED_SESSIONS`,
`SP_MARK_API_INDEX_SYNC_FAILED`, `SP_DELETE_API_INDEX_SYNC`)는 각각 테이블 하나만 써서 이 순서표의
적용 대상이 아니다(단일 테이블 쓰기는 애초에 다른 SP와 데드락을 일으킬 잠금 순서 자체가 없다).

## 예외 — advisory lock

`SP_LOCK_ACQUIRE`/`SP_LOCK_RELEASE`(`GET_LOCK`/`RELEASE_LOCK` 기반, 인스턴스 간 배치 중복실행 방지용)는
테이블 행 잠금이 아니라 MySQL 세션 수준 named lock이라 이 순서표의 대상이 아니다.
