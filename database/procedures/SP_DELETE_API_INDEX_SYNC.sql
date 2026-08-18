DROP PROCEDURE IF EXISTS SP_DELETE_API_INDEX_SYNC;
DELIMITER $
CREATE PROCEDURE SP_DELETE_API_INDEX_SYNC(
    IN  i_sync_id             BIGINT,    -- 삭제할 동기화 큐 ID
    IN  i_expected_updated_at DATETIME   -- 워커가 SP_GET_PENDING_API_INDEX_SYNC 조회 시점에 읽은 updated_at (낙관적 동시성 가드)
) COMMENT 'rag_server 동기화 성공 후 큐 행 삭제 - 접근제어 없음(내부 배치 전용)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_DELETE_API_INDEX_SYNC
-- 작성 : 2026-08-12 trisakion
-- 수정 : 2026-08-13 trisakion - i_expected_updated_at 가드 추가. 워커가 조회(SELECT)한 뒤
--        rag_server에 push하는 사이(왕복 시간 동안) 도메인 SP가 같은 api_id를 다시 수정하면
--        ON DUPLICATE KEY UPDATE로 같은 sync_id 행이 "최신 변경 대기"로 재큐잉된다 - 이 가드
--        없이 sync_id만으로 삭제하면, 워커가 방금 push한(구버전) 데이터를 성공으로 착각하고
--        재큐잉된 최신 변경 요청까지 함께 지워버려 그 변경분이 gm_apis에 영영 반영되지 않는
--        레이스가 있었다. WHERE에 updated_at을 함께 걸어, 조회 이후 재큐잉된 행(ROW_COUNT=0)은
--        삭제하지 않고 다음 tick이 최신 데이터로 재처리하도록 남겨둔다.
-- 내용 : apiIndexSync.job.ts(server/) 전용 내부 배치 - rag_server push 성공 시 호출.
--        ROW_COUNT=0(이미 삭제됐거나, 조회 이후 재큐잉되어 updated_at이 달라진 경우) 이어도
--        오류로 취급하지 않는다 - 두 경우 모두 "지금 이 삭제는 하지 않는 게 맞다"는 뜻이라
--        워커 입장에서는 성공(RESULT=0)과 동일하게 처리하면 된다(다른 SP들의 "ROW_COUNT()=0 체크
--        시 오류 반환" 관례와 달리, 여기서는 idempotent/재큐잉 감지 둘 다 조용히 넘어가는 것이
--        정확한 의미).
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

    DELETE FROM `api_index_sync_queue`
    WHERE `sync_id` = i_sync_id
      AND `updated_at` = i_expected_updated_at;

    SELECT 0 AS RESULT;

END$

DELIMITER ;
