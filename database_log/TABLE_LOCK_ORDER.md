# 로그 DB(gm_platform_log) 테이블 잠금 순서

trisakion-dev-convention-skill 4.7절 "데드락 방지" 규칙에 따라, 메인 DB(`database/TABLE_LOCK_ORDER.md`)와
별도로 이 물리 DB(`gm_platform_log`) 안에서만 통용되는 전역 순서다. 두 DB는 같은 트랜잭션에 절대 묶이지
않으므로(메인 트랜잭션과 로그 기록은 별도 커넥션/트랜잭션 — CLAUDE.md 로깅 원칙 참고) DB 경계를 넘는
순서까지 정할 필요는 없다.

## 전역 순서

1. `log_audit`
2. `log_audit_index_sync_queue`

## 근거

```
log_audit
  └─ log_audit_index_sync_queue (fk_log_audit_index_sync_queue_log_audit)
```

FK 부모(`log_audit`)가 자식(`log_audit_index_sync_queue`)보다 먼저 — 메인 DB의 `api_request`/`api_response`
예외와 달리 여기는 예외 없이 표준 "부모 먼저" 순서를 그대로 따른다. `log_audit`은 Append-Only라 기존 행을
UPDATE하는 SP가 없어서(새 로그마다 새 행만 INSERT) `api`처럼 "부수효과로 부모를 나중에 갱신"하는 패턴 자체가
발생하지 않기 때문이다.

## 실제 다중 테이블 SP (검증된 순서)

| SP | 순서 |
|----|------|
| `SP_INSERT_LOG_AUDIT` | `log_audit` INSERT(`LAST_INSERT_ID()` 획득) → `log_audit_index_sync_queue` INSERT |

`SP_DELETE_LOG_AUDIT_INDEX_SYNC`/`SP_MARK_LOG_AUDIT_INDEX_SYNC_FAILED`는 `log_audit_index_sync_queue` 한
테이블만 써서 이 순서표의 적용 대상이 아니다. `SP_GET_LOG_AUDIT`/`SP_GET_LOG_AUDIT_LIST`/
`SP_GET_LOG_AUDIT_SYNC_SNAPSHOT`/`SP_GET_PENDING_LOG_AUDIT_INDEX_SYNC`는 조회 전용(SELECT, `FOR UPDATE`
없음)이라 행 잠금 자체를 잡지 않는다.

## 로그 DB 고유 제약

- 로그 DB는 메인 DB의 `user`/`user_role`을 참조할 수 없어(물리적으로 분리) `FN_HAS_PROJECT_ROLE`/
  `FN_GET_PROJECT_ROLE_CODE`를 쓸 수 없다 — 권한 검증은 `server/`의 `logAuditSearch.service.ts` 등
  앱 레이어가 메인 DB를 먼저 조회해 얻은 허용 목록(`i_allowed_project_ids` 콤마 문자열)을 파라미터로
  전달받아 SQL 단에서 `FIND_IN_SET`으로 거르는 방식을 쓴다 — 새 로그 DB 조회 SP도 이 패턴을 따른다.
