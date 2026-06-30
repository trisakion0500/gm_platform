DROP PROCEDURE IF EXISTS SP_UPDATE_API_EXECUTION_RESULT;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_API_EXECUTION_RESULT(
    IN  i_api_execution_id  BIGINT,
    IN  i_status            TINYINT,       -- 40=SUCCESS, 50=FAILED
    IN  i_response_data     LONGTEXT,      -- NULL if failed
    IN  i_error_message     VARCHAR(2000)  -- NULL if success
) COMMENT 'API 실행 결과 반영 - status 40/50, response_data/error_message 저장'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_API_EXECUTION_RESULT
-- 작성 : 2026-06-30 trisakion
-- 내용 : HTTP 호출 결과를 api_execution 에 반영
--        status → 40(SUCCESS) 또는 50(FAILED)
--        executed_at = NOW()
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

    START TRANSACTION;

        UPDATE `api_execution`
        SET `status`        = i_status,
            `response_data` = i_response_data,
            `error_message` = i_error_message,
            `executed_at`   = v_now,
            `updated_at`    = v_now
        WHERE `api_execution_id` = i_api_execution_id;

    COMMIT;

    SELECT 0 AS RESULT;

END$

DELIMITER ;
