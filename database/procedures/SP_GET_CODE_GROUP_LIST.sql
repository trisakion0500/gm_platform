DROP PROCEDURE IF EXISTS SP_GET_CODE_GROUP_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_CODE_GROUP_LIST(
    IN  i_project_id         BIGINT,   -- 프로젝트 ID
    IN  i_status             TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_caller_role_code   INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id     BIGINT    -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사)
) COMMENT '코드 그룹 목록 조회 - 역할별 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CODE_GROUP_LIST
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 내용 : 코드 그룹 목록 조회
--        SUPER_ADMIN(10) : 해당 프로젝트 전체 조회
--        일반 사용자     : user_role 에 등록된 프로젝트만 조회 (그 외엔 빈 목록)
--        status 필터 nullable
--        정렬 : status DESC, code_group_name ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT `code_group_id`, `project_id`, `code_group_code`, `code_group_name`,
           `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
    FROM `code_group`
    WHERE `project_id` = i_project_id
      AND (i_status IS NULL OR `status` = i_status)
      AND (i_caller_role_code = 10 OR EXISTS (
              SELECT 1 FROM `user_role` ur
              WHERE ur.`user_id`    = i_caller_user_id
                AND ur.`project_id` = i_project_id
                AND ur.`status`     = 1
          ))
    ORDER BY `status` DESC, `code_group_name` ASC;

END$

DELIMITER ;
