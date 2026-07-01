DROP PROCEDURE IF EXISTS SP_GET_LOG_AUDIT;
DELIMITER $
CREATE PROCEDURE SP_GET_LOG_AUDIT(
    IN  i_log_audit_id       BIGINT,  -- 감사 로그 ID
    IN  i_caller_role_code   INT,     -- 요청자 역할 코드
    IN  i_caller_company_id  BIGINT   -- 요청자 company_id (DEVELOPER/APPROVER 스코핑용)
) COMMENT '감사 로그 단건 조회 - before_json, after_json 포함'
BEGIN
    check_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `log_audit`
            WHERE `log_audit_id` = i_log_audit_id
              AND (i_caller_role_code = 10 OR `company_id` = i_caller_company_id)
        ) THEN
            SELECT 31010 AS RESULT;
            LEAVE check_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT `log_audit_id`, `company_id`, `project_id`, `table_name`,
               `target_id`, `target_name`, `action_type`,
               `before_json`, `after_json`, `created_by`, `created_at`
        FROM `log_audit`
        WHERE `log_audit_id` = i_log_audit_id;

    END;

END$
DELIMITER ;
