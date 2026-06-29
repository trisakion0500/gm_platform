DROP PROCEDURE IF EXISTS SP_CREATE_CODE_GROUP;

DELIMITER $

CREATE PROCEDURE SP_CREATE_CODE_GROUP(
    IN  i_project_id        BIGINT,        -- 프로젝트 ID
    IN  i_code_group_code   VARCHAR(100),  -- 코드 그룹 코드 (프로젝트 내 유일)
    IN  i_code_group_name   VARCHAR(200),  -- 코드 그룹명
    IN  i_description       VARCHAR(1000), -- 설명 (NULL 허용)
    IN  i_created_by        BIGINT         -- 생성자 user_id
)
COMMENT '코드 그룹 등록 - code_group INSERT'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_CODE_GROUP
-- 작성 : 2026-06-29 trisakion
-- 내용 : 코드 그룹 등록
--        project 존재 검사 (31002)
--        code_group_code 프로젝트 내 중복 검사 (32001)
-- 테이블 적용 순서 : code_group
-- --------------------------------- --

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

        IF NOT EXISTS (SELECT 1 FROM `project` WHERE `project_id` = i_project_id AND `status` = 1) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF EXISTS (SELECT 1 FROM `code_group` WHERE `project_id` = i_project_id AND `code_group_code` = i_code_group_code) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `code_group` (`project_id`, `code_group_code`, `code_group_name`, `description`, `status`, `created_by`, `updated_by`)
            VALUES (i_project_id, i_code_group_code, i_code_group_name, i_description, 1, i_created_by, i_created_by);

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `code_group_id`, `project_id`, `code_group_code`, `code_group_name`,
               `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_group`
        WHERE `code_group_id` = LAST_INSERT_ID();

    END;

END$

DELIMITER ;
