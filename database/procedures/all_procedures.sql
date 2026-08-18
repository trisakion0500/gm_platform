DROP PROCEDURE IF EXISTS SP_APPROVE_API_EXECUTION;
DELIMITER $
CREATE PROCEDURE SP_APPROVE_API_EXECUTION(
    IN  i_api_execution_id  BIGINT,  -- 승인할 실행 이력 ID
    IN  i_approve_user_id   BIGINT,  -- 승인자 user_id
    IN  i_caller_role_code  INT      -- 승인자 역할 코드 (10=SUPER_ADMIN 외에는 대상 프로젝트 실제 권한 재검증)
) COMMENT '실행 승인 - status 10→20, approve_user_id/approved_at 저장, api_base_url/api_key 반환'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_APPROVE_API_EXECUTION
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-15 trisakion - project.api_key(암호문) 반환 추가, callExternalApi가 복호화해 X-API-Key 헤더로 사용
-- 수정 : 2026-07-17 trisakion - role_code IN(20,30) 조회를 FN_GET_PROJECT_ROLE_CODE() 호출로 공용화
-- 내용 : PENDING(10) → APPROVED(20)
--        실행 이력 없음 → 31009
--        status != 10  → 31009
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER/APPROVER 활성 권한 없음 → 31009 (이력 존재 자체를 숨김)
--        api_base_url/api_key 반환 (서비스에서 HTTP 호출에 사용)
-- 테이블 적용 순서 : api_execution
-- --------------------------------- --

    DECLARE v_now               DATETIME      DEFAULT NOW();
    DECLARE v_status            TINYINT;
    DECLARE v_project_id        BIGINT;
    DECLARE v_api_base_url      VARCHAR(255);
    DECLARE v_api_key           VARCHAR(255);
    DECLARE v_actual_role_code  INT;

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

        SELECT ae.`status`, p.`project_id`, p.`api_base_url`, p.`api_key`
        INTO   v_status, v_project_id, v_api_base_url, v_api_key
        FROM `api_execution` ae
        JOIN `api` a ON a.`api_id` = ae.`api_id`
        JOIN `project` p ON p.`project_id` = a.`project_id`
        WHERE ae.`api_execution_id` = i_api_execution_id;

        IF v_status IS NULL THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF v_status != 10 THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_approve_user_id, v_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code NOT IN (20, 30) THEN
                SELECT 31009 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        START TRANSACTION;

            UPDATE `api_execution`
            SET `status`          = 20,
                `approve_user_id` = i_approve_user_id,
                `approved_at`     = v_now,
                `updated_at`      = v_now
            WHERE `api_execution_id` = i_api_execution_id
              AND `status` = 10;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 31009 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT ae.`api_execution_id`, ae.`api_id`, ae.`api_name`, ae.`endpoint`, ae.`is_required_approval`,
               ae.`request_user_id`, ae.`approve_user_id`, ae.`status`,
               ae.`request_json`, ae.`response_data`, ae.`reject_reason`, ae.`error_message`,
               ae.`requested_at`, ae.`approved_at`, ae.`executed_at`, ae.`updated_at`,
               v_api_base_url AS api_base_url, v_api_key AS api_key
        FROM `api_execution` ae
        WHERE ae.`api_execution_id` = i_api_execution_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_APPROVE_USER;
DELIMITER $
CREATE PROCEDURE SP_APPROVE_USER(
    IN  i_user_id          BIGINT,  -- 승인할 사용자 ID
    IN  i_caller_role_code INT      -- 요청자 역할 코드 (SUPER_ADMIN=10 외 20001)
) COMMENT '가입 승인 - status=1로 변경'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_APPROVE_USER
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-08-18 trisakion - i_caller_role_code 추가, SUPER_ADMIN 여부를 SP 내부에서도 재검증
--        (기존엔 라우트의 requireRole만이 유일한 방어선이라, 앱 레이어 버그나 우회 호출 시 DB가
--        마지막 방어선이 되지 못했음 — API/CodeGroup 계열 SP가 이미 갖춘 방어적 이중 체크 패턴 적용)
-- 내용 : 가입 승인 처리
--        SUPER_ADMIN 외 호출 → 20001
--        user 존재 검사 후 status=1로 변경
-- 테이블 적용 순서 : user
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

        IF i_caller_role_code != 10 THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `user` WHERE `user_id` = i_user_id) THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `user`
            SET `status` = 1
            WHERE `user_id` = i_user_id AND `status` = 0;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 30003 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;

        SELECT `user_id`, `company_id`, `requested_project_id`,
               `login_id`, `user_name`, `email`,
               `status`, `last_login_at`, `created_at`, `updated_at`
        FROM `user`
        WHERE `user_id` = i_user_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_CANCEL_API_EXECUTION;
DELIMITER $
CREATE PROCEDURE SP_CANCEL_API_EXECUTION(
    IN  i_api_execution_id  BIGINT,        -- 취소할 실행 이력 ID
    IN  i_caller_user_id    BIGINT,        -- 취소 요청자 user_id (본인 검증용)
    IN  i_reject_reason     VARCHAR(1000)  -- 취소 사유
) COMMENT '실행 취소 - status 10→60, 요청자 본인만 가능'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CANCEL_API_EXECUTION
-- 작성 : 2026-06-30 trisakion
-- 내용 : PENDING(10) → CANCELED(60)
--        실행 이력 없음 → 31009
--        status != 10  → 31009
--        본인 아닌 취소 → 31009
-- 테이블 적용 순서 : api_execution
-- --------------------------------- --

    DECLARE v_now              DATETIME  DEFAULT NOW();
    DECLARE v_status           TINYINT;
    DECLARE v_request_user_id  BIGINT;

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

        SELECT `status`, `request_user_id`
        INTO   v_status, v_request_user_id
        FROM `api_execution`
        WHERE `api_execution_id` = i_api_execution_id;

        IF v_status IS NULL THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF v_status != 10 THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF v_request_user_id != i_caller_user_id THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `api_execution`
            SET `status`        = 60,
                `reject_reason` = i_reject_reason,
                `updated_at`    = v_now
            WHERE `api_execution_id` = i_api_execution_id
              AND `status` = 10;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 31009 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `api_execution_id`, `api_id`, `api_name`, `endpoint`, `is_required_approval`,
               `request_user_id`, `approve_user_id`, `status`,
               `request_json`, `response_data`, `reject_reason`, `error_message`,
               `requested_at`, `approved_at`, `executed_at`, `updated_at`
        FROM `api_execution`
        WHERE `api_execution_id` = i_api_execution_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_CLEANUP_EXPIRED_SESSIONS;
DELIMITER $
CREATE PROCEDURE SP_CLEANUP_EXPIRED_SESSIONS() COMMENT '만료된 세션 삭제 - expired_at이 지난 user_session 행을 status와 무관하게 DELETE'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CLEANUP_EXPIRED_SESSIONS
-- 작성 : 2026-07-08 trisakion
-- 내용 : user_session이 로그인마다 계속 쌓이기만 하고 삭제되지 않는 문제 정리
--        expired_at(JWT_REFRESH_EXPIRES_IN 기준 만료일시)이 지난 세션은
--        refresh 자체가 불가능해 재사용 가치가 없으므로 status와 무관하게 DELETE
--        운영 스케줄러(크론 등)에서 주기적으로 호출하는 것을 전제로 작성
-- 테이블 적용 순서 : user_session
-- --------------------------------- --

    DECLARE v_now            DATETIME      DEFAULT NOW();
    DECLARE v_deleted_count  INT           DEFAULT 0;
    DECLARE sql_state        CHAR(5)       DEFAULT '00000';
    DECLARE error_no         INT           DEFAULT 0;
    DECLARE error_message    VARCHAR(255)  DEFAULT '';
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

        START TRANSACTION;

            DELETE FROM `user_session`
            WHERE  `expired_at` < v_now;

            SET v_deleted_count = ROW_COUNT();

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT v_deleted_count AS deleted_count;

    END;

END$

DELIMITER ;

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
-- 수정 : 2026-08-12 trisakion - api_index_sync_queue INSERT 추가(같은 트랜잭션, ON DUPLICATE KEY UPDATE로
--        dedup) - RAG Phase 2(API 정의 검색) rag_server 동기화용 아웃박스 큐 적재
-- 내용 : API 등록
--        project 존재 및 활성 검사 (31002)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        api_code 프로젝트 내 중복 검사 (32001)
--        초기값 : api_stage=20(개발), status=1(사용)
-- 테이블 적용 순서 : api → api_index_sync_queue
-- --------------------------------- --

    DECLARE v_now               DATETIME DEFAULT NOW();
    DECLARE v_api_id            BIGINT;
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
            SET v_api_id = LAST_INSERT_ID();

            INSERT INTO `api_index_sync_queue` (`api_id`, `attempt_count`, `last_error`, `updated_at`)
            VALUES (v_api_id, 0, NULL, v_now)
            ON DUPLICATE KEY UPDATE `attempt_count` = 0, `last_error` = NULL, `updated_at` = v_now;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `api_id`, `project_id`, `api_code`, `api_name`, `endpoint`, `description`,
               `api_stage`, `is_required_approval`, `response_view_type`,
               `status`, `display_order`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api`
        WHERE `api_id` = v_api_id;

    END;

END$

DELIMITER ;

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
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 수정 : 2026-08-12 trisakion - api_index_sync_queue INSERT 추가(같은 트랜잭션, ON DUPLICATE KEY UPDATE로
--        dedup) - RAG Phase 2(API 정의 검색) rag_server 동기화용 아웃박스 큐 적재. api_request 변경도
--        소속 api의 검색 인덱스(요청 파라미터 포함)를 최신으로 유지해야 하므로 api_id 기준으로 적재.
-- 내용 : API Request 파라미터 등록
--        api 존재 검사 (31006)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        parameter_name API 내 중복 검사 (32001)
--        component_type 5/6/7 이면 code_group_id > 0 필수 (30003)
--        등록 시 api.api_stage = 20 자동 설정
-- 테이블 적용 순서 : api_request → api → api_index_sync_queue
-- --------------------------------- --

    DECLARE v_now              DATETIME DEFAULT NOW();
    DECLARE v_project_id       BIGINT;
    DECLARE v_actual_role_code INT;

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

            INSERT INTO `api_index_sync_queue` (`api_id`, `attempt_count`, `last_error`, `updated_at`)
            VALUES (i_api_id, 0, NULL, v_now)
            ON DUPLICATE KEY UPDATE `attempt_count` = 0, `last_error` = NULL, `updated_at` = v_now;

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
    IN  i_created_by      BIGINT,        -- 생성자 user_id
    IN  i_caller_role_code INT           -- 생성자 역할 코드 (10=SUPER_ADMIN 외에는 대상 API 소속 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT 'API Response 파라미터 등록 - api_response INSERT, api_stage 자동 롤백, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_API_RESPONSE
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-31 trisakion - i_caller_role_code 추가, FN_GET_PROJECT_ROLE_CODE로 DEVELOPER 권한을
--        검증+INSERT 한 트랜잭션에서 처리(TOCTOU 창 제거). api 존재 검사를 project_id도 함께
--        얻도록 SELECT INTO로 변경.
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 수정 : 2026-08-12 trisakion - api_index_sync_queue INSERT 추가(같은 트랜잭션, ON DUPLICATE KEY UPDATE로
--        dedup) - RAG Phase 2(API 정의 검색) rag_server 동기화용 아웃박스 큐 적재
-- 내용 : API Response 파라미터 등록
--        api 존재 검사 (31006)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        parameter_name API 내 중복 검사 (32001)
--        등록 시 api.api_stage = 20 자동 설정
-- 테이블 적용 순서 : api_response → api → api_index_sync_queue
-- --------------------------------- --

    DECLARE v_now              DATETIME DEFAULT NOW();
    DECLARE v_project_id       BIGINT;
    DECLARE v_actual_role_code INT;

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

            INSERT INTO `api_index_sync_queue` (`api_id`, `attempt_count`, `last_error`, `updated_at`)
            VALUES (i_api_id, 0, NULL, v_now)
            ON DUPLICATE KEY UPDATE `attempt_count` = 0, `last_error` = NULL, `updated_at` = v_now;

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

DROP PROCEDURE IF EXISTS SP_CREATE_CODE_GROUP;
DELIMITER $
CREATE PROCEDURE SP_CREATE_CODE_GROUP(
    IN  i_project_id        BIGINT,        -- 프로젝트 ID
    IN  i_code_group_code   VARCHAR(100),  -- 코드 그룹 코드 (프로젝트 내 유일)
    IN  i_code_group_name   VARCHAR(200),  -- 코드 그룹명
    IN  i_description       VARCHAR(1000), -- 설명 (NULL 허용)
    IN  i_created_by        BIGINT,        -- 생성자 user_id
    IN  i_caller_role_code  INT            -- 생성자 역할 코드 (10=SUPER_ADMIN 외에는 대상 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT '코드 그룹 등록 - code_group INSERT, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_CODE_GROUP
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-31 trisakion - i_caller_role_code 추가, FN_GET_PROJECT_ROLE_CODE로 DEVELOPER 권한을
--        검증+INSERT 한 트랜잭션에서 처리(TOCTOU 창 제거)
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 내용 : 코드 그룹 등록
--        project 존재 검사 (31002)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        code_group_code 프로젝트 내 중복 검사 (32001)
-- 테이블 적용 순서 : code_group
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

        IF EXISTS (SELECT 1 FROM `code_group` WHERE `project_id` = i_project_id AND `code_group_code` = i_code_group_code) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `code_group` (`project_id`, `code_group_code`, `code_group_name`, `description`, `status`, `created_by`, `updated_by`)
            VALUES (i_project_id, i_code_group_code, i_code_group_name, i_description, 1, i_created_by, i_created_by);

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `code_group_id`, `project_id`, `code_group_code`, `code_group_name`,
               `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_group`
        WHERE `code_group_id` = LAST_INSERT_ID();

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_CREATE_CODE_ITEM;
DELIMITER $
CREATE PROCEDURE SP_CREATE_CODE_ITEM(
    IN  i_code_group_id  INT,            -- 코드 그룹 ID
    IN  i_code_value     VARCHAR(100),   -- 코드 값 (그룹 내 유일)
    IN  i_code_name      VARCHAR(200),   -- 코드명
    IN  i_description    VARCHAR(1000),  -- 설명 (NULL 허용)
    IN  i_display_order  INT,            -- 표시 순서
    IN  i_created_by     BIGINT,         -- 생성자 user_id
    IN  i_caller_role_code INT           -- 생성자 역할 코드 (10=SUPER_ADMIN 외에는 대상 코드 그룹 소속 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT '코드 아이템 등록 - code_item INSERT, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_CODE_ITEM
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-31 trisakion - i_caller_role_code 추가, FN_GET_PROJECT_ROLE_CODE로 DEVELOPER 권한을
--        검증+INSERT 한 트랜잭션에서 처리(TOCTOU 창 제거). code_group 존재 검사를 project_id도
--        함께 얻도록 SELECT INTO로 변경.
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 내용 : 코드 아이템 등록
--        code_group 존재 검사 (31004)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        code_value 그룹 내 중복 검사 (32001)
-- 테이블 적용 순서 : code_item
-- --------------------------------- --

    DECLARE v_project_id       BIGINT;
    DECLARE v_actual_role_code INT;

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

        SELECT `project_id` INTO v_project_id FROM `code_group` WHERE `code_group_id` = i_code_group_id AND `status` = 1;

        IF v_project_id IS NULL THEN
            SELECT 31004 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_created_by, v_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code != 20 THEN
                SELECT 20001 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM `code_item` WHERE `code_group_id` = i_code_group_id AND `code_value` = i_code_value) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `code_item` (`code_group_id`, `code_value`, `code_name`, `description`, `display_order`, `status`, `created_by`, `updated_by`)
            VALUES (i_code_group_id, i_code_value, i_code_name, i_description, i_display_order, 1, i_created_by, i_created_by);

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `code_item_id`, `code_group_id`, `code_value`, `code_name`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_item`
        WHERE `code_item_id` = LAST_INSERT_ID();

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_CREATE_COMPANY;
DELIMITER $
CREATE PROCEDURE SP_CREATE_COMPANY(
    IN  i_company_code     VARCHAR(20),   -- 회사 코드
    IN  i_company_name     VARCHAR(100),  -- 회사명
    IN  i_description      VARCHAR(1000), -- 설명 (NULL 허용)
    IN  i_caller_role_code INT            -- 요청자 역할 코드 (SUPER_ADMIN=10 외 20001)
) COMMENT '회사 생성 - company 테이블 INSERT'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_COMPANY
-- 작성 : 2026-06-28 trisakion
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 수정 : 2026-08-18 trisakion - i_caller_role_code 추가, SUPER_ADMIN 여부를 SP 내부에서도 재검증
--        (기존엔 라우트의 requireRole만이 유일한 방어선이라, 앱 레이어 버그나 우회 호출 시 DB가
--        마지막 방어선이 되지 못했음 — API/CodeGroup 계열 SP가 이미 갖춘 방어적 이중 체크 패턴 적용)
-- 내용 : 회사 생성 처리
--        SUPER_ADMIN 외 호출 → 20001
--        company_code 중복 검사 후 company INSERT
--        생성된 company 전체 정보 반환
-- 테이블 적용 순서 : company
-- --------------------------------- --

    DECLARE v_company_id   BIGINT        DEFAULT NULL;
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

        IF i_caller_role_code != 10 THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF EXISTS (SELECT 1 FROM `company` WHERE `company_code` = i_company_code) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `company` (`company_code`, `company_name`, `description`, `status`)
            VALUES (i_company_code, i_company_name, i_description, 1);

            SET v_company_id = LAST_INSERT_ID();

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `company_id`, `company_code`, `company_name`, `description`, `status`, `created_at`, `updated_at`
        FROM `company`
        WHERE `company_id` = v_company_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_CREATE_LOGIN_SESSION;
