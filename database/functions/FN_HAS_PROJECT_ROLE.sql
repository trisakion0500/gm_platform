DROP FUNCTION IF EXISTS FN_HAS_PROJECT_ROLE;
DELIMITER $
CREATE FUNCTION FN_HAS_PROJECT_ROLE(
    p_role_code   INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN, 배정과 무관하게 항상 TRUE)
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
-- 내용 : p_role_code가 10(SUPER_ADMIN)이면 배정과 무관하게 항상 TRUE.
--        그 외에는 p_user_id가 p_project_id에 대해 활성 user_role을 보유했는지 반환
--        SP들의 "i_caller_role_code = 10 OR EXISTS(user_role...)" 패턴 전체를 공용 함수로 추출
-- --------------------------------- --

    IF p_role_code = 10 THEN
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
