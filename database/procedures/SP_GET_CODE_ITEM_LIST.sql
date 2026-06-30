DROP PROCEDURE IF EXISTS SP_GET_CODE_ITEM_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_CODE_ITEM_LIST(
    IN  i_code_group_id  INT,     -- 코드 그룹 ID
    IN  i_status         TINYINT  -- 상태 필터 (NULL=전체)
) COMMENT '코드 아이템 목록 조회'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CODE_ITEM_LIST
-- 작성 : 2026-06-29 trisakion
-- 내용 : 코드 아이템 목록 조회
--        status 필터 nullable
--        정렬 : status DESC, display_order ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT `code_item_id`, `code_group_id`, `code_value`, `code_name`,
           `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
    FROM `code_item`
    WHERE `code_group_id` = i_code_group_id
      AND (i_status IS NULL OR `status` = i_status)
    ORDER BY `status` DESC, `display_order` ASC;

END$

DELIMITER ;
