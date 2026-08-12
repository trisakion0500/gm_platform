DROP PROCEDURE IF EXISTS SP_DELETE_API_INDEX_SYNC;
DELIMITER $
CREATE PROCEDURE SP_DELETE_API_INDEX_SYNC(
    IN  i_sync_id  BIGINT  -- 삭제할 동기화 큐 ID
) COMMENT 'rag_server 동기화 성공 후 큐 행 삭제 - 접근제어 없음(내부 배치 전용)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_DELETE_API_INDEX_SYNC
-- 작성 : 2026-08-12 trisakion
-- 내용 : apiIndexSync.job.ts(server/) 전용 내부 배치 - rag_server push 성공 시 호출.
--        이미 삭제된 sync_id(ROW_COUNT=0)여도 오류로 취급하지 않는다 - 워커가 재시도 중 중복
--        삭제를 시도해도 안전해야 하기 때문(다른 SP들의 "ROW_COUNT()=0 체크" 관례와 달리
--        여기서는 idempotent 삭제가 정확한 의미).
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

    DELETE FROM `api_index_sync_queue` WHERE `sync_id` = i_sync_id;

    SELECT 0 AS RESULT;

END$

DELIMITER ;
