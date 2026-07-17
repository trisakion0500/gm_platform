DROP PROCEDURE IF EXISTS SP_GET_API_EXECUTION_PENDING;
DELIMITER $
CREATE PROCEDURE SP_GET_API_EXECUTION_PENDING(
    IN  i_project_id        BIGINT,  -- 프로젝트 ID (필수)
    IN  i_page              INT,     -- 페이지 번호 (1부터)
    IN  i_page_size         INT,     -- 페이지 크기 (20/30/50/100)
    IN  i_caller_role_code  INT,     -- 요청자 역할 코드
    IN  i_caller_user_id    BIGINT   -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사용)
) COMMENT '승인 대기 목록 조회 - 프로젝트 스코핑, status=10, requested_at ASC'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_EXECUTION_PENDING
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-17 trisakion - company 단위 스코핑(i_caller_company_id)을 project 단위(user_role)로 좁힘
-- 내용 : 승인 대기(status=10) 목록 조회
--        SUPER_ADMIN(10) : 모든 project 가능
--        그 외           : 본인이 활성 user_role을 가진 프로젝트만 가능
--        정렬 : requested_at ASC (오래 기다린 요청 우선)
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    SELECT 0 AS RESULT;

    SELECT COUNT(ae.`api_execution_id`) AS total_count
    FROM `api_execution` ae
    JOIN `api` a ON a.`api_id` = ae.`api_id`
    WHERE a.`project_id` = i_project_id
      AND (i_caller_role_code = 10 OR EXISTS (
              SELECT 1 FROM `user_role` ur
              WHERE ur.`user_id`    = i_caller_user_id
                AND ur.`project_id` = a.`project_id`
                AND ur.`status`     = 1
          ))
      AND ae.`status` = 10;

    SELECT ae.`api_execution_id`, ae.`api_id`, ae.`api_name`, ae.`endpoint`, ae.`is_required_approval`,
           ae.`request_user_id`, u1.`user_name` AS `request_user_name`, u2.`user_name` AS `approve_user_name`, ae.`status`,
           ae.`reject_reason`, ae.`error_message`,
           ae.`requested_at`, ae.`approved_at`, ae.`executed_at`, ae.`updated_at`
    FROM `api_execution` ae
    JOIN `api` a ON a.`api_id` = ae.`api_id`
    LEFT JOIN `user` u1 ON u1.`user_id` = ae.`request_user_id`
    LEFT JOIN `user` u2 ON u2.`user_id` = ae.`approve_user_id`
    WHERE a.`project_id` = i_project_id
      AND (i_caller_role_code = 10 OR EXISTS (
              SELECT 1 FROM `user_role` ur
              WHERE ur.`user_id`    = i_caller_user_id
                AND ur.`project_id` = a.`project_id`
                AND ur.`status`     = 1
          ))
      AND ae.`status` = 10
    ORDER BY ae.`requested_at` ASC
    LIMIT i_page_size OFFSET v_offset;

END$

DELIMITER ;
