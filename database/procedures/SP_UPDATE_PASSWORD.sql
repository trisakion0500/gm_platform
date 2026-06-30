DROP PROCEDURE IF EXISTS SP_UPDATE_PASSWORD;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_PASSWORD(
    IN  i_user_id           BIGINT,       -- 사용자 ID
    IN  i_password_hash     VARCHAR(255)  -- 새 비밀번호 해시
) COMMENT '비밀번호 변경 - password_hash 갱신 및 모든 활성 세션 종료'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_PASSWORD
-- 작성 : 2026-06-28 trisakion
-- 내용 : PATCH /auth/password 처리
--        비밀번호 갱신 후 해당 사용자의 모든 활성 세션을 즉시 종료
--        두 작업을 하나의 트랜잭션으로 처리하여 원자성 보장
-- 테이블 적용 순서 : user → user_session
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

            UPDATE `user`
            SET    `password_hash` = i_password_hash
            WHERE  `user_id` = i_user_id;

            UPDATE `user_session`
            SET    `status` = 0
            WHERE  `user_id` = i_user_id
              AND  `status`  = 1;

        COMMIT;

        SELECT 0 AS RESULT;

    END;

END$

DELIMITER ;
