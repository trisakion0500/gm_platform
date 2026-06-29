DROP PROCEDURE IF EXISTS SP_APPROVE_USER;

DELIMITER $

CREATE PROCEDURE SP_APPROVE_USER(
    IN  i_user_id  BIGINT  -- 승인할 사용자 ID
)
COMMENT '가입 승인 - status=1로 변경'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_APPROVE_USER
-- 작성 : 2026-06-29 trisakion
-- 내용 : 가입 승인 처리
--        user 존재 검사 후 status=1로 변경
-- 테이블 적용 순서 : user
-- --------------------------------- --

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

        IF NOT EXISTS (SELECT 1 FROM `user` WHERE `user_id` = i_user_id) THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `user`
            SET `status` = 1
            WHERE `user_id` = i_user_id AND `status` = 0;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 30003 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;

    END;

END$

DELIMITER ;
