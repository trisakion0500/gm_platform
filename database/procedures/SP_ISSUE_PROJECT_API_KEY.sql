DROP PROCEDURE IF EXISTS SP_ISSUE_PROJECT_API_KEY;
DELIMITER $
CREATE PROCEDURE SP_ISSUE_PROJECT_API_KEY(
    IN  i_project_id      BIGINT,        -- 대상 프로젝트 ID
    IN  i_encrypted_key   VARCHAR(255)   -- 서비스 레이어에서 AES-256-CBC로 암호화한 api_key
) COMMENT '프로젝트 X-API-Key 발급/재발급 - project.api_key UPDATE (기존 키 덮어씀)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_ISSUE_PROJECT_API_KEY
-- 작성 : 2026-07-15 trisakion
-- 내용 : GM Platform이 대상 서버 호출용 X-API-Key를 발급/재발급
--        project 존재 검사 후 api_key UPDATE (재발급 시 기존 암호문 덮어씀)
--        평문은 서비스 레이어가 호출 직전에 생성해 응답에만 1회 실어보내고, 이 SP는 암호문만 다룬다
--        수정된 project 전체 정보 반환 (company 정보 포함, has_api_key=1 확정)
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
            SET `api_key` = i_encrypted_key
            WHERE `project_id` = i_project_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT p.`project_id`, p.`company_id`, c.`company_code`, c.`company_name`,
               p.`project_code`, p.`project_name`, p.`api_base_url`, p.`description`,
               p.`status`, IF(p.`api_key` IS NOT NULL, 1, 0) AS has_api_key,
               p.`created_at`, p.`updated_at`
        FROM `project` p
        JOIN `company` c ON c.`company_id` = p.`company_id`
        WHERE p.`project_id` = i_project_id;

    END;

END$

DELIMITER ;
