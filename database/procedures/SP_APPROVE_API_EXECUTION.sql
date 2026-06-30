DROP PROCEDURE IF EXISTS SP_APPROVE_API_EXECUTION;
DELIMITER $
CREATE PROCEDURE SP_APPROVE_API_EXECUTION(
    IN  i_api_execution_id  BIGINT,  -- 승인할 실행 이력 ID
    IN  i_approve_user_id   BIGINT   -- 승인자 user_id
) COMMENT '실행 승인 - status 10→20, approve_user_id/approved_at 저장, api_base_url 반환'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_APPROVE_API_EXECUTION
-- 작성 : 2026-06-30 trisakion
-- 내용 : PENDING(10) → APPROVED(20)
--        실행 이력 없음 → 31009
--        status != 10  → 30003
--        api_base_url 반환 (서비스에서 HTTP 호출에 사용)
-- 테이블 적용 순서 : api_execution
-- --------------------------------- --

    DECLARE v_now           DATETIME      DEFAULT NOW();
    DECLARE v_status        TINYINT;
    DECLARE v_api_base_url  VARCHAR(255);

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

        SELECT ae.`status`, p.`api_base_url`
        INTO   v_status, v_api_base_url
        FROM `api_execution` ae
        JOIN `api` a ON a.`api_id` = ae.`api_id`
        JOIN `project` p ON p.`project_id` = a.`project_id`
        WHERE ae.`api_execution_id` = i_api_execution_id;

        IF v_status IS NULL THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF v_status != 10 THEN
            SELECT 30003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `api_execution`
            SET `status`          = 20,
                `approve_user_id` = i_approve_user_id,
                `approved_at`     = v_now,
                `updated_at`      = v_now
            WHERE `api_execution_id` = i_api_execution_id
              AND `status` = 10;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 30003 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT ae.`api_execution_id`, ae.`api_id`, ae.`api_name`, ae.`endpoint`,
               ae.`request_user_id`, ae.`approve_user_id`, ae.`status`,
               ae.`request_json`, ae.`response_data`, ae.`reject_reason`, ae.`error_message`,
               ae.`requested_at`, ae.`approved_at`, ae.`executed_at`, ae.`updated_at`,
               v_api_base_url AS api_base_url
        FROM `api_execution` ae
        WHERE ae.`api_execution_id` = i_api_execution_id;

    END;

END$

DELIMITER ;
