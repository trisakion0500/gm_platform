DROP PROCEDURE IF EXISTS SP_GET_API;

DELIMITER $

CREATE PROCEDURE SP_GET_API(
    IN  i_api_id  BIGINT  -- API ID
)
COMMENT 'API 상세 조회 - api + api_request + api_response 전체 반환'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API
-- 작성 : 2026-06-30 trisakion
-- 내용 : API 상세 조회
--        api 존재 검사 (31006)
--        결과 순서 : api(1행) → api_request 목록 → api_response 목록
-- --------------------------------- --

    proc_block: BEGIN

        IF NOT EXISTS (SELECT 1 FROM `api` WHERE `api_id` = i_api_id) THEN
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
