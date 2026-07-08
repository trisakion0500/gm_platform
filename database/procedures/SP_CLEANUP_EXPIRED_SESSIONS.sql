DROP PROCEDURE IF EXISTS SP_CLEANUP_EXPIRED_SESSIONS;
DELIMITER $
CREATE PROCEDURE SP_CLEANUP_EXPIRED_SESSIONS() COMMENT '만료된 세션 삭제 - expired_at이 지난 user_session 행을 status와 무관하게 DELETE'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CLEANUP_EXPIRED_SESSIONS
-- 작성 : 2026-07-08 trisakion
-- 내용 : user_session이 로그인마다 계속 쌓이기만 하고 삭제되지 않는 문제 정리
--        expired_at(JWT_REFRESH_EXPIRES_IN 기준 만료일시)이 지난 세션은
--        refresh 자체가 불가능해 재사용 가치가 없으므로 status와 무관하게 DELETE
--        운영 스케줄러(크론 등)에서 주기적으로 호출하는 것을 전제로 작성
-- 테이블 적용 순서 : user_session
-- --------------------------------- --

    DECLARE v_now            DATETIME      DEFAULT NOW();
    DECLARE v_deleted_count  INT           DEFAULT 0;
    DECLARE sql_state        CHAR(5)       DEFAULT '00000';
    DECLARE error_no         INT           DEFAULT 0;
    DECLARE error_message    VARCHAR(255)  DEFAULT '';
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

            DELETE FROM `user_session`
            WHERE  `expired_at` < v_now;

            SET v_deleted_count = ROW_COUNT();

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT v_deleted_count AS deleted_count;

    END;

END$

DELIMITER ;
