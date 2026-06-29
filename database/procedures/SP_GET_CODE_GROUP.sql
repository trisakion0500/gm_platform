DROP PROCEDURE IF EXISTS SP_GET_CODE_GROUP;

DELIMITER $

CREATE PROCEDURE SP_GET_CODE_GROUP(
    IN  i_code_group_id  INT  -- 코드 그룹 ID
)
COMMENT '코드 그룹 단건 조회'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CODE_GROUP
-- 작성 : 2026-06-29 trisakion
-- 내용 : code_group_id로 단건 조회
--        존재하지 않으면 31004 반환
-- --------------------------------- --

    DECLARE v_not_found    TINYINT       DEFAULT 0;
    DECLARE v_id           INT           DEFAULT NULL;
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
    DECLARE CONTINUE HANDLER FOR NOT FOUND
    BEGIN
        SET v_not_found = 1;
    END;

    transaction_block: BEGIN

        SELECT `code_group_id`
        INTO   v_id
        FROM   `code_group`
        WHERE  `code_group_id` = i_code_group_id;

        IF v_not_found = 1 THEN
            SELECT 31004 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT `code_group_id`, `project_id`, `code_group_code`, `code_group_name`,
               `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_group`
        WHERE `code_group_id` = i_code_group_id;

    END;

END$

DELIMITER ;
