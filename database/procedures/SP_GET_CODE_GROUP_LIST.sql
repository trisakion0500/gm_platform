DROP PROCEDURE IF EXISTS SP_GET_CODE_GROUP_LIST;

DELIMITER $

CREATE PROCEDURE SP_GET_CODE_GROUP_LIST(
    IN  i_project_id  BIGINT,   -- 프로젝트 ID
    IN  i_status      TINYINT   -- 상태 필터 (NULL=전체)
)
COMMENT '코드 그룹 목록 조회'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CODE_GROUP_LIST
-- 작성 : 2026-06-29 trisakion
-- 내용 : 코드 그룹 목록 조회
--        status 필터 nullable
--        정렬 : status DESC, code_group_name ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT `code_group_id`, `project_id`, `code_group_code`, `code_group_name`,
           `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
    FROM `code_group`
    WHERE `project_id` = i_project_id
      AND (i_status IS NULL OR `status` = i_status)
    ORDER BY `status` DESC, `code_group_name` ASC;

END$

DELIMITER ;
