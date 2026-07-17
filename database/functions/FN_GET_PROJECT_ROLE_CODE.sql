DROP FUNCTION IF EXISTS FN_GET_PROJECT_ROLE_CODE;
DELIMITER $
CREATE FUNCTION FN_GET_PROJECT_ROLE_CODE(
    p_user_id     BIGINT,  -- 확인할 사용자 ID
    p_project_id  BIGINT   -- 확인할 프로젝트 ID
) RETURNS INT
DETERMINISTIC
READS SQL DATA
COMMENT '사용자의 해당 프로젝트 활성 role_code 반환, 배정 없으면 NULL - SUPER_ADMIN 우회는 호출부에서 처리'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_GET_PROJECT_ROLE_CODE
-- 작성 : 2026-07-17 trisakion
-- 내용 : p_user_id가 p_project_id에 대해 가진 활성(status=1) user_role의 role_code를 반환.
--        배정이 없으면 NULL.
--        FN_HAS_PROJECT_ROLE(boolean 반환)과 달리 role_code "값 자체"가 필요한
--        승인/반려/실행 게이트 판정(SP_APPROVE_API_EXECUTION 등)용이라 SUPER_ADMIN
--        우회를 함수에 넣지 않고 호출부에서 그대로 처리한다(호출부마다 허용 role_code
--        조합이 달라 우회 값을 단일하게 정의할 수 없음).
-- --------------------------------- --

    DECLARE v_role_code INT DEFAULT NULL;

    SELECT `role_code` INTO v_role_code
    FROM `user_role`
    WHERE `user_id` = p_user_id
      AND `project_id` = p_project_id
      AND `status` = 1
    LIMIT 1;

    RETURN v_role_code;

END$

DELIMITER ;
