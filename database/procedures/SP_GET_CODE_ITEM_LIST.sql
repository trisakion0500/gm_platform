DROP PROCEDURE IF EXISTS SP_GET_CODE_ITEM_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_CODE_ITEM_LIST(
    IN  i_code_group_id      INT,      -- 코드 그룹 ID
    IN  i_status             TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_caller_role_code   INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id     BIGINT    -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사)
) COMMENT '코드 아이템 목록 조회 - 역할별 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CODE_ITEM_LIST
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 내용 : 코드 아이템 목록 조회
--        SUPER_ADMIN(10) : 해당 코드 그룹 전체 조회
--        일반 사용자     : 코드 그룹 소속 프로젝트에 user_role 등록된 경우만 조회 (그 외엔 빈 목록)
--        status 필터 nullable
--        정렬 : status DESC, display_order ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT ci.`code_item_id`, ci.`code_group_id`, ci.`code_value`, ci.`code_name`,
           ci.`description`, ci.`display_order`, ci.`status`, ci.`created_by`, ci.`updated_by`, ci.`created_at`, ci.`updated_at`
    FROM `code_item` ci
    JOIN `code_group` g ON g.`code_group_id` = ci.`code_group_id`
    WHERE ci.`code_group_id` = i_code_group_id
      AND (i_status IS NULL OR ci.`status` = i_status)
      AND (i_caller_role_code = 10 OR EXISTS (
              SELECT 1 FROM `user_role` ur
              WHERE ur.`user_id`    = i_caller_user_id
                AND ur.`project_id` = g.`project_id`
                AND ur.`status`     = 1
          ))
    ORDER BY ci.`status` DESC, ci.`display_order` ASC;

END$

DELIMITER ;
