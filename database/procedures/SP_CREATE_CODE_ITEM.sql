DROP PROCEDURE IF EXISTS SP_CREATE_CODE_ITEM;
DELIMITER $
CREATE PROCEDURE SP_CREATE_CODE_ITEM(
    IN  i_code_group_id  INT,            -- 코드 그룹 ID
    IN  i_code_value     VARCHAR(100),   -- 코드 값 (그룹 내 유일)
    IN  i_code_name      VARCHAR(200),   -- 코드명
    IN  i_description    VARCHAR(1000),  -- 설명 (NULL 허용)
    IN  i_display_order  INT,            -- 표시 순서
    IN  i_created_by     BIGINT          -- 생성자 user_id
) COMMENT '코드 아이템 등록 - code_item INSERT'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_CODE_ITEM
-- 작성 : 2026-06-29 trisakion
-- 내용 : 코드 아이템 등록
--        code_group 존재 검사 (31004)
--        code_value 그룹 내 중복 검사 (32001)
-- 테이블 적용 순서 : code_item
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

        IF NOT EXISTS (SELECT 1 FROM `code_group` WHERE `code_group_id` = i_code_group_id AND `status` = 1) THEN
            SELECT 31004 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF EXISTS (SELECT 1 FROM `code_item` WHERE `code_group_id` = i_code_group_id AND `code_value` = i_code_value) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `code_item` (`code_group_id`, `code_value`, `code_name`, `description`, `display_order`, `status`, `created_by`, `updated_by`)
            VALUES (i_code_group_id, i_code_value, i_code_name, i_description, i_display_order, 1, i_created_by, i_created_by);

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `code_item_id`, `code_group_id`, `code_value`, `code_name`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_item`
        WHERE `code_item_id` = LAST_INSERT_ID();

    END;

END$

DELIMITER ;
