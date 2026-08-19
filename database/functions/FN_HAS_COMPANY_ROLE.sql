DROP FUNCTION IF EXISTS FN_HAS_COMPANY_ROLE;
DELIMITER $
CREATE FUNCTION FN_HAS_COMPANY_ROLE(
    p_role_code           INT,    -- (더 이상 신뢰하지 않음, 무시됨 — 콜사이트 불변을 위해 파라미터만 유지) SUPER_ADMIN 판정은 FN_IS_SUPER_ADMIN(p_caller_user_id)로 재검증
    p_caller_user_id      BIGINT, -- 요청자 user_id (SUPER_ADMIN 재검증용, 신규)
    p_caller_company_id   BIGINT, -- 요청자 소속 회사 ID
    p_target_company_id   BIGINT  -- 확인할 대상 회사 ID
) RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
COMMENT 'SUPER_ADMIN이거나 요청자 소속 회사와 대상 회사가 일치하는지 여부 반환 - 회사 스코핑 체크 공용화'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_HAS_COMPANY_ROLE
-- 작성 : 2026-08-18 trisakion
-- 수정 : 2026-08-19 trisakion - p_role_code(앱이 전달한 값)를 그대로 신뢰하던 것을
--        FN_IS_SUPER_ADMIN(p_caller_user_id) DB 재검증으로 전환(sp-convention-validator 지적, 4.2
--        "SP는 호출자의 role_code 값을 앱으로부터 전달받아 신뢰하지 않는다" 위반). 이 함수는
--        FN_HAS_PROJECT_ROLE/FN_IS_PROJECT_DEVELOPER와 달리 애초에 user_id를 받지 않아 그 둘처럼
--        파라미터만 무시하는 식으로는 재검증이 불가능했다 — p_caller_user_id를 신규 파라미터로
--        추가(2번째 자리)했고, 이를 원래 안 받던 SP_GET_COMPANY/SP_GET_COMPANY_LIST/SP_GET_USER_LIST
--        3개 SP에 i_caller_user_id 파라미터를 신설해 TS 컨트롤러의 req.user.user_id까지 관통시켰다.
--        company.service.ts의 updateCompany가 "before" 상태 조회에 쓰는 db.getCompany(companyId, 10, 0)
--        (스코핑 우회, 항상 조회 성공해야 함)도 이 함수를 거치므로, FN_HAS_PROJECT_ROLE과 동일하게
--        p_caller_user_id=0(실제 로그인 사용자일 수 없는 내부 전용 sentinel, 5.3 SYSTEM sentinel과
--        동일 원리)이면 p_role_code를 그대로 신뢰하는 예외를 둔다.
-- 내용 : p_caller_user_id=0(내부 전용 sentinel)이면 p_role_code를 그대로 신뢰(항상 10으로 호출됨).
--        그 외에는 p_caller_user_id가 실제 SUPER_ADMIN으로 배정돼 있으면 배정과 무관하게 항상 TRUE,
--        아니면 p_caller_company_id와 p_target_company_id 일치 여부를 반환.
--        SP들의 "i_role_code = 10 OR company_id = i_company_id" 반복 패턴을 공용 함수로 추출
--        (FN_HAS_PROJECT_ROLE이 프로젝트 스코핑을 공용화한 것과 동일한 사유 - 4곳 6군데 반복).
-- --------------------------------- --

    IF p_caller_user_id = 0 THEN
        RETURN p_role_code = 10;
    END IF;

    IF FN_IS_SUPER_ADMIN(p_caller_user_id) THEN
        RETURN 1;
    END IF;

    RETURN p_caller_company_id = p_target_company_id;

END$
DELIMITER ;
