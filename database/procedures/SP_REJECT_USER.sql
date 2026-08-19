DROP PROCEDURE IF EXISTS SP_REJECT_USER;
DELIMITER $
CREATE PROCEDURE SP_REJECT_USER(
    IN  i_user_id        BIGINT,  -- 반려할 사용자 ID
    IN  i_caller_user_id BIGINT   -- 요청자 user_id (SP 내부에서 SUPER_ADMIN 실배정 재검증)
) COMMENT '가입 반려 - status=2로 변경'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_REJECT_USER
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-08-18 trisakion - i_caller_role_code 추가, SUPER_ADMIN 여부를 SP 내부에서도 재검증
--        (기존엔 라우트의 requireRole만이 유일한 방어선이라, 앱 레이어 버그나 우회 호출 시 DB가
--        마지막 방어선이 되지 못했음 — API/CodeGroup 계열 SP가 이미 갖춘 방어적 이중 체크 패턴 적용)
-- 수정 : 2026-08-19 trisakion - i_caller_role_code를 i_caller_user_id로 교체, FN_IS_SUPER_ADMIN이
--        앱이 넘긴 role_code 값을 그대로 신뢰하지 않고 user_id로 DB 재검증하도록 변경
-- 내용 : 가입 반려 처리
--        SUPER_ADMIN 외 호출 → 20001
--        user 존재 검사 후 status=2로 변경
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

        IF NOT FN_IS_SUPER_ADMIN(i_caller_user_id) THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `user` WHERE `user_id` = i_user_id) THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            UPDATE `user`
            SET `status` = 2
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
