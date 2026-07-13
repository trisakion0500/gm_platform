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
INSERT INTO `api` (`api_id`, `project_id`, `api_code`, `api_name`, `endpoint`, `description`, `api_stage`, `is_required_approval`, `response_view_type`, `status`, `display_order`, `created_by`, `updated_by`, `created_at`, `updated_at`)
VALUES
(1, 2, 'GET_USER', '유저 조회', '/api/get-user', 'user_id로 유저 상세 조회', 40, 0, 1, 1, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 22:01:57'),
(2, 2, 'GET_USER_LIST', '유저 목록 조회', '/api/get-user-list', '닉네임/생성일시/수정일시 조건으로 유저 목록 조회', 40, 0, 2, 1, 2, 1, 1, '2026-07-13 21:51:57', '2026-07-13 22:01:57'),
(3, 2, 'UPDATE_USER_STATUS', '유저 상태 변경', '/api/update-user-status', '유저 상태를 정상/일시정지/영구정지로 변경', 40, 1, 1, 1, 3, 1, 1, '2026-07-13 21:51:58', '2026-07-13 22:01:57'),
(4, 2, 'GET_CURRENCY_LIST', '재화 잔액 조회', '/api/get-currency-list', 'user_id로 재화 잔액 목록 조회', 40, 0, 2, 1, 4, 1, 1, '2026-07-13 21:51:58', '2026-07-13 22:01:57'),
(5, 2, 'GRANT_CURRENCY', '재화 지급/차감', '/api/grant-currency', '유저 재화를 amount만큼 증감 (음수=차감)', 40, 1, 1, 1, 5, 1, 1, '2026-07-13 21:51:58', '2026-07-13 22:01:57'),
(6, 2, 'GET_CARD_LIST', '보유 카드 조회', '/api/get-card-list', '유저 보유 카드 목록 조회 (카드코드/기간 필터)', 40, 0, 2, 1, 6, 1, 1, '2026-07-13 21:51:58', '2026-07-13 22:01:57'),
(7, 2, 'GRANT_CARD', '카드 지급', '/api/grant-card', '유저에게 카드를 지급 (기존 보유 시 수량 누적)', 40, 1, 1, 1, 7, 1, 1, '2026-07-13 21:51:58', '2026-07-13 22:01:57');
SET FOREIGN_KEY_CHECKS = 1;