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
