DROP FUNCTION IF EXISTS FN_HAS_COMPANY_ROLE;
DELIMITER $
CREATE FUNCTION FN_HAS_COMPANY_ROLE(
    p_role_code           INT,    -- 요청자 역할 코드 (10=SUPER_ADMIN, 배정과 무관하게 항상 TRUE)
    p_caller_company_id   BIGINT, -- 요청자 소속 회사 ID
    p_target_company_id   BIGINT  -- 확인할 대상 회사 ID
) RETURNS TINYINT(1)
DETERMINISTIC
COMMENT 'SUPER_ADMIN이거나 요청자 소속 회사와 대상 회사가 일치하는지 여부 반환 - 회사 스코핑 체크 공용화'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_HAS_COMPANY_ROLE
-- 작성 : 2026-08-18 trisakion
-- 내용 : p_role_code가 10(SUPER_ADMIN)이면 배정과 무관하게 항상 TRUE.
--        그 외에는 p_caller_company_id와 p_target_company_id 일치 여부를 반환.
--        SP들의 "i_role_code = 10 OR company_id = i_company_id" 반복 패턴을 공용 함수로 추출
--        (FN_HAS_PROJECT_ROLE이 프로젝트 스코핑을 공용화한 것과 동일한 사유 - 4곳 6군데 반복).
-- --------------------------------- --

    IF p_role_code = 10 THEN
        RETURN 1;
    END IF;

    RETURN p_caller_company_id = p_target_company_id;

END$
DELIMITER ;
