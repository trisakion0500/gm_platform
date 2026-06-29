DROP PROCEDURE IF EXISTS SP_GET_USER_ROLE_LIST;

DELIMITER $

CREATE PROCEDURE SP_GET_USER_ROLE_LIST(
    IN  i_user_id     BIGINT,   -- 사용자 ID 필터 (NULL=전체)
    IN  i_project_id  BIGINT,   -- 프로젝트 ID 필터 (NULL=전체)
    IN  i_role_code   TINYINT,  -- 역할 코드 필터 (NULL=전체)
    IN  i_status      TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_company_id  BIGINT    -- 회사 ID 스코핑 (NULL=전체, DEVELOPER용)
)
COMMENT 'User Role 목록 조회 - user/project 정보 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_USER_ROLE_LIST
-- 작성 : 2026-06-29 trisakion
-- 내용 : user_role 목록 조회
--        모든 파라미터 nullable (NULL=전체)
--        user, project JOIN 포함
--        i_company_id: DEVELOPER 스코핑용, NULL이면 전체(SUPER_ADMIN)
--        정렬 : status DESC, role_code ASC, user_id ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT ur.`user_id`, u.`login_id`, u.`user_name`,
           ur.`project_id`, p.`project_code`, p.`project_name`,
           ur.`role_code`, ur.`status`, ur.`created_at`, ur.`updated_at`
    FROM `user_role` ur
    JOIN `user`    u ON u.`user_id`    = ur.`user_id`
    JOIN `project` p ON p.`project_id` = ur.`project_id`
    WHERE (i_user_id    IS NULL OR ur.`user_id`    = i_user_id)
      AND (i_project_id IS NULL OR ur.`project_id` = i_project_id)
      AND (i_role_code  IS NULL OR ur.`role_code`  = i_role_code)
      AND (i_status     IS NULL OR ur.`status`     = i_status)
      AND (i_company_id IS NULL OR p.`company_id`  = i_company_id)
    ORDER BY ur.`status` DESC, ur.`role_code` ASC, ur.`user_id` ASC;

END$

DELIMITER ;
