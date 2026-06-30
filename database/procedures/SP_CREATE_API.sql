DROP PROCEDURE IF EXISTS SP_CREATE_API;
DELIMITER $
CREATE PROCEDURE SP_CREATE_API(
    IN  i_project_id             BIGINT,        -- 프로젝트 ID
    IN  i_api_code               VARCHAR(100),  -- API 코드 (프로젝트 내 유일)
    IN  i_api_name               VARCHAR(200),  -- API 이름
    IN  i_endpoint               VARCHAR(500),  -- 서비스 호출 Endpoint
    IN  i_description            VARCHAR(1000), -- API 설명 (NULL 허용)
    IN  i_is_required_approval   TINYINT,       -- 승인 필요 여부 (0:즉시실행, 1:승인필요)
    IN  i_response_view_type     TINYINT,       -- 응답 표시 방식 (1:KEY_VALUE, 2:GRID)
    IN  i_display_order          INT,           -- 화면 표시 순서
    IN  i_created_by             BIGINT         -- 생성자 user_id
) COMMENT 'API 등록 - api INSERT'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_API
-- 작성 : 2026-06-30 trisakion
-- 내용 : API 등록
--        project 존재 및 활성 검사 (31002)
--        api_code 프로젝트 내 중복 검사 (32001)
--        초기값 : api_stage=20(개발), status=1(사용)
-- 테이블 적용 순서 : api
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

        IF NOT EXISTS (SELECT 1 FROM `project` WHERE `project_id` = i_project_id AND `status` = 1) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF EXISTS (SELECT 1 FROM `api` WHERE `project_id` = i_project_id AND `api_code` = i_api_code) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `api` (
                `project_id`, `api_code`, `api_name`, `endpoint`, `description`,
                `api_stage`, `is_required_approval`, `response_view_type`,
                `status`, `display_order`, `created_by`, `updated_by`
            ) VALUES (
                i_project_id, i_api_code, i_api_name, i_endpoint, i_description,
                20, i_is_required_approval, i_response_view_type,
                1, i_display_order, i_created_by, i_created_by
            );

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `api_id`, `project_id`, `api_code`, `api_name`, `endpoint`, `description`,
               `api_stage`, `is_required_approval`, `response_view_type`,
               `status`, `display_order`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api`
        WHERE `api_id` = LAST_INSERT_ID();

    END;

END$

DELIMITER ;
