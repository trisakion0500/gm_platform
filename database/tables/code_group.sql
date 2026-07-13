-- ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : code_group
-- 작성 : 2026.06.17 trisakion
-- 내용 : 공통 코드 그룹 정의
--        API 요청/응답에서 사용하는 코드 그룹 관리
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `code_group`;
CREATE TABLE `code_group` (
  `code_group_id`			INT			UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT '코드 그룹 ID',
  `project_id`         		BIGINT		UNSIGNED	NOT NULL															COMMENT '프로젝트 ID',
  `code_group_code`    		VARCHAR(100)			NOT NULL															COMMENT '코드 그룹 코드',
  `code_group_name`    		VARCHAR(200)			NOT NULL															COMMENT '코드 그룹명',
  `description`        		VARCHAR(1000)						DEFAULT NULL											COMMENT '설명',
  `status`             		TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `created_by`				BIGINT		UNSIGNED	NOT NULL															COMMENT '생성자 사용자 ID',
  `updated_by`				BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '수정자 사용자 ID',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`code_group_id`),
  UNIQUE KEY `uk_project_code_group_code`(`project_id`, `code_group_code`),
  KEY `ix_project_id` (`project_id`),
  KEY `ix_status` (`status`),
  CONSTRAINT `fk_code_group_project` FOREIGN KEY (`project_id`) REFERENCES `project` (`project_id`),
  CONSTRAINT `fk_code_group_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_code_group_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='공통 코드 그룹 정의';
INSERT INTO `code_group` (`code_group_id`, `project_id`, `code_group_code`, `code_group_name`, `description`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`)
VALUES
(1, 2, 'USER_STATUS', '유저상태', NULL, 1, 1, 1, '2026-07-13 21:41:31', '2026-07-13 21:41:31'),
(2, 2, 'CURRENCY_TYPE', '재화종류', NULL, 1, 1, 1, '2026-07-13 21:42:14', '2026-07-13 21:42:14'),
(3, 2, 'CARD', '카드종류', NULL, 1, 1, 1, '2026-07-13 21:42:55', '2026-07-13 21:42:55');
SET FOREIGN_KEY_CHECKS = 1;