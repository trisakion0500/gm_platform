-- ------------------------------------------------------------------------------------------------------------ --
-- 로그 전용 DB(예: gm_platform_log) 통합 Procedure 파일. 메인 DB(gm_platform) 대상 Procedure는
-- database/procedures/all_procedures.sql에 별도로 있다 — logPool(로그 DB 전용 커넥션 풀,
-- server/src/config/db.ts)만 이 파일의 SP를 호출한다. 이 DB는 메인 DB의 어떤 테이블에도
-- 물리적으로 접근할 수 없으므로, 아래 SP들은 log_audit/log_audit_index_sync_queue 테이블만 참조하고
-- FN_*/JOIN을 쓰지 않는다.
-- 개별 파일을 수정하면 이 파일도 반드시 함께 갱신할 것(all_procedures.sql과 동일한 동기화 원칙).
-- ------------------------------------------------------------------------------------------------------------ --
DROP PROCEDURE IF EXISTS SP_DELETE_LOG_AUDIT_INDEX_SYNC;
DELIMITER $
CREATE PROCEDURE SP_DELETE_LOG_AUDIT_INDEX_SYNC(
    IN  i_sync_id  BIGINT  -- 삭제할 동기화 큐 ID
) COMMENT 'rag_server 동기화 성공 후 큐 행 삭제 - 접근제어 없음(내부 배치 전용)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_DELETE_LOG_AUDIT_INDEX_SYNC
-- 작성 : 2026-08-16 trisakion
-- 내용 : logAuditIndexSync.job.ts(server/) 전용 내부 배치 - rag_server push 성공 시 호출.
--        SP_DELETE_API_INDEX_SYNC(database/, RAG Phase 2)와 달리 낙관적 동시성 가드(i_expected_updated_at)가
--        없다 — log_audit은 Append-Only라 같은 log_audit_id가 SP_GET_PENDING_LOG_AUDIT_INDEX_SYNC 조회
--        이후 재큐잉될 수 없으므로(재큐잉은 "같은 대상이 다시 변경됨"을 뜻하는데, 로그 자체는 절대
--        UPDATE되지 않고 새 log_audit_id로만 추가된다), Phase 2가 겪은 TOCTOU가 구조적으로 발생하지 않는다.
--        sync_id만으로 삭제, ROW_COUNT()=0(이미 삭제됨)이어도 오류로 취급하지 않는다(idempotent).
-- --------------------------------- --

    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    DELETE FROM `log_audit_index_sync_queue`
    WHERE `sync_id` = i_sync_id;

    SELECT 0 AS RESULT;

