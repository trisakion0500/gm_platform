DROP PROCEDURE IF EXISTS SP_UPDATE_SESSION_JTI;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_SESSION_JTI(
    IN  i_session_id        BIGINT,       -- 세션 ID
    IN  i_access_token_jti  VARCHAR(100), -- 새 Access Token JTI
    IN  i_expected_jti      VARCHAR(100)  -- 호출자가 조회 시점에 읽은 기존 access_token_jti (동시수정 감지용)
) COMMENT 'Access Token 재발급 시 세션의 JTI 갱신 - 동시 refresh 감지 시 10009로 스킵'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_SESSION_JTI
-- 작성 : 2026-06-28 trisakion
-- 수정 : 2026-07-29 trisakion - i_expected_jti 파라미터 추가, UPDATE에
--        AND access_token_jti = i_expected_jti 가드 + ROW_COUNT() 체크 추가.
--        동일 refresh_token으로 거의 동시에 두 refresh 요청이 들어오면 둘 다 조회를 통과해
--        각자 다른 JTI로 이 SP를 호출했고, 조건 없이 무조건 UPDATE하던 것이 원인이 되어
--        나중에 커밋된 요청의 JTI만 유효해지고 먼저 응답받은 클라이언트의 access_token은
--        즉시 10009로 무효화되는 레이스가 있었음 — 조회 시점 jti가 그새 바뀌었으면(다른
--        요청이 먼저 refresh) 갱신하지 않고 바로 10009 반환.
-- 내용 : POST /auth/refresh 처리 후 새 JTI로 세션 갱신
--        last_access_at도 함께 갱신
--        조회 시점의 access_token_jti가 현재 값과 다르면(동시 refresh) 갱신하지 않고 10009 반환
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
            SET    `access_token_jti` = i_access_token_jti,
                   `last_access_at`   = NOW()
            WHERE  `session_id` = i_session_id
              AND  `access_token_jti` = i_expected_jti;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 10009 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;

    END;

END$

DELIMITER ;
