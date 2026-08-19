DROP FUNCTION IF EXISTS FN_HAS_PROJECT_ROLE;
DELIMITER $
CREATE FUNCTION FN_HAS_PROJECT_ROLE(
    p_role_code   INT,     -- (더 이상 신뢰하지 않음, 무시됨 — 콜사이트 불변을 위해 파라미터만 유지) SUPER_ADMIN 판정은 FN_IS_SUPER_ADMIN(p_user_id)로 재검증
    p_user_id     BIGINT,  -- 확인할 사용자 ID
    p_project_id  BIGINT   -- 확인할 프로젝트 ID
) RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
COMMENT 'SUPER_ADMIN이거나 해당 프로젝트에 활성(status=1) user_role을 보유했는지 여부 반환 - 조회 SP들의 프로젝트 스코핑 체크 공용화'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_HAS_PROJECT_ROLE
-- 작성 : 2026-07-17 trisakion
-- 수정 : 2026-07-17 trisakion - SUPER_ADMIN 우회(p_role_code=10)를 호출부 대신 함수 내부로 이동
-- 수정 : 2026-08-19 trisakion - p_role_code(앱이 전달한 값)를 그대로 신뢰하던 것을
--        FN_IS_SUPER_ADMIN(p_user_id) DB 재검증으로 전환(sp-convention-validator 지적: 4.2
--        "SP는 호출자의 role_code 값을 앱으로부터 전달받아 신뢰하지 않는다" 위반). 시그니처를
--        바꾸면 39곳 호출부 전체를 고쳐야 해 파라미터는 그대로 두고 내부에서만 무시한다.
--        단, logAudit.service.ts의 resolveApiScope/resolveCodeGroupScope, project.service.ts의
--        "before" 상태 조회 등 감사로그·내부 조회 전용 호출부는 실제 요청자가 아니라 TS 소스에
--        박힌 상수 (project_id/api_id, 10, 0)으로 SP_GET_API/SP_GET_CODE_GROUP/SP_GET_PROJECT를
--        호출해 스코핑을 의도적으로 우회한다(항상 조회 성공해야 함) — p_user_id=0은 실제 로그인
--        사용자일 수 없는 값(AUTO_INCREMENT는 1부터, JWT user_id는 항상 양수)이라 안전한 내부
--        전용 sentinel로 재사용(5.3 SYSTEM sentinel과 동일 원리)해 이 경우만 p_role_code를
--        그대로 신뢰하도록 예외를 둔다 — 이 값은 요청 경로로는 절대 도달할 수 없다.
-- 내용 : p_user_id=0(내부 전용 sentinel)이면 p_role_code를 그대로 신뢰(항상 10으로 호출됨).
--        그 외에는 p_user_id가 실제 SUPER_ADMIN으로 배정돼 있으면 배정과 무관하게 항상 TRUE,
--        아니면 p_user_id가 p_project_id에 대해 활성 user_role을 보유했는지 반환
--        SP들의 "i_caller_role_code = 10 OR EXISTS(user_role...)" 패턴 전체를 공용 함수로 추출
-- --------------------------------- --

    IF p_user_id = 0 THEN
        RETURN p_role_code = 10;
    END IF;

    IF FN_IS_SUPER_ADMIN(p_user_id) THEN
        RETURN 1;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM `user_role`
        WHERE `user_id` = p_user_id
          AND `project_id` = p_project_id
          AND `status` = 1
    );

END$

DELIMITER ;
