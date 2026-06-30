DROP PROCEDURE IF EXISTS SP_UPDATE_CODE_ITEM;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_CODE_ITEM(
    IN  i_code_item_id   BIGINT,        -- 수정할 코드 아이템 ID
    IN  i_code_name      VARCHAR(200),  -- 코드명 (NULL=변경 없음)
    IN  i_description    VARCHAR(1000), -- 설명 (NULL=변경 없음)
    IN  i_display_order  INT,           -- 표시 순서 (NULL=변경 없음)
    IN  i_status         TINYINT,       -- 상태 (NULL=변경 없음)
    IN  i_updated_by     BIGINT         -- 수정자 user_id
) COMMENT '코드 아이템 수정 - code_item UPDATE'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_CODE_ITEM
-- 작성 : 2026-06-29 trisakion
-- 내용 : 코드 아이템 수정
--        code_item 존재 검사 (31005)
--        NULL 입력 시 기존 값 유지 (COALESCE)
--        code_group_id, code_value 수정 불가
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

        IF NOT EXISTS (SELECT 1 FROM `code_item` WHERE `code_item_id` = i_code_item_id) THEN
            SELECT 31005 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `code_item`
            SET `code_name`     = COALESCE(i_code_name,     `code_name`),
                `description`   = COALESCE(i_description,   `description`),
                `display_order` = COALESCE(i_display_order, `display_order`),
                `status`        = COALESCE(i_status,        `status`),
                `updated_by`    = i_updated_by
            WHERE `code_item_id` = i_code_item_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `code_item_id`, `code_group_id`, `code_value`, `code_name`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_item`
        WHERE `code_item_id` = i_code_item_id;

    END;

END$

DELIMITER ;
