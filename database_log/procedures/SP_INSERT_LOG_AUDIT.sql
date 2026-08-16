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
