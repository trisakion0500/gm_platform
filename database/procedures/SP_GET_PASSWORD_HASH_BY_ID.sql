DROP PROCEDURE IF EXISTS SP_GET_PASSWORD_HASH_BY_ID;

DELIMITER $

CREATE PROCEDURE SP_GET_PASSWORD_HASH_BY_ID(
    IN  i_user_id  BIGINT  -- 사용자 ID
)
COMMENT '사용자 ID로 비밀번호 해시 조회 - 비밀번호 변경 시 현재 비밀번호 검증용'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_PASSWORD_HASH_BY_ID
-- 작성 : 2026-06-28 trisakion
-- 내용 : 비밀번호 변경 처리 시 현재 비밀번호 검증 목적으로만 사용
--        password_hash는 서비스 내부 검증용으로 API 응답에 절대 노출 금지
-- --------------------------------- --

    DECLARE v_not_found     TINYINT       DEFAULT 0;
    DECLARE v_password_hash VARCHAR(255)  DEFAULT NULL;
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

        SELECT u.`password_hash`
        INTO   v_password_hash
        FROM   `user` u
        WHERE  u.`user_id` = i_user_id;

        IF v_not_found = 1 THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT v_password_hash AS password_hash;

    END;

END$

DELIMITER ;
