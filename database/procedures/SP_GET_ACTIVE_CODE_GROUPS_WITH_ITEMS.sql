DROP PROCEDURE IF EXISTS SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS;
DELIMITER $
CREATE PROCEDURE SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS(
    IN  i_project_id  BIGINT  -- 프로젝트 ID
) COMMENT 'API Request/Response 렌더링용 - 프로젝트의 활성 코드그룹 + 활성 아이템 일괄 조회'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS
-- 작성 : 2026-07-04 trisakion
-- 내용 : 프로젝트 단위로 활성(status=1) 코드그룹과 각 그룹의 활성 아이템을 한 번에 조회
--        아이템이 없는 그룹도 포함(LEFT JOIN)
--        정렬 : code_group_name ASC, display_order ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT cg.`code_group_id`, cg.`code_group_code`, cg.`code_group_name`,
           ci.`code_value`, ci.`code_name`
    FROM `code_group` cg
    LEFT JOIN `code_item` ci ON ci.`code_group_id` = cg.`code_group_id` AND ci.`status` = 1
    WHERE cg.`project_id` = i_project_id
      AND cg.`status` = 1
    ORDER BY cg.`code_group_name` ASC, ci.`display_order` ASC;

END$

DELIMITER ;
