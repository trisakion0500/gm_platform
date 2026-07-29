DROP PROCEDURE IF EXISTS SP_UPDATE_API_EXECUTION_RESULT;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_API_EXECUTION_RESULT(
    IN  i_api_execution_id  BIGINT,        -- 대상 실행 이력 ID
    IN  i_status            TINYINT,       -- 40=SUCCESS, 50=FAILED
    IN  i_response_data     LONGTEXT,      -- 응답 데이터 (실패 시 NULL)
    IN  i_error_message     VARCHAR(2000)  -- 에러 메시지 (성공 시 NULL)
) COMMENT 'API 실행 결과 반영 - status 10/20→40/50, 이미 종결된 건은 31009로 스킵'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_API_EXECUTION_RESULT
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-29 trisakion - status IN (10,20) 가드 + ROW_COUNT() 체크 추가.
--        즉시실행 대기 중 사용자가 취소(10→60)하면 이 SP가 뒤늦게 도착한 HTTP 응답으로
--        status를 다시 40/50으로 덮어써 CANCELED가 사라지는 레이스가 있었음 — 가드 없이
--        무조건 UPDATE하던 것이 원인.
-- 내용 : HTTP 호출 결과를 api_execution 에 반영
--        status → 40(SUCCESS) 또는 50(FAILED)
--        executed_at = NOW()
--        대상 status가 10(PENDING, 즉시실행) 또는 20(APPROVED, 승인 후 실행)이 아니면
--        (취소·반려 등으로 이미 종결) 갱신하지 않고 31009 반환
-- 테이블 적용 순서 : api_execution
-- --------------------------------- --

    DECLARE v_now          DATETIME      DEFAULT NOW();

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

    transaction_block: BEGIN

        START TRANSACTION;

            UPDATE `api_execution`
            SET `status`        = i_status,
                `response_data` = i_response_data,
                `error_message` = i_error_message,
                `executed_at`   = v_now,
                `updated_at`    = v_now
            WHERE `api_execution_id` = i_api_execution_id
              AND `status` IN (10, 20);

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 31009 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;

    END;

END$

DELIMITER ;
