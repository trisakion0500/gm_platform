DROP PROCEDURE IF EXISTS SP_GET_ACTIVE_CODE_ITEMS;
DELIMITER $
CREATE PROCEDURE SP_GET_ACTIVE_CODE_ITEMS(
    IN  i_code_group_id     INT,   -- 코드 그룹 ID
    IN  i_caller_role_code  INT,   -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id    BIGINT -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사용)
) COMMENT 'API Request 렌더링용 활성 코드 아이템 조회 (code_value, code_name만 반환) - 프로젝트 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_ACTIVE_CODE_ITEMS
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 내용 : SELECT/RADIO/CHECKBOX 컴포넌트 렌더링용
--        SUPER_ADMIN(10) : 전체 조회 가능
--        그 외           : 코드 그룹 소속 프로젝트에 활성 user_role이 없으면 빈 목록
--        status=1 아이템만 반환
--        code_value, code_name만 반환
--        정렬 : display_order ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT ci.`code_value`, ci.`code_name`
    FROM `code_item` ci
    JOIN `code_group` g ON g.`code_group_id` = ci.`code_group_id`
    WHERE ci.`code_group_id` = i_code_group_id
      AND ci.`status` = 1
      AND (i_caller_role_code = 10 OR EXISTS (
              SELECT 1 FROM `user_role` ur
              WHERE ur.`user_id`    = i_caller_user_id
                AND ur.`project_id` = g.`project_id`
                AND ur.`status`     = 1
          ))
    ORDER BY ci.`display_order` ASC;

END$

DELIMITER ;
