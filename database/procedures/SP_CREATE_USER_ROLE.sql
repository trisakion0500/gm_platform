DROP PROCEDURE IF EXISTS SP_CREATE_USER_ROLE;
DELIMITER $
CREATE PROCEDURE SP_CREATE_USER_ROLE(
    IN  i_user_id          BIGINT,   -- 사용자 ID
    IN  i_project_id       BIGINT,   -- 프로젝트 ID
    IN  i_role_code        TINYINT,  -- 역할 코드 (20=DEVELOPER, 30=APPROVER, 40=OPERATOR)
    IN  i_caller_role_code INT       -- 요청자 역할 코드 (SUPER_ADMIN=10 외 20001)
) COMMENT 'User Role 등록 - user_role INSERT'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_CREATE_USER_ROLE
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-08-09 trisakion - UNIQUE 제약 위반(MySQL 1062)을 32001로 매핑하는 전용 핸들러 추가
--        (사전 중복검사 이후 동시 요청이 끼어드는 TOCTOU 레이스 시 50001 대신 32001로 정확히 응답)
-- 수정 : 2026-08-18 trisakion - i_caller_role_code 추가, SUPER_ADMIN 여부를 SP 내부에서도 재검증
--        (기존엔 라우트의 requireRole만이 유일한 방어선이라, 앱 레이어 버그나 우회 호출 시 DB가
--        마지막 방어선이 되지 못했음 — API/CodeGroup 계열 SP가 이미 갖춘 방어적 이중 체크 패턴 적용)
-- 내용 : user_role 등록
--        SUPER_ADMIN 외 호출 → 20001
--        user 존재 검사 (31003)
--        project 존재 검사 (31002)
--        user와 project의 company_id 일치 검사 (30003)
--        role_code 범위 검사 - SUPER_ADMIN(10) 등록 불가 (30003)
--        동일 user_id + project_id 중복 검사 (32001)
-- 테이블 적용 순서 : user_role
-- --------------------------------- --

    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
    DECLARE EXIT HANDLER FOR 1062
    BEGIN
        ROLLBACK;
        SELECT 32001 AS RESULT;
    END;

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

        IF i_caller_role_code != 10 THEN
            SELECT 20001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `user` WHERE `user_id` = i_user_id) THEN
            SELECT 31003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM `project` WHERE `project_id` = i_project_id) THEN
            SELECT 31002 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM `user` u
            JOIN `project` p ON p.`company_id` = u.`company_id`
            WHERE u.`user_id`    = i_user_id
              AND p.`project_id` = i_project_id
        ) THEN
            SELECT 30003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF i_role_code NOT IN (20, 30, 40) THEN
            SELECT 30003 AS RESULT;
            LEAVE transaction_block;
        END IF;

        IF EXISTS (SELECT 1 FROM `user_role` WHERE `user_id` = i_user_id AND `project_id` = i_project_id) THEN
            SELECT 32001 AS RESULT;
            LEAVE transaction_block;
        END IF;

        START TRANSACTION;

            INSERT INTO `user_role` (`user_id`, `project_id`, `role_code`, `status`)
            VALUES (i_user_id, i_project_id, i_role_code, 1);

        COMMIT;

        SELECT 0 AS RESULT;
        SELECT ur.`user_id`, u.`login_id`, u.`user_name`,
               ur.`project_id`, p.`project_code`, p.`project_name`,
               ur.`role_code`, ur.`status`, ur.`created_at`, ur.`updated_at`
        FROM `user_role` ur
        JOIN `user`    u ON u.`user_id`    = ur.`user_id`
        JOIN `project` p ON p.`project_id` = ur.`project_id`
        WHERE ur.`user_id` = i_user_id AND ur.`project_id` = i_project_id;

    END;

END$

DELIMITER ;
