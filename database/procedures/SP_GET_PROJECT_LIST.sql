DROP PROCEDURE IF EXISTS SP_GET_PROJECT_LIST;
DELIMITER $
CREATE PROCEDURE SP_GET_PROJECT_LIST(
    IN  i_company_id  BIGINT,   -- 회사 ID 필터 (NULL=전체)
    IN  i_status      TINYINT,  -- 상태 필터 (NULL=전체)
    IN  i_page        INT,      -- 페이지 번호 (1부터)
    IN  i_page_size   INT,      -- 페이지 크기 (20/50/100)
    IN  i_role_code   INT,      -- 요청자 역할 코드 (10=SUPER_ADMIN)
    IN  i_user_id     BIGINT    -- 요청자 user_id (SUPER_ADMIN 외 user_role 스코핑용)
) COMMENT '프로젝트 목록 조회 - 페이지네이션, 역할별 스코핑, company 정보 포함'
BEGIN
-- --------------------------------- --
-- 명칭 : SP_GET_PROJECT_LIST
-- 작성 : 2026-06-29 trisakion
-- 수정 : 2026-07-02 trisakion - 스코핑 기준을 company 소속에서 user_role 배정으로 변경
-- 내용 : 프로젝트 목록 조회
--        SUPER_ADMIN(10) : 전체 프로젝트 반환
--        그 외           : 본인이 활성 user_role을 가진 프로젝트만 반환
--        각 항목에 company 정보 포함
--        페이지네이션 : total_count + items 순서로 반환
-- --------------------------------- --

    DECLARE v_offset  INT DEFAULT (i_page - 1) * i_page_size;

    SELECT 0 AS RESULT;

    SELECT COUNT(p.`project_id`) AS total_count
    FROM `project` p
    WHERE (i_status IS NULL OR p.`status` = i_status)
      AND (i_company_id IS NULL OR p.`company_id` = i_company_id)
      AND (i_role_code = 10 OR EXISTS (
            SELECT 1 FROM `user_role` ur
            WHERE ur.`project_id` = p.`project_id`
              AND ur.`user_id` = i_user_id
              AND ur.`status` = 1
          ));

    SELECT p.`project_id`, p.`company_id`, c.`company_code`, c.`company_name`,
           p.`project_code`, p.`project_name`, p.`api_base_url`, p.`description`,
           p.`status`, p.`created_at`, p.`updated_at`
    FROM `project` p
    JOIN `company` c ON c.`company_id` = p.`company_id`
    WHERE (i_status IS NULL OR p.`status` = i_status)
      AND (i_company_id IS NULL OR p.`company_id` = i_company_id)
      AND (i_role_code = 10 OR EXISTS (
            SELECT 1 FROM `user_role` ur
            WHERE ur.`project_id` = p.`project_id`
              AND ur.`user_id` = i_user_id
              AND ur.`status` = 1
          ))
    ORDER BY p.`status` DESC, p.`project_name` ASC
    LIMIT i_page_size OFFSET v_offset;

END$

DELIMITER ;
