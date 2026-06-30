DROP PROCEDURE IF EXISTS SP_GET_API_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_API_LIST(
    IN  i_project_id         BIGINT,   -- 프로젝트 ID (필수)
    IN  i_status             TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_api_stage          TINYINT,  -- 운영 단계 필터 (NULL=전체)
    IN  i_page               INT,      -- 페이지 번호 (1부터)
    IN  i_page_size          INT,      -- 페이지 크기 (20/50/100)
    IN  i_caller_role_code   INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id     BIGINT    -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사)
) COMMENT 'API 목록 조회 - 페이지네이션, 역할별 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_LIST
-- 작성 : 2026-06-30 trisakion
-- 내용 : API 목록 조회
--        SUPER_ADMIN(10) : 해당 프로젝트 전체 조회
--        일반 사용자     : user_role 에 등록된 프로젝트만 조회
--        페이지네이션 : total_count + items 순서로 반환
--        정렬 : status DESC, display_order ASC
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    SELECT 0 AS RESULT;

    SELECT COUNT(a.`api_id`) AS total_count
    FROM `api` a
    WHERE a.`project_id` = i_project_id
      AND (i_status    IS NULL OR a.`status`    = i_status)
      AND (i_api_stage IS NULL OR a.`api_stage` = i_api_stage)
      AND (i_caller_role_code = 10 OR EXISTS (
              SELECT 1 FROM `user_role` ur
              WHERE ur.`user_id`    = i_caller_user_id
                AND ur.`project_id` = a.`project_id`
                AND ur.`status`     = 1
          ));

    SELECT a.`api_id`, a.`project_id`, a.`api_code`, a.`api_name`, a.`endpoint`,
           a.`description`, a.`api_stage`, a.`is_required_approval`, a.`response_view_type`,
           a.`status`, a.`display_order`, a.`created_by`, a.`updated_by`, a.`created_at`, a.`updated_at`
    FROM `api` a
    WHERE a.`project_id` = i_project_id
      AND (i_status    IS NULL OR a.`status`    = i_status)
      AND (i_api_stage IS NULL OR a.`api_stage` = i_api_stage)
      AND (i_caller_role_code = 10 OR EXISTS (
              SELECT 1 FROM `user_role` ur
              WHERE ur.`user_id`    = i_caller_user_id
                AND ur.`project_id` = a.`project_id`
                AND ur.`status`     = 1
          ))
    ORDER BY a.`status` DESC, a.`display_order` ASC
    LIMIT i_page_size OFFSET v_offset;

END$

DELIMITER ;
