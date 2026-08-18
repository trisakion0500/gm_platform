DROP PROCEDURE IF EXISTS SP_APPROVE_USER;
DELIMITER $
CREATE PROCEDURE SP_APPROVE_USER(
    IN  i_user_id          BIGINT,  -- 승인할 사용자 ID
    IN  i_caller_role_code INT      -- 요청자 역할 코드 (SUPER_ADMIN=10 외 20001)
) COMMENT '가입 승인 - status=1로 변경'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_APPROVE_USER
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-08-18 trisakion - i_caller_role_code 추가, SUPER_ADMIN 여부를 SP 내부에서도 재검증
--        (기존엔 라우트의 requireRole만이 유일한 방어선이라, 앱 레이어 버그나 우회 호출 시 DB가
--        마지막 방어선이 되지 못했음 — API/CodeGroup 계열 SP가 이미 갖춘 방어적 이중 체크 패턴 적용)
-- 내용 : 가입 승인 처리
--        SUPER_ADMIN 외 호출 → 20001
--        user 존재 검사 후 status=1로 변경
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

        IF NOT FN_IS_SUPER_ADMIN(i_caller_role_code) THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `user` WHERE `user_id` = i_user_id) THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `user`
            SET `status` = 1
            WHERE `user_id` = i_user_id AND `status` = 0;

            IF ROW_COUNT() = 0 THEN
                ROLLBACK;
                SELECT 30003 AS RESULT;
                LEAVE transaction_block;
            END IF;

        COMMIT;

        SELECT 0 AS RESULT;

        SELECT `user_id`, `company_id`, `requested_project_id`,
               `login_id`, `user_name`, `email`,
               `status`, `last_login_at`, `created_at`, `updated_at`
        FROM `user`
        WHERE `user_id` = i_user_id;

    END;

END$

DELIMITER ;
