DROP PROCEDURE IF EXISTS SP_GET_API_RESPONSE;
DELIMITER $
CREATE PROCEDURE SP_GET_API_RESPONSE(
    IN  i_api_response_id   BIGINT,  -- API Response 파라미터 ID
    IN  i_caller_role_code  INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id    BIGINT   -- 요청자 user_id (비SUPER_ADMIN 프로젝트 스코핑용)
) COMMENT 'API Response 파라미터 상세 조회 - 프로젝트 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_RESPONSE
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 내용 : API Response 파라미터 상세 조회
--        SUPER_ADMIN(10) : 모든 파라미터 조회 가능
--        그 외           : 본인이 활성 user_role을 가진 프로젝트 소속 api의 파라미터만 조회 가능
--        조회 불가 또는 미존재 시 31008 반환 (정보 은닉)
-- --------------------------------- --

    proc_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `api_response` r
            JOIN `api` a ON a.`api_id` = r.`api_id`
            WHERE r.`api_response_id` = i_api_response_id
              AND (i_caller_role_code = 10 OR EXISTS (
                    SELECT 1 FROM `user_role` ur
                    WHERE ur.`project_id` = a.`project_id`
                      AND ur.`user_id` = i_caller_user_id
                      AND ur.`status` = 1
                  ))
        ) THEN
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