END$
DELIMITER ;
DROP PROCEDURE IF EXISTS SP_GET_LOG_AUDIT;
DELIMITER $
CREATE PROCEDURE SP_GET_LOG_AUDIT(
    IN  i_log_audit_id         BIGINT,        -- 감사 로그 ID
    IN  i_caller_role_code     INT,           -- 요청자 역할 코드
    IN  i_allowed_project_ids  VARCHAR(4000), -- 요청자가 role_code<=30(SA/DEV/APV)으로 실제 배정된 project_id 콤마 목록 (없으면 빈 문자열)
    IN  i_caller_company_id    BIGINT         -- 요청자 company_id (project_id 없는 로그의 회사 스코핑용)
) COMMENT '감사 로그 단건 조회 - before_json, after_json 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_LOG_AUDIT
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-28 trisakion - project_id 있는 로그는 회사 스코핑 대신 대상 프로젝트에 대한 실제 role_code 일치 여부로 재검증
-- 수정 : 2026-08-02 trisakion - database_log(별도 물리 DB) 이관에 맞춰 user_role(메인 DB) 테이블을 직접 읽던
--        FN_GET_PROJECT_ROLE_CODE 호출을 제거 — 이 SP가 실행되는 DB는 메인 DB 테이블에 물리적으로 접근할 수
--        없다. 대신 TS 레이어(logAudit.service.ts)가 메인 DB에서 미리 조회한 "호출자가 role_code<=30으로
--        실제 배정된 project_id 목록"을 i_allowed_project_ids로 그대로 전달받아 FIND_IN_SET으로 판정한다.
--        이 김에 판정 기준도 "세션 role_code와 정확히 일치"에서 "role_code<=30(SA/DEV/APV)으로 실제
--        배정된 프로젝트 전체 허용"으로 완화했다 — 세션 role_code가 여러 프로젝트 중 최고 권한(MIN)으로
--        고정되는 이 앱의 특성상, A프로젝트 DEVELOPER·B프로젝트 APPROVER인 사용자가 세션이 DEVELOPER로
--        고정돼 있다는 이유만으로 B프로젝트 로그를 못 보던 문제를 없앤다. OPERATOR로만 배정된 프로젝트는
--        여전히 제외된다(라우트 자체가 OPERATOR를 차단하는 것과 같은 기준).
-- 내용 : 감사 로그 단건 조회
--        SUPER_ADMIN(10)  : 전체 로그 조회 가능
--        project_id 있음  : 호출자가 해당 프로젝트에 role_code<=30으로 실제 배정된 경우만 조회 가능
--        project_id 없음  : company/user 테이블 로그(특정 프로젝트와 무관) — 기존대로 회사 스코핑
--        조회 불가 또는 미존재 시 31010 반환
-- --------------------------------- --

    check_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `log_audit`
            WHERE `log_audit_id` = i_log_audit_id
              AND (
                    i_caller_role_code = 10
                    OR (`project_id` IS NOT NULL AND FIND_IN_SET(`project_id`, i_allowed_project_ids) > 0)
                    OR (`project_id` IS NULL AND `company_id` = i_caller_company_id)
                  )
        ) THEN
            SELECT 31010 AS RESULT;
            LEAVE check_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT la.`log_audit_id`, la.`company_id`, la.`project_id`, la.`project_name`,
               la.`table_name`, la.`target_id`, la.`target_name`, la.`action_type`,
               la.`before_json`, la.`after_json`, la.`created_by_name`, la.`created_at`
        FROM `log_audit` la
        WHERE la.`log_audit_id` = i_log_audit_id;

    END;