DELIMITER $
CREATE PROCEDURE SP_CREATE_LOGIN_SESSION(
    IN  i_user_id               BIGINT,       -- 사용자 ID
    IN  i_access_token_jti      VARCHAR(100), -- Access Token JTI (UUID v4)
    IN  i_refresh_token_hash    VARCHAR(255), -- Refresh Token 해시 (SHA-256)
    IN  i_expired_at            DATETIME      -- 세션 만료일시 (Refresh Token 기준, 7일)
) COMMENT '로그인 세션 생성 - last_login_at 갱신 및 user_session INSERT'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_LOGIN_SESSION
-- 작성 : 2026-06-28 trisakion
-- 내용 : 로그인 성공 시 처리
--        user.last_login_at 갱신 후 user_session INSERT
--        두 작업을 하나의 트랜잭션으로 처리하여 원자성 보장
-- 테이블 적용 순서 : user → user_session
-- --------------------------------- --

    DECLARE v_session_id    BIGINT        DEFAULT NULL;
    DECLARE v_now           DATETIME      DEFAULT NULL;
    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
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

        SET v_now = NOW();

        START TRANSACTION;

            UPDATE `user`
            SET    `last_login_at` = v_now
            WHERE  `user_id` = i_user_id;

            INSERT INTO `user_session` (`user_id`, `access_token_jti`, `refresh_token_hash`, `expired_at`, `last_access_at`, `status`)
            VALUES (i_user_id, i_access_token_jti, i_refresh_token_hash, i_expired_at, v_now, 1);

            SET v_session_id = LAST_INSERT_ID();

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT v_session_id AS session_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_CREATE_PROJECT;
DELIMITER $
CREATE PROCEDURE SP_CREATE_PROJECT(
    IN  i_company_id       BIGINT,        -- 회사 ID
    IN  i_project_code     VARCHAR(20),   -- 프로젝트 코드
    IN  i_project_name     VARCHAR(100),  -- 프로젝트명
    IN  i_api_base_url     VARCHAR(255),  -- API Base URL
    IN  i_description      VARCHAR(1000), -- 설명 (NULL 허용)
    IN  i_caller_role_code INT            -- 요청자 역할 코드 (SUPER_ADMIN=10 외 20001)
) COMMENT '프로젝트 생성 - project 테이블 INSERT'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_PROJECT
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-15 trisakion - has_api_key(발급 여부) 반환 추가 (생성 직후는 항상 0)
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 수정 : 2026-08-18 trisakion - i_caller_role_code 추가, SUPER_ADMIN 여부를 SP 내부에서도 재검증
--        (기존엔 라우트의 requireRole만이 유일한 방어선이라, 앱 레이어 버그나 우회 호출 시 DB가
--        마지막 방어선이 되지 못했음 — API/CodeGroup 계열 SP가 이미 갖춘 방어적 이중 체크 패턴 적용)
-- 내용 : 프로젝트 생성 처리
--        SUPER_ADMIN 외 호출 → 20001
--        company 존재 검사 후 project_code 중복 검사 (동일 company 내)
--        생성된 project 전체 정보 반환 (company 정보 포함)
-- 테이블 적용 순서 : project
-- --------------------------------- --

    DECLARE v_project_id    BIGINT        DEFAULT NULL;
    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
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

        IF i_caller_role_code != 10 THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `company` WHERE `company_id` = i_company_id AND `status` = 1) THEN
            SELECT 31001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF EXISTS (SELECT 1 FROM `project` WHERE `company_id` = i_company_id AND `project_code` = i_project_code) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `project` (`company_id`, `project_code`, `project_name`, `api_base_url`, `description`, `status`)
            VALUES (i_company_id, i_project_code, i_project_name, i_api_base_url, i_description, 1);

            SET v_project_id = LAST_INSERT_ID();

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT p.`project_id`, p.`company_id`, c.`company_code`, c.`company_name`,
               p.`project_code`, p.`project_name`, p.`api_base_url`, p.`description`,
               p.`status`, IF(p.`api_key` IS NOT NULL, 1, 0) AS has_api_key,
               p.`created_at`, p.`updated_at`
        FROM `project` p
        JOIN `company` c ON c.`company_id` = p.`company_id`
        WHERE p.`project_id` = v_project_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_CREATE_USER_ROLE;
DELIMITER $
CREATE PROCEDURE SP_CREATE_USER_ROLE(
    IN  i_user_id          BIGINT,   -- 사용자 ID
    IN  i_project_id       BIGINT,   -- 프로젝트 ID
    IN  i_role_code        TINYINT,  -- 역할 코드 (20=DEVELOPER, 30=APPROVER, 40=OPERATOR)
    IN  i_caller_role_code INT       -- 요청자 역할 코드 (SUPER_ADMIN=10 외 20001)
) COMMENT 'User Role 등록 - user_role INSERT'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_USER_ROLE
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 수정 : 2026-08-18 trisakion - i_caller_role_code 추가, SUPER_ADMIN 여부를 SP 내부에서도 재검증
--        (기존엔 라우트의 requireRole만이 유일한 방어선이라, 앱 레이어 버그나 우회 호출 시 DB가
--        마지막 방어선이 되지 못했음 — API/CodeGroup 계열 SP가 이미 갖춘 방어적 이중 체크 패턴 적용)
-- 내용 : user_role 등록
--        SUPER_ADMIN 외 호출 → 20001
--        user 존재 검사 (31003)
--        project 존재 검사 (31002)
--        user와 project의 company_id 일치 검사 (30003)
--        role_code 범위 검사 - SUPER_ADMIN(10) 등록 불가 (30003)
--        동일 user_id + project_id 중복 검사 (32001)
-- 테이블 적용 순서 : user_role
-- --------------------------------- --

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

        IF i_caller_role_code != 10 THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `user` WHERE `user_id` = i_user_id) THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `project` WHERE `project_id` = i_project_id) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM `user` u
            JOIN `project` p ON p.`company_id` = u.`company_id`
            WHERE u.`user_id`    = i_user_id
              AND p.`project_id` = i_project_id
        ) THEN
            SELECT 30003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_role_code NOT IN (20, 30, 40) THEN
            SELECT 30003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF EXISTS (SELECT 1 FROM `user_role` WHERE `user_id` = i_user_id AND `project_id` = i_project_id) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `user_role` (`user_id`, `project_id`, `role_code`, `status`)
            VALUES (i_user_id, i_project_id, i_role_code, 1);

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT ur.`user_id`, u.`login_id`, u.`user_name`,
               ur.`project_id`, p.`project_code`, p.`project_name`,
               ur.`role_code`, ur.`status`, ur.`created_at`, ur.`updated_at`
        FROM `user_role` ur
        JOIN `user`    u ON u.`user_id`    = ur.`user_id`
        JOIN `project` p ON p.`project_id` = ur.`project_id`
        WHERE ur.`user_id` = i_user_id AND ur.`project_id` = i_project_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_DELETE_API_INDEX_SYNC;
DELIMITER $
CREATE PROCEDURE SP_DELETE_API_INDEX_SYNC(
    IN  i_sync_id             BIGINT,    -- 삭제할 동기화 큐 ID
    IN  i_expected_updated_at DATETIME   -- 워커가 SP_GET_PENDING_API_INDEX_SYNC 조회 시점에 읽은 updated_at (낙관적 동시성 가드)
) COMMENT 'rag_server 동기화 성공 후 큐 행 삭제 - 접근제어 없음(내부 배치 전용)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_DELETE_API_INDEX_SYNC
-- 작성 : 2026-08-12 trisakion
-- 수정 : 2026-08-13 trisakion - i_expected_updated_at 가드 추가. 워커가 조회(SELECT)한 뒤
--        rag_server에 push하는 사이(왕복 시간 동안) 도메인 SP가 같은 api_id를 다시 수정하면
--        ON DUPLICATE KEY UPDATE로 같은 sync_id 행이 "최신 변경 대기"로 재큐잉된다 - 이 가드
--        없이 sync_id만으로 삭제하면, 워커가 방금 push한(구버전) 데이터를 성공으로 착각하고
--        재큐잉된 최신 변경 요청까지 함께 지워버려 그 변경분이 gm_apis에 영영 반영되지 않는
--        레이스가 있었다. WHERE에 updated_at을 함께 걸어, 조회 이후 재큐잉된 행(ROW_COUNT=0)은
--        삭제하지 않고 다음 tick이 최신 데이터로 재처리하도록 남겨둔다.
-- 내용 : apiIndexSync.job.ts(server/) 전용 내부 배치 - rag_server push 성공 시 호출.
--        ROW_COUNT=0(이미 삭제됐거나, 조회 이후 재큐잉되어 updated_at이 달라진 경우) 이어도
--        오류로 취급하지 않는다 - 두 경우 모두 "지금 이 삭제는 하지 않는 게 맞다"는 뜻이라
--        워커 입장에서는 성공(RESULT=0)과 동일하게 처리하면 된다(다른 SP들의 "ROW_COUNT()=0 체크
--        시 오류 반환" 관례와 달리, 여기서는 idempotent/재큐잉 감지 둘 다 조용히 넘어가는 것이
--        정확한 의미).
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

    DELETE FROM `api_index_sync_queue`
    WHERE `sync_id` = i_sync_id
      AND `updated_at` = i_expected_updated_at;

    SELECT 0 AS RESULT;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_ACTIVE_APIS;
DELIMITER $
CREATE PROCEDURE SP_GET_ACTIVE_APIS(
    IN  i_project_id        BIGINT,  -- 대상 프로젝트 ID
    IN  i_caller_role_code  INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id    BIGINT   -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사)
) COMMENT '사이드바 API 메뉴용 활성 API 전체 조회 - 페이지네이션 없음'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_ACTIVE_APIS
-- 작성 : 2026-07-05 trisakion
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-17 trisakion - 미권한 시 빈 목록 대신 20001 반환, 가드절을 최상단으로 이동
-- 내용 : 활성(status=1) API 전체 조회 (페이지네이션 없음)
--        SUPER_ADMIN(10) : 해당 프로젝트 전체 조회
--        일반 사용자     : user_role 에 등록된 프로젝트가 아니면 20001
-- --------------------------------- --

    proc_block: BEGIN

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, i_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT a.`api_id`, a.`api_name`, a.`api_stage`
        FROM `api` a
        WHERE a.`project_id` = i_project_id
          AND a.`status` = 1
        ORDER BY a.`display_order` ASC;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS;
DELIMITER $
CREATE PROCEDURE SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS(
    IN  i_project_id         BIGINT,  -- 프로젝트 ID
    IN  i_caller_role_code   INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id     BIGINT   -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사용)
) COMMENT 'API Request/Response 렌더링용 - 프로젝트의 활성 코드그룹 + 활성 아이템 일괄 조회, 프로젝트 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_ACTIVE_CODE_GROUPS_WITH_ITEMS
-- 작성 : 2026-07-04 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-17 trisakion - 미권한 시 빈 목록 대신 20001 반환, 가드절을 최상단으로 이동
-- 내용 : 프로젝트 단위로 활성(status=1) 코드그룹과 각 그룹의 활성 아이템을 한 번에 조회
--        SUPER_ADMIN(10) : 전체 조회 가능
--        그 외           : 해당 프로젝트에 활성 user_role이 없으면 20001
--        아이템이 없는 그룹도 포함(LEFT JOIN)
--        정렬 : code_group_name ASC, display_order ASC
-- --------------------------------- --

    proc_block: BEGIN

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, i_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT cg.`code_group_id`, cg.`code_group_code`, cg.`code_group_name`,
               ci.`code_value`, ci.`code_name`
        FROM `code_group` cg
        LEFT JOIN `code_item` ci ON ci.`code_group_id` = cg.`code_group_id` AND ci.`status` = 1
        WHERE cg.`project_id` = i_project_id
          AND cg.`status` = 1
        ORDER BY cg.`code_group_name` ASC, ci.`display_order` ASC;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_ACTIVE_CODE_ITEMS;
DELIMITER $
CREATE PROCEDURE SP_GET_ACTIVE_CODE_ITEMS(
    IN  i_code_group_id     INT,   -- 코드 그룹 ID
    IN  i_caller_role_code  INT,   -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id    BIGINT -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사용)
) COMMENT 'API Request 렌더링용 활성 코드 아이템 조회 (code_value, code_name만 반환) - 프로젝트 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_ACTIVE_CODE_ITEMS
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-17 trisakion - 미권한 시 빈 목록 대신 20001 반환, 가드절을 최상단으로 이동
-- 내용 : SELECT/RADIO/CHECKBOX 컴포넌트 렌더링용
--        SUPER_ADMIN(10) : 전체 조회 가능
--        그 외           : 코드 그룹 소속 프로젝트에 활성 user_role이 없으면 20001
--        status=1 아이템만 반환
--        code_value, code_name만 반환
--        정렬 : display_order ASC
-- --------------------------------- --

    DECLARE v_project_id  BIGINT DEFAULT NULL;

    proc_block: BEGIN

        SELECT `project_id` INTO v_project_id FROM `code_group` WHERE `code_group_id` = i_code_group_id;

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, v_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT `code_value`, `code_name`
        FROM `code_item`
        WHERE `code_group_id` = i_code_group_id
          AND `status` = 1
        ORDER BY `display_order` ASC;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_ACTIVE_HEADER_DATA;
