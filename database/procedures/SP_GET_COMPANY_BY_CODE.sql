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
