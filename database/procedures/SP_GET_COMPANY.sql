DROP PROCEDURE IF EXISTS SP_GET_COMPANY;

DELIMITER $

CREATE PROCEDURE SP_GET_COMPANY(
    IN  i_company_id       BIGINT,  -- 조회할 회사 ID
    IN  i_role_code        INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN, 20=DEVELOPER)
    IN  i_user_company_id  BIGINT   -- 요청자 소속 회사 ID (DEVELOPER 스코핑용)
)
COMMENT '회사 단건 조회 - 역할별 스코핑'
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