DELIMITER $
CREATE PROCEDURE SP_GET_ACTIVE_HEADER_DATA(
    IN  i_role_code   INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_company_id  BIGINT,   -- 요청자 소속 회사 ID (SUPER_ADMIN 외 회사 스코핑용)
    IN  i_user_id     BIGINT    -- 요청자 user_id (SUPER_ADMIN 외 프로젝트 user_role 스코핑용)
) COMMENT '헤더 회사/프로젝트 콤보박스용 활성 목록 조회 - 페이지네이션 없음, 회사+프로젝트 한 번에 반환'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_ACTIVE_HEADER_DATA
-- 작성 : 2026-07-05 trisakion
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 내용 : 헤더 콤보박스가 로그인 시 1회 로드하는 활성 회사/프로젝트 목록을 한 호출로 반환
--        SUPER_ADMIN(10) : 전체 활성 회사 + 전체 활성 프로젝트
--        그 외            : 본인 소속 회사만 + 본인이 활성 user_role을 가진 프로젝트만
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT `company_id`, `company_name`
    FROM `company`
    WHERE `status` = 1
      AND (i_role_code = 10 OR `company_id` = i_company_id)
    ORDER BY `company_name` ASC;

    SELECT p.`project_id`, p.`company_id`, p.`project_name`
    FROM `project` p
    WHERE p.`status` = 1
      AND FN_HAS_PROJECT_ROLE(i_role_code, i_user_id, p.`project_id`)
    ORDER BY p.`project_name` ASC;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_API;
DELIMITER $
CREATE PROCEDURE SP_GET_API(
    IN  i_api_id            BIGINT,  -- API ID
    IN  i_caller_role_code  INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id    BIGINT   -- 요청자 user_id (비SUPER_ADMIN 프로젝트 스코핑용)
) COMMENT 'API 상세 조회 - api + api_request + api_response 전체 반환, 프로젝트 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 내용 : API 상세 조회
--        SUPER_ADMIN(10) : 모든 API 조회 가능
--        그 외           : 본인이 활성 user_role을 가진 프로젝트 소속 API만 조회 가능
--        조회 불가 또는 미존재 시 31006 반환 (정보 은닉)
--        결과 순서 : api(1행) → api_request 목록 → api_response 목록
-- --------------------------------- --

    proc_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `api` a
            WHERE a.`api_id` = i_api_id
              AND FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, a.`project_id`)
        ) THEN
            SELECT 31006 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT `api_id`, `project_id`, `api_code`, `api_name`, `endpoint`, `description`,
               `api_stage`, `is_required_approval`, `response_view_type`,
               `status`, `display_order`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api`
        WHERE `api_id` = i_api_id;

        SELECT `api_request_id`, `api_id`, `parameter_name`, `parameter_label`,
               `parameter_type`, `component_type`, `code_group_id`, `is_required`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api_request`
        WHERE `api_id` = i_api_id
        ORDER BY `status` DESC, `display_order` ASC;

        SELECT `api_response_id`, `api_id`, `parameter_name`, `parameter_label`,
               `parameter_type`, `code_group_id`, `description`,
               `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api_response`
        WHERE `api_id` = i_api_id
        ORDER BY `status` DESC, `display_order` ASC;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_API_EXECUTION;
DELIMITER $
CREATE PROCEDURE SP_GET_API_EXECUTION(
    IN  i_api_execution_id  BIGINT,  -- 조회할 실행 이력 ID
    IN  i_caller_role_code  INT,     -- 요청자 역할 코드
    IN  i_caller_user_id    BIGINT   -- 요청자 user_id (OPERATOR 가시성 검사 및 프로젝트 스코핑용)
) COMMENT 'API 실행 이력 상세 조회 - 역할별 가시성 검사, 프로젝트 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_EXECUTION
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-17 trisakion - company 단위 스코핑(i_caller_company_id)을 project 단위(user_role)로 좁힘
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 내용 : API 실행 이력 상세 조회
--        OPERATOR(40) : 본인 요청 건만 조회 가능 (31009)
--        비SUPER_ADMIN : 대상 project_id에 대한 실제 활성 user_role이 없으면 조회 불가 (20001)
-- --------------------------------- --

    DECLARE v_request_user_id  BIGINT;
    DECLARE v_project_id       BIGINT;

    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    transaction_block: BEGIN

        SELECT ae.`request_user_id`, a.`project_id`
        INTO   v_request_user_id, v_project_id
        FROM `api_execution` ae
        JOIN `api` a ON a.`api_id` = ae.`api_id`
        WHERE ae.`api_execution_id` = i_api_execution_id;

        IF v_project_id IS NULL THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code = 40 AND v_request_user_id != i_caller_user_id THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, v_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT ae.`api_execution_id`, ae.`api_id`, ae.`api_name`, ae.`endpoint`, ae.`is_required_approval`,
               ae.`request_user_id`, u1.`user_name` AS `request_user_name`, u2.`user_name` AS `approve_user_name`, ae.`status`,
               ae.`request_json`, ae.`response_data`, ae.`reject_reason`, ae.`error_message`,
               ae.`requested_at`, ae.`approved_at`, ae.`executed_at`, ae.`updated_at`
        FROM `api_execution` ae
        LEFT JOIN `user` u1 ON u1.`user_id` = ae.`request_user_id`
        LEFT JOIN `user` u2 ON u2.`user_id` = ae.`approve_user_id`
        WHERE ae.`api_execution_id` = i_api_execution_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_API_EXECUTION_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_API_EXECUTION_LIST(
    IN  i_project_id            BIGINT,    -- 프로젝트 ID (필수)
    IN  i_api_id                BIGINT,    -- API ID 필터 (NULL=전체)
    IN  i_request_user_id       BIGINT,    -- 요청자 필터 (NULL=전체, OPERATOR는 서비스에서 강제 적용)
    IN  i_status                TINYINT,   -- 상태 필터 (NULL=전체)
    IN  i_required_approval_only TINYINT,  -- 승인 필요 건만 필터 (NULL=전체, 1=승인필요 건만)
    IN  i_page                  INT,       -- 페이지 번호 (1부터)
    IN  i_page_size             INT,       -- 페이지 크기 (20/30/50/100)
    IN  i_caller_role_code      INT,       -- 요청자 역할 코드
    IN  i_caller_user_id        BIGINT     -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사용)
) COMMENT 'API 실행 이력 목록 조회 - 프로젝트 스코핑, 페이지네이션'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_EXECUTION_LIST
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-17 trisakion - company 단위 스코핑(i_caller_company_id)을 project 단위(user_role)로 좁힘
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-17 trisakion - 미권한 시 빈 목록 대신 20001 반환, 가드절을 최상단으로 이동
-- 내용 : API 실행 이력 목록 조회
--        SUPER_ADMIN(10) : 모든 project 가능
--        그 외           : 본인이 활성 user_role을 가진 프로젝트가 아니면 20001
--        OPERATOR의 request_user_id 강제는 서비스 레이어에서 처리
--        정렬 : requested_at DESC
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    proc_block: BEGIN

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, i_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT COUNT(ae.`api_execution_id`) AS total_count
        FROM `api_execution` ae
        JOIN `api` a ON a.`api_id` = ae.`api_id`
        WHERE a.`project_id` = i_project_id
          AND (i_api_id          IS NULL OR ae.`api_id`         = i_api_id)
          AND (i_request_user_id IS NULL OR ae.`request_user_id` = i_request_user_id)
          AND (i_status          IS NULL OR ae.`status`          = i_status)
          AND (i_required_approval_only IS NULL OR ae.`is_required_approval` = i_required_approval_only);

        SELECT ae.`api_execution_id`, ae.`api_id`, ae.`api_name`, ae.`endpoint`, ae.`is_required_approval`,
               ae.`request_user_id`, u1.`user_name` AS `request_user_name`, u2.`user_name` AS `approve_user_name`, ae.`status`,
               ae.`reject_reason`, ae.`error_message`,
               ae.`requested_at`, ae.`approved_at`, ae.`executed_at`, ae.`updated_at`
        FROM `api_execution` ae
        JOIN `api` a ON a.`api_id` = ae.`api_id`
        LEFT JOIN `user` u1 ON u1.`user_id` = ae.`request_user_id`
        LEFT JOIN `user` u2 ON u2.`user_id` = ae.`approve_user_id`
        WHERE a.`project_id` = i_project_id
          AND (i_api_id          IS NULL OR ae.`api_id`         = i_api_id)
          AND (i_request_user_id IS NULL OR ae.`request_user_id` = i_request_user_id)
          AND (i_status          IS NULL OR ae.`status`          = i_status)
          AND (i_required_approval_only IS NULL OR ae.`is_required_approval` = i_required_approval_only)
        ORDER BY ae.`requested_at` DESC
        LIMIT i_page_size OFFSET v_offset;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_API_EXECUTION_PENDING;
DELIMITER $
CREATE PROCEDURE SP_GET_API_EXECUTION_PENDING(
    IN  i_project_id        BIGINT,  -- 프로젝트 ID (필수)
    IN  i_page              INT,     -- 페이지 번호 (1부터)
    IN  i_page_size         INT,     -- 페이지 크기 (20/30/50/100)
    IN  i_caller_role_code  INT,     -- 요청자 역할 코드
    IN  i_caller_user_id    BIGINT   -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사용)
) COMMENT '승인 대기 목록 조회 - 프로젝트 스코핑, status=10, requested_at ASC'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_EXECUTION_PENDING
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-17 trisakion - company 단위 스코핑(i_caller_company_id)을 project 단위(user_role)로 좁힘
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-17 trisakion - 미권한 시 빈 목록 대신 20001 반환, 가드절을 최상단으로 이동
-- 내용 : 승인 대기(status=10) 목록 조회
--        SUPER_ADMIN(10) : 모든 project 가능
--        그 외           : 본인이 활성 user_role을 가진 프로젝트가 아니면 20001
--        정렬 : requested_at ASC (오래 기다린 요청 우선)
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    proc_block: BEGIN

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, i_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT COUNT(ae.`api_execution_id`) AS total_count
        FROM `api_execution` ae
        JOIN `api` a ON a.`api_id` = ae.`api_id`
        WHERE a.`project_id` = i_project_id
          AND ae.`status` = 10;

        SELECT ae.`api_execution_id`, ae.`api_id`, ae.`api_name`, ae.`endpoint`, ae.`is_required_approval`,
               ae.`request_user_id`, u1.`user_name` AS `request_user_name`, u2.`user_name` AS `approve_user_name`, ae.`status`,
               ae.`reject_reason`, ae.`error_message`,
               ae.`requested_at`, ae.`approved_at`, ae.`executed_at`, ae.`updated_at`
        FROM `api_execution` ae
        JOIN `api` a ON a.`api_id` = ae.`api_id`
        LEFT JOIN `user` u1 ON u1.`user_id` = ae.`request_user_id`
        LEFT JOIN `user` u2 ON u2.`user_id` = ae.`approve_user_id`
        WHERE a.`project_id` = i_project_id
          AND ae.`status` = 10
        ORDER BY ae.`requested_at` ASC
        LIMIT i_page_size OFFSET v_offset;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_API_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_API_LIST(
    IN  i_project_id         BIGINT,   -- 프로젝트 ID (필수)
    IN  i_status             TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_api_stage          TINYINT,  -- 운영 단계 필터 (NULL=전체)
    IN  i_page               INT,      -- 페이지 번호 (1부터)
    IN  i_page_size          INT,      -- 페이지 크기 (20/30/50/100)
    IN  i_caller_role_code   INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id     BIGINT    -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사)
) COMMENT 'API 목록 조회 - 페이지네이션, 역할별 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_LIST
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-17 trisakion - 미권한 시 빈 목록 대신 20001 반환, 가드절을 최상단으로 이동
-- 내용 : API 목록 조회
--        SUPER_ADMIN(10) : 해당 프로젝트 전체 조회
--        일반 사용자     : user_role 에 등록된 프로젝트가 아니면 20001
--        페이지네이션 : total_count + items 순서로 반환
--        정렬 : status DESC, display_order ASC
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    proc_block: BEGIN

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, i_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT COUNT(a.`api_id`) AS total_count
        FROM `api` a
        WHERE a.`project_id` = i_project_id
          AND (i_status    IS NULL OR a.`status`    = i_status)
          AND (i_api_stage IS NULL OR a.`api_stage` = i_api_stage);

        SELECT a.`api_id`, a.`project_id`, a.`api_code`, a.`api_name`, a.`endpoint`,
               a.`description`, a.`api_stage`, a.`is_required_approval`, a.`response_view_type`,
               a.`status`, a.`display_order`, a.`created_by`, a.`updated_by`, a.`created_at`, a.`updated_at`
        FROM `api` a
        WHERE a.`project_id` = i_project_id
          AND (i_status    IS NULL OR a.`status`    = i_status)
          AND (i_api_stage IS NULL OR a.`api_stage` = i_api_stage)
        ORDER BY a.`status` DESC, a.`display_order` ASC
        LIMIT i_page_size OFFSET v_offset;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_API_REQUEST;
DELIMITER $
CREATE PROCEDURE SP_GET_API_REQUEST(
    IN  i_api_request_id    BIGINT,  -- API Request 파라미터 ID
    IN  i_caller_role_code  INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id    BIGINT   -- 요청자 user_id (비SUPER_ADMIN 프로젝트 스코핑용)
) COMMENT 'API Request 파라미터 상세 조회 - 프로젝트 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_API_REQUEST
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 내용 : API Request 파라미터 상세 조회
--        SUPER_ADMIN(10) : 모든 파라미터 조회 가능
--        그 외           : 본인이 활성 user_role을 가진 프로젝트 소속 api의 파라미터만 조회 가능
--        조회 불가 또는 미존재 시 31007 반환 (정보 은닉)
-- --------------------------------- --

    proc_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `api_request` r
            JOIN `api` a ON a.`api_id` = r.`api_id`
            WHERE r.`api_request_id` = i_api_request_id
              AND FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, a.`project_id`)
        ) THEN
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
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
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
              AND FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, a.`project_id`)
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

DROP PROCEDURE IF EXISTS SP_GET_CODE_GROUP;
DELIMITER $
CREATE PROCEDURE SP_GET_CODE_GROUP(
    IN  i_code_group_id     INT,   -- 코드 그룹 ID
    IN  i_caller_role_code  INT,   -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id    BIGINT -- 요청자 user_id (비SUPER_ADMIN 프로젝트 스코핑용)
) COMMENT '코드 그룹 단건 조회 - 프로젝트 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CODE_GROUP
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 내용 : code_group_id로 단건 조회
--        SUPER_ADMIN(10) : 모든 코드 그룹 조회 가능
--        그 외           : 본인이 활성 user_role을 가진 프로젝트 소속 코드 그룹만 조회 가능
--        조회 불가 또는 존재하지 않으면 31004 반환 (정보 은닉)
-- --------------------------------- --

    DECLARE v_not_found    TINYINT       DEFAULT 0;
    DECLARE v_id           INT           DEFAULT NULL;
    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;
    DECLARE CONTINUE HANDLER FOR NOT FOUND
    BEGIN
        SET v_not_found = 1;
    END;

    transaction_block: BEGIN

        SELECT g.`code_group_id`
        INTO   v_id
        FROM   `code_group` g
        WHERE  g.`code_group_id` = i_code_group_id
          AND  FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, g.`project_id`);

        IF v_not_found = 1 THEN
            SELECT 31004 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT `code_group_id`, `project_id`, `code_group_code`, `code_group_name`,
               `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_group`
        WHERE `code_group_id` = i_code_group_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_CODE_GROUP_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_CODE_GROUP_LIST(
    IN  i_project_id         BIGINT,   -- 프로젝트 ID
    IN  i_status             TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_caller_role_code   INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id     BIGINT    -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사)
) COMMENT '코드 그룹 목록 조회 - 역할별 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CODE_GROUP_LIST
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-17 trisakion - 미권한 시 빈 목록 대신 20001 반환, 가드절을 최상단으로 이동
-- 내용 : 코드 그룹 목록 조회
--        SUPER_ADMIN(10) : 해당 프로젝트 전체 조회
--        일반 사용자     : user_role 에 등록된 프로젝트가 아니면 20001
--        status 필터 nullable
--        정렬 : status DESC, code_group_name ASC
-- --------------------------------- --

    proc_block: BEGIN

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, i_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT `code_group_id`, `project_id`, `code_group_code`, `code_group_name`,
               `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_group`
        WHERE `project_id` = i_project_id
          AND (i_status IS NULL OR `status` = i_status)
        ORDER BY `status` DESC, `code_group_name` ASC;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_CODE_ITEM;
