DROP FUNCTION IF EXISTS FN_IS_PROJECT_DEVELOPER;
DELIMITER $
CREATE FUNCTION FN_IS_PROJECT_DEVELOPER(
    p_role_code   INT,     -- 요청자 역할 코드 (10=SUPER_ADMIN, 배정과 무관하게 항상 TRUE)
    p_user_id     BIGINT,  -- 확인할 사용자 ID
    p_project_id  BIGINT   -- 확인할 프로젝트 ID
) RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
COMMENT 'SUPER_ADMIN이거나 해당 프로젝트에 실제 DEVELOPER(20)로 배정됐는지 여부 반환 - 관리 화면(/admin/projects) 스코핑 체크 공용화'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_IS_PROJECT_DEVELOPER
-- 작성 : 2026-08-18 trisakion
-- 내용 : p_role_code가 10(SUPER_ADMIN)이면 배정과 무관하게 항상 TRUE.
--        그 외에는 p_user_id가 p_project_id에 실제 role_code=20(DEVELOPER)으로 배정됐는지 반환
--        (FN_HAS_PROJECT_ROLE은 "아무 역할이나 배정"이면 통과하는 전 역할 공용 화면 기준이라
--        관리 화면(SUPER_ADMIN+DEVELOPER 전용) 전용 스코핑에는 쓸 수 없어 별도 함수로 분리).
--        SP_GET_PROJECT/SP_GET_PROJECT_LIST의 반복 조건절을 공용 함수로 추출.
-- --------------------------------- --

    IF p_role_code = 10 THEN
        RETURN 1;
    END IF;

    RETURN FN_GET_PROJECT_ROLE_CODE(p_user_id, p_project_id) = 20;

END$
DELIMITER ;
