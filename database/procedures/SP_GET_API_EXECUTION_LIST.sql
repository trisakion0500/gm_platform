DROP PROCEDURE IF EXISTS SP_GET_API_EXECUTION_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_API_EXECUTION_LIST(
    IN  i_project_id            BIGINT,    -- 프로젝트 ID (필수)
    IN  i_api_id                BIGINT,    -- API ID 필터 (NULL=전체)
    IN  i_request_user_id       BIGINT,    -- 요청자 필터 (NULL=전체, OPERATOR는 서비스에서 강제 적용)
    IN  i_status                TINYINT,   -- 상태 필터 (NULL=전체)
    IN  i_required_approval_only TINYINT,  -- 승인 필요 건만 필터 (NULL=전체, 1=승인필요 건만)
    IN  i_page                  INT,       -- 페이지 번호 (1부터)
    IN  i_page_size             INT,       -- 페이지 크기 (20/30/50/100)
    IN  i_caller_role_code      INT,       -- 요청자 역할 코드
    IN  i_caller_user_id        BIGINT     -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사용)
) COMMENT 'API 실행 이력 목록 조회 - 프로젝트 스코핑, 페이지네이션'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_EXECUTION_LIST
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-17 trisakion - company 단위 스코핑(i_caller_company_id)을 project 단위(user_role)로 좁힘
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-17 trisakion - 미권한 시 빈 목록 대신 20001 반환, 가드절을 최상단으로 이동
-- 내용 : API 실행 이력 목록 조회
--        SUPER_ADMIN(10) : 모든 project 가능
--        그 외           : 본인이 활성 user_role을 가진 프로젝트가 아니면 20001
--        OPERATOR의 request_user_id 강제는 서비스 레이어에서 처리
--        정렬 : requested_at DESC
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    proc_block: BEGIN

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, i_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT COUNT(ae.`api_execution_id`) AS total_count
        FROM `api_execution` ae
        JOIN `api` a ON a.`api_id` = ae.`api_id`
        WHERE a.`project_id` = i_project_id
          AND (i_api_id          IS NULL OR ae.`api_id`         = i_api_id)
          AND (i_request_user_id IS NULL OR ae.`request_user_id` = i_request_user_id)
          AND (i_status          IS NULL OR ae.`status`          = i_status)
          AND (i_required_approval_only IS NULL OR ae.`is_required_approval` = i_required_approval_only);

        SELECT ae.`api_execution_id`, ae.`api_id`, ae.`api_name`, ae.`endpoint`, ae.`is_required_approval`,
               ae.`request_user_id`, u1.`user_name` AS `request_user_name`, u2.`user_name` AS `approve_user_name`, ae.`status`,
               ae.`reject_reason`, ae.`error_message`,
               ae.`requested_at`, ae.`approved_at`, ae.`executed_at`, ae.`updated_at`
        FROM `api_execution` ae
        JOIN `api` a ON a.`api_id` = ae.`api_id`
        LEFT JOIN `user` u1 ON u1.`user_id` = ae.`request_user_id`
        LEFT JOIN `user` u2 ON u2.`user_id` = ae.`approve_user_id`
        WHERE a.`project_id` = i_project_id
          AND (i_api_id          IS NULL OR ae.`api_id`         = i_api_id)
          AND (i_request_user_id IS NULL OR ae.`request_user_id` = i_request_user_id)
          AND (i_status          IS NULL OR ae.`status`          = i_status)
          AND (i_required_approval_only IS NULL OR ae.`is_required_approval` = i_required_approval_only)
        ORDER BY ae.`requested_at` DESC
        LIMIT i_page_size OFFSET v_offset;

    END;

END$

DELIMITER ;
