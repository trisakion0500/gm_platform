DROP PROCEDURE IF EXISTS SP_GET_COMPANY_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_COMPANY_LIST(
    IN  i_status      TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_page        INT,      -- 페이지 번호 (1부터)
    IN  i_page_size   INT,      -- 페이지 크기 (20/50/100)
    IN  i_role_code   INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN, 20=DEVELOPER)
    IN  i_company_id  BIGINT    -- 요청자 소속 회사 ID (DEVELOPER 스코핑용)
) COMMENT '회사 목록 조회 - 페이지네이션, 역할별 스코핑'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_COMPANY_LIST
-- 작성 : 2026-06-28 trisakion
-- 내용 : 회사 목록 조회
--        SUPER_ADMIN(10) : 전체 회사 반환
--        DEVELOPER(20)   : 본인 소속 company_id 의 회사만 반환
--        페이지네이션 : total_count + items 순서로 반환
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    SELECT 0 AS RESULT;

    SELECT COUNT(`company_id`) AS total_count
    FROM `company`
    WHERE (i_status IS NULL OR `status` = i_status)
      AND (i_role_code = 10 OR `company_id` = i_company_id);

    SELECT `company_id`, `company_code`, `company_name`, `description`, `status`, `created_at`, `updated_at`
    FROM `company`
    WHERE (i_status IS NULL OR `status` = i_status)
      AND (i_role_code = 10 OR `company_id` = i_company_id)
    ORDER BY `status` DESC, `company_name` ASC
    LIMIT i_page_size OFFSET v_offset;

END$

DELIMITER ;
