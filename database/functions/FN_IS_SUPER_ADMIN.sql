DROP FUNCTION IF EXISTS FN_IS_SUPER_ADMIN;
DELIMITER $
CREATE FUNCTION FN_IS_SUPER_ADMIN(
    p_user_id  BIGINT  -- 확인할 사용자 ID
) RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
COMMENT '해당 사용자가 실제 SUPER_ADMIN(10)으로 활성 배정돼 있는지 여부 반환 - SUPER_ADMIN 전용 SP 9곳의 반복 게이트 공용화'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_IS_SUPER_ADMIN
-- 작성 : 2026-08-18 trisakion
-- 수정 : 2026-08-19 trisakion - 앱이 넘긴 role_code 값을 그대로 신뢰하던 것을 user_id 기반
--        DB 재검증으로 변경(sp-convention-validator 지적: 4.2 "SP는 호출자의 role_code
--        값을 앱으로부터 전달받아 신뢰하지 않는다" 위반 — 앱 레이어 버그나 우회 호출 시
--        DB가 마지막 방어선이 되지 못했음). SUPER_ADMIN은 어떤 project_id에 배정되어도
--        무관하므로(user_role.role_code 컬럼 COMMENT 참고) project_id 조건 없이 확인한다.
-- 내용 : p_user_id가 user_role에 role_code=10(SUPER_ADMIN)으로 활성(status=1) 배정돼
--        있는지 EXISTS로 재조회해 반환.
-- --------------------------------- --

    RETURN EXISTS (
        SELECT 1 FROM `user_role`
        WHERE `user_id` = p_user_id
          AND `role_code` = 10
          AND `status` = 1
    );

END$
DELIMITER ;
