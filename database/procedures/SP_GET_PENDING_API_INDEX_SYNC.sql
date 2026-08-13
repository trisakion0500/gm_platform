DROP PROCEDURE IF EXISTS SP_GET_PENDING_API_INDEX_SYNC;
DELIMITER $
CREATE PROCEDURE SP_GET_PENDING_API_INDEX_SYNC(
    IN  i_limit  INT  -- 한 번에 조회할 최대 건수
) COMMENT 'rag_server 동기화 대기 중인 API 목록 조회 - sync_id 오름차순(오래된 순), 접근제어 없음(내부 배치 전용)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_PENDING_API_INDEX_SYNC
-- 작성 : 2026-08-12 trisakion
-- 수정 : 2026-08-13 trisakion - updated_at을 함께 반환하도록 변경. 워커가 이 값을 그대로
--        SP_DELETE_API_INDEX_SYNC의 i_expected_updated_at으로 넘겨, 조회 이후 도메인 SP가
--        같은 sync_id를 재큐잉(ON DUPLICATE KEY UPDATE)했는지 삭제 시점에 재검증할 수 있게 한다.
-- 내용 : apiIndexSync.job.ts(server/) 전용 내부 배치 조회 - 컨트롤러/라우트 없이 job이 직접 호출한다.
--        sync_id 오름차순으로 오래된 순 i_limit건 반환
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
    SELECT `sync_id`, `api_id`, `attempt_count`, `last_error`, `updated_at`
    FROM `api_index_sync_queue`
    ORDER BY `sync_id` ASC
    LIMIT i_limit;

END$

DELIMITER ;
