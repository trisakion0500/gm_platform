DROP PROCEDURE IF EXISTS SP_INSERT_LOG_AUDIT;
DELIMITER $
CREATE PROCEDURE SP_INSERT_LOG_AUDIT(
    IN  i_company_id   BIGINT,        -- 회사 ID
    IN  i_project_id   BIGINT,        -- 프로젝트 ID (NULL 허용)
    IN  i_table_name   VARCHAR(100),  -- 대상 테이블명
    IN  i_target_id    VARCHAR(100),  -- 대상 PK (복합키는 JSON 문자열)
    IN  i_target_name  VARCHAR(200),  -- 대상 표시명
    IN  i_action_type  TINYINT,       -- 작업 유형 (10:CREATE, 20:UPDATE, 30:STATUS_CHANGE)
    IN  i_before_json  LONGTEXT,      -- 변경 전 데이터 (CREATE 시 NULL)
    IN  i_after_json   LONGTEXT,      -- 변경 후 데이터
    IN  i_created_by   BIGINT         -- 작업 수행 사용자 ID
) COMMENT '감사 로그 단건 INSERT'
BEGIN
    INSERT INTO `log_audit` (
        `company_id`, `project_id`, `table_name`, `target_id`, `target_name`,
        `action_type`, `before_json`, `after_json`, `created_by`
    ) VALUES (
        i_company_id, i_project_id, i_table_name, i_target_id, i_target_name,
        i_action_type, i_before_json, i_after_json, i_created_by
    );
    SELECT 0 AS RESULT;
END$
DELIMITER ;
