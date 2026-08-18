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
        ROLLBACK;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    SELECT 0 AS RESULT;
    SELECT `sync_id`, `log_audit_id`, `attempt_count`, `last_error`
    FROM `log_audit_index_sync_queue`
    ORDER BY `sync_id` ASC
    LIMIT i_limit;

END$
DELIMITER ;
