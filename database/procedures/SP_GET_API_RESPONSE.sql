DROP PROCEDURE IF EXISTS SP_GET_API_RESPONSE;
DELIMITER $
CREATE PROCEDURE SP_GET_API_RESPONSE(
    IN  i_api_response_id  BIGINT  -- API Response 파라미터 ID
) COMMENT 'API Response 파라미터 상세 조회'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_RESPONSE
-- 작성 : 2026-06-30 trisakion
-- 내용 : API Response 파라미터 상세 조회
--        api_response 존재 검사 (31008)
-- --------------------------------- --

    proc_block: BEGIN

        IF NOT EXISTS (SELECT 1 FROM `api_response` WHERE `api_response_id` = i_api_response_id) THEN
            SELECT 31008 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT `api_response_id`, `api_id`, `parameter_name`, `parameter_label`,
               `parameter_type`, `code_group_id`, `description`,
               `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api_response`
        WHERE `api_response_id` = i_api_response_id;

    END;

END$

DELIMITER ;
