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
