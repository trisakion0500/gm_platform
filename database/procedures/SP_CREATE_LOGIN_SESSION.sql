DELIMITER $

DROP PROCEDURE IF EXISTS SP_CREATE_LOGIN_SESSION$

CREATE PROCEDURE SP_CREATE_LOGIN_SESSION(
    IN  i_user_id               BIGINT,       -- 사용자 ID
    IN  i_access_token_jti      VARCHAR(100), -- Access Token JTI (UUID v4)
    IN  i_refresh_token_hash    VARCHAR(255), -- Refresh Token 해시 (SHA-256)
    IN  i_expired_at            DATETIME      -- 세션 만료일시 (Refresh Token 기준, 7일)
)
COMMENT '로그인 세션 생성 - last_login_at 갱신 및 user_session INSERT'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_LOGIN_SESSION
-- 작성 : 2026-06-28 trisakion
-- 내용 : 로그인 성공 시 처리
--        user.last_login_at 갱신 후 user_session INSERT
--        두 작업을 하나의 트랜잭션으로 처리하여 원자성 보장
-- 테이블 적용 순서 : user → user_session
-- --------------------------------- --

    DECLARE v_session_id    BIGINT        DEFAULT NULL;
    DECLARE v_now           DATETIME      DEFAULT NULL;
    DECLARE sql_state       CHAR(5)       DEFAULT '00000';
    DECLARE error_no        INT           DEFAULT 0;
    DECLARE error_message   VARCHAR(255)  DEFAULT '';
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

        SET v_now = NOW();

        START TRANSACTION;

            UPDATE user
            SET    last_login_at = v_now
            WHERE  user_id = i_user_id;

            INSERT INTO user_session (user_id, access_token_jti, refresh_token_hash, expired_at, last_access_at, status)
            VALUES (i_user_id, i_access_token_jti, i_refresh_token_hash, i_expired_at, v_now, 1);

            SET v_session_id = LAST_INSERT_ID();

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT v_session_id AS session_id;

    END;

END$

DELIMITER ;
