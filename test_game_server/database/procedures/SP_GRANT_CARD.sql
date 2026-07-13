DROP PROCEDURE IF EXISTS SP_GRANT_CARD;
DELIMITER $
CREATE PROCEDURE SP_GRANT_CARD(
    IN  i_user_id    BIGINT,       -- 유저 ID
    IN  i_card_type  TINYINT,      -- 카드 종류 (1:캐릭터, 2:아이템)
    IN  i_card_code  VARCHAR(50),  -- 카드 코드
    IN  i_quantity   INT           -- 지급 수량 (기존 보유 시 수량 누적)
) COMMENT '유저 카드 지급 - 이미 보유 중이면 수량 누적, 없으면 신규 지급'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GRANT_CARD
-- 작성 : 2026-07-13 trisakion
-- 내용 : user_id에게 card_code 카드를 i_quantity 만큼 지급
--        이미 보유한 card_code면 quantity 누적, 없으면 신규 행 INSERT
--        유저 없으면 31001, 카드 종류가 1~2가 아니면 30003, 수량이 1 미만이면 30003
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

        IF i_card_type NOT IN (1, 2) OR i_quantity < 1 THEN
            SELECT 30003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `user` WHERE `user_id` = i_user_id) THEN
            SELECT 31001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `card` (`user_id`, `card_type`, `card_code`, `quantity`, `acquired_at`, `updated_at`)
            VALUES (i_user_id, i_card_type, i_card_code, i_quantity, v_now, v_now)
            ON DUPLICATE KEY UPDATE
                `quantity` = `quantity` + i_quantity,
                `updated_at` = v_now;

        COMMIT;

        SELECT 0 AS RESULT;

        SELECT `card_id`, `user_id`, `card_type`, `card_code`, `quantity`, `acquired_at`, `updated_at`
        FROM `card`
        WHERE `user_id` = i_user_id AND `card_code` = i_card_code;

    END;

END$

DELIMITER ;
