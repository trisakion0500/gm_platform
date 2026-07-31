DROP PROCEDURE IF EXISTS SP_CREATE_API_REQUEST;
DELIMITER $
CREATE PROCEDURE SP_CREATE_API_REQUEST(
    IN  i_api_id          BIGINT,        -- API ID
    IN  i_parameter_name  VARCHAR(100),  -- 파라미터명 (API 내 유일)
    IN  i_parameter_label VARCHAR(100),  -- 화면 표시명
    IN  i_parameter_type  TINYINT,       -- 데이터 타입 (1:STRING, 2:NUMBER, 3:BOOLEAN, 4:DATE, 5:DATETIME, 6:JSON)
    IN  i_component_type  TINYINT,       -- 입력 컴포넌트 (1:TEXT~7:CHECKBOX)
    IN  i_code_group_id   INT,           -- 코드 그룹 ID (0:미사용, component_type 5/6/7은 필수)
    IN  i_is_required     TINYINT,       -- 필수 여부 (0:선택, 1:필수)
    IN  i_description     VARCHAR(1000), -- 설명 (NULL 허용)
    IN  i_display_order   INT,           -- 화면 표시 순서
    IN  i_created_by      BIGINT,        -- 생성자 user_id
    IN  i_caller_role_code INT           -- 생성자 역할 코드 (10=SUPER_ADMIN 외에는 대상 API 소속 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT 'API Request 파라미터 등록 - api_request INSERT, api_stage 자동 롤백, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_API_REQUEST
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-31 trisakion - i_caller_role_code 추가, FN_GET_PROJECT_ROLE_CODE로 DEVELOPER 권한을
--        검증+INSERT 한 트랜잭션에서 처리(TOCTOU 창 제거). api 존재 검사를 project_id도 함께
--        얻도록 SELECT INTO로 변경.
-- 내용 : API Request 파라미터 등록
--        api 존재 검사 (31006)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        parameter_name API 내 중복 검사 (32001)
--        component_type 5/6/7 이면 code_group_id > 0 필수 (30003)
--        등록 시 api.api_stage = 20 자동 설정
-- 테이블 적용 순서 : api_request → api
-- --------------------------------- --

    DECLARE v_project_id       BIGINT;
    DECLARE v_actual_role_code INT;

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

        SELECT `project_id` INTO v_project_id FROM `api` WHERE `api_id` = i_api_id;

        IF v_project_id IS NULL THEN
            SELECT 31006 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_created_by, v_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code != 20 THEN
                SELECT 20001 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM `api_request` WHERE `api_id` = i_api_id AND `parameter_name` = i_parameter_name) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        -- SELECT / RADIO / CHECKBOX 는 code_group_id 필수
        IF i_component_type IN (5, 6, 7) AND i_code_group_id = 0 THEN
            SELECT 30003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `api_request` (
                `api_id`, `parameter_name`, `parameter_label`, `parameter_type`,
                `component_type`, `code_group_id`, `is_required`,
                `description`, `display_order`, `status`, `created_by`, `updated_by`
            ) VALUES (
                i_api_id, i_parameter_name, i_parameter_label, i_parameter_type,
                i_component_type, i_code_group_id, i_is_required,
                i_description, i_display_order, 1, i_created_by, i_created_by
            );

            UPDATE `api`
            SET `api_stage`  = 20,
                `updated_by` = i_created_by
            WHERE `api_id` = i_api_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `api_request_id`, `api_id`, `parameter_name`, `parameter_label`,
               `parameter_type`, `component_type`, `code_group_id`, `is_required`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api_request`
        WHERE `api_request_id` = LAST_INSERT_ID();

    END;

END$

DELIMITER ;