END$
DELIMITER ;
DROP PROCEDURE IF EXISTS SP_GET_LOG_AUDIT_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_LOG_AUDIT_LIST(
    IN  i_company_id          BIGINT,        -- 회사 ID 필터 (NULL=전체)
    IN  i_project_id          BIGINT,        -- 프로젝트 ID 필터 (NULL=전체)
    IN  i_table_name          VARCHAR(100),  -- 테이블명 필터 (NULL=전체)
    IN  i_target_id           VARCHAR(100),  -- 대상 ID 필터 (NULL=전체)
    IN  i_action_type         TINYINT,       -- 작업 유형 필터 (NULL=전체)
    IN  i_from_created_at     DATETIME,      -- 시작 일시 (NULL=제한없음)
    IN  i_to_created_at       DATETIME,      -- 종료 일시 (NULL=제한없음)
    IN  i_page                INT,           -- 페이지 번호 (1부터)
    IN  i_page_size           INT,           -- 페이지 크기 (20/30/50/100)
    IN  i_caller_role_code    INT,           -- 요청자 역할 코드
    IN  i_allowed_project_ids VARCHAR(4000), -- 요청자가 role_code<=30(SA/DEV/APV)으로 실제 배정된 project_id 콤마 목록 (없으면 빈 문자열)
    IN  i_caller_company_id   BIGINT         -- 요청자 company_id (project_id 없는 로그의 회사 스코핑용)
) COMMENT '감사 로그 목록 조회 - 역할 스코핑, 페이지네이션'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_LOG_AUDIT_LIST
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-28 trisakion - project_id 있는 로그는 회사 스코핑 대신 대상 프로젝트에 대한 실제 role_code 일치 여부로 재검증
-- 수정 : 2026-08-02 trisakion - database_log(별도 물리 DB) 이관에 맞춰 user_role(메인 DB) 테이블을 직접 읽던
--        FN_GET_PROJECT_ROLE_CODE 호출을 제거 — 이 SP가 실행되는 DB는 메인 DB 테이블에 물리적으로 접근할 수
--        없다. 대신 TS 레이어(logAudit.service.ts)가 메인 DB에서 미리 조회한 "호출자가 role_code<=30으로
--        실제 배정된 project_id 목록"을 i_allowed_project_ids로 그대로 전달받아 FIND_IN_SET으로 판정한다.
--        이 김에 판정 기준도 "세션 role_code와 정확히 일치"에서 "role_code<=30(SA/DEV/APV)으로 실제
--        배정된 프로젝트 전체 허용"으로 완화했다 — 세션 role_code가 여러 프로젝트 중 최고 권한(MIN)으로
--        고정되는 이 앱의 특성상, A프로젝트 DEVELOPER·B프로젝트 APPROVER인 사용자가 세션이 DEVELOPER로
--        고정돼 있다는 이유만으로 B프로젝트 로그를 못 보던 문제를 없앤다. OPERATOR로만 배정된 프로젝트는
--        여전히 제외된다(라우트 자체가 OPERATOR를 차단하는 것과 같은 기준).
-- 내용 : 감사 로그 목록 조회
--        SUPER_ADMIN(10)  : 전체 로그 반환
--        project_id 있음  : 호출자가 해당 프로젝트에 role_code<=30으로 실제 배정된 경우만 반환
--        project_id 없음  : company/user 테이블 로그(특정 프로젝트와 무관) — 기존대로 회사 스코핑
-- --------------------------------- --

    DECLARE v_offset INT DEFAULT (i_page - 1) * i_page_size;

    SELECT 0 AS RESULT;

    SELECT COUNT(*) AS total_count
    FROM `log_audit`
    WHERE (
            i_caller_role_code = 10
            OR (`project_id` IS NOT NULL AND FIND_IN_SET(`project_id`, i_allowed_project_ids) > 0)
            OR (`project_id` IS NULL AND `company_id` = i_caller_company_id)
          )
      AND (i_company_id        IS NULL OR `company_id`   = i_company_id)
      AND (i_project_id        IS NULL OR `project_id`   = i_project_id)
      AND (i_table_name        IS NULL OR `table_name`   = i_table_name)
      AND (i_target_id         IS NULL OR `target_id`    = i_target_id)
      AND (i_action_type       IS NULL OR `action_type`  = i_action_type)
      AND (i_from_created_at   IS NULL OR `created_at`  >= i_from_created_at)
      AND (i_to_created_at     IS NULL OR `created_at`  <= i_to_created_at);

    SELECT la.`log_audit_id`, la.`company_id`, la.`project_id`, la.`project_name`,
           la.`table_name`, la.`target_id`, la.`target_name`, la.`action_type`,
           la.`created_by_name`, la.`created_at`
    FROM `log_audit` la
    WHERE (
            i_caller_role_code = 10
            OR (la.`project_id` IS NOT NULL AND FIND_IN_SET(la.`project_id`, i_allowed_project_ids) > 0)
            OR (la.`project_id` IS NULL AND la.`company_id` = i_caller_company_id)
          )
      AND (i_company_id        IS NULL OR la.`company_id`   = i_company_id)
      AND (i_project_id        IS NULL OR la.`project_id`   = i_project_id)
      AND (i_table_name        IS NULL OR la.`table_name`   = i_table_name)
      AND (i_target_id         IS NULL OR la.`target_id`    = i_target_id)
      AND (i_action_type       IS NULL OR la.`action_type`  = i_action_type)
      AND (i_from_created_at   IS NULL OR la.`created_at`  >= i_from_created_at)
      AND (i_to_created_at     IS NULL OR la.`created_at`  <= i_to_created_at)
    ORDER BY la.`created_at` DESC
    LIMIT i_page_size OFFSET v_offset;
