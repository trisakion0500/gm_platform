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
