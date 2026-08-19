DROP FUNCTION IF EXISTS FN_IS_PROJECT_DEVELOPER;
DELIMITER $
CREATE FUNCTION FN_IS_PROJECT_DEVELOPER(
    p_role_code   INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN, 배정과 무관하게 항상 TRUE)
    p_user_id     BIGINT,  -- 확인할 사용자 ID
    p_project_id  BIGINT   -- 확인할 프로젝트 ID
) RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
COMMENT 'SUPER_ADMIN이거나 해당 프로젝트에 실제 DEVELOPER(20)로 배정됐는지 여부 반환 - 프로젝트 단위 DEVELOPER 권한 스코핑 체크 공용화'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_IS_PROJECT_DEVELOPER
-- 작성 : 2026-08-18 trisakion
-- 수정 : 2026-08-19 trisakion - API/CodeGroup/CodeItem/ProjectConnection/ProjectApiKey 계열 12개 SP에
--        반복되던 "IF i_caller_role_code != 10 THEN v_actual_role_code = FN_GET_PROJECT_ROLE_CODE(...) ...
--        END IF" 인라인 블록을 이 함수 호출로 공용화(sp-convention-validator 지적) — COMMENT의
--        "관리 화면" 한정 표현도 실제 재사용 범위에 맞춰 일반화
-- 수정 : 2026-08-19 trisakion - 미배정(NULL) 시 FN_GET_PROJECT_ROLE_CODE(...) = 20이 NULL이 되어
--        "IF NOT FN_IS_PROJECT_DEVELOPER(...) THEN"가 조건 자체를 거짓 취급(NOT NULL도 NULL)하며
--        20001 분기를 건너뛰는 권한 우회가 있었음(테스트로 실측 발견) — COALESCE로 NULL을 0으로
--        명시 확정해 미배정이면 항상 false가 되도록 수정
-- 내용 : p_role_code가 10(SUPER_ADMIN)이면 배정과 무관하게 항상 TRUE.
--        그 외에는 p_user_id가 p_project_id에 실제 role_code=20(DEVELOPER)으로 배정됐는지 반환
--        (FN_HAS_PROJECT_ROLE은 "아무 역할이나 배정"이면 통과하는 전 역할 공용 화면 기준이라
--        DEVELOPER 전용 쓰기 권한 스코핑에는 쓸 수 없어 별도 함수로 분리).
-- --------------------------------- --

    IF p_role_code = 10 THEN
        RETURN 1;
    END IF;

    RETURN COALESCE(FN_GET_PROJECT_ROLE_CODE(p_user_id, p_project_id), 0) = 20;

END$
DELIMITER ;