END$
DELIMITER ;
DROP PROCEDURE IF EXISTS SP_GET_LOG_AUDIT_SYNC_SNAPSHOT;
DELIMITER $
CREATE PROCEDURE SP_GET_LOG_AUDIT_SYNC_SNAPSHOT(
    IN  i_page       INT,  -- 페이지 번호 (1부터)
    IN  i_page_size  INT   -- 페이지 크기
) COMMENT 'rag_server 전체 재구축(부팅 자가치유·build-index-logs) 전용 페이지 조회 - before_json/after_json 포함, 접근제어 없음(내부 배치 전용)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_LOG_AUDIT_SYNC_SNAPSHOT
-- 작성 : 2026-08-16 trisakion
-- 내용 : GET /internal/log-audits(server/) 전용 내부 배치 조회. SP_GET_LOG_AUDIT_LIST와 달리
--        before_json/after_json을 포함하고 역할 스코핑이 없다 - 일반 목록 API가 이 필드를 포함하면
--        UI 목록 응답이 불필요하게 커지므로 의도적으로 별도 SP로 분리했다(SP_GET_LOG_AUDIT 단건
--        조회만 before/after를 포함하던 기존 원칙과 동일).
--        log_audit_id 오름차순 페이지네이션 - rag_server(logAuditReindex.ts)가 total_count를 보고
--        페이지를 끝까지 순회한다(server/ internal.service.ts의 fetchAllActiveApis()와 대칭되는 pull 루프).
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    SELECT 0 AS RESULT;

    SELECT COUNT(*) AS total_count
    FROM `log_audit`;

    SELECT `log_audit_id`, `company_id`, `project_id`, `project_name`,
           `table_name`, `target_id`, `target_name`, `action_type`,
           `before_json`, `after_json`, `created_by_name`, `created_at`
    FROM `log_audit`
    ORDER BY `log_audit_id` ASC
    LIMIT i_page_size OFFSET v_offset;

END$
DELIMITER ;
DROP PROCEDURE IF EXISTS SP_GET_PENDING_LOG_AUDIT_INDEX_SYNC;
DELIMITER $
CREATE PROCEDURE SP_GET_PENDING_LOG_AUDIT_INDEX_SYNC(
    IN  i_limit  INT  -- 한 번에 조회할 최대 건수
) COMMENT 'rag_server 동기화 대기 중인 감사 로그 목록 조회 - sync_id 오름차순(오래된 순), 접근제어 없음(내부 배치 전용)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_PENDING_LOG_AUDIT_INDEX_SYNC
-- 작성 : 2026-08-16 trisakion
-- 내용 : logAuditIndexSync.job.ts(server/) 전용 내부 배치 조회 - 컨트롤러/라우트 없이 job이 직접 호출한다.
--        sync_id 오름차순으로 오래된 순 i_limit건 반환. log_audit이 Append-Only라 같은 log_audit_id가
--        재큐잉되는 경우가 없어(api_index_sync_queue와 달리) updated_at을 함께 반환할 필요가 없다 —
--        SP_DELETE_LOG_AUDIT_INDEX_SYNC는 sync_id만으로 삭제해도 안전하다.
-- --------------------------------- --

    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    SELECT 0 AS RESULT;
    SELECT `sync_id`, `log_audit_id`, `attempt_count`, `last_error`
    FROM `log_audit_index_sync_queue`
    ORDER BY `sync_id` ASC
    LIMIT i_limit;

