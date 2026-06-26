-- ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : code_item
-- 작성 : 2026.06.17 trisakion
-- 내용 : 공통 코드 상세 정의
--        code_group 하위 코드 데이터 관리
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `code_item`;
CREATE TABLE `code_item` (
  `code_item_id`			BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT '코드 항목 ID',
  `code_group_id`			INT			UNSIGNED	NOT NULL															COMMENT '코드 그룹 ID',
  `code_value`				VARCHAR(100)			NOT NULL															COMMENT '코드 값',
  `code_name`				VARCHAR(200)			NOT NULL															COMMENT '코드명',
  `description`				VARCHAR(1000)						DEFAULT NULL											COMMENT '설명',
  `display_order`			INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '표시 순서',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `created_by`				BIGINT		UNSIGNED	NOT NULL															COMMENT '생성자 사용자 ID',
  `updated_by`				BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '수정자 사용자 ID',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`code_item_id`),
  UNIQUE KEY `uk_code_group_value` (`code_group_id`,`code_value`),
  KEY `ix_code_group_id` (`code_group_id`),
  KEY `ix_display_order` (`display_order`),
  KEY `ix_status` (`status`),
  CONSTRAINT `fk_code_item_code_group` FOREIGN KEY (`code_group_id`) REFERENCES `code_group` (`code_group_id`),
  CONSTRAINT `fk_code_item_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_code_item_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='공통 코드 상세 정의';
SET FOREIGN_KEY_CHECKS = 1;