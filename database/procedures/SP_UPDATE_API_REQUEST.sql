DROP PROCEDURE IF EXISTS SP_UPDATE_API_REQUEST;

DELIMITER $

CREATE PROCEDURE SP_UPDATE_API_REQUEST(
    IN  i_api_request_id  BIGINT,        -- 수정할 API Request 파라미터 ID
    IN  i_parameter_name  VARCHAR(100),  -- 파라미터명 (NULL=변경 없음)
    IN  i_parameter_label VARCHAR(100),  -- 화면 표시명 (NULL=변경 없음)
    IN  i_parameter_type  TINYINT,       -- 데이터 타입 (NULL=변경 없음)
    IN  i_component_type  TINYINT,       -- 입력 컴포넌트 (NULL=변경 없음)
    IN  i_code_group_id   INT,           -- 코드 그룹 ID (NULL=변경 없음)
    IN  i_is_required     TINYINT,       -- 필수 여부 (NULL=변경 없음)
    IN  i_description     VARCHAR(1000), -- 설명 (NULL=변경 없음)
    IN  i_display_order   INT,           -- 표시 순서 (NULL=변경 없음)
    IN  i_status          TINYINT,       -- 상태 (NULL=변경 없음)
    IN  i_updated_by      BIGINT         -- 수정자 user_id
)
COMMENT 'API Request 파라미터 수정 - api_request UPDATE, api_stage 자동 롤백 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_API_REQUEST
-- 작성 : 2026-06-30 trisakion
-- 내용 : API Request 파라미터 수정
--        api_request 존재 검사 (31007)
--        parameter_name 변경 시 API 내 중복 검사 (32001)
--        롤백 트리거 필드(parameter_name/parameter_type/component_type/code_group_id/is_required) 변경 시
--        api.api_stage = 20 자동 설정
-- 테이블 적용 순서 : api_request → api(조건부)
-- --------------------------------- --

    DECLARE v_api_id               BIGINT;
    DECLARE v_old_parameter_name   VARCHAR(100);
    DECLARE v_old_parameter_type   TINYINT;
    DECLARE v_old_component_type   TINYINT;
    DECLARE v_old_code_group_id    INT;
    DECLARE v_old_is_required      TINYINT;
    DECLARE v_do_rollback          TINYINT DEFAULT 0;

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

        SELECT `api_id`, `parameter_name`, `parameter_type`, `component_type`, `code_group_id`, `is_required`
        INTO   v_api_id, v_old_parameter_name, v_old_parameter_type, v_old_component_type, v_old_code_group_id, v_old_is_required
        FROM `api_request`
        WHERE `api_request_id` = i_api_request_id;

        IF v_api_id IS NULL THEN
            SELECT 31007 AS RESULT;
            LEAVE transaction_block;
        END IF;

        -- parameter_name 변경 시 중복 검사
        IF i_parameter_name IS NOT NULL AND i_parameter_name != v_old_parameter_name THEN
            IF EXISTS (SELECT 1 FROM `api_request` WHERE `api_id` = v_api_id AND `parameter_name` = i_parameter_name AND `api_request_id` != i_api_request_id) THEN
                SELECT 32001 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        -- 운영 단계 자동 롤백 판정
        IF (i_parameter_name IS NOT NULL AND i_parameter_name != v_old_parameter_name) THEN
            SET v_do_rollback = 1;
        END IF;
        IF (i_parameter_type IS NOT NULL AND i_parameter_type != v_old_parameter_type) THEN
            SET v_do_rollback = 1;
        END IF;
        IF (i_component_type IS NOT NULL AND i_component_type != v_old_component_type) THEN
            SET v_do_rollback = 1;
        END IF;
        IF (i_code_group_id IS NOT NULL AND i_code_group_id != v_old_code_group_id) THEN
            SET v_do_rollback = 1;
        END IF;
        IF (i_is_required IS NOT NULL AND i_is_required != v_old_is_required) THEN
            SET v_do_rollback = 1;
        END IF;

        START TRANSACTION;

            UPDATE `api_request`
            SET `parameter_name`  = COALESCE(i_parameter_name,  `parameter_name`),
                `parameter_label` = COALESCE(i_parameter_label, `parameter_label`),
                `parameter_type`  = COALESCE(i_parameter_type,  `parameter_type`),
                `component_type`  = COALESCE(i_component_type,  `component_type`),
                `code_group_id`   = COALESCE(i_code_group_id,   `code_group_id`),
                `is_required`     = COALESCE(i_is_required,     `is_required`),
                `description`     = COALESCE(i_description,     `description`),
                `display_order`   = COALESCE(i_display_order,   `display_order`),
                `status`          = COALESCE(i_status,          `status`),
                `updated_by`      = i_updated_by
            WHERE `api_request_id` = i_api_request_id;

            IF v_do_rollback = 1 THEN
                UPDATE `api`
                SET `api_stage`  = 20,
                    `updated_by` = i_updated_by
                WHERE `api_id` = v_api_id;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `api_request_id`, `api_id`, `parameter_name`, `parameter_label`,
               `parameter_type`, `component_type`, `code_group_id`, `is_required`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api_request`
        WHERE `api_request_id` = i_api_request_id;

    END;

END$

DELIMITER ;
