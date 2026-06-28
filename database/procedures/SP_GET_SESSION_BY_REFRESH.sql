DELIMITER $

DROP PROCEDURE IF EXISTS SP_GET_SESSION_BY_REFRESH$

CREATE PROCEDURE SP_GET_SESSION_BY_REFRESH(
    IN  i_refresh_token_hash  VARCHAR(255)  -- Refresh Token 해시 (SHA-256)
)
COMMENT 'Refresh Token 해시로 세션 조회 - Access Token 재발급 시 사용'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_SESSION_BY_REFRESH
-- 작성 : 2026-06-28 trisakion
-- 내용 : refresh_token_hash로 세션 및 사용자 정보 조회
--        세션 만료(expired_at) 및 상태(status) 검증 포함
--        세션이 존재하지 않거나 만료된 경우 10008 반환
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

        SELECT s.session_id
        INTO   v_session_id
        FROM   user_session s
        WHERE  s.refresh_token_hash = i_refresh_token_hash
          AND  s.status = 1
          AND  s.expired_at > NOW();

        IF v_not_found = 1 THEN
            SELECT 10008 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT s.session_id, s.user_id,
               s.status AS session_status,
               u.status AS user_status,
               u.company_id,
               COALESCE(MIN(ur.role_code), 40) AS role_code
        FROM   user_session s
        JOIN   user u ON s.user_id = u.user_id
        LEFT JOIN user_role ur ON u.user_id = ur.user_id
        WHERE  s.session_id = v_session_id
        GROUP BY s.session_id, s.user_id, s.status, u.status, u.company_id;

    END;

END$

DELIMITER ;
