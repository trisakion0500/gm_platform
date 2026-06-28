DROP PROCEDURE IF EXISTS SP_LOGOUT_ALL_SESSIONS;

DELIMITER $

CREATE PROCEDURE SP_LOGOUT_ALL_SESSIONS(
    IN  i_user_id  BIGINT  -- 사용자 ID
)
COMMENT '사용자의 모든 활성 세션 로그아웃 - status=1인 세션 전체를 0으로 변경'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_LOGOUT_ALL_SESSIONS
-- 작성 : 2026-06-28 trisakion
-- 내용 : 비밀번호 변경 및 강제 로그아웃 시 사용
--        해당 사용자의 status=1(사용) 세션 전체를 0(로그아웃)으로 변경
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

            UPDATE `user_session`
            SET    `status` = 0
            WHERE  `user_id` = i_user_id
              AND  `status`  = 1;

        COMMIT;

        SELECT 0 AS RESULT;

    END;

END$

DELIMITER ;
