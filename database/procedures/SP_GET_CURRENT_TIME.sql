DROP PROCEDURE IF EXISTS SP_GET_CURRENT_TIME;

DELIMITER $

CREATE PROCEDURE SP_GET_CURRENT_TIME()
COMMENT 'DB 현재 시간 조회 - 서버 기동 시 DB 연결 확인용'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CURRENT_TIME
-- 작성 : 2026-06-28 trisakion
-- 내용 : 서버 기동 시 DB 연결 및 SP 호출 가능 여부 확인 목적
--        DB 서버의 현재 시간(UTC) 반환
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
        SELECT 99 AS RESULT, sql_state AS SQL_STATE, error_no AS ERROR_NO, error_message AS ERROR_MESSAGE;
    END;

    SELECT 0 AS RESULT;
    SELECT NOW() AS `current_time`;

END$

DELIMITER ;
