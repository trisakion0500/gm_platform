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
