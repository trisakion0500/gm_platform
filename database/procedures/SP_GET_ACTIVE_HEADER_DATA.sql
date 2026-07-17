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
