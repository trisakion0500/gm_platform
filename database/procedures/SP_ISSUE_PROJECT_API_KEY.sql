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
