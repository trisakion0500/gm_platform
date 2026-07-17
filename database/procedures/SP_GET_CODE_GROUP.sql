DROP PROCEDURE IF EXISTS SP_GET_CODE_GROUP;
DELIMITER $
CREATE PROCEDURE SP_GET_CODE_GROUP(
    IN  i_code_group_id     INT,   -- 코드 그룹 ID
    IN  i_caller_role_code  INT,   -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_caller_user_id    BIGINT -- 요청자 user_id (비SUPER_ADMIN 프로젝트 스코핑용)
) COMMENT '코드 그룹 단건 조회 - 프로젝트 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_CODE_GROUP
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-17 trisakion - 프로젝트 스코핑 추가 (i_caller_role_code, i_caller_user_id)
-- 내용 : code_group_id로 단건 조회
--        SUPER_ADMIN(10) : 모든 코드 그룹 조회 가능
--        그 외           : 본인이 활성 user_role을 가진 프로젝트 소속 코드 그룹만 조회 가능
--        조회 불가 또는 존재하지 않으면 31004 반환 (정보 은닉)
-- --------------------------------- --

    DECLARE v_not_found    TINYINT       DEFAULT 0;
    DECLARE v_id           INT           DEFAULT NULL;
    DECLARE sql_state      CHAR(5)       DEFAULT '00000';
    DECLARE error_no       INT           DEFAULT 0;
    DECLARE error_message  VARCHAR(255)  DEFAULT '';
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

        SELECT g.`code_group_id`
        INTO   v_id
        FROM   `code_group` g
        WHERE  g.`code_group_id` = i_code_group_id
          AND  (i_caller_role_code = 10 OR EXISTS (
                SELECT 1 FROM `user_role` ur
                WHERE ur.`project_id` = g.`project_id`
                  AND ur.`user_id` = i_caller_user_id
                  AND ur.`status` = 1
              ));

        IF v_not_found = 1 THEN
            SELECT 31004 AS RESULT;
            LEAVE transaction_block;
        END IF;

        SELECT 0 AS RESULT;
        SELECT `code_group_id`, `project_id`, `code_group_code`, `code_group_name`,
               `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
        FROM `code_group`
        WHERE `code_group_id` = i_code_group_id;

    END;

END$

DELIMITER ;
