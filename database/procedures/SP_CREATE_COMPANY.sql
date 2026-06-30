DROP PROCEDURE IF EXISTS SP_CREATE_COMPANY;
DELIMITER $
CREATE PROCEDURE SP_CREATE_COMPANY(
    IN  i_company_code  VARCHAR(20),   -- 회사 코드
    IN  i_company_name  VARCHAR(100),  -- 회사명
    IN  i_description   VARCHAR(1000)  -- 설명 (NULL 허용)
) COMMENT '회사 생성 - company 테이블 INSERT'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_COMPANY
-- 작성 : 2026-06-28 trisakion
-- 내용 : 회사 생성 처리
--        company_code 중복 검사 후 company INSERT
--        생성된 company 전체 정보 반환
-- 테이블 적용 순서 : company
-- --------------------------------- --

    DECLARE v_company_id   BIGINT        DEFAULT NULL;
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