END$
DELIMITER ;
DROP PROCEDURE IF EXISTS SP_INSERT_LOG_AUDIT;
DELIMITER $
CREATE PROCEDURE SP_INSERT_LOG_AUDIT(
    IN  i_company_id       BIGINT,        -- 회사 ID
    IN  i_project_id       BIGINT,        -- 프로젝트 ID (NULL 허용)
    IN  i_project_name     VARCHAR(100),  -- 프로젝트명 스냅샷 (project_id NULL이면 NULL)
    IN  i_table_name       VARCHAR(100),  -- 대상 테이블명
    IN  i_target_id        VARCHAR(100),  -- 대상 PK (복합키는 JSON 문자열)
    IN  i_target_name      VARCHAR(200),  -- 대상 표시명
    IN  i_action_type      TINYINT,       -- 작업 유형 (10:CREATE, 20:UPDATE, 30:STATUS_CHANGE)
    IN  i_before_json      LONGTEXT,      -- 변경 전 데이터 (CREATE 시 NULL)
    IN  i_after_json       LONGTEXT,      -- 변경 후 데이터
    IN  i_created_by       BIGINT,        -- 작업 수행 사용자 ID
    IN  i_created_by_name  VARCHAR(50)    -- 작업 수행 사용자명 스냅샷
) COMMENT '감사 로그 단건 INSERT - RAG Phase 3 아웃박스 큐 등록을 같은 트랜잭션으로 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_INSERT_LOG_AUDIT
-- 작성 : 2026-06-22 trisakion
-- 수정 : 2026-08-16 trisakion - RAG Phase 3(감사로그 검색). log_audit INSERT 직후 같은 트랜잭션 안에서
--        log_audit_index_sync_queue에도 INSERT한다 — "log_audit 행이 있으면 큐 항목도 반드시 있다"는
--        불변식을 log_audit_id AUTO_INCREMENT 값을 LAST_INSERT_ID()로 그대로 이어받아 보장한다.
--        기존엔 단일 INSERT라 트랜잭션이 없었으나, 이제 두 INSERT를 원자적으로 묶어야 해서
--        START TRANSACTION/COMMIT + EXIT HANDLER FOR SQLEXCEPTION(ROLLBACK)을 추가했다
--        (SP_ISSUE_PROJECT_API_KEY 등 기존 다단계 쓰기 SP와 동일한 관례).
-- 내용 : 감사 로그 단건 INSERT + rag_server 동기화 큐 등록
-- --------------------------------- --

    DECLARE v_log_audit_id  BIGINT;

    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    START TRANSACTION;

        INSERT INTO `log_audit` (
            `company_id`, `project_id`, `project_name`, `table_name`, `target_id`, `target_name`,
            `action_type`, `before_json`, `after_json`, `created_by`, `created_by_name`
        ) VALUES (
            i_company_id, i_project_id, i_project_name, i_table_name, i_target_id, i_target_name,
            i_action_type, i_before_json, i_after_json, i_created_by, i_created_by_name
        );

        SET v_log_audit_id = LAST_INSERT_ID();

        INSERT INTO `log_audit_index_sync_queue` (`log_audit_id`)
        VALUES (v_log_audit_id);

    COMMIT;

    SELECT 0 AS RESULT;
END$
DELIMITER ;
DROP PROCEDURE IF EXISTS SP_MARK_LOG_AUDIT_INDEX_SYNC_FAILED;
DELIMITER $
CREATE PROCEDURE SP_MARK_LOG_AUDIT_INDEX_SYNC_FAILED(
    IN  i_sync_id  BIGINT,       -- 실패 처리할 동기화 큐 ID
    IN  i_error    VARCHAR(500)  -- 실패 사유
) COMMENT 'rag_server 동기화 실패 시 재시도 카운트/사유 갱신 - 접근제어 없음(내부 배치 전용)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_MARK_LOG_AUDIT_INDEX_SYNC_FAILED
-- 작성 : 2026-08-16 trisakion
-- 내용 : logAuditIndexSync.job.ts(server/) 전용 내부 배치 - rag_server push 실패 시 호출.
--        행을 삭제하지 않고 attempt_count 증가 + last_error 갱신만 하여 다음 tick에
--        무기한 재시도한다(별도 dead-letter 없음 - SP_MARK_API_INDEX_SYNC_FAILED와 동일 설계 의도).
-- --------------------------------- --

    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    UPDATE `log_audit_index_sync_queue`
    SET `attempt_count` = `attempt_count` + 1,
        `last_error`    = i_error
    WHERE `sync_id` = i_sync_id;

    SELECT 0 AS RESULT;

END$
DELIMITER ;
