DROP PROCEDURE IF EXISTS SP_CREATE_API_EXECUTION;
DELIMITER $
CREATE PROCEDURE SP_CREATE_API_EXECUTION(
    IN  i_api_id            BIGINT,    -- 실행할 API ID
    IN  i_request_user_id   BIGINT,    -- 요청자 user_id
    IN  i_request_json      LONGTEXT,  -- 요청 파라미터 JSON
    IN  i_role_code         INT,       -- 요청자 역할 코드
    IN  i_company_id        BIGINT     -- 요청자 company_id (접근 검사용)
) COMMENT 'API 실행 생성 - 검증, 스냅샷 저장, 즉시실행 여부 반환'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_API_EXECUTION
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-15 trisakion - project.api_key(암호문) 반환 추가, callExternalApi가 복호화해 X-API-Key 헤더로 사용
-- 수정 : 2026-07-17 trisakion - role_code 조회를 FN_GET_PROJECT_ROLE_CODE() 호출로 공용화
-- 내용 : API 실행 이력 생성
--        api 존재·활성 검사 (31006, 30003)
--        대상 프로젝트 실제 권한 재검증 (20001, SUPER_ADMIN 제외 — i_role_code는 세션 전역값이라
--        다른 프로젝트 권한으로 이 프로젝트의 api_stage 게이트를 통과하지 못하도록 user_role을 다시 조회)
--        api_stage 역할 접근 검사 (20001, 프로젝트 실제 권한 기준)
--        프로젝트 company 접근 검사 (20001, SUPER_ADMIN 제외)
--        api_name/endpoint 스냅샷 저장
--        is_immediate: is_required_approval=0 또는 OPERATOR(40) 아닌 경우 1 (프로젝트 실제 권한 기준)
-- 테이블 적용 순서 : api_execution
-- --------------------------------- --

    DECLARE v_now                   DATETIME      DEFAULT NOW();
    DECLARE v_api_name              VARCHAR(200);
    DECLARE v_endpoint              VARCHAR(500);
    DECLARE v_api_stage             TINYINT;
    DECLARE v_is_required_approval  TINYINT;
    DECLARE v_api_status            TINYINT;
    DECLARE v_project_id            BIGINT;
    DECLARE v_project_company_id    BIGINT;
    DECLARE v_api_base_url          VARCHAR(255);
    DECLARE v_api_key               VARCHAR(255);
    DECLARE v_is_immediate          TINYINT;
    DECLARE v_actual_role_code      INT;

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

        SELECT a.`api_name`, a.`endpoint`, a.`api_stage`, a.`is_required_approval`,
               a.`status`, a.`project_id`, p.`company_id`, p.`api_base_url`, p.`api_key`
        INTO   v_api_name, v_endpoint, v_api_stage, v_is_required_approval,
               v_api_status, v_project_id, v_project_company_id, v_api_base_url, v_api_key
        FROM `api` a
        JOIN `project` p ON p.`project_id` = a.`project_id`
        WHERE a.`api_id` = i_api_id;

        IF v_project_id IS NULL THEN
            SELECT 31006 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF v_api_status != 1 THEN
            SELECT 30003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        -- 대상 프로젝트 실제 권한 재검증 — i_role_code(세션 전역 role_code, 가진 프로젝트 중 최고 권한)를
        -- 그대로 신뢰하면 다른 프로젝트의 권한으로 이 프로젝트의 api_stage 게이트를 통과할 수 있다.
        -- SUPER_ADMIN은 user_role 배정 없이 항상 허용.
        IF i_role_code = 10 THEN
            SET v_actual_role_code = 10;
        ELSE
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_request_user_id, v_project_id);
        END IF;

        IF v_actual_role_code IS NULL THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        -- api_stage 역할 접근 검사 (프로젝트 실제 권한 기준)
        IF v_api_stage = 20 AND v_actual_role_code NOT IN (10, 20) THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;
        IF v_api_stage = 30 AND v_actual_role_code NOT IN (10, 20, 30) THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        -- 프로젝트 company 접근 검사 (SUPER_ADMIN 제외)
        IF i_role_code != 10 AND v_project_company_id != i_company_id THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        -- is_required_approval=0 또는 OPERATOR(40)가 아닌 경우 즉시 실행 (프로젝트 실제 권한 기준)
        SET v_is_immediate = IF(v_is_required_approval = 0 OR v_actual_role_code != 40, 1, 0);

        START TRANSACTION;

            INSERT INTO `api_execution` (
                `api_id`, `api_name`, `endpoint`, `is_required_approval`,
                `request_user_id`, `status`, `request_json`, `requested_at`, `updated_at`
            ) VALUES (
                i_api_id, v_api_name, v_endpoint, v_is_required_approval,
                i_request_user_id, 10, i_request_json, v_now, v_now
            );

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT ae.`api_execution_id`, ae.`api_id`, ae.`api_name`, ae.`endpoint`, ae.`is_required_approval`,
               ae.`request_user_id`, ae.`approve_user_id`, ae.`status`,
               ae.`request_json`, ae.`response_data`, ae.`reject_reason`, ae.`error_message`,
               ae.`requested_at`, ae.`approved_at`, ae.`executed_at`, ae.`updated_at`,
               v_api_base_url AS api_base_url, v_api_key AS api_key, v_is_immediate AS is_immediate
        FROM `api_execution` ae
        WHERE ae.`api_execution_id` = LAST_INSERT_ID();

    END;

END$

DELIMITER ;
