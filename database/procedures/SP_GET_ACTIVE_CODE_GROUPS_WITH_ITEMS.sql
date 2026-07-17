DROP PROCEDURE IF EXISTS SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS;
DELIMITER $
CREATE PROCEDURE SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS(
    IN  i_project_id         BIGINT,  -- 프로젝트 ID
    IN  i_caller_role_code   INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id     BIGINT   -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사용)
) COMMENT 'API Request/Response 렌더링용 - 프로젝트의 활성 코드그룹 + 활성 아이템 일괄 조회, 프로젝트 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS
-- 작성 : 2026-07-04 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-17 trisakion - 미권한 시 빈 목록 대신 20001 반환, 가드절을 최상단으로 이동
-- 내용 : 프로젝트 단위로 활성(status=1) 코드그룹과 각 그룹의 활성 아이템을 한 번에 조회
--        SUPER_ADMIN(10) : 전체 조회 가능
--        그 외           : 해당 프로젝트에 활성 user_role이 없으면 20001
--        아이템이 없는 그룹도 포함(LEFT JOIN)
--        정렬 : code_group_name ASC, display_order ASC
-- --------------------------------- --

    proc_block: BEGIN

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, i_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT cg.`code_group_id`, cg.`code_group_code`, cg.`code_group_name`,
               ci.`code_value`, ci.`code_name`
        FROM `code_group` cg
        LEFT JOIN `code_item` ci ON ci.`code_group_id` = cg.`code_group_id` AND ci.`status` = 1
        WHERE cg.`project_id` = i_project_id
          AND cg.`status` = 1
        ORDER BY cg.`code_group_name` ASC, ci.`display_order` ASC;

    END;

END$

DELIMITER ;
