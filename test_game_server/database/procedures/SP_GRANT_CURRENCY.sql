DROP PROCEDURE IF EXISTS SP_GRANT_CURRENCY;
DELIMITER $
CREATE PROCEDURE SP_GRANT_CURRENCY(
    IN  i_user_id        BIGINT,   -- 유저 ID
    IN  i_currency_type  TINYINT,  -- 재화 종류 (1:유료다이아, 2:무료다이아, 3:골드)
    IN  i_amount         BIGINT    -- 증감량 (음수면 차감)
) COMMENT '유저 재화 지급/차감 - amount 만큼 잔액 증감'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GRANT_CURRENCY
-- 작성 : 2026-07-13 trisakion
-- 내용 : user_id/currency_type의 재화 잔액을 i_amount 만큼 증감
--        유저 없으면 31001, 재화 종류가 1~3이 아니면 30003
--        차감 결과가 0 미만이면 31002 반환
-- --------------------------------- --

    DECLARE v_now  DATETIME  DEFAULT NOW();
    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        ROLLBACK;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    transaction_block: BEGIN

        IF i_currency_type NOT IN (1, 2, 3) THEN
            SELECT 30003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `user` WHERE `user_id` = i_user_id) THEN
            SELECT 31001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `currency`
            SET `amount` = `amount` + i_amount, `updated_at` = v_now
            WHERE `user_id` = i_user_id AND `currency_type` = i_currency_type AND `amount` + i_amount >= 0;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 31002 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;

        SELECT `currency_id`, `user_id`, `currency_type`, `amount`, `updated_at`
        FROM `currency`
        WHERE `user_id` = i_user_id AND `currency_type` = i_currency_type;

    END;

END$

DELIMITER ;
