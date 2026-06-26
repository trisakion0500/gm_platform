-- ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : api
-- 작성 : 2026.06.17 trisakion
-- 내용 : GM API 정의
--        개발자가 등록하는 GM 기능 정의 테이블
--        API 운영 단계(개발/승인/운영) 및 승인 정책 관리
--        GM-Tool → 서비스 간 S2S 호출 정보 저장
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `api`;
CREATE TABLE `api` (
  `api_id`					BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT 'API ID',
  `project_id`				BIGINT		UNSIGNED	NOT NULL															COMMENT '프로젝트 ID(수정불가)',
  `api_code`				VARCHAR(100)			NOT NULL															COMMENT 'API 고유 코드',
  `api_name`				VARCHAR(200)			NOT NULL															COMMENT 'API 이름',
  `endpoint`				VARCHAR(500)			NOT NULL															COMMENT '서비스 호출 Endpoint',
  `description`				VARCHAR(1000)						DEFAULT NULL											COMMENT 'API 설명',
  `api_stage`				TINYINT		UNSIGNED	NOT NULL	DEFAULT 20												COMMENT 'API 운영 단계 (20:개발, 30:승인, 40:운영)',
  `is_required_approval`	TINYINT		UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '승인 필요 여부 (0:즉시 실행, 1:승인 필요)',
  `response_view_type`		TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '응답 표시 방식 (1:KEY_VALUE, 2:GRID)',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `display_order`			INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '화면 표시 순서',
  `created_by`				BIGINT		UNSIGNED	NOT NULL															COMMENT '생성자 사용자 ID',
  `updated_by`				BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '수정자 사용자 ID',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`api_id`),
  UNIQUE KEY `uk_project_api_code` (`project_id`,`api_code`),
  KEY `ix_project_id` (`project_id`),
  KEY `ix_api_stage` (`api_stage`),
  KEY `ix_status` (`status`),
  CONSTRAINT `fk_api_project` FOREIGN KEY (`project_id`) REFERENCES `project` (`project_id`),
  CONSTRAINT `fk_api_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_api_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='GM API 정의';
SET FOREIGN_KEY_CHECKS = 1;