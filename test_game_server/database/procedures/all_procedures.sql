DROP PROCEDURE IF EXISTS SP_GET_CARD_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_CARD_LIST(
    IN  i_user_id           BIGINT,       -- 유저 ID
    IN  i_card_type         TINYINT,      -- 카드 종류 필터 (NULL=전체, 1:캐릭터, 2:아이템)
    IN  i_card_code         VARCHAR(50),  -- 카드 코드 검색 (NULL/빈문자열=제한없음, 완전일치)
    IN  i_from_acquired_at  DATETIME,     -- 획득일시 시작 (NULL=제한없음)
    IN  i_to_acquired_at    DATETIME,     -- 획득일시 종료 (NULL=제한없음)
    IN  i_from_updated_at   DATETIME,     -- 수정일시 시작 (NULL=제한없음)
    IN  i_to_updated_at     DATETIME      -- 수정일시 종료 (NULL=제한없음)
) COMMENT '유저 보유 카드 목록 조회'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CARD_LIST
-- 작성 : 2026-07-13 trisakion
-- 내용 : user_id로 보유 카드 목록 조회
--        card_type, card_code(완전일치), acquired_at 범위, updated_at 범위 필터 전부 nullable
--        정렬 : card_type ASC, card_code ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT `card_id`, `user_id`, `card_type`, `card_code`, `quantity`, `acquired_at`, `updated_at`
    FROM `card`
    WHERE `user_id` = i_user_id
      AND (i_card_type        IS NULL OR `card_type`   = i_card_type)
      AND (i_card_code        IS NULL OR i_card_code = '' OR `card_code` = i_card_code)
      AND (i_from_acquired_at IS NULL OR `acquired_at` >= i_from_acquired_at)
      AND (i_to_acquired_at   IS NULL OR `acquired_at` <= i_to_acquired_at)
      AND (i_from_updated_at  IS NULL OR `updated_at`  >= i_from_updated_at)
      AND (i_to_updated_at    IS NULL OR `updated_at`  <= i_to_updated_at)
    ORDER BY `card_type` ASC, `card_code` ASC;

END$

DELIMITER ;

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

DROP PROCEDURE IF EXISTS SP_GET_USER;
DELIMITER $
CREATE PROCEDURE SP_GET_USER(
    IN  i_user_id  BIGINT  -- 유저 ID
) COMMENT '유저 상세 조회'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_USER
-- 작성 : 2026-07-13 trisakion
-- 내용 : user_id로 유저 상세 조회
--        존재하지 않으면 31001 반환
-- --------------------------------- --

    DECLARE v_not_found    TINYINT       DEFAULT 0;
    DECLARE v_user_id      BIGINT        DEFAULT NULL;
    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            sql_state     = RETURNED_SQLSTATE,
            error_no      = MYSQL_ERRNO,
            error_message = MESSAGE_TEXT;
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;
    DECLARE CONTINUE HANDLER FOR NOT FOUND
    BEGIN
        SET v_not_found = 1;
    END;

    transaction_block: BEGIN

        SELECT `user_id`
        INTO   v_user_id
        FROM   `user`
        WHERE  `user_id` = i_user_id;

        IF v_not_found = 1 THEN
            SELECT 31001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT `user_id`, `nickname`, `status`, `created_at`, `updated_at`
        FROM   `user`
        WHERE  `user_id` = i_user_id;

    END;

END$

DELIMITER ;

DROP PROCEDURE IF EXISTS SP_GET_USER_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_USER_LIST(
    IN  i_nickname         VARCHAR(100),  -- 닉네임 LIKE 검색 (NULL/빈문자열=제한없음)
    IN  i_from_created_at  DATETIME,      -- 생성일시 시작 (NULL=제한없음)
    IN  i_to_created_at    DATETIME,      -- 생성일시 종료 (NULL=제한없음)
    IN  i_from_updated_at  DATETIME,      -- 수정일시 시작 (NULL=제한없음)
    IN  i_to_updated_at    DATETIME       -- 수정일시 종료 (NULL=제한없음)
) COMMENT '유저 목록 조회'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_USER_LIST
-- 작성 : 2026-07-13 trisakion
-- 내용 : 유저 목록 조회
--        nickname LIKE 검색, created_at 범위, updated_at 범위 필터 전부 nullable
--        정렬 : user_id ASC
-- --------------------------------- --

    SELECT 0 AS RESULT;

    SELECT `user_id`, `nickname`, `status`, `created_at`, `updated_at`
    FROM `user`
    WHERE (i_nickname         IS NULL OR i_nickname = '' OR `nickname` LIKE CONCAT('%', i_nickname, '%'))
      AND (i_from_created_at  IS NULL OR `created_at` >= i_from_created_at)
      AND (i_to_created_at    IS NULL OR `created_at` <= i_to_created_at)
      AND (i_from_updated_at  IS NULL OR `updated_at` >= i_from_updated_at)
      AND (i_to_updated_at    IS NULL OR `updated_at` <= i_to_updated_at)
    ORDER BY `user_id` ASC;

END$

DELIMITER ;

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

DROP PROCEDURE IF EXISTS SP_UPDATE_USER_STATUS;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_USER_STATUS(
    IN  i_user_id  BIGINT,   -- 유저 ID
    IN  i_status   TINYINT   -- 변경할 상태 (1:정상, 2:일시정지, 3:영구정지)
) COMMENT '유저 상태 변경 (정지/해제)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_USER_STATUS
-- 작성 : 2026-07-13 trisakion
-- 내용 : user_id의 status를 i_status로 변경
--        유저 없으면 31001, 상태값이 1~3이 아니면 30003
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

        IF i_status NOT IN (1, 2, 3) THEN
            SELECT 30003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `user` WHERE `user_id` = i_user_id) THEN
            SELECT 31001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `user`
            SET `status` = i_status, `updated_at` = v_now
            WHERE `user_id` = i_user_id;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 31001 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;

        SELECT `user_id`, `nickname`, `status`, `created_at`, `updated_at`
        FROM `user`
        WHERE `user_id` = i_user_id;

    END;

END$

DELIMITER ;
