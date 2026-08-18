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
