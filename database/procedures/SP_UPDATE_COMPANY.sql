DROP PROCEDURE IF EXISTS SP_UPDATE_COMPANY;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_COMPANY(
    IN  i_company_id    BIGINT,        -- 수정할 회사 ID
    IN  i_company_code  VARCHAR(20),   -- 회사 코드 (NULL=변경 없음)
    IN  i_company_name  VARCHAR(100),  -- 회사명 (NULL=변경 없음)
    IN  i_description   VARCHAR(1000), -- 설명 (NULL=변경 없음)
    IN  i_status        TINYINT        -- 상태 (NULL=변경 없음)
) COMMENT '회사 수정 - company 테이블 UPDATE'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_COMPANY
-- 작성 : 2026-06-28 trisakion
-- 내용 : 회사 정보 수정
--        company 존재 검사 후 UPDATE
--        company_code 변경 시 중복 검사 (본인 제외)
--        NULL 입력 시 기존 값 유지 (COALESCE)
-- 테이블 적용 순서 : company
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
