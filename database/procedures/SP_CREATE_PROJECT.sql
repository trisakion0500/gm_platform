DROP PROCEDURE IF EXISTS SP_CREATE_PROJECT;

DELIMITER $

CREATE PROCEDURE SP_CREATE_PROJECT(
    IN  i_company_id    BIGINT,        -- 회사 ID
    IN  i_project_code  VARCHAR(20),   -- 프로젝트 코드
    IN  i_project_name  VARCHAR(100),  -- 프로젝트명
    IN  i_api_base_url  VARCHAR(255),  -- API Base URL
    IN  i_description   VARCHAR(1000)  -- 설명 (NULL 허용)
)
COMMENT '프로젝트 생성 - project 테이블 INSERT'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_PROJECT
-- 작성 : 2026-06-29 trisakion
-- 내용 : 프로젝트 생성 처리
--        company 존재 검사 후 project_code 중복 검사 (동일 company 내)
--        생성된 project 전체 정보 반환 (company 정보 포함)
-- 테이블 적용 순서 : project
-- --------------------------------- --

    DECLARE v_project_id    BIGINT        DEFAULT NULL;
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

        IF NOT EXISTS (SELECT 1 FROM `company` WHERE `company_id` = i_company_id AND `status` = 1) THEN
            SELECT 31001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF EXISTS (SELECT 1 FROM `project` WHERE `company_id` = i_company_id AND `project_code` = i_project_code) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `project` (`company_id`, `project_code`, `project_name`, `api_base_url`, `description`, `status`)
            VALUES (i_company_id, i_project_code, i_project_name, i_api_base_url, i_description, 1);

            SET v_project_id = LAST_INSERT_ID();

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT p.`project_id`, p.`company_id`, c.`company_code`, c.`company_name`,
               p.`project_code`, p.`project_name`, p.`api_base_url`, p.`description`,
               p.`status`, p.`created_at`, p.`updated_at`
        FROM `project` p
        JOIN `company` c ON c.`company_id` = p.`company_id`
        WHERE p.`project_id` = v_project_id;

    END;

END$

DELIMITER ;
