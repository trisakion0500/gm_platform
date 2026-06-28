DELIMITER $

DROP PROCEDURE IF EXISTS SP_LOGOUT_SESSION$

CREATE PROCEDURE SP_LOGOUT_SESSION(
    IN  i_session_id  BIGINT  -- 세션 ID
)
COMMENT '특정 세션 로그아웃 - status를 0(로그아웃)으로 변경'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_LOGOUT_SESSION
-- 작성 : 2026-06-28 trisakion
-- 내용 : POST /auth/logout 처리
--        현재 요청의 세션만 종료 (status → 0)
-- 테이블 적용 순서 : user_session
-- --------------------------------- --

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

        START TRANSACTION;

            UPDATE user_session
            SET    status = 0
            WHERE  session_id = i_session_id;

        COMMIT;

        SELECT 0 AS RESULT;

    END;

END$

DELIMITER ;
