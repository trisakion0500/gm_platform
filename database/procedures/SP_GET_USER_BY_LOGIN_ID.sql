DROP PROCEDURE IF EXISTS SP_GET_USER_BY_LOGIN_ID;
DELIMITER $
CREATE PROCEDURE SP_GET_USER_BY_LOGIN_ID(
    IN  i_login_id  VARCHAR(100)  -- 로그인 ID
) COMMENT '로그인 ID로 사용자 조회 - password_hash 및 최소 role_code 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_USER_BY_LOGIN_ID
-- 작성 : 2026-06-28 trisakion
-- 내용 : 로그인 인증용 사용자 조회
--        user_role 조인하여 최고 권한(MIN role_code) 반환
--        로그인 ID가 존재하지 않으면 31003 반환
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
        WHERE  u.`login_id` = i_login_id;

        IF v_not_found = 1 THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT u.`user_id`, u.`company_id`, u.`requested_project_id`,
               u.`login_id`, u.`password_hash`, u.`user_name`, u.`email`,
               u.`status`,
               COALESCE(MIN(ur.`role_code`), 40) AS role_code,
               u.`last_login_at`, u.`created_at`, u.`updated_at`
        FROM   `user` u
        LEFT JOIN `user_role` ur ON u.`user_id` = ur.`user_id` AND ur.`status` = 1
        WHERE  u.`user_id` = v_user_id
        GROUP BY u.`user_id`, u.`company_id`, u.`requested_project_id`,
                 u.`login_id`, u.`password_hash`, u.`user_name`, u.`email`,
                 u.`status`, u.`last_login_at`, u.`created_at`, u.`updated_at`;

    END;

END$

DELIMITER ;