DELIMITER $
CREATE PROCEDURE SP_GET_CODE_ITEM(
    IN  i_code_item_id      BIGINT,  -- 코드 아이템 ID
    IN  i_caller_role_code  INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id    BIGINT   -- 요청자 user_id (비SUPER_ADMIN 프로젝트 스코핑용)
) COMMENT '코드 아이템 단건 조회 - 프로젝트 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CODE_ITEM
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 내용 : code_item_id로 단건 조회
--        SUPER_ADMIN(10) : 모든 코드 아이템 조회 가능
--        그 외           : 본인이 활성 user_role을 가진 프로젝트 소속 코드 아이템만 조회 가능
--        조회 불가 또는 존재하지 않으면 31005 반환 (정보 은닉)
-- --------------------------------- --

    DECLARE v_not_found    TINYINT       DEFAULT 0;
    DECLARE v_id           BIGINT        DEFAULT NULL;
    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;
    DECLARE CONTINUE HANDLER FOR NOT FOUND
    BEGIN
        SET v_not_found = 1;
    END;

    transaction_block: BEGIN

        SELECT ci.`code_item_id`
        INTO   v_id
        FROM   `code_item` ci
        JOIN   `code_group` g ON g.`code_group_id` = ci.`code_group_id`
        WHERE  ci.`code_item_id` = i_code_item_id
          AND  FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, g.`project_id`);

        IF v_not_found = 1 THEN
            SELECT 31005 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT `code_item_id`, `code_group_id`, `code_value`, `code_name`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_item`
        WHERE `code_item_id` = i_code_item_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_CODE_ITEM_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_CODE_ITEM_LIST(
    IN  i_code_group_id      INT,      -- 코드 그룹 ID
    IN  i_status             TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_caller_role_code   INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id     BIGINT    -- 요청자 user_id (비SUPER_ADMIN 프로젝트 접근 검사)
) COMMENT '코드 아이템 목록 조회 - 역할별 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CODE_ITEM_LIST
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-17 trisakion - 미권한 시 빈 목록 대신 20001 반환, 가드절을 최상단으로 이동
-- 내용 : 코드 아이템 목록 조회
--        SUPER_ADMIN(10) : 해당 코드 그룹 전체 조회
--        일반 사용자     : 코드 그룹 소속 프로젝트에 user_role 등록되지 않으면 20001
--        status 필터 nullable
--        정렬 : status DESC, display_order ASC
-- --------------------------------- --

    DECLARE v_project_id  BIGINT DEFAULT NULL;

    proc_block: BEGIN

        SELECT `project_id` INTO v_project_id FROM `code_group` WHERE `code_group_id` = i_code_group_id;

        IF NOT FN_HAS_PROJECT_ROLE(i_caller_role_code, i_caller_user_id, v_project_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE proc_block;
        END IF;

        SELECT 0 AS RESULT;

        SELECT `code_item_id`, `code_group_id`, `code_value`, `code_name`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_item`
        WHERE `code_group_id` = i_code_group_id
          AND (i_status IS NULL OR `status` = i_status)
        ORDER BY `status` DESC, `display_order` ASC;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_COMPANY;
DELIMITER $
CREATE PROCEDURE SP_GET_COMPANY(
    IN  i_company_id       BIGINT,  -- 조회할 회사 ID
    IN  i_role_code        INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN, 20=DEVELOPER)
    IN  i_user_company_id  BIGINT   -- 요청자 소속 회사 ID (DEVELOPER 스코핑용)
) COMMENT '회사 단건 조회 - 역할별 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_COMPANY
-- 작성 : 2026-06-28 trisakion
-- 내용 : 회사 단건 조회
--        SUPER_ADMIN(10) : 모든 회사 조회 가능
--        DEVELOPER(20)   : 본인 소속 company_id 의 회사만 조회 가능
--        조회 불가 또는 미존재 시 31001 반환
-- --------------------------------- --

    transaction_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `company`
            WHERE `company_id` = i_company_id
              AND (i_role_code = 10 OR `company_id` = i_user_company_id)
        ) THEN
            SELECT 31001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT `company_id`, `company_code`, `company_name`, `description`, `status`, `created_at`, `updated_at`
        FROM `company`
        WHERE `company_id` = i_company_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_COMPANY_BY_CODE;
DELIMITER $
CREATE PROCEDURE SP_GET_COMPANY_BY_CODE(
    IN  i_company_code  VARCHAR(20)  -- 조회할 회사 코드
) COMMENT '회사코드로 활성 회사 조회 - 회원가입 화면 전용(인증 불필요), company_id/company_name만 반환'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_COMPANY_BY_CODE
-- 작성 : 2026-07-06 trisakion
-- 내용 : 회원가입 화면에서 입력받은 company_code를 company_id로 변환
--        status=1(정상) 회사만 조회 가능, 미존재/비활성 시 31001 반환
--        인증 전 화면에서 호출되므로 company_id/company_name 외 정보는 반환하지 않는다
-- --------------------------------- --

    transaction_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `company`
            WHERE `company_code` = i_company_code
              AND `status` = 1
        ) THEN
            SELECT 31001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT `company_id`, `company_name`
        FROM `company`
        WHERE `company_code` = i_company_code
          AND `status` = 1;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_COMPANY_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_COMPANY_LIST(
    IN  i_status      TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_page        INT,      -- 페이지 번호 (1부터)
    IN  i_page_size   INT,      -- 페이지 크기 (20/30/50/100)
    IN  i_role_code   INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN, 20=DEVELOPER)
    IN  i_company_id  BIGINT    -- 요청자 소속 회사 ID (DEVELOPER 스코핑용)
) COMMENT '회사 목록 조회 - 페이지네이션, 역할별 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_COMPANY_LIST
-- 작성 : 2026-06-28 trisakion
-- 내용 : 회사 목록 조회
--        SUPER_ADMIN(10) : 전체 회사 반환
--        DEVELOPER(20)   : 본인 소속 company_id 의 회사만 반환
--        페이지네이션 : total_count + items 순서로 반환
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    SELECT 0 AS RESULT;

    SELECT COUNT(`company_id`) AS total_count
    FROM `company`
    WHERE (i_status IS NULL OR `status` = i_status)
      AND (i_role_code = 10 OR `company_id` = i_company_id);

    SELECT `company_id`, `company_code`, `company_name`, `description`, `status`, `created_at`, `updated_at`
    FROM `company`
    WHERE (i_status IS NULL OR `status` = i_status)
      AND (i_role_code = 10 OR `company_id` = i_company_id)
    ORDER BY `status` DESC, `company_name` ASC
    LIMIT i_page_size OFFSET v_offset;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_CURRENT_TIME;
DELIMITER $
CREATE PROCEDURE SP_GET_CURRENT_TIME() COMMENT 'DB 현재 시간 조회 - 서버 기동 시 DB 연결 확인용'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CURRENT_TIME
-- 작성 : 2026-06-28 trisakion
-- 내용 : 서버 기동 시 DB 연결 및 SP 호출 가능 여부 확인 목적
--        DB 서버의 현재 시간(UTC) 반환
-- --------------------------------- --

    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    SELECT 0 AS RESULT;
    SELECT NOW() AS `current_time`;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_PASSWORD_HASH_BY_ID;
DELIMITER $
CREATE PROCEDURE SP_GET_PASSWORD_HASH_BY_ID(
    IN  i_user_id  BIGINT  -- 사용자 ID
) COMMENT '사용자 ID로 비밀번호 해시 조회 - 비밀번호 변경 시 현재 비밀번호 검증용'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_PASSWORD_HASH_BY_ID
-- 작성 : 2026-06-28 trisakion
-- 내용 : 비밀번호 변경 처리 시 현재 비밀번호 검증 목적으로만 사용
--        password_hash는 서비스 내부 검증용으로 API 응답에 절대 노출 금지
-- --------------------------------- --

    DECLARE v_not_found     TINYINT       DEFAULT 0;
    DECLARE v_password_hash VARCHAR(255)  DEFAULT NULL;
    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;
    DECLARE CONTINUE HANDLER FOR NOT FOUND
    BEGIN
        SET v_not_found = 1;
    END;

    transaction_block: BEGIN

        SELECT u.`password_hash`
        INTO   v_password_hash
        FROM   `user` u
        WHERE  u.`user_id` = i_user_id;

        IF v_not_found = 1 THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT v_password_hash AS password_hash;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_PENDING_API_INDEX_SYNC;
DELIMITER $
CREATE PROCEDURE SP_GET_PENDING_API_INDEX_SYNC(
    IN  i_limit  INT  -- 한 번에 조회할 최대 건수
) COMMENT 'rag_server 동기화 대기 중인 API 목록 조회 - sync_id 오름차순(오래된 순), 접근제어 없음(내부 배치 전용)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_PENDING_API_INDEX_SYNC
-- 작성 : 2026-08-12 trisakion
-- 수정 : 2026-08-13 trisakion - updated_at을 함께 반환하도록 변경. 워커가 이 값을 그대로
--        SP_DELETE_API_INDEX_SYNC의 i_expected_updated_at으로 넘겨, 조회 이후 도메인 SP가
--        같은 sync_id를 재큐잉(ON DUPLICATE KEY UPDATE)했는지 삭제 시점에 재검증할 수 있게 한다.
-- 내용 : apiIndexSync.job.ts(server/) 전용 내부 배치 조회 - 컨트롤러/라우트 없이 job이 직접 호출한다.
--        sync_id 오름차순으로 오래된 순 i_limit건 반환
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

    SELECT 0 AS RESULT;
    SELECT `sync_id`, `api_id`, `attempt_count`, `last_error`, `updated_at`
    FROM `api_index_sync_queue`
    ORDER BY `sync_id` ASC
    LIMIT i_limit;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_PROJECT;
DELIMITER $
CREATE PROCEDURE SP_GET_PROJECT(
    IN  i_project_id  BIGINT,  -- 조회할 프로젝트 ID
    IN  i_role_code   INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_user_id     BIGINT   -- 요청자 user_id (SUPER_ADMIN 외 user_role 스코핑용)
) COMMENT '프로젝트 단건 조회 - 역할별 스코핑, company 정보 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_PROJECT
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-02 trisakion - 스코핑 기준을 company 소속에서 user_role 배정으로 변경
-- 수정 : 2026-07-15 trisakion - api_key 원문 대신 has_api_key(발급 여부)만 반환
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-28 trisakion - 관리 화면(/admin/projects) 전용: 아무 역할이 아닌 실제 DEVELOPER(20) 배정만 통과하도록 강화
-- 내용 : 프로젝트 단건 조회 (관리 화면 전용)
--        SUPER_ADMIN(10) : 모든 프로젝트 조회 가능
--        그 외(DEVELOPER) : 본인이 실제 DEVELOPER(20)로 배정된 프로젝트만 조회 가능
--        조회 불가 또는 미존재 시 31002 반환
-- --------------------------------- --

    transaction_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `project`
            WHERE `project_id` = i_project_id
              AND (i_role_code = 10 OR FN_GET_PROJECT_ROLE_CODE(i_user_id, i_project_id) = 20)
        ) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT p.`project_id`, p.`company_id`, c.`company_code`, c.`company_name`,
               p.`project_code`, p.`project_name`, p.`api_base_url`, p.`description`,
               p.`status`, IF(p.`api_key` IS NOT NULL, 1, 0) AS has_api_key,
               p.`created_at`, p.`updated_at`
        FROM `project` p
        JOIN `company` c ON c.`company_id` = p.`company_id`
        WHERE p.`project_id` = i_project_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_PROJECT_BY_CODE;
DELIMITER $
CREATE PROCEDURE SP_GET_PROJECT_BY_CODE(
    IN  i_company_id    BIGINT,      -- 소속 회사 ID (회원가입 화면에서 먼저 확인된 company_id)
    IN  i_project_code  VARCHAR(20)  -- 조회할 프로젝트 코드
) COMMENT '프로젝트코드로 활성 프로젝트 조회 - 회원가입 화면 전용(인증 불필요), project_id/project_name만 반환'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_PROJECT_BY_CODE
-- 작성 : 2026-07-06 trisakion
-- 내용 : 회원가입 화면에서 입력받은 project_code를 project_id로 변환
--        i_company_id 소속 + status=1(정상) 프로젝트만 조회 가능, 미존재/비활성/타사 소속 시 31002 반환
--        인증 전 화면에서 호출되므로 project_id/project_name 외 정보는 반환하지 않는다
-- --------------------------------- --

    transaction_block: BEGIN

        IF NOT EXISTS (
            SELECT 1 FROM `project`
            WHERE `company_id` = i_company_id
              AND `project_code` = i_project_code
              AND `status` = 1
        ) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT `project_id`, `project_name`
        FROM `project`
        WHERE `company_id` = i_company_id
          AND `project_code` = i_project_code
          AND `status` = 1;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_PROJECT_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_PROJECT_LIST(
    IN  i_company_id  BIGINT,   -- 회사 ID 필터 (NULL=전체)
    IN  i_status      TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_page        INT,      -- 페이지 번호 (1부터)
    IN  i_page_size   INT,      -- 페이지 크기 (20/30/50/100)
    IN  i_role_code   INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_user_id     BIGINT    -- 요청자 user_id (SUPER_ADMIN 외 user_role 스코핑용)
) COMMENT '프로젝트 목록 조회 - 페이지네이션, 역할별 스코핑, company 정보 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_PROJECT_LIST
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-02 trisakion - 스코핑 기준을 company 소속에서 user_role 배정으로 변경
-- 수정 : 2026-07-15 trisakion - api_key 원문 대신 has_api_key(발급 여부)만 반환
-- 수정 : 2026-07-17 trisakion - EXISTS 인라인 체크를 FN_HAS_PROJECT_ROLE() 호출로 공용화
-- 수정 : 2026-07-28 trisakion - 관리 화면(/admin/projects) 전용: 아무 역할이 아닌 실제 DEVELOPER(20) 배정만 통과하도록 강화
-- 내용 : 프로젝트 목록 조회 (관리 화면 전용)
--        SUPER_ADMIN(10) : 전체 프로젝트 반환
--        그 외(DEVELOPER) : 본인이 실제 DEVELOPER(20)로 배정된 프로젝트만 반환
--        각 항목에 company 정보 포함
--        페이지네이션 : total_count + items 순서로 반환
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    SELECT 0 AS RESULT;

    SELECT COUNT(p.`project_id`) AS total_count
    FROM `project` p
    WHERE (i_status IS NULL OR p.`status` = i_status)
      AND (i_company_id IS NULL OR p.`company_id` = i_company_id)
      AND (i_role_code = 10 OR FN_GET_PROJECT_ROLE_CODE(i_user_id, p.`project_id`) = 20);

    SELECT p.`project_id`, p.`company_id`, c.`company_code`, c.`company_name`,
           p.`project_code`, p.`project_name`, p.`api_base_url`, p.`description`,
           p.`status`, IF(p.`api_key` IS NOT NULL, 1, 0) AS has_api_key,
           p.`created_at`, p.`updated_at`
    FROM `project` p
    JOIN `company` c ON c.`company_id` = p.`company_id`
    WHERE (i_status IS NULL OR p.`status` = i_status)
      AND (i_company_id IS NULL OR p.`company_id` = i_company_id)
      AND (i_role_code = 10 OR FN_GET_PROJECT_ROLE_CODE(i_user_id, p.`project_id`) = 20)
    ORDER BY p.`status` DESC, p.`project_name` ASC
    LIMIT i_page_size OFFSET v_offset;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_SESSION_BY_JTI;
