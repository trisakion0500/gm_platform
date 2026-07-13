DROP PROCEDURE IF EXISTS SP_GET_CURRENCY_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_CURRENCY_LIST(
    IN  i_user_id  BIGINT  -- 유저 ID
) COMMENT '유저 재화 잔액 목록 조회'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CURRENCY_LIST
-- 작성 : 2026-07-13 trisakion
-- 내용 : user_id로 재화 잔액 목록 조회
--        정렬 : currency_type ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT `currency_id`, `user_id`, `currency_type`, `amount`, `updated_at`
    FROM `currency`
    WHERE `user_id` = i_user_id
    ORDER BY `currency_type` ASC;

END$

DELIMITER ;
