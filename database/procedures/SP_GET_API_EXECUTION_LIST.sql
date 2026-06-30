DROP PROCEDURE IF EXISTS SP_GET_API_EXECUTION_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_API_EXECUTION_LIST(
    IN  i_project_id          BIGINT,    -- 프로젝트 ID (필수)
    IN  i_api_id              BIGINT,    -- API ID 필터 (NULL=전체)
    IN  i_request_user_id     BIGINT,    -- 요청자 필터 (NULL=전체, OPERATOR는 서비스에서 강제 적용)
    IN  i_status              TINYINT,   -- 상태 필터 (NULL=전체)
    IN  i_page                INT,       -- 페이지 번호 (1부터)
    IN  i_page_size           INT,       -- 페이지 크기 (20/50/100)
    IN  i_caller_role_code    INT,       -- 요청자 역할 코드
    IN  i_caller_company_id   BIGINT     -- 요청자 company_id (접근 검사용)
) COMMENT 'API 실행 이력 목록 조회 - 역할별 스코핑, 페이지네이션'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_EXECUTION_LIST
-- 작성 : 2026-06-30 trisakion
-- 내용 : API 실행 이력 목록 조회
--        SUPER_ADMIN(10) : 모든 project 가능
--        그 외           : project.company_id = i_caller_company_id 만 가능
--        OPERATOR의 request_user_id 강제는 서비스 레이어에서 처리
--        정렬 : requested_at DESC
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    SELECT 0 AS RESULT;

    SELECT COUNT(ae.`api_execution_id`) AS total_count
    FROM `api_execution` ae
    JOIN `api` a ON a.`api_id` = ae.`api_id`
    JOIN `project` p ON p.`project_id` = a.`project_id`
    WHERE p.`project_id` = i_project_id
      AND (i_caller_role_code = 10 OR p.`company_id`       = i_caller_company_id)
      AND (i_api_id          IS NULL OR ae.`api_id`         = i_api_id)
      AND (i_request_user_id IS NULL OR ae.`request_user_id` = i_request_user_id)
      AND (i_status          IS NULL OR ae.`status`          = i_status);

    SELECT ae.`api_execution_id`, ae.`api_id`, ae.`api_name`, ae.`endpoint`,
           ae.`request_user_id`, ae.`approve_user_id`, ae.`status`,
           ae.`reject_reason`, ae.`error_message`,
           ae.`requested_at`, ae.`approved_at`, ae.`executed_at`, ae.`updated_at`
    FROM `api_execution` ae
    JOIN `api` a ON a.`api_id` = ae.`api_id`
    JOIN `project` p ON p.`project_id` = a.`project_id`
    WHERE p.`project_id` = i_project_id
      AND (i_caller_role_code = 10 OR p.`company_id`       = i_caller_company_id)
      AND (i_api_id          IS NULL OR ae.`api_id`         = i_api_id)
      AND (i_request_user_id IS NULL OR ae.`request_user_id` = i_request_user_id)
      AND (i_status          IS NULL OR ae.`status`          = i_status)
    ORDER BY ae.`requested_at` DESC
    LIMIT i_page_size OFFSET v_offset;

END$

DELIMITER ;
