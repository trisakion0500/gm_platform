DROP PROCEDURE IF EXISTS SP_CREATE_COMPANY;
DELIMITER $
CREATE PROCEDURE SP_CREATE_COMPANY(
    IN  i_company_code   VARCHAR(20),   -- 회사 코드
    IN  i_company_name   VARCHAR(100),  -- 회사명
    IN  i_description    VARCHAR(1000), -- 설명 (NULL 허용)
    IN  i_caller_user_id BIGINT         -- 요청자 user_id (SP 내부에서 SUPER_ADMIN 실배정 재검증)
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
-- 수정 : 2026-08-19 trisakion - i_caller_role_code를 i_caller_user_id로 교체, FN_IS_SUPER_ADMIN이
--        앱이 넘긴 role_code 값을 그대로 신뢰하지 않고 user_id로 DB 재검증하도록 변경
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

        IF NOT FN_IS_SUPER_ADMIN(i_caller_user_id) THEN
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
