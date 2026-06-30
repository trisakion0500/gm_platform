DROP PROCEDURE IF EXISTS SP_CANCEL_API_EXECUTION;
DELIMITER $
CREATE PROCEDURE SP_CANCEL_API_EXECUTION(
    IN  i_api_execution_id  BIGINT,        -- 취소할 실행 이력 ID
    IN  i_caller_user_id    BIGINT,        -- 취소 요청자 user_id (본인 검증용)
    IN  i_reject_reason     VARCHAR(1000)  -- 취소 사유
) COMMENT '실행 취소 - status 10→60, 요청자 본인만 가능'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CANCEL_API_EXECUTION
-- 작성 : 2026-06-30 trisakion
-- 내용 : PENDING(10) → CANCELED(60)
--        실행 이력 없음 → 31009
--        status != 10  → 31009
--        본인 아닌 취소 → 31009
-- 테이블 적용 순서 : api_execution
-- --------------------------------- --

    DECLARE v_now              DATETIME  DEFAULT NOW();
    DECLARE v_status           TINYINT;
    DECLARE v_request_user_id  BIGINT;

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

        SELECT `status`, `request_user_id`
        INTO   v_status, v_request_user_id
        FROM `api_execution`
        WHERE `api_execution_id` = i_api_execution_id;

        IF v_status IS NULL THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF v_status != 10 THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF v_request_user_id != i_caller_user_id THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `api_execution`
            SET `status`        = 60,
                `reject_reason` = i_reject_reason,
                `updated_at`    = v_now
            WHERE `api_execution_id` = i_api_execution_id
              AND `status` = 10;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 31009 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `api_execution_id`, `api_id`, `api_name`, `endpoint`,
               `request_user_id`, `approve_user_id`, `status`,
               `request_json`, `response_data`, `reject_reason`, `error_message`,
               `requested_at`, `approved_at`, `executed_at`, `updated_at`
        FROM `api_execution`
        WHERE `api_execution_id` = i_api_execution_id;

    END;

END$

DELIMITER ;
