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
        ROLLBACK;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    DELETE FROM `log_audit_index_sync_queue`
    WHERE `sync_id` = i_sync_id;

    SELECT 0 AS RESULT;

END$
DELIMITER ;
