DELIMITER $

DROP PROCEDURE IF EXISTS SP_SIGNUP_USER$

CREATE PROCEDURE SP_SIGNUP_USER(
    IN  i_company_id            BIGINT,       -- 회사 ID
    IN  i_requested_project_id  BIGINT,       -- 가입 신청 프로젝트 ID (NULL 허용)
    IN  i_login_id              VARCHAR(100), -- 로그인 ID
    IN  i_password_hash         VARCHAR(255), -- 비밀번호 해시
    IN  i_user_name             VARCHAR(100), -- 사용자명
    IN  i_email                 VARCHAR(200)  -- 이메일
)
COMMENT '회원가입 - user 테이블 INSERT (status=0: 가입승인대기)'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_SIGNUP_USER
-- 작성 : 2026-06-28 trisakion
-- 내용 : 회원가입 처리
--        company_id, requested_project_id 유효성 검사 후 user INSERT
--        생성된 user 전체 정보 반환 (password_hash 제외)
-- 테이블 적용 순서 : user
-- --------------------------------- --

    DECLARE v_user_id       BIGINT        DEFAULT NULL;
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

        IF NOT EXISTS (SELECT 1 FROM company WHERE company_id = i_company_id AND status = 1) THEN
            SELECT 31001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_requested_project_id IS NOT NULL AND
           NOT EXISTS (SELECT 1 FROM project WHERE project_id = i_requested_project_id AND status = 1) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF EXISTS (SELECT 1 FROM user WHERE login_id = i_login_id) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF EXISTS (SELECT 1 FROM user WHERE email = i_email) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO user (company_id, requested_project_id, login_id, password_hash, user_name, email, status)
            VALUES (i_company_id, i_requested_project_id, i_login_id, i_password_hash, i_user_name, i_email, 0);

            SET v_user_id = LAST_INSERT_ID();

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT u.user_id, u.company_id, u.requested_project_id,
               u.login_id, u.user_name, u.email,
               u.status, u.last_login_at, u.created_at, u.updated_at
        FROM user u
        WHERE u.user_id = v_user_id;

    END;

END$

DELIMITER ;
