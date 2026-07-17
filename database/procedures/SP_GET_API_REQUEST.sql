DROP PROCEDURE IF EXISTS SP_GET_API_REQUEST;
DELIMITER $
CREATE PROCEDURE SP_GET_API_REQUEST(
    IN  i_api_request_id    BIGINT,  -- API Request 파라미터 ID
    IN  i_caller_role_code  INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id    BIGINT   -- 요청자 user_id (비SUPER_ADMIN 프로젝트 스코핑용)
) COMMENT 'API Request 파라미터 상세 조회 - 프로젝트 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_REQUEST
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 내용 : API Request 파라미터 상세 조회
--        SUPER_ADMIN(10) : 모든 파라미터 조회 가능
--        그 외           : 본인이 활성 user_role을 가진 프로젝트 소속 api의 파라미터만 조회 가능
--        조회 불가 또는 미존재 시 31007 반환 (정보 은닉)
-- --------------------------------- --

    proc_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `api_request` r
            JOIN `api` a ON a.`api_id` = r.`api_id`
            WHERE r.`api_request_id` = i_api_request_id
              AND FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, a.`project_id`)
        ) THEN
            SELECT 31007 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT `api_request_id`, `api_id`, `parameter_name`, `parameter_label`,
               `parameter_type`, `component_type`, `code_group_id`, `is_required`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api_request`
        WHERE `api_request_id` = i_api_request_id;

    END;

END$

DELIMITER ;
