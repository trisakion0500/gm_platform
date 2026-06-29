DROP PROCEDURE IF EXISTS SP_GET_ACTIVE_CODE_ITEMS;

DELIMITER $

CREATE PROCEDURE SP_GET_ACTIVE_CODE_ITEMS(
    IN  i_code_group_id  INT  -- 코드 그룹 ID
)
COMMENT 'API Request 렌더링용 활성 코드 아이템 조회 (code_value, code_name만 반환)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_ACTIVE_CODE_ITEMS
-- 작성 : 2026-06-29 trisakion
-- 내용 : SELECT/RADIO/CHECKBOX 컴포넌트 렌더링용
--        status=1 아이템만 반환
--        code_value, code_name만 반환
--        정렬 : display_order ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT `code_value`, `code_name`
    FROM `code_item`
    WHERE `code_group_id` = i_code_group_id
      AND `status` = 1
    ORDER BY `display_order` ASC;

END$

DELIMITER ;