DELIMITER $
CREATE PROCEDURE SP_GET_SESSION_BY_JTI(
    IN  i_jti  VARCHAR(100)  -- Access Token JTI
) COMMENT 'JTI로 세션 조회 - 인증 미들웨어에서 매 요청마다 호출'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_SESSION_BY_JTI
-- 작성 : 2026-06-28 trisakion
-- 내용 : access_token_jti로 세션 및 사용자 상태 조회
--        인증 미들웨어에서 session.status, user.status 검증에 사용
--        세션이 존재하지 않으면 10009 반환
-- --------------------------------- --

    DECLARE v_not_found     TINYINT       DEFAULT 0;
    DECLARE v_session_id    BIGINT        DEFAULT NULL;
    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;
    DECLARE CONTINUE HANDLER FOR NOT FOUND
    BEGIN
        SET v_not_found = 1;
    END;

    transaction_block: BEGIN

        SELECT s.`session_id`
        INTO   v_session_id
        FROM   `user_session` s
        WHERE  s.`access_token_jti` = i_jti;

        IF v_not_found = 1 THEN
            SELECT 10009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT s.`session_id`, s.`user_id`,
               s.`status` AS session_status,
               u.`status` AS user_status
        FROM   `user_session` s
        JOIN   `user` u ON s.`user_id` = u.`user_id`
        WHERE  s.`session_id` = v_session_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_SESSION_BY_REFRESH;
DELIMITER $
CREATE PROCEDURE SP_GET_SESSION_BY_REFRESH(
    IN  i_refresh_token_hash  VARCHAR(255)  -- Refresh Token 해시 (SHA-256)
) COMMENT 'Refresh Token 해시로 세션 조회 - Access Token 재발급 시 사용'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_SESSION_BY_REFRESH
-- 작성 : 2026-06-28 trisakion
-- 수정 : 2026-07-29 trisakion - access_token_jti를 결과에 포함. 동일 refresh_token으로 거의
--        동시에 두 refresh 요청이 들어오면 SP_UPDATE_SESSION_JTI가 무조건 덮어써 나중에
--        커밋된 요청만 유효해지는 레이스가 있었음 — 이 값을 SP_UPDATE_SESSION_JTI에
--        낙관적 동시성 가드로 넘기기 위해 추가.
-- 내용 : refresh_token_hash로 세션 및 사용자 정보 조회
--        세션 만료(expired_at) 및 상태(status) 검증 포함
--        세션이 존재하지 않거나 만료된 경우 10008 반환
-- --------------------------------- --

    DECLARE v_not_found     TINYINT       DEFAULT 0;
    DECLARE v_session_id    BIGINT        DEFAULT NULL;
    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;
    DECLARE CONTINUE HANDLER FOR NOT FOUND
    BEGIN
        SET v_not_found = 1;
    END;

    transaction_block: BEGIN

        SELECT s.`session_id`
        INTO   v_session_id
        FROM   `user_session` s
        WHERE  s.`refresh_token_hash` = i_refresh_token_hash
          AND  s.`status` = 1
          AND  s.`expired_at` > NOW();

        IF v_not_found = 1 THEN
            SELECT 10008 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT s.`session_id`, s.`user_id`,
               s.`status` AS session_status,
               u.`status` AS user_status,
               u.`company_id`,
               s.`access_token_jti`,
               COALESCE(MIN(ur.`role_code`), 40) AS role_code
        FROM   `user_session` s
        JOIN   `user` u ON s.`user_id` = u.`user_id`
        LEFT JOIN `user_role` ur ON u.`user_id` = ur.`user_id` AND ur.`status` = 1
        WHERE  s.`session_id` = v_session_id
        GROUP BY s.`session_id`, s.`user_id`, s.`status`, u.`status`, u.`company_id`, s.`access_token_jti`;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_USER;
DELIMITER $
CREATE PROCEDURE SP_GET_USER(
    IN  i_user_id  BIGINT  -- 사용자 ID
) COMMENT '사용자 상세 조회 - company 정보 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_USER
-- 작성 : 2026-06-29 trisakion
-- 내용 : user_id로 사용자 상세 조회
--        company 정보 JOIN 포함
--        password_hash 반환하지 않음
--        존재하지 않으면 31003 반환
-- --------------------------------- --

    DECLARE v_not_found    TINYINT       DEFAULT 0;
    DECLARE v_user_id      BIGINT        DEFAULT NULL;
    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;
    DECLARE CONTINUE HANDLER FOR NOT FOUND
    BEGIN
        SET v_not_found = 1;
    END;

    transaction_block: BEGIN

        SELECT u.`user_id`
        INTO   v_user_id
        FROM   `user` u
        WHERE  u.`user_id` = i_user_id;

        IF v_not_found = 1 THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT u.`user_id`, u.`company_id`, c.`company_code`, c.`company_name`,
               u.`requested_project_id`, u.`login_id`, u.`user_name`, u.`email`,
               u.`phone_number`, u.`department`, u.`position`,
               u.`status`, u.`last_login_at`, u.`created_at`, u.`updated_at`
        FROM   `user` u
        JOIN   `company` c ON c.`company_id` = u.`company_id`
        WHERE  u.`user_id` = i_user_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_USER_BY_ID;
DELIMITER $
CREATE PROCEDURE SP_GET_USER_BY_ID(
    IN  i_user_id  BIGINT  -- 사용자 ID
) COMMENT '사용자 ID로 사용자 조회 (password_hash 제외)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_USER_BY_ID
-- 작성 : 2026-06-28 trisakion
-- 내용 : user_id로 사용자 공개 정보 조회
--        password_hash는 반환하지 않음
--        사용자가 존재하지 않으면 31003 반환
-- --------------------------------- --

    DECLARE v_not_found     TINYINT       DEFAULT 0;
    DECLARE v_user_id       BIGINT        DEFAULT NULL;
    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;
    DECLARE CONTINUE HANDLER FOR NOT FOUND
    BEGIN
        SET v_not_found = 1;
    END;

    transaction_block: BEGIN

        SELECT u.`user_id`
        INTO   v_user_id
        FROM   `user` u
        WHERE  u.`user_id` = i_user_id;

        IF v_not_found = 1 THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT u.`user_id`, u.`company_id`, u.`requested_project_id`,
               u.`login_id`, u.`user_name`, u.`email`,
               u.`phone_number`, u.`department`, u.`position`,
               u.`status`, u.`last_login_at`, u.`created_at`, u.`updated_at`
        FROM   `user` u
        WHERE  u.`user_id` = i_user_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_USER_BY_LOGIN_ID;
DELIMITER $
CREATE PROCEDURE SP_GET_USER_BY_LOGIN_ID(
    IN  i_login_id  VARCHAR(100)  -- 로그인 ID
) COMMENT '로그인 ID로 사용자 조회 - password_hash 및 최소 role_code 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_USER_BY_LOGIN_ID
-- 작성 : 2026-06-28 trisakion
-- 내용 : 로그인 인증용 사용자 조회
--        user_role 조인하여 최고 권한(MIN role_code) 반환
--        로그인 ID가 존재하지 않으면 31003 반환
-- --------------------------------- --

    DECLARE v_not_found     TINYINT       DEFAULT 0;
    DECLARE v_user_id       BIGINT        DEFAULT NULL;
    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;
    DECLARE CONTINUE HANDLER FOR NOT FOUND
    BEGIN
        SET v_not_found = 1;
    END;

    transaction_block: BEGIN

        SELECT u.`user_id`
        INTO   v_user_id
        FROM   `user` u
        WHERE  u.`login_id` = i_login_id;

        IF v_not_found = 1 THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT u.`user_id`, u.`company_id`, u.`requested_project_id`,
               u.`login_id`, u.`password_hash`, u.`user_name`, u.`email`,
               u.`phone_number`, u.`department`, u.`position`,
               u.`status`,
               COALESCE(MIN(ur.`role_code`), 40) AS role_code,
               u.`last_login_at`, u.`created_at`, u.`updated_at`
        FROM   `user` u
        LEFT JOIN `user_role` ur ON u.`user_id` = ur.`user_id` AND ur.`status` = 1
        WHERE  u.`user_id` = v_user_id
        GROUP BY u.`user_id`, u.`company_id`, u.`requested_project_id`,
                 u.`login_id`, u.`password_hash`, u.`user_name`, u.`email`,
                 u.`phone_number`, u.`department`, u.`position`,
                 u.`status`, u.`last_login_at`, u.`created_at`, u.`updated_at`;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_USER_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_USER_LIST(
    IN  i_company_id       BIGINT,   -- 회사 ID 필터 (NULL=전체, SUPER_ADMIN만 유효)
    IN  i_status           TINYINT,  -- 상태 필터 (NULL=전체, SUPER_ADMIN만 유효)
    IN  i_page             INT,      -- 페이지 번호 (1부터)
    IN  i_page_size        INT,      -- 페이지 크기 (20/30/50/100)
    IN  i_role_code        INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN, 20=DEVELOPER)
    IN  i_user_company_id  BIGINT    -- 요청자 소속 회사 ID (DEVELOPER 스코핑용)
) COMMENT '사용자 목록 조회 - 페이지네이션, 역할별 스코핑, company 정보 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_USER_LIST
-- 작성 : 2026-06-29 trisakion
-- 내용 : 사용자 목록 조회
--        SUPER_ADMIN(10) : 전체 사용자, company_id/status 필터 적용
--        DEVELOPER(20)   : 본인 소속 회사 사용자 전체(모든 status), status 필터로 좁혀볼 수 있음
--        각 항목에 company 정보 포함
--        페이지네이션 : total_count + items 순서로 반환
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    SELECT 0 AS RESULT;

    SELECT COUNT(u.`user_id`) AS total_count
    FROM `user` u
    WHERE (i_status IS NULL OR u.`status` = i_status)
      AND (i_company_id IS NULL OR u.`company_id` = i_company_id)
      AND (i_role_code = 10 OR u.`company_id` = i_user_company_id);

    SELECT u.`user_id`, u.`company_id`, c.`company_code`, c.`company_name`,
           u.`login_id`, u.`user_name`, u.`email`,
           u.`phone_number`, u.`department`, u.`position`,
           u.`status`, u.`last_login_at`, u.`created_at`, u.`updated_at`
    FROM `user` u
    JOIN `company` c ON c.`company_id` = u.`company_id`
    WHERE (i_status IS NULL OR u.`status` = i_status)
      AND (i_company_id IS NULL OR u.`company_id` = i_company_id)
      AND (i_role_code = 10 OR u.`company_id` = i_user_company_id)
    ORDER BY u.`created_at` DESC
    LIMIT i_page_size OFFSET v_offset;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_USER_ROLE_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_USER_ROLE_LIST(
    IN  i_user_id     BIGINT,   -- 사용자 ID 필터 (NULL=전체)
    IN  i_project_id  BIGINT,   -- 프로젝트 ID 필터 (NULL=전체)
    IN  i_role_code   TINYINT,  -- 역할 코드 필터 (NULL=전체)
    IN  i_status      TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_company_id  BIGINT    -- 회사 ID 스코핑 (NULL=전체, DEVELOPER용)
) COMMENT 'User Role 목록 조회 - user/project 정보 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_USER_ROLE_LIST
-- 작성 : 2026-06-29 trisakion
-- 내용 : user_role 목록 조회
--        모든 파라미터 nullable (NULL=전체)
--        user, project JOIN 포함
--        i_company_id: DEVELOPER 스코핑용, NULL이면 전체(SUPER_ADMIN)
--        정렬 : status DESC, role_code ASC, user_id ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT ur.`user_id`, u.`login_id`, u.`user_name`,
           ur.`project_id`, p.`project_code`, p.`project_name`,
           ur.`role_code`, ur.`status`, ur.`created_at`, ur.`updated_at`
    FROM `user_role` ur
    JOIN `user`    u ON u.`user_id`    = ur.`user_id`
    JOIN `project` p ON p.`project_id` = ur.`project_id`
    WHERE (i_user_id    IS NULL OR ur.`user_id`    = i_user_id)
      AND (i_project_id IS NULL OR ur.`project_id` = i_project_id)
      AND (i_role_code  IS NULL OR ur.`role_code`  = i_role_code)
      AND (i_status     IS NULL OR ur.`status`     = i_status)
      AND (i_company_id IS NULL OR p.`company_id`  = i_company_id)
    ORDER BY ur.`status` DESC, ur.`role_code` ASC, ur.`user_id` ASC;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_ISSUE_PROJECT_API_KEY;
