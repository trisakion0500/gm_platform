DROP PROCEDURE IF EXISTS SP_CREATE_API_RESPONSE;

DELIMITER $

CREATE PROCEDURE SP_CREATE_API_RESPONSE(
    IN  i_api_id          BIGINT,        -- API ID
    IN  i_parameter_name  VARCHAR(100),  -- 응답 항목명 (API 내 유일)
    IN  i_parameter_label VARCHAR(100),  -- 화면 표시명
    IN  i_parameter_type  TINYINT,       -- 데이터 타입 (1:STRING, 2:NUMBER, 3:BOOLEAN, 4:DATE, 5:DATETIME, 6:JSON)
    IN  i_code_group_id   INT,           -- 코드 그룹 ID (0:미사용)
    IN  i_description     VARCHAR(1000), -- 설명 (NULL 허용)
    IN  i_display_order   INT,           -- 화면 표시 순서
    IN  i_created_by      BIGINT         -- 생성자 user_id
)
COMMENT 'API Response 파라미터 등록 - api_response INSERT, api_stage 자동 롤백'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_API_RESPONSE
-- 작성 : 2026-06-30 trisakion
-- 내용 : API Response 파라미터 등록
--        api 존재 검사 (31006)
--        parameter_name API 내 중복 검사 (32001)
--        등록 시 api.api_stage = 20 자동 설정
-- 테이블 적용 순서 : api_response → api
-- --------------------------------- --

    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    transaction_block: BEGIN

        IF NOT EXISTS (SELECT 1 FROM `api` WHERE `api_id` = i_api_id) THEN
            SELECT 31006 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF EXISTS (SELECT 1 FROM `api_response` WHERE `api_id` = i_api_id AND `parameter_name` = i_parameter_name) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `api_response` (
                `api_id`, `parameter_name`, `parameter_label`, `parameter_type`,
                `code_group_id`, `description`, `display_order`, `status`, `created_by`, `updated_by`
            ) VALUES (
                i_api_id, i_parameter_name, i_parameter_label, i_parameter_type,
                i_code_group_id, i_description, i_display_order, 1, i_created_by, i_created_by
            );

            UPDATE `api`
            SET `api_stage`  = 20,
                `updated_by` = i_created_by
            WHERE `api_id` = i_api_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `api_response_id`, `api_id`, `parameter_name`, `parameter_label`,
               `parameter_type`, `code_group_id`, `description`,
               `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api_response`
        WHERE `api_response_id` = LAST_INSERT_ID();

    END;

END$

DELIMITER ;
