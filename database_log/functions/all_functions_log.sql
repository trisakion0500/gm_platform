-- ------------------------------------------------------------------------------------------------------------ --
-- 로그 전용 DB(예: gm_platform_log) 통합 Function 파일. 메인 DB(gm_platform) 대상 Function은
-- database/functions/all_functions.sql에 별도로 있다. 이 DB는 메인 DB의 어떤 테이블에도 물리적으로
-- 접근할 수 없어(4.2) 메인 DB의 FN_IS_SUPER_ADMIN 등을 재사용할 수 없다 — 이 파일의 Function들은
-- p_role_code를 앱으로부터 그대로 신뢰하는 것이 의도된 예외다(방어적 이중 체크 불가, 앱 레이어가
-- 유일한 권한 판단 지점). 개별 파일을 수정하면 이 파일도 반드시 함께 갱신할 것
-- (all_procedures_log.sql과 동일한 동기화 원칙).
-- ------------------------------------------------------------------------------------------------------------ --
DROP FUNCTION IF EXISTS FN_HAS_LOG_AUDIT_ACCESS;
DELIMITER $
CREATE FUNCTION FN_HAS_LOG_AUDIT_ACCESS(
    p_role_code           INT,           -- 요청자 역할 코드 (10=SUPER_ADMIN, 항상 TRUE)
    p_allowed_project_ids VARCHAR(4000), -- 요청자가 role_code<=30(SA/DEV/APV)으로 실제 배정된 project_id 콤마 목록
    p_caller_company_id   BIGINT,        -- 요청자 company_id
    p_project_id          BIGINT,        -- 대상 로그의 project_id (NULL 가능)
    p_company_id          BIGINT         -- 대상 로그의 company_id
) RETURNS TINYINT(1)
DETERMINISTIC
COMMENT 'project_id 있는 로그는 project_id 배정 여부, 없는 로그는 회사 일치 여부로 접근권한 판정 - log_audit 조회 SP 3곳의 반복 조건절 공용화'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_HAS_LOG_AUDIT_ACCESS
-- 작성 : 2026-08-18 trisakion
-- 내용 : p_role_code=10이면 항상 TRUE. project_id 있는 로그는 FIND_IN_SET으로 배정 여부,
--        project_id 없는 로그(company/user 테이블 변경)는 company_id 일치 여부로 판정.
--        SP_GET_LOG_AUDIT/SP_GET_LOG_AUDIT_LIST 3곳에 반복되던 조건절을 공용 함수로 추출.
-- --------------------------------- --

    IF p_role_code = 10 THEN
        RETURN 1;
    END IF;

    IF p_project_id IS NOT NULL THEN
        RETURN FIND_IN_SET(p_project_id, p_allowed_project_ids) > 0;
    END IF;

    RETURN p_company_id = p_caller_company_id;

END$
DELIMITER ;
