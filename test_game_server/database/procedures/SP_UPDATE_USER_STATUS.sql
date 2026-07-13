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
