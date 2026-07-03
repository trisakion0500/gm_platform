DROP PROCEDURE IF EXISTS SP_GET_USER_BY_ID;
DELIMITER $
CREATE PROCEDURE SP_GET_USER_BY_ID(
    IN  i_user_id  BIGINT  -- 사용자 ID
) COMMENT '사용자 ID로 사용자 조회 (password_hash 제외)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_USER_BY_ID
-- 작성 : 2026-06-28 trisakion
-- 내용 : user_id로 사용자 공개 정보 조회
--        password_hash는 반환하지 않음
--        사용자가 존재하지 않으면 31003 반환
-- --------------------------------- --

    DECLARE v_not_found     TINYINT       DEFAULT 0;
    DECLARE v_user_id       BIGINT        DEFAULT NULL;
    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
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

        SELECT u.`user_id`
        INTO   v_user_id
        FROM   `user` u
        WHERE  u.`user_id` = i_user_id;

        IF v_not_found = 1 THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT u.`user_id`, u.`company_id`, u.`requested_project_id`,
               u.`login_id`, u.`user_name`, u.`email`,
               u.`phone_number`, u.`department`, u.`position`,
               u.`status`, u.`last_login_at`, u.`created_at`, u.`updated_at`
        FROM   `user` u
        WHERE  u.`user_id` = i_user_id;

    END;

END$

DELIMITER ;
