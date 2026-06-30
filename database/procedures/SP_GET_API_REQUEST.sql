DROP PROCEDURE IF EXISTS SP_GET_API_REQUEST;
DELIMITER $
CREATE PROCEDURE SP_GET_API_REQUEST(
    IN  i_api_request_id  BIGINT  -- API Request 파라미터 ID
) COMMENT 'API Request 파라미터 상세 조회'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_REQUEST
-- 작성 : 2026-06-30 trisakion
-- 내용 : API Request 파라미터 상세 조회
--        api_request 존재 검사 (31007)
-- --------------------------------- --

    proc_block: BEGIN

        IF NOT EXISTS (SELECT 1 FROM `api_request` WHERE `api_request_id` = i_api_request_id) THEN
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
