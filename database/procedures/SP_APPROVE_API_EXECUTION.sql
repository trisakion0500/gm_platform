DROP PROCEDURE IF EXISTS SP_APPROVE_API_EXECUTION;
DELIMITER $
CREATE PROCEDURE SP_APPROVE_API_EXECUTION(
    IN  i_api_execution_id  BIGINT,  -- 승인할 실행 이력 ID
    IN  i_approve_user_id   BIGINT,  -- 승인자 user_id
    IN  i_caller_role_code  INT      -- 승인자 역할 코드 (10=SUPER_ADMIN 외에는 대상 프로젝트 실제 권한 재검증)
) COMMENT '실행 승인 - status 10→20, approve_user_id/approved_at 저장, api_base_url/api_key 반환'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_APPROVE_API_EXECUTION
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-15 trisakion - project.api_key(암호문) 반환 추가, callExternalApi가 복호화해 X-API-Key 헤더로 사용
-- 내용 : PENDING(10) → APPROVED(20)
--        실행 이력 없음 → 31009
--        status != 10  → 31009
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER/APPROVER 활성 권한 없음 → 31009 (이력 존재 자체를 숨김)
--        api_base_url/api_key 반환 (서비스에서 HTTP 호출에 사용)
-- 테이블 적용 순서 : api_execution
-- --------------------------------- --

    DECLARE v_now           DATETIME      DEFAULT NOW();
    DECLARE v_status        TINYINT;
    DECLARE v_project_id    BIGINT;
    DECLARE v_api_base_url  VARCHAR(255);
    DECLARE v_api_key       VARCHAR(255);

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

        SELECT ae.`status`, p.`project_id`, p.`api_base_url`, p.`api_key`
        INTO   v_status, v_project_id, v_api_base_url, v_api_key
        FROM `api_execution` ae
        JOIN `api` a ON a.`api_id` = ae.`api_id`
        JOIN `project` p ON p.`project_id` = a.`project_id`
        WHERE ae.`api_execution_id` = i_api_execution_id;

        IF v_status IS NULL THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF v_status != 10 THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            IF NOT EXISTS (
                SELECT 1 FROM `user_role` ur
                WHERE ur.`user_id`    = i_approve_user_id
                  AND ur.`project_id` = v_project_id
                  AND ur.`status`     = 1
                  AND ur.`role_code`  IN (20, 30)
            ) THEN
                SELECT 31009 AS RESULT;
                LEAVE transaction_block;
            END IF;
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
                SELECT 31009 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT ae.`api_execution_id`, ae.`api_id`, ae.`api_name`, ae.`endpoint`, ae.`is_required_approval`,
               ae.`request_user_id`, ae.`approve_user_id`, ae.`status`,
               ae.`request_json`, ae.`response_data`, ae.`reject_reason`, ae.`error_message`,
               ae.`requested_at`, ae.`approved_at`, ae.`executed_at`, ae.`updated_at`,
               v_api_base_url AS api_base_url, v_api_key AS api_key
        FROM `api_execution` ae
        WHERE ae.`api_execution_id` = i_api_execution_id;

    END;

END$

DELIMITER ;