DELIMITER $
CREATE PROCEDURE SP_ISSUE_PROJECT_API_KEY(
    IN  i_project_id             BIGINT,        -- 대상 프로젝트 ID
    IN  i_encrypted_key          VARCHAR(255),  -- 서비스 레이어에서 AES-256-CBC로 암호화한 api_key
    IN  i_expected_api_base_url  VARCHAR(255),  -- 호출자가 조회 시점에 읽은 api_base_url (동시수정 감지용)
    IN  i_caller_user_id         BIGINT,        -- 호출자 user_id (프로젝트별 역할 재검증용)
    IN  i_caller_role_code       INT            -- 호출자 역할 코드 (10=SUPER_ADMIN 외에는 대상 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT '프로젝트 X-API-Key 발급/재발급 - api_base_url 동시변경 감지, project.api_key UPDATE, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_ISSUE_PROJECT_API_KEY
-- 작성 : 2026-07-15 trisakion
-- 수정 : 2026-07-29 trisakion - i_expected_api_base_url 파라미터 추가, UPDATE에
--        AND api_base_url = i_expected_api_base_url 가드 + ROW_COUNT() 체크 추가.
--        이 발급과 SP_UPDATE_PROJECT_CONNECTION(api_base_url 변경 시 api_key 자동폐기)이
--        서로 다른 트랜잭션으로 거의 동시에 실행되면, url 변경이 먼저 커밋된 뒤에 이 발급이
--        나중에 커밋되어 "새 url + (변경 전 url 기준으로 발급된) 유효한 키"가 되는 레이스가
--        있었음 — 발급 시점에 호출자가 읽었던 api_base_url이 그새 바뀌었으면 32002로 실패시켜
--        재조회 후 재시도하도록 강제.
-- 수정 : 2026-07-31 trisakion - i_caller_user_id/i_caller_role_code 추가(기존엔 호출자 정보 자체가
--        없어 서비스 레이어가 별도 SP 라운드트립인 assertProjectRole로 먼저 검증했음), FN_GET_PROJECT_ROLE_CODE로
--        DEVELOPER 권한을 검증+UPDATE 한 트랜잭션에서 처리(TOCTOU 창 제거)
-- 내용 : GM Platform이 대상 서버 호출용 X-API-Key를 발급/재발급
--        project 존재 검사 (31002)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        api_key UPDATE (재발급 시 기존 암호문 덮어씀)
--        평문은 서비스 레이어가 호출 직전에 생성해 응답에만 1회 실어보내고, 이 SP는 암호문만 다룬다
--        api_base_url이 호출자가 읽은 값과 다르면(동시 변경됨) 갱신하지 않고 32002 반환
--        수정된 project 전체 정보 반환 (company 정보 포함, has_api_key=1 확정)
-- 테이블 적용 순서 : project
-- --------------------------------- --

    DECLARE v_actual_role_code  INT;

    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
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

        IF NOT EXISTS (SELECT 1 FROM `project` WHERE `project_id` = i_project_id) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_caller_user_id, i_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code != 20 THEN
                SELECT 20001 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        START TRANSACTION;

            UPDATE `project`
            SET `api_key` = i_encrypted_key
            WHERE `project_id` = i_project_id
              AND `api_base_url` = i_expected_api_base_url;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 32002 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT p.`project_id`, p.`company_id`, c.`company_code`, c.`company_name`,
               p.`project_code`, p.`project_name`, p.`api_base_url`, p.`description`,
               p.`status`, IF(p.`api_key` IS NOT NULL, 1, 0) AS has_api_key,
               p.`created_at`, p.`updated_at`
        FROM `project` p
        JOIN `company` c ON c.`company_id` = p.`company_id`
        WHERE p.`project_id` = i_project_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_LOCK_ACQUIRE;
DELIMITER $
CREATE PROCEDURE SP_LOCK_ACQUIRE(
    IN  i_lock_name  VARCHAR(64)  -- 획득할 advisory lock 이름 (인스턴스 간 공유되는 배치 식별 키)
) COMMENT '인스턴스 간 배치 중복실행 방지용 MySQL advisory lock 획득 (GET_LOCK, non-blocking)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_LOCK_ACQUIRE
-- 작성 : 2026-07-28 trisakion
-- 내용 : 스케일아웃 시 세션 정리 크론(SP_CLEANUP_EXPIRED_SESSIONS 등)이 인스턴스마다 중복
--        실행되는 문제를 막기 위한 advisory lock 획득 전용 SP. timeout=0(non-blocking)으로
--        시도해 이미 다른 인스턴스가 점유 중이면 대기하지 않고 즉시 포기한다 — 크론은 다음
--        스케줄에 또 돌아오므로 여기서 기다릴 이유가 없다. GET_LOCK이 드물게 NULL(내부 오류,
--        예: 메모리 부족)을 반환해도 COALESCE로 0(미획득)과 동일하게 처리해 항상 안전한 쪽
--        (락을 못 잡은 것으로 간주)으로 fail한다.
--        주의: 반드시 호출부가 pool에서 직접 뽑아 유지하는 단일 커넥션 위에서 호출해야 한다
--        (callSP처럼 매번 pool이 임의로 골라주는 커넥션을 쓰면 락을 건 세션과 다른 세션이
--        되어버려 advisory lock의 세션 종속 특성이 깨진다). SP_LOCK_RELEASE도 반드시 같은
--        커넥션에서 호출해야 한다.
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
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    SELECT 0 AS RESULT;
    SELECT COALESCE(GET_LOCK(i_lock_name, 0), 0) AS acquired;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_LOCK_RELEASE;
DELIMITER $
CREATE PROCEDURE SP_LOCK_RELEASE(
    IN  i_lock_name  VARCHAR(64)  -- 해제할 advisory lock 이름 (SP_LOCK_ACQUIRE와 동일 값)
) COMMENT '인스턴스 간 배치 중복실행 방지용 MySQL advisory lock 해제 (RELEASE_LOCK)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_LOCK_RELEASE
-- 작성 : 2026-07-28 trisakion
-- 내용 : SP_LOCK_ACQUIRE로 획득한 advisory lock을 해제한다. 반드시 획득할 때와 동일한
--        커넥션(세션)에서 호출해야 한다 — advisory lock은 세션에 종속되므로 다른 세션에서
--        호출하면 아무 효과가 없다(RELEASE_LOCK이 0을 반환할 뿐, 에러는 아니다). 반환값
--        (해제 성공 여부)은 호출부(db.ts의 runExclusive)가 실제로 읽어 판단하지 않지만
--        (락 해제가 실패해도 커넥션이 pool로 반환되며 세션이 끝나는 시점에 MySQL이 결국
--        정리한다), RESULT 규약을 일관되게 지키기 위해 반환한다.
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
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    SELECT 0 AS RESULT;
    SELECT COALESCE(RELEASE_LOCK(i_lock_name), 0) AS released;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_LOGOUT_ALL_SESSIONS;
DELIMITER $
CREATE PROCEDURE SP_LOGOUT_ALL_SESSIONS(
    IN  i_user_id  BIGINT  -- 사용자 ID
) COMMENT '사용자의 모든 활성 세션 로그아웃 - status=1인 세션 전체를 0으로 변경'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_LOGOUT_ALL_SESSIONS
-- 작성 : 2026-06-28 trisakion
-- 내용 : 비밀번호 변경 및 강제 로그아웃 시 사용
--        해당 사용자의 status=1(사용) 세션 전체를 0(로그아웃)으로 변경
-- 테이블 적용 순서 : user_session
-- --------------------------------- --

    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
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

        START TRANSACTION;

            UPDATE `user_session`
            SET    `status` = 0
            WHERE  `user_id` = i_user_id
              AND  `status`  = 1;

        COMMIT;

        SELECT 0 AS RESULT;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_LOGOUT_SESSION;
DELIMITER $
CREATE PROCEDURE SP_LOGOUT_SESSION(
    IN  i_session_id  BIGINT  -- 세션 ID
) COMMENT '특정 세션 로그아웃 - status를 0(로그아웃)으로 변경'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_LOGOUT_SESSION
-- 작성 : 2026-06-28 trisakion
-- 내용 : POST /auth/logout 처리
--        현재 요청의 세션만 종료 (status → 0)
-- 테이블 적용 순서 : user_session
-- --------------------------------- --

    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
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

        START TRANSACTION;

            UPDATE `user_session`
            SET    `status` = 0
            WHERE  `session_id` = i_session_id;

        COMMIT;

        SELECT 0 AS RESULT;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_MARK_API_INDEX_SYNC_FAILED;
DELIMITER $
CREATE PROCEDURE SP_MARK_API_INDEX_SYNC_FAILED(
    IN  i_sync_id  BIGINT,       -- 실패 처리할 동기화 큐 ID
    IN  i_error    VARCHAR(500)  -- 실패 사유
) COMMENT 'rag_server 동기화 실패 시 재시도 카운트/사유 갱신 - 접근제어 없음(내부 배치 전용)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_MARK_API_INDEX_SYNC_FAILED
-- 작성 : 2026-08-12 trisakion
-- 내용 : apiIndexSync.job.ts(server/) 전용 내부 배치 - rag_server push 실패 시 호출.
--        행을 삭제하지 않고 attempt_count 증가 + last_error 갱신만 하여 다음 tick에
--        무기한 재시도한다(별도 dead-letter 없음 - "시간차는 있어도 결국 반드시 일치"라는
--        설계 의도).
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

    UPDATE `api_index_sync_queue`
    SET `attempt_count` = `attempt_count` + 1,
        `last_error`    = i_error
    WHERE `sync_id` = i_sync_id;

    SELECT 0 AS RESULT;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_REJECT_API_EXECUTION;
DELIMITER $
CREATE PROCEDURE SP_REJECT_API_EXECUTION(
    IN  i_api_execution_id  BIGINT,        -- 반려할 실행 이력 ID
    IN  i_approve_user_id   BIGINT,        -- 반려자 user_id
    IN  i_reject_reason     VARCHAR(1000), -- 반려 사유
    IN  i_caller_role_code  INT            -- 반려자 역할 코드 (10=SUPER_ADMIN 외에는 대상 프로젝트 실제 권한 재검증)
) COMMENT '실행 반려 - status 10→30, approve_user_id/reject_reason 저장'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_REJECT_API_EXECUTION
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-17 trisakion - role_code IN(20,30) 조회를 FN_GET_PROJECT_ROLE_CODE() 호출로 공용화
-- 내용 : PENDING(10) → REJECTED(30)
--        실행 이력 없음 → 31009
--        status != 10  → 31009
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER/APPROVER 활성 권한 없음 → 31009 (이력 존재 자체를 숨김)
-- 테이블 적용 순서 : api_execution
-- --------------------------------- --

    DECLARE v_now               DATETIME  DEFAULT NOW();
    DECLARE v_status            TINYINT;
    DECLARE v_project_id        BIGINT;
    DECLARE v_actual_role_code  INT;

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

        SELECT ae.`status`, p.`project_id`
        INTO   v_status, v_project_id
        FROM `api_execution` ae
        JOIN `api` a ON a.`api_id` = ae.`api_id`
        JOIN `project` p ON p.`project_id` = a.`project_id`
        WHERE ae.`api_execution_id` = i_api_execution_id;

        IF v_status IS NULL THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF v_status != 10 THEN
            SELECT 31009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_approve_user_id, v_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code NOT IN (20, 30) THEN
                SELECT 31009 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        START TRANSACTION;

            UPDATE `api_execution`
            SET `status`          = 30,
                `approve_user_id` = i_approve_user_id,
                `reject_reason`   = i_reject_reason,
                `updated_at`      = v_now
            WHERE `api_execution_id` = i_api_execution_id
              AND `status` = 10;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 31009 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `api_execution_id`, `api_id`, `api_name`, `endpoint`, `is_required_approval`,
               `request_user_id`, `approve_user_id`, `status`,
               `request_json`, `response_data`, `reject_reason`, `error_message`,
               `requested_at`, `approved_at`, `executed_at`, `updated_at`
        FROM `api_execution`
        WHERE `api_execution_id` = i_api_execution_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_REJECT_USER;
DELIMITER $
CREATE PROCEDURE SP_REJECT_USER(
    IN  i_user_id          BIGINT,  -- 반려할 사용자 ID
    IN  i_caller_role_code INT      -- 요청자 역할 코드 (SUPER_ADMIN=10 외 20001)
) COMMENT '가입 반려 - status=2로 변경'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_REJECT_USER
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-08-18 trisakion - i_caller_role_code 추가, SUPER_ADMIN 여부를 SP 내부에서도 재검증
--        (기존엔 라우트의 requireRole만이 유일한 방어선이라, 앱 레이어 버그나 우회 호출 시 DB가
--        마지막 방어선이 되지 못했음 — API/CodeGroup 계열 SP가 이미 갖춘 방어적 이중 체크 패턴 적용)
-- 내용 : 가입 반려 처리
--        SUPER_ADMIN 외 호출 → 20001
--        user 존재 검사 후 status=2로 변경
-- 테이블 적용 순서 : user
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

        IF i_caller_role_code != 10 THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `user` WHERE `user_id` = i_user_id) THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `user`
            SET `status` = 2
            WHERE `user_id` = i_user_id AND `status` = 0;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 30003 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;

        SELECT `user_id`, `company_id`, `requested_project_id`,
               `login_id`, `user_name`, `email`,
               `status`, `last_login_at`, `created_at`, `updated_at`
        FROM `user`
        WHERE `user_id` = i_user_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_SIGNUP_USER;
DELIMITER $
CREATE PROCEDURE SP_SIGNUP_USER(
    IN  i_company_id            BIGINT,       -- 회사 ID
    IN  i_requested_project_id  BIGINT,       -- 가입 신청 프로젝트 ID (NULL 허용)
    IN  i_login_id              VARCHAR(100), -- 로그인 ID
    IN  i_password_hash         VARCHAR(255), -- 비밀번호 해시
    IN  i_user_name             VARCHAR(100), -- 사용자명
    IN  i_email                 VARCHAR(200), -- 이메일
    IN  i_phone_number          VARCHAR(255), -- 휴대폰 번호 (암호화된 값, 앱 레이어에서 AES-256-CBC 암호화 후 전달)
    IN  i_department            VARCHAR(100), -- 부서 (NULL 허용)
    IN  i_position              VARCHAR(100)  -- 직급 (NULL 허용)
) COMMENT '회원가입 - user 테이블 INSERT (status=0: 가입승인대기)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_SIGNUP_USER
-- 작성 : 2026-06-28 trisakion
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 내용 : 회원가입 처리
--        company_id, requested_project_id 유효성 검사 후 user INSERT
--        생성된 user 전체 정보 반환 (password_hash 제외)
-- 테이블 적용 순서 : user
-- --------------------------------- --

    DECLARE v_user_id       BIGINT        DEFAULT NULL;
    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
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

        IF NOT EXISTS (SELECT 1 FROM `company` WHERE `company_id` = i_company_id AND `status` = 1) THEN
            SELECT 31001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_requested_project_id IS NOT NULL AND
           NOT EXISTS (SELECT 1 FROM `project` WHERE `project_id` = i_requested_project_id AND `status` = 1 AND `company_id` = i_company_id) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF EXISTS (SELECT 1 FROM `user` WHERE `login_id` = i_login_id) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF EXISTS (SELECT 1 FROM `user` WHERE `email` = i_email) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `user` (`company_id`, `requested_project_id`, `login_id`, `password_hash`, `user_name`, `email`, `phone_number`, `department`, `position`, `status`)
            VALUES (i_company_id, i_requested_project_id, i_login_id, i_password_hash, i_user_name, i_email, i_phone_number, i_department, i_position, 0);

            SET v_user_id = LAST_INSERT_ID();

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT u.`user_id`, u.`company_id`, u.`requested_project_id`,
               u.`login_id`, u.`user_name`, u.`email`, u.`phone_number`, u.`department`, u.`position`,
               u.`status`, u.`last_login_at`, u.`created_at`, u.`updated_at`
        FROM `user` u
        WHERE u.`user_id` = v_user_id;

    END;

END$

DELIMITER ;

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
    IN  i_updated_by             BIGINT,        -- 수정자 user_id
    IN  i_caller_role_code       INT            -- 수정자 역할 코드 (10=SUPER_ADMIN 외에는 대상 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT 'API 수정 - api UPDATE, api_stage 자동 롤백 포함, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_API
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-31 trisakion - i_caller_role_code 추가, FN_GET_PROJECT_ROLE_CODE로 DEVELOPER 권한을
--        검증+UPDATE 한 트랜잭션에서 처리(TOCTOU 창 제거, SP_CREATE_API와 동일한 이유)
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 수정 : 2026-08-12 trisakion - api_index_sync_queue INSERT 추가(같은 트랜잭션, ON DUPLICATE KEY UPDATE로
--        dedup) - RAG Phase 2(API 정의 검색) rag_server 동기화용 아웃박스 큐 적재
-- 내용 : API 수정
--        api 존재 검사 (31006)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        api_code 변경 시 프로젝트 내 중복 검사 (32001)
--        롤백 트리거 필드(api_code/endpoint/is_required_approval/response_view_type) 변경 시
--        api_stage 강제 20 (i_api_stage 무시)
--        NULL 입력 시 기존 값 유지 (COALESCE)
-- 테이블 적용 순서 : api → api_index_sync_queue
-- --------------------------------- --

    DECLARE v_now                     DATETIME DEFAULT NOW();
    DECLARE v_actual_role_code        INT;
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

        SELECT `project_id`, `api_code`, `endpoint`, `is_required_approval`, `response_view_type`, `api_stage`
        INTO   v_project_id, v_old_api_code, v_old_endpoint, v_old_is_required_approval, v_old_response_view_type, v_old_api_stage
        FROM `api`
        WHERE `api_id` = i_api_id;

        IF v_project_id IS NULL THEN
            SELECT 31006 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_updated_by, v_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code != 20 THEN
                SELECT 20001 AS RESULT;
                LEAVE transaction_block;
            END IF;
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

            INSERT INTO `api_index_sync_queue` (`api_id`, `attempt_count`, `last_error`, `updated_at`)
            VALUES (i_api_id, 0, NULL, v_now)
            ON DUPLICATE KEY UPDATE `attempt_count` = 0, `last_error` = NULL, `updated_at` = v_now;

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

DROP PROCEDURE IF EXISTS SP_UPDATE_API_EXECUTION_RESULT;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_API_EXECUTION_RESULT(
    IN  i_api_execution_id  BIGINT,        -- 대상 실행 이력 ID
    IN  i_status            TINYINT,       -- 40=SUCCESS, 50=FAILED
    IN  i_response_data     LONGTEXT,      -- 응답 데이터 (실패 시 NULL)
    IN  i_error_message     VARCHAR(2000)  -- 에러 메시지 (성공 시 NULL)
) COMMENT 'API 실행 결과 반영 - status 10/20→40/50, 이미 종결된 건은 31009로 스킵'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_API_EXECUTION_RESULT
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-29 trisakion - status IN (10,20) 가드 + ROW_COUNT() 체크 추가.
--        즉시실행 대기 중 사용자가 취소(10→60)하면 이 SP가 뒤늦게 도착한 HTTP 응답으로
--        status를 다시 40/50으로 덮어써 CANCELED가 사라지는 레이스가 있었음 — 가드 없이
--        무조건 UPDATE하던 것이 원인.
-- 내용 : HTTP 호출 결과를 api_execution 에 반영
--        status → 40(SUCCESS) 또는 50(FAILED)
--        executed_at = NOW()
--        대상 status가 10(PENDING, 즉시실행) 또는 20(APPROVED, 승인 후 실행)이 아니면
--        (취소·반려 등으로 이미 종결) 갱신하지 않고 31009 반환
-- 테이블 적용 순서 : api_execution
-- --------------------------------- --

    DECLARE v_now          DATETIME      DEFAULT NOW();

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

        START TRANSACTION;

            UPDATE `api_execution`
            SET `status`        = i_status,
                `response_data` = i_response_data,
                `error_message` = i_error_message,
                `executed_at`   = v_now,
                `updated_at`    = v_now
            WHERE `api_execution_id` = i_api_execution_id
              AND `status` IN (10, 20);

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 31009 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;

    END;

END$

DELIMITER ;

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
    IN  i_updated_by      BIGINT,        -- 수정자 user_id
    IN  i_caller_role_code INT           -- 수정자 역할 코드 (10=SUPER_ADMIN 외에는 대상 API 소속 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT 'API Request 파라미터 수정 - api_request UPDATE, api_stage 자동 롤백 포함, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_API_REQUEST
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-31 trisakion - i_caller_role_code 추가, FN_GET_PROJECT_ROLE_CODE로 DEVELOPER 권한을
--        검증+UPDATE 한 트랜잭션에서 처리(TOCTOU 창 제거). api JOIN으로 project_id 함께 조회.
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 수정 : 2026-08-12 trisakion - api_index_sync_queue INSERT 추가(같은 트랜잭션, ON DUPLICATE KEY UPDATE로
--        dedup) - RAG Phase 2(API 정의 검색) rag_server 동기화용 아웃박스 큐 적재. status만 바뀌는
--        경우(롤백 미트리거)도 검색 인덱스 반영 대상이라 v_do_rollback과 무관하게 항상 큐에 적재한다.
-- 내용 : API Request 파라미터 수정
--        api_request 존재 검사 (31007)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        parameter_name 변경 시 API 내 중복 검사 (32001)
--        롤백 트리거 필드(parameter_name/parameter_type/component_type/code_group_id/is_required) 변경 시
--        api.api_stage = 20 자동 설정
-- 테이블 적용 순서 : api_request → api(조건부) → api_index_sync_queue
-- --------------------------------- --

    DECLARE v_now                  DATETIME DEFAULT NOW();
    DECLARE v_api_id               BIGINT;
    DECLARE v_project_id           BIGINT;
    DECLARE v_actual_role_code     INT;
    DECLARE v_old_parameter_name   VARCHAR(100);
    DECLARE v_old_parameter_type   TINYINT;
    DECLARE v_old_component_type   TINYINT;
    DECLARE v_old_code_group_id    INT;
    DECLARE v_old_is_required      TINYINT;
    DECLARE v_do_rollback          TINYINT DEFAULT 0;

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

        SELECT `api_id`, `parameter_name`, `parameter_type`, `component_type`, `code_group_id`, `is_required`
        INTO   v_api_id, v_old_parameter_name, v_old_parameter_type, v_old_component_type, v_old_code_group_id, v_old_is_required
        FROM `api_request`
        WHERE `api_request_id` = i_api_request_id;

        IF v_api_id IS NULL THEN
            SELECT 31007 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            SELECT `project_id` INTO v_project_id FROM `api` WHERE `api_id` = v_api_id;
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_updated_by, v_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code != 20 THEN
                SELECT 20001 AS RESULT;
                LEAVE transaction_block;
            END IF;
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

            INSERT INTO `api_index_sync_queue` (`api_id`, `attempt_count`, `last_error`, `updated_at`)
            VALUES (v_api_id, 0, NULL, v_now)
            ON DUPLICATE KEY UPDATE `attempt_count` = 0, `last_error` = NULL, `updated_at` = v_now;

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

DROP PROCEDURE IF EXISTS SP_UPDATE_API_RESPONSE;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_API_RESPONSE(
    IN  i_api_response_id  BIGINT,        -- 수정할 API Response 파라미터 ID
    IN  i_parameter_name   VARCHAR(100),  -- 응답 항목명 (NULL=변경 없음)
    IN  i_parameter_label  VARCHAR(100),  -- 화면 표시명 (NULL=변경 없음)
    IN  i_parameter_type   TINYINT,       -- 데이터 타입 (NULL=변경 없음)
    IN  i_code_group_id    INT,           -- 코드 그룹 ID (NULL=변경 없음)
    IN  i_description      VARCHAR(1000), -- 설명 (NULL=변경 없음)
    IN  i_display_order    INT,           -- 표시 순서 (NULL=변경 없음)
    IN  i_status           TINYINT,       -- 상태 (NULL=변경 없음)
    IN  i_updated_by       BIGINT,        -- 수정자 user_id
    IN  i_caller_role_code INT            -- 수정자 역할 코드 (10=SUPER_ADMIN 외에는 대상 API 소속 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT 'API Response 파라미터 수정 - api_response UPDATE, api_stage 자동 롤백 포함, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_API_RESPONSE
-- 작성 : 2026-06-30 trisakion
-- 수정 : 2026-07-31 trisakion - i_caller_role_code 추가, FN_GET_PROJECT_ROLE_CODE로 DEVELOPER 권한을
--        검증+UPDATE 한 트랜잭션에서 처리(TOCTOU 창 제거). api JOIN으로 project_id 함께 조회.
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 수정 : 2026-08-12 trisakion - api_index_sync_queue INSERT 추가(같은 트랜잭션, ON DUPLICATE KEY UPDATE로
--        dedup) - RAG Phase 2(API 정의 검색) rag_server 동기화용 아웃박스 큐 적재. status만 바뀌는
--        경우(롤백 미트리거)도 검색 인덱스 반영 대상이라 v_do_rollback과 무관하게 항상 큐에 적재한다.
-- 내용 : API Response 파라미터 수정
--        api_response 존재 검사 (31008)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        parameter_name 변경 시 API 내 중복 검사 (32001)
--        롤백 트리거 필드(parameter_name/parameter_type/code_group_id) 변경 시
--        api.api_stage = 20 자동 설정
-- 테이블 적용 순서 : api_response → api(조건부) → api_index_sync_queue
-- --------------------------------- --

    DECLARE v_now                 DATETIME DEFAULT NOW();
    DECLARE v_api_id              BIGINT;
    DECLARE v_project_id          BIGINT;
    DECLARE v_actual_role_code    INT;
    DECLARE v_old_parameter_name  VARCHAR(100);
    DECLARE v_old_parameter_type  TINYINT;
    DECLARE v_old_code_group_id   INT;
    DECLARE v_do_rollback         TINYINT DEFAULT 0;

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

        SELECT `api_id`, `parameter_name`, `parameter_type`, `code_group_id`
        INTO   v_api_id, v_old_parameter_name, v_old_parameter_type, v_old_code_group_id
        FROM `api_response`
        WHERE `api_response_id` = i_api_response_id;

        IF v_api_id IS NULL THEN
            SELECT 31008 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            SELECT `project_id` INTO v_project_id FROM `api` WHERE `api_id` = v_api_id;
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_updated_by, v_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code != 20 THEN
                SELECT 20001 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        -- parameter_name 변경 시 중복 검사
        IF i_parameter_name IS NOT NULL AND i_parameter_name != v_old_parameter_name THEN
            IF EXISTS (SELECT 1 FROM `api_response` WHERE `api_id` = v_api_id AND `parameter_name` = i_parameter_name AND `api_response_id` != i_api_response_id) THEN
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
        IF (i_code_group_id IS NOT NULL AND i_code_group_id != v_old_code_group_id) THEN
            SET v_do_rollback = 1;
        END IF;

        START TRANSACTION;

            UPDATE `api_response`
            SET `parameter_name`  = COALESCE(i_parameter_name,  `parameter_name`),
                `parameter_label` = COALESCE(i_parameter_label, `parameter_label`),
                `parameter_type`  = COALESCE(i_parameter_type,  `parameter_type`),
                `code_group_id`   = COALESCE(i_code_group_id,   `code_group_id`),
                `description`     = COALESCE(i_description,     `description`),
                `display_order`   = COALESCE(i_display_order,   `display_order`),
                `status`          = COALESCE(i_status,          `status`),
                `updated_by`      = i_updated_by
            WHERE `api_response_id` = i_api_response_id;

            IF v_do_rollback = 1 THEN
                UPDATE `api`
                SET `api_stage`  = 20,
                    `updated_by` = i_updated_by
                WHERE `api_id` = v_api_id;
            END IF;

            INSERT INTO `api_index_sync_queue` (`api_id`, `attempt_count`, `last_error`, `updated_at`)
            VALUES (v_api_id, 0, NULL, v_now)
            ON DUPLICATE KEY UPDATE `attempt_count` = 0, `last_error` = NULL, `updated_at` = v_now;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `api_response_id`, `api_id`, `parameter_name`, `parameter_label`,
               `parameter_type`, `code_group_id`, `description`,
               `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `api_response`
        WHERE `api_response_id` = i_api_response_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_UPDATE_CODE_GROUP;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_CODE_GROUP(
    IN  i_code_group_id    INT,            -- 수정할 코드 그룹 ID
    IN  i_code_group_name  VARCHAR(200),   -- 코드 그룹명 (NULL=변경 없음)
    IN  i_description      VARCHAR(1000),  -- 설명 (NULL=변경 없음)
    IN  i_status           TINYINT,        -- 상태 (NULL=변경 없음)
    IN  i_updated_by       BIGINT,         -- 수정자 user_id
    IN  i_caller_role_code INT             -- 수정자 역할 코드 (10=SUPER_ADMIN 외에는 대상 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT '코드 그룹 수정 - code_group UPDATE, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_CODE_GROUP
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-31 trisakion - i_caller_role_code 추가, FN_GET_PROJECT_ROLE_CODE로 DEVELOPER 권한을
--        검증+UPDATE 한 트랜잭션에서 처리(TOCTOU 창 제거). 존재 검사를 project_id도 함께
--        얻도록 SELECT INTO로 변경.
-- 내용 : 코드 그룹 수정
--        code_group 존재 검사 (31004)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        NULL 입력 시 기존 값 유지 (COALESCE)
--        code_group_code, project_id 수정 불가
-- 테이블 적용 순서 : code_group
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

        SELECT `project_id` INTO v_project_id FROM `code_group` WHERE `code_group_id` = i_code_group_id;

        IF v_project_id IS NULL THEN
            SELECT 31004 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_updated_by, v_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code != 20 THEN
                SELECT 20001 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        START TRANSACTION;

            UPDATE `code_group`
            SET `code_group_name` = COALESCE(i_code_group_name, `code_group_name`),
                `description`     = COALESCE(i_description,     `description`),
                `status`          = COALESCE(i_status,          `status`),
                `updated_by`      = i_updated_by
            WHERE `code_group_id` = i_code_group_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `code_group_id`, `project_id`, `code_group_code`, `code_group_name`,
               `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_group`
        WHERE `code_group_id` = i_code_group_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_UPDATE_CODE_ITEM;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_CODE_ITEM(
    IN  i_code_item_id   BIGINT,        -- 수정할 코드 아이템 ID
    IN  i_code_name      VARCHAR(200),  -- 코드명 (NULL=변경 없음)
    IN  i_description    VARCHAR(1000), -- 설명 (NULL=변경 없음)
    IN  i_display_order  INT,           -- 표시 순서 (NULL=변경 없음)
    IN  i_status         TINYINT,       -- 상태 (NULL=변경 없음)
    IN  i_updated_by     BIGINT,        -- 수정자 user_id
    IN  i_caller_role_code INT          -- 수정자 역할 코드 (10=SUPER_ADMIN 외에는 대상 코드 그룹 소속 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT '코드 아이템 수정 - code_item UPDATE, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_CODE_ITEM
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-31 trisakion - i_caller_role_code 추가, FN_GET_PROJECT_ROLE_CODE로 DEVELOPER 권한을
--        검증+UPDATE 한 트랜잭션에서 처리(TOCTOU 창 제거). code_group JOIN으로 project_id 함께 조회.
-- 내용 : 코드 아이템 수정
--        code_item 존재 검사 (31005)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        NULL 입력 시 기존 값 유지 (COALESCE)
--        code_group_id, code_value 수정 불가
-- 테이블 적용 순서 : code_item
-- --------------------------------- --

    DECLARE v_code_group_id    INT;
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

        SELECT `code_group_id` INTO v_code_group_id FROM `code_item` WHERE `code_item_id` = i_code_item_id;

        IF v_code_group_id IS NULL THEN
            SELECT 31005 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            SELECT `project_id` INTO v_project_id FROM `code_group` WHERE `code_group_id` = v_code_group_id;
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_updated_by, v_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code != 20 THEN
                SELECT 20001 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        START TRANSACTION;

            UPDATE `code_item`
            SET `code_name`     = COALESCE(i_code_name,     `code_name`),
                `description`   = COALESCE(i_description,   `description`),
                `display_order` = COALESCE(i_display_order, `display_order`),
                `status`        = COALESCE(i_status,        `status`),
                `updated_by`    = i_updated_by
            WHERE `code_item_id` = i_code_item_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `code_item_id`, `code_group_id`, `code_value`, `code_name`,
               `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_item`
        WHERE `code_item_id` = i_code_item_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_UPDATE_COMPANY;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_COMPANY(
    IN  i_company_id       BIGINT,        -- 수정할 회사 ID
    IN  i_company_code     VARCHAR(20),   -- 회사 코드 (NULL=변경 없음)
    IN  i_company_name     VARCHAR(100),  -- 회사명 (NULL=변경 없음)
    IN  i_description      VARCHAR(1000), -- 설명 (NULL=변경 없음)
    IN  i_status           TINYINT,       -- 상태 (NULL=변경 없음)
    IN  i_caller_role_code INT            -- 요청자 역할 코드 (SUPER_ADMIN=10 외 20001)
) COMMENT '회사 수정 - company 테이블 UPDATE'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_COMPANY
-- 작성 : 2026-06-28 trisakion
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 수정 : 2026-08-18 trisakion - i_caller_role_code 추가, SUPER_ADMIN 여부를 SP 내부에서도 재검증
--        (기존엔 라우트의 requireRole만이 유일한 방어선이라, 앱 레이어 버그나 우회 호출 시 DB가
--        마지막 방어선이 되지 못했음 — API/CodeGroup 계열 SP가 이미 갖춘 방어적 이중 체크 패턴 적용)
-- 내용 : 회사 정보 수정
--        SUPER_ADMIN 외 호출 → 20001
--        company 존재 검사 후 UPDATE
--        company_code 변경 시 중복 검사 (본인 제외)
--        NULL 입력 시 기존 값 유지 (COALESCE)
-- 테이블 적용 순서 : company
-- --------------------------------- --

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

        IF i_caller_role_code != 10 THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `company` WHERE `company_id` = i_company_id) THEN
            SELECT 31001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_company_code IS NOT NULL AND
           EXISTS (SELECT 1 FROM `company` WHERE `company_code` = i_company_code AND `company_id` != i_company_id) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `company`
            SET `company_code` = COALESCE(i_company_code, `company_code`),
                `company_name` = COALESCE(i_company_name, `company_name`),
                `description`  = COALESCE(i_description,  `description`),
                `status`       = COALESCE(i_status,       `status`)
            WHERE `company_id` = i_company_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT `company_id`, `company_code`, `company_name`, `description`, `status`, `created_at`, `updated_at`
        FROM `company`
        WHERE `company_id` = i_company_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_UPDATE_PASSWORD;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_PASSWORD(
    IN  i_user_id           BIGINT,       -- 사용자 ID
    IN  i_password_hash     VARCHAR(255)  -- 새 비밀번호 해시
) COMMENT '비밀번호 변경 - password_hash 갱신 및 모든 활성 세션 종료'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_PASSWORD
-- 작성 : 2026-06-28 trisakion
-- 내용 : PATCH /auth/password 처리
--        비밀번호 갱신 후 해당 사용자의 모든 활성 세션을 즉시 종료
--        두 작업을 하나의 트랜잭션으로 처리하여 원자성 보장
-- 테이블 적용 순서 : user → user_session
-- --------------------------------- --

    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
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

        START TRANSACTION;

            UPDATE `user`
            SET    `password_hash` = i_password_hash
            WHERE  `user_id` = i_user_id;

            UPDATE `user_session`
            SET    `status` = 0
            WHERE  `user_id` = i_user_id
              AND  `status`  = 1;

        COMMIT;

        SELECT 0 AS RESULT;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_UPDATE_PROJECT;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_PROJECT(
    IN  i_project_id       BIGINT,        -- 수정할 프로젝트 ID
    IN  i_project_code     VARCHAR(20),   -- 프로젝트 코드 (NULL=변경 없음)
    IN  i_project_name     VARCHAR(100),  -- 프로젝트명 (NULL=변경 없음)
    IN  i_description      VARCHAR(1000), -- 설명 (NULL=변경 없음)
    IN  i_status           TINYINT,       -- 상태 (NULL=변경 없음)
    IN  i_caller_role_code INT            -- 요청자 역할 코드 (SUPER_ADMIN=10 외 20001)
) COMMENT '프로젝트 수정 - project 테이블 UPDATE'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_PROJECT
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-15 trisakion - api_base_url을 SP_UPDATE_PROJECT_CONNECTION으로 분리(DEVELOPER도 수정 가능하게 열 예정이라 프로젝트 정체성 필드와 쓰기 권한을 나눔)
-- 수정 : 2026-07-15 trisakion - has_api_key(발급 여부) 반환 추가
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 수정 : 2026-08-18 trisakion - i_caller_role_code 추가, SUPER_ADMIN 여부를 SP 내부에서도 재검증
--        (기존엔 라우트의 requireRole만이 유일한 방어선이라, 앱 레이어 버그나 우회 호출 시 DB가
--        마지막 방어선이 되지 못했음 — API/CodeGroup 계열 SP가 이미 갖춘 방어적 이중 체크 패턴 적용)
-- 내용 : 프로젝트 정보 수정 (project_code/project_name/description/status만, api_base_url은 SP_UPDATE_PROJECT_CONNECTION 전용)
--        SUPER_ADMIN 외 호출 → 20001
--        project 존재 검사 후 UPDATE
--        project_code 변경 시 동일 company 내 중복 검사 (본인 제외)
--        NULL 입력 시 기존 값 유지 (COALESCE)
--        수정된 project 전체 정보 반환 (company 정보 포함)
-- 테이블 적용 순서 : project
-- --------------------------------- --

    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
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

        IF i_caller_role_code != 10 THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `project` WHERE `project_id` = i_project_id) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_project_code IS NOT NULL AND
           EXISTS (
               SELECT 1 FROM `project`
               WHERE `company_id` = (SELECT `company_id` FROM `project` WHERE `project_id` = i_project_id)
                 AND `project_code` = i_project_code
                 AND `project_id` != i_project_id
           ) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `project`
            SET `project_code` = COALESCE(i_project_code, `project_code`),
                `project_name` = COALESCE(i_project_name, `project_name`),
                `description`  = COALESCE(i_description,  `description`),
                `status`       = COALESCE(i_status,       `status`)
            WHERE `project_id` = i_project_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT p.`project_id`, p.`company_id`, c.`company_code`, c.`company_name`,
               p.`project_code`, p.`project_name`, p.`api_base_url`, p.`description`,
               p.`status`, IF(p.`api_key` IS NOT NULL, 1, 0) AS has_api_key,
               p.`created_at`, p.`updated_at`
        FROM `project` p
        JOIN `company` c ON c.`company_id` = p.`company_id`
        WHERE p.`project_id` = i_project_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_UPDATE_PROJECT_CONNECTION;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_PROJECT_CONNECTION(
    IN  i_project_id        BIGINT,       -- 수정할 프로젝트 ID
    IN  i_api_base_url      VARCHAR(255), -- 변경할 API Base URL
    IN  i_caller_user_id    BIGINT,       -- 호출자 user_id (프로젝트별 역할 재검증용)
    IN  i_caller_role_code  INT           -- 호출자 역할 코드 (10=SUPER_ADMIN 외에는 대상 프로젝트 실제 DEVELOPER 권한 재검증)
) COMMENT '프로젝트 연결 정보(api_base_url) 수정 - project 테이블 UPDATE, 프로젝트 DEVELOPER 권한 원자적 재검증'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_PROJECT_CONNECTION
-- 작성 : 2026-07-15 trisakion
-- 수정 : 2026-07-15 trisakion - api_base_url 변경 시 저장된 api_key를 함께 NULL 폐기(대상 서버가 바뀌었는데
--        옛 키를 그대로 보내는 조용한 실수 방지), has_api_key(발급 여부) 반환 추가
-- 수정 : 2026-07-31 trisakion - i_caller_user_id/i_caller_role_code 추가(기존엔 호출자 정보 자체가
--        없어 서비스 레이어가 별도 SP 라운드트립인 assertProjectRole로 먼저 검증했음), FN_GET_PROJECT_ROLE_CODE로
--        DEVELOPER 권한을 검증+UPDATE 한 트랜잭션에서 처리(TOCTOU 창 제거)
-- 내용 : 프로젝트의 api_base_url만 수정 (project_code/project_name/description/status는 SP_UPDATE_PROJECT 전용)
--        project 존재 검사 (31002)
--        SUPER_ADMIN 외 대상 프로젝트에 DEVELOPER 활성 권한 없음 → 20001
--        UPDATE (api_base_url 변경과 함께 api_key도 NULL로 폐기)
--        SUPER_ADMIN 외에 DEVELOPER도 호출 가능한 라우트라 project_code 등 정체성 필드와 SP 자체를 분리해둠
--        수정된 project 전체 정보 반환 (company 정보 포함)
-- 테이블 적용 순서 : project
-- --------------------------------- --

    DECLARE v_actual_role_code  INT;

    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
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

        IF NOT EXISTS (SELECT 1 FROM `project` WHERE `project_id` = i_project_id) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_caller_role_code != 10 THEN
            SET v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(i_caller_user_id, i_project_id);
            IF v_actual_role_code IS NULL OR v_actual_role_code != 20 THEN
                SELECT 20001 AS RESULT;
                LEAVE transaction_block;
            END IF;
        END IF;

        START TRANSACTION;

            UPDATE `project`
            SET `api_base_url` = i_api_base_url,
                `api_key`      = NULL
            WHERE `project_id` = i_project_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT p.`project_id`, p.`company_id`, c.`company_code`, c.`company_name`,
               p.`project_code`, p.`project_name`, p.`api_base_url`, p.`description`,
               p.`status`, IF(p.`api_key` IS NOT NULL, 1, 0) AS has_api_key,
               p.`created_at`, p.`updated_at`
        FROM `project` p
        JOIN `company` c ON c.`company_id` = p.`company_id`
        WHERE p.`project_id` = i_project_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_UPDATE_SESSION_JTI;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_SESSION_JTI(
    IN  i_session_id        BIGINT,       -- 세션 ID
    IN  i_access_token_jti  VARCHAR(100), -- 새 Access Token JTI
    IN  i_expected_jti      VARCHAR(100)  -- 호출자가 조회 시점에 읽은 기존 access_token_jti (동시수정 감지용)
) COMMENT 'Access Token 재발급 시 세션의 JTI 갱신 - 동시 refresh 감지 시 10009로 스킵'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_SESSION_JTI
-- 작성 : 2026-06-28 trisakion
-- 수정 : 2026-07-29 trisakion - i_expected_jti 파라미터 추가, UPDATE에
--        AND access_token_jti = i_expected_jti 가드 + ROW_COUNT() 체크 추가.
--        동일 refresh_token으로 거의 동시에 두 refresh 요청이 들어오면 둘 다 조회를 통과해
--        각자 다른 JTI로 이 SP를 호출했고, 조건 없이 무조건 UPDATE하던 것이 원인이 되어
--        나중에 커밋된 요청의 JTI만 유효해지고 먼저 응답받은 클라이언트의 access_token은
--        즉시 10009로 무효화되는 레이스가 있었음 — 조회 시점 jti가 그새 바뀌었으면(다른
--        요청이 먼저 refresh) 갱신하지 않고 바로 10009 반환.
-- 내용 : POST /auth/refresh 처리 후 새 JTI로 세션 갱신
--        last_access_at도 함께 갱신
--        조회 시점의 access_token_jti가 현재 값과 다르면(동시 refresh) 갱신하지 않고 10009 반환
-- 테이블 적용 순서 : user_session
-- --------------------------------- --

    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
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

        START TRANSACTION;

            UPDATE `user_session`
            SET    `access_token_jti` = i_access_token_jti,
                   `last_access_at`   = NOW()
            WHERE  `session_id` = i_session_id
              AND  `access_token_jti` = i_expected_jti;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 10009 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_UPDATE_USER;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_USER(
    IN  i_user_id          BIGINT,        -- 수정할 사용자 ID
    IN  i_user_name        VARCHAR(100),  -- 이름 (NULL=변경 없음)
    IN  i_email            VARCHAR(200),  -- 이메일 (NULL=변경 없음)
    IN  i_phone_number     VARCHAR(255),  -- 휴대폰 번호 (암호화된 값, NULL=변경 없음)
    IN  i_department       VARCHAR(100),  -- 부서 (NULL=변경 없음)
    IN  i_position         VARCHAR(100),  -- 직급 (NULL=변경 없음)
    IN  i_status           TINYINT,       -- 상태 (NULL=변경 없음)
    IN  i_caller_role_code INT            -- 요청자 역할 코드 (SUPER_ADMIN=10 외 20001)
) COMMENT '사용자 수정 - user 테이블 UPDATE'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_USER
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 수정 : 2026-08-18 trisakion - i_caller_role_code 추가, SUPER_ADMIN 여부를 SP 내부에서도 재검증
--        (기존엔 라우트의 requireRole만이 유일한 방어선이라, 앱 레이어 버그나 우회 호출 시 DB가
--        마지막 방어선이 되지 못했음 — API/CodeGroup 계열 SP가 이미 갖춘 방어적 이중 체크 패턴 적용)
-- 내용 : 사용자 정보 수정
--        SUPER_ADMIN 외 호출 → 20001
--        user 존재 검사 후 UPDATE
--        email 변경 시 중복 검사 (본인 제외)
--        NULL 입력 시 기존 값 유지 (COALESCE)
-- 테이블 적용 순서 : user
-- --------------------------------- --

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

        IF i_caller_role_code != 10 THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `user` WHERE `user_id` = i_user_id) THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_email IS NOT NULL AND
           EXISTS (SELECT 1 FROM `user` WHERE `email` = i_email AND `user_id` != i_user_id) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `user`
            SET `user_name`    = COALESCE(i_user_name,    `user_name`),
                `email`        = COALESCE(i_email,        `email`),
                `phone_number` = COALESCE(i_phone_number, `phone_number`),
                `department`   = COALESCE(i_department,   `department`),
                `position`     = COALESCE(i_position,     `position`),
                `status`       = COALESCE(i_status,       `status`)
            WHERE `user_id` = i_user_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT u.`user_id`, u.`company_id`, c.`company_code`, c.`company_name`,
               u.`requested_project_id`, u.`login_id`, u.`user_name`, u.`email`,
               u.`phone_number`, u.`department`, u.`position`,
               u.`status`, u.`last_login_at`, u.`created_at`, u.`updated_at`
        FROM   `user` u
        JOIN   `company` c ON c.`company_id` = u.`company_id`
        WHERE  u.`user_id` = i_user_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_UPDATE_USER_ROLE;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_USER_ROLE(
    IN  i_user_id          BIGINT,   -- 사용자 ID
    IN  i_project_id       BIGINT,   -- 프로젝트 ID
    IN  i_role_code        TINYINT,  -- 역할 코드 (NULL=변경 없음)
    IN  i_status           TINYINT,  -- 상태 (NULL=변경 없음)
    IN  i_caller_role_code INT       -- 요청자 역할 코드 (SUPER_ADMIN=10 외 20001)
) COMMENT 'User Role 수정 - user_role UPDATE'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_USER_ROLE
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-08-18 trisakion - i_caller_role_code 추가, SUPER_ADMIN 여부를 SP 내부에서도 재검증
--        (기존엔 라우트의 requireRole만이 유일한 방어선이라, 앱 레이어 버그나 우회 호출 시 DB가
--        마지막 방어선이 되지 못했음 — API/CodeGroup 계열 SP가 이미 갖춘 방어적 이중 체크 패턴 적용)
-- 내용 : user_role 수정
--        SUPER_ADMIN 외 호출 → 20001
--        user_role 존재 검사 (30003)
--        role_code 변경 시 범위 검사 - SUPER_ADMIN(10) 변경 불가 (30003)
--        NULL 입력 시 기존 값 유지 (COALESCE)
-- 테이블 적용 순서 : user_role
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

        IF i_caller_role_code != 10 THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `user_role` WHERE `user_id` = i_user_id AND `project_id` = i_project_id) THEN
            SELECT 30003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_role_code IS NOT NULL AND i_role_code NOT IN (20, 30, 40) THEN
            SELECT 30003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `user_role`
            SET `role_code` = COALESCE(i_role_code, `role_code`),
                `status`    = COALESCE(i_status,    `status`)
            WHERE `user_id` = i_user_id AND `project_id` = i_project_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT ur.`user_id`, u.`login_id`, u.`user_name`,
               ur.`project_id`, p.`project_code`, p.`project_name`,
               ur.`role_code`, ur.`status`, ur.`created_at`, ur.`updated_at`
        FROM `user_role` ur
        JOIN `user`    u ON u.`user_id`    = ur.`user_id`
        JOIN `project` p ON p.`project_id` = ur.`project_id`
        WHERE ur.`user_id` = i_user_id AND ur.`project_id` = i_project_id;

    END;

END$

DELIMITER ;

