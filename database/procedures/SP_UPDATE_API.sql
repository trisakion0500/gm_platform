DROP PROCEDURE IF EXISTS SP_UPDATE_API;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_API(
    IN  i_api_id                 BIGINT,        -- 수정할 API ID
    IN  i_api_code               VARCHAR(100),  -- API 코드 (NULL=변경 없음)
    IN  i_api_name               VARCHAR(200),  -- API 이름 (NULL=변경 없음)
    IN  i_endpoint               VARCHAR(500),  -- Endpoint (NULL=변경 없음)
    IN  i_description            VARCHAR(1000), -- 설명 (NULL=변경 없음)
    IN  i_api_stage              TINYINT,       -- 운영 단계 (NULL=변경 없음, 롤백 시 무시됨)
    IN  i_is_required_approval   TINYINT,       -- 승인 필요 여부 (NULL=변경 없음)
    IN  i_response_view_type     TINYINT,       -- 응답 표시 방식 (NULL=변경 없음)
    IN  i_display_order          INT,           -- 표시 순서 (NULL=변경 없음)
    IN  i_status                 TINYINT,       -- 상태 (NULL=변경 없음)
    IN  i_updated_by             BIGINT         -- 수정자 user_id
) COMMENT 'API 수정 - api UPDATE, api_stage 자동 롤백 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_API
-- 작성 : 2026-06-30 trisakion
-- 내용 : API 수정
--        api 존재 검사 (31006)
--        api_code 변경 시 프로젝트 내 중복 검사 (32001)
--        롤백 트리거 필드(api_code/endpoint/is_required_approval/response_view_type) 변경 시
--        api_stage 강제 20 (i_api_stage 무시)
--        NULL 입력 시 기존 값 유지 (COALESCE)
-- 테이블 적용 순서 : api
-- --------------------------------- --

    DECLARE v_project_id              BIGINT;
    DECLARE v_old_api_code            VARCHAR(100);
    DECLARE v_old_endpoint            VARCHAR(500);
    DECLARE v_old_is_required_approval TINYINT;
    DECLARE v_old_response_view_type  TINYINT;
    DECLARE v_old_api_stage           TINYINT;
    DECLARE v_new_api_stage           TINYINT;
    DECLARE v_do_rollback             TINYINT DEFAULT 0;

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

        SELECT `project_id`, `api_code`, `endpoint`, `is_required_approval`, `response_view_type`, `api_stage`
        INTO   v_project_id, v_old_api_code, v_old_endpoint, v_old_is_required_approval, v_old_response_view_type, v_old_api_stage
        FROM `api`
        WHERE `api_id` = i_api_id;

        IF v_project_id IS NULL THEN
            SELECT 31006 AS RESULT;
            LEAVE transaction_block;
        END IF;

        -- api_code 변경 시 중복 검사
        IF i_api_code IS NOT NULL AND i_api_code != v_old_api_code THEN
            IF EXISTS (SELECT 1 FROM `api` WHERE `project_id` = v_project_id AND `api_code` = i_api_code AND `api_id` != i_api_id) THEN
                SELECT 32001 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        -- 운영 단계 자동 롤백 판정
        IF (i_api_code IS NOT NULL AND i_api_code != v_old_api_code) THEN
            SET v_do_rollback = 1;
        END IF;
        IF (i_endpoint IS NOT NULL AND i_endpoint != v_old_endpoint) THEN
            SET v_do_rollback = 1;
        END IF;
        IF (i_is_required_approval IS NOT NULL AND i_is_required_approval != v_old_is_required_approval) THEN
            SET v_do_rollback = 1;
        END IF;
        IF (i_response_view_type IS NOT NULL AND i_response_view_type != v_old_response_view_type) THEN
            SET v_do_rollback = 1;
        END IF;

        SET v_new_api_stage = IF(v_do_rollback = 1, 20, COALESCE(i_api_stage, v_old_api_stage));

        START TRANSACTION;

            UPDATE `api`
            SET `api_code`              = COALESCE(i_api_code,             `api_code`),
                `api_name`              = COALESCE(i_api_name,             `api_name`),
                `endpoint`              = COALESCE(i_endpoint,             `endpoint`),
                `description`           = COALESCE(i_description,          `description`),
                `api_stage`             = v_new_api_stage,
                `is_required_approval`  = COALESCE(i_is_required_approval, `is_required_approval`),
                `response_view_type`    = COALESCE(i_response_view_type,   `response_view_type`),
                `display_order`         = COALESCE(i_display_order,        `display_order`),
                `status`                = COALESCE(i_status,               `status`),
                `updated_by`            = i_updated_by
            WHERE `api_id` = i_api_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `api_id`, `project_id`, `api_code`, `api_name`, `endpoint`, `description`,
               `api_stage`, `is_required_approval`, `response_view_type`,
               `status`, `display_order`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api`
        WHERE `api_id` = i_api_id;

    END;

END$

DELIMITER ;
