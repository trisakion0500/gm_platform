DROP PROCEDURE IF EXISTS SP_UPDATE_PROJECT_CONNECTION;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_PROJECT_CONNECTION(
    IN  i_project_id    BIGINT,       -- 수정할 프로젝트 ID
    IN  i_api_base_url  VARCHAR(255)  -- 변경할 API Base URL
) COMMENT '프로젝트 연결 정보(api_base_url) 수정 - project 테이블 UPDATE'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_PROJECT_CONNECTION
-- 작성 : 2026-07-15 trisakion
-- 내용 : 프로젝트의 api_base_url만 수정 (project_code/project_name/description/status는 SP_UPDATE_PROJECT 전용)
--        project 존재 검사 후 UPDATE
--        SUPER_ADMIN 외에 DEVELOPER도 호출 가능한 라우트라 project_code 등 정체성 필드와 SP 자체를 분리해둠
--        수정된 project 전체 정보 반환 (company 정보 포함)
-- 테이블 적용 순서 : project
-- --------------------------------- --

    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
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

        IF NOT EXISTS (SELECT 1 FROM `project` WHERE `project_id` = i_project_id) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `project`
            SET `api_base_url` = i_api_base_url
            WHERE `project_id` = i_project_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT p.`project_id`, p.`company_id`, c.`company_code`, c.`company_name`,
               p.`project_code`, p.`project_name`, p.`api_base_url`, p.`description`,
               p.`status`, p.`created_at`, p.`updated_at`
        FROM `project` p
        JOIN `company` c ON c.`company_id` = p.`company_id`
        WHERE p.`project_id` = i_project_id;

    END;

END$

DELIMITER ;
