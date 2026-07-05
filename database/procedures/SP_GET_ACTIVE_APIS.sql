DROP PROCEDURE IF EXISTS SP_GET_ACTIVE_APIS;
DELIMITER $
CREATE PROCEDURE SP_GET_ACTIVE_APIS(
    IN  i_project_id        BIGINT,  -- 대상 프로젝트 ID
    IN  i_caller_role_code  INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id    BIGINT   -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사)
) COMMENT '사이드바 API 메뉴용 활성 API 전체 조회 - 페이지네이션 없음'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_ACTIVE_APIS
-- 작성 : 2026-07-05 trisakion
-- 내용 : 활성(status=1) API 전체 조회 (페이지네이션 없음)
--        SUPER_ADMIN(10) : 해당 프로젝트 전체 조회
--        일반 사용자     : user_role 에 등록된 프로젝트만 조회
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT a.`api_id`, a.`api_name`, a.`api_stage`
    FROM `api` a
    WHERE a.`project_id` = i_project_id
      AND a.`status` = 1
      AND (i_caller_role_code = 10 OR EXISTS (
              SELECT 1 FROM `user_role` ur
              WHERE ur.`user_id`    = i_caller_user_id
                AND ur.`project_id` = a.`project_id`
                AND ur.`status`     = 1
          ))
    ORDER BY a.`display_order` ASC;

END$

DELIMITER ;
