DROP FUNCTION IF EXISTS FN_IS_SUPER_ADMIN;
DELIMITER $
CREATE FUNCTION FN_IS_SUPER_ADMIN(
    p_role_code  INT  -- 요청자 역할 코드
) RETURNS TINYINT(1)
DETERMINISTIC
COMMENT 'role_code가 SUPER_ADMIN(10)인지 여부 반환 - SUPER_ADMIN 전용 SP 9곳의 반복 게이트 공용화'
BEGIN
-- --------------------------------- --
-- 명칭 : FN_IS_SUPER_ADMIN
-- 작성 : 2026-08-18 trisakion
-- 내용 : p_role_code = 10 여부만 반환하는 단순 비교. SUPER_ADMIN 코드값이 바뀌면
--        이 한 곳만 고치면 되도록 9개 SP에 반복되던 `!= 10` 비교를 공용화.
-- --------------------------------- --

    RETURN p_role_code = 10;

END$
DELIMITER ;
