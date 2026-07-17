DROP PROCEDURE IF EXISTS SP_GET_API;
DELIMITER $
CREATE PROCEDURE SP_GET_API(
    IN  i_api_id            BIGINT,  -- API ID
    IN  i_caller_role_code  INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id    BIGINT   -- 요청자 user_id (비SUPER_ADMIN 프로젝트 스코핑용)
) COMMENT 'API 상세 조회 - api + api_request + api_response 전체 반환, 프로젝트 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 내용 : API 상세 조회
--        SUPER_ADMIN(10) : 모든 API 조회 가능
--        그 외           : 본인이 활성 user_role을 가진 프로젝트 소속 API만 조회 가능
--        조회 불가 또는 미존재 시 31006 반환 (정보 은닉)
--        결과 순서 : api(1행) → api_request 목록 → api_response 목록
-- --------------------------------- --

    proc_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `api` a
            WHERE a.`api_id` = i_api_id
              AND (i_caller_role_code = 10 OR EXISTS (
                    SELECT 1 FROM `user_role` ur
                    WHERE ur.`project_id` = a.`project_id`
                      AND ur.`user_id` = i_caller_user_id
                      AND ur.`status` = 1
                  ))
        ) THEN
            SELECT 31006 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT `api_id`, `project_id`, `api_code`, `api_name`, `endpoint`, `description`,
               `api_stage`, `is_required_approval`, `response_view_type`,
               `status`, `display_order`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api`
        WHERE `api_id` = i_api_id;

        SELECT `api_request_id`, `api_id`, `parameter_name`, `parameter_label`,
               `parameter_type`, `component_type`, `code_group_id`, `is_required`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api_request`
        WHERE `api_id` = i_api_id
        ORDER BY `status` DESC, `display_order` ASC;

        SELECT `api_response_id`, `api_id`, `parameter_name`, `parameter_label`,
               `parameter_type`, `code_group_id`, `description`,
               `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api_response`
        WHERE `api_id` = i_api_id
        ORDER BY `status` DESC, `display_order` ASC;

    END;

END$

DELIMITER ;
