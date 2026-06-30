DROP PROCEDURE IF EXISTS SP_UPDATE_USER;
DELIMITER $
CREATE PROCEDURE SP_UPDATE_USER(
    IN  i_user_id    BIGINT,        -- 수정할 사용자 ID
    IN  i_user_name  VARCHAR(100),  -- 이름 (NULL=변경 없음)
    IN  i_email      VARCHAR(200),  -- 이메일 (NULL=변경 없음)
    IN  i_status     TINYINT        -- 상태 (NULL=변경 없음)
) COMMENT '사용자 수정 - user 테이블 UPDATE'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_UPDATE_USER
-- 작성 : 2026-06-29 trisakion
-- 내용 : 사용자 정보 수정
--        user 존재 검사 후 UPDATE
--        email 변경 시 중복 검사 (본인 제외)
--        NULL 입력 시 기존 값 유지 (COALESCE)
-- 테이블 적용 순서 : user
-- --------------------------------- --

    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
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

        IF NOT EXISTS (SELECT 1 FROM `user` WHERE `user_id` = i_user_id) THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_email IS NOT NULL AND
           EXISTS (SELECT 1 FROM `user` WHERE `email` = i_email AND `user_id` != i_user_id) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `user`
            SET `user_name` = COALESCE(i_user_name, `user_name`),
                `email`     = COALESCE(i_email,     `email`),
                `status`    = COALESCE(i_status,    `status`)
            WHERE `user_id` = i_user_id;

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT u.`user_id`, u.`company_id`, c.`company_code`, c.`company_name`,
               u.`requested_project_id`, u.`login_id`, u.`user_name`, u.`email`,
               u.`status`, u.`last_login_at`, u.`created_at`, u.`updated_at`
        FROM   `user` u
        JOIN   `company` c ON c.`company_id` = u.`company_id`
        WHERE  u.`user_id` = i_user_id;

    END;

END$

DELIMITER ;
