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
    IN  i_created_by             BIGINT,        -- 생성자 user_id
    IN  i_caller_role_code       INT            -- 생성자 역할 코드 (10=SUPER_ADMIN 외에는 대상 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT 'API 등록 - api INSERT, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_API
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-31 trisakion - i_caller_role_code 추가, FN_GET_PROJECT_ROLE_CODE로 DEVELOPER 권한을
--        검증+INSERT 한 트랜잭션에서 처리(기존엔 서비스 레이어가 별도 SP 라운드트립인 assertProjectRole로
--        먼저 검증한 뒤 이 SP를 호출해, 그 사이 권한이 회수되어도 통과하는 TOCTOU 창이 있었음)
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 내용 : API 등록
--        project 존재 및 활성 검사 (31002)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        api_code 프로젝트 내 중복 검사 (32001)
--        초기값 : api_stage=20(개발), status=1(사용)
-- 테이블 적용 순서 : api
-- --------------------------------- --

    DECLARE v_actual_role_code  INT;

    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR 1062
    BEGIN
        ROLLBACK;
        SELECT 32001 AS RESULT;
    END;

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

        IF i_caller_role_code != 10 THEN
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_created_by, i_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code != 20 THEN
                SELECT 20001 AS RESULT;
                LEAVE transaction_block;
            END IF;
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
