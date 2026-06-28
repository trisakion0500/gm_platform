DROP PROCEDURE IF EXISTS SP_GET_SESSION_BY_JTI;

DELIMITER $

CREATE PROCEDURE SP_GET_SESSION_BY_JTI(
    IN  i_jti  VARCHAR(100)  -- Access Token JTI
)
COMMENT 'JTI로 세션 조회 - 인증 미들웨어에서 매 요청마다 호출'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_SESSION_BY_JTI
-- 작성 : 2026-06-28 trisakion
-- 내용 : access_token_jti로 세션 및 사용자 상태 조회
--        인증 미들웨어에서 session.status, user.status 검증에 사용
--        세션이 존재하지 않으면 10009 반환
-- --------------------------------- --

    DECLARE v_not_found     TINYINT       DEFAULT 0;
    DECLARE v_session_id    BIGINT        DEFAULT NULL;
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

        SELECT s.`session_id`
        INTO   v_session_id
        FROM   `user_session` s
        WHERE  s.`access_token_jti` = i_jti;

        IF v_not_found = 1 THEN
            SELECT 10009 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT s.`session_id`, s.`user_id`,
               s.`status` AS session_status,
               u.`status` AS user_status
        FROM   `user_session` s
        JOIN   `user` u ON s.`user_id` = u.`user_id`
        WHERE  s.`session_id` = v_session_id;

    END;

END$

DELIMITER ;
