DROP PROCEDURE IF EXISTS SP_GET_API_EXECUTION;
DELIMITER $
CREATE PROCEDURE SP_GET_API_EXECUTION(
    IN  i_api_execution_id    BIGINT,  -- 조회할 실행 이력 ID
    IN  i_caller_role_code    INT,     -- 요청자 역할 코드
    IN  i_caller_user_id      BIGINT,  -- 요청자 user_id (OPERATOR 가시성 검사용)
    IN  i_caller_company_id   BIGINT   -- 요청자 company_id (접근 검사용)
) COMMENT 'API 실행 이력 상세 조회 - 역할별 가시성 검사'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_EXECUTION
-- 작성 : 2026-06-30 trisakion
-- 내용 : API 실행 이력 상세 조회
--        OPERATOR(40) : 본인 요청 건만 조회 가능 (31009)
--        비SUPER_ADMIN : 자신의 company 프로젝트만 조회 가능 (20001)
-- --------------------------------- --

    DECLARE v_request_user_id     BIGINT;
    DECLARE v_project_company_id  BIGINT;

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

    transaction_block: BEGIN

        SELECT ae.`request_user_id`, p.`company_id`
        INTO   v_request_user_id, v_project_company_id
        FROM `api_execution` ae
        JOIN `api` a ON a.`api_id` = ae.`api_id`
        JOIN `project` p ON p.`project_id` = a.`project_id`
        WHERE ae.`api_execution_id` = i_api_execution_id;

        IF v_project_company_id IS NULL THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code = 40 AND v_request_user_id != i_caller_user_id THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 AND v_project_company_id != i_caller_company_id THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT ae.`api_execution_id`, ae.`api_id`, ae.`api_name`, ae.`endpoint`, ae.`is_required_approval`,
               ae.`request_user_id`, u1.`user_name` AS `request_user_name`, u2.`user_name` AS `approve_user_name`, ae.`status`,
               ae.`request_json`, ae.`response_data`, ae.`reject_reason`, ae.`error_message`,
               ae.`requested_at`, ae.`approved_at`, ae.`executed_at`, ae.`updated_at`
        FROM `api_execution` ae
        LEFT JOIN `user` u1 ON u1.`user_id` = ae.`request_user_id`
        LEFT JOIN `user` u2 ON u2.`user_id` = ae.`approve_user_id`
        WHERE ae.`api_execution_id` = i_api_execution_id;

    END;

END$

DELIMITER ;
