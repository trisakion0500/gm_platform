DROP PROCEDURE IF EXISTS SP_GET_USER_LIST;

DELIMITER $

CREATE PROCEDURE SP_GET_USER_LIST(
    IN  i_company_id       BIGINT,   -- 회사 ID 필터 (NULL=전체, SUPER_ADMIN만 유효)
    IN  i_status           TINYINT,  -- 상태 필터 (NULL=전체, SUPER_ADMIN만 유효)
    IN  i_page             INT,      -- 페이지 번호 (1부터)
    IN  i_page_size        INT,      -- 페이지 크기 (20/50/100)
    IN  i_role_code        INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN, 20=DEVELOPER)
    IN  i_user_company_id  BIGINT    -- 요청자 소속 회사 ID (DEVELOPER 스코핑용)
)
COMMENT '사용자 목록 조회 - 페이지네이션, 역할별 스코핑, company 정보 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_USER_LIST
-- 작성 : 2026-06-29 trisakion
-- 내용 : 사용자 목록 조회
--        SUPER_ADMIN(10) : 전체 사용자, company_id/status 필터 적용
--        DEVELOPER(20)   : 본인 소속 회사 + status=1 사용자만
--        각 항목에 company 정보 포함
--        페이지네이션 : total_count + items 순서로 반환
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    SELECT 0 AS RESULT;

    SELECT COUNT(u.`user_id`) AS total_count
    FROM `user` u
    WHERE (i_status IS NULL OR u.`status` = i_status)
      AND (i_company_id IS NULL OR u.`company_id` = i_company_id)
      AND (i_role_code = 10 OR (u.`company_id` = i_user_company_id AND u.`status` = 1));

    SELECT u.`user_id`, u.`company_id`, c.`company_code`, c.`company_name`,
           u.`login_id`, u.`user_name`, u.`email`,
           u.`status`, u.`last_login_at`, u.`created_at`, u.`updated_at`
    FROM `user` u
    JOIN `company` c ON c.`company_id` = u.`company_id`
    WHERE (i_status IS NULL OR u.`status` = i_status)
      AND (i_company_id IS NULL OR u.`company_id` = i_company_id)
      AND (i_role_code = 10 OR (u.`company_id` = i_user_company_id AND u.`status` = 1))
    ORDER BY u.`created_at` DESC
    LIMIT i_page_size OFFSET v_offset;

END$

DELIMITER ;
