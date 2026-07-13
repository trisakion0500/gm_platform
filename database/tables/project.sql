-- ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : project
-- 작성 : 2026.06.17 trisakion
-- 내용 : 서비스 프로젝트 정보
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `project`;
CREATE TABLE `project` (
  `project_id`				BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT '프로젝트 ID',
  `company_id`				BIGINT		UNSIGNED	NOT NULL															COMMENT '회사 ID',
  `project_code`			VARCHAR(20)				NOT NULL															COMMENT '프로젝트 코드',
  `project_name`			VARCHAR(100)			NOT NULL															COMMENT '프로젝트명',
  `api_base_url`			VARCHAR(255)			NOT NULL															COMMENT 'API Base URL (루트 주소)',
  `description`				VARCHAR(1000)						DEFAULT NULL											COMMENT 'Project 설명',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`project_id`),
  UNIQUE KEY `uk_company_project_code` (`company_id`,`project_code`),
  KEY `ix_project_company_id` (`company_id`),
  CONSTRAINT `fk_project_company_id` FOREIGN KEY (`company_id`) REFERENCES `company` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='서비스 프로젝트 정보';
INSERT INTO `project` (`project_id`, `company_id`, `project_code`, `project_name`, `api_base_url`, `description`, `status`, `created_at`, `updated_at`)
VALUES
(1, 1, 'ADMIN_PROJECT', 'Administrator Company Default Project', 'http://127.0.0.1:3000', NULL, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00'),
(2, 2, 'DEV_PROJECT',   'Developer Company Default Project',     'http://127.0.0.1:3100', NULL, 1, '1970-01-01 00:00:00', '1970-01-01 00:00:00');
SET FOREIGN_KEY_CHECKS = 1;