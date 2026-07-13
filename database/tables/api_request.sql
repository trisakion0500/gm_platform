-- ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : api_request
-- 작성 : 2026.06.17 trisakion
-- 내용 : API 요청 파라미터 정의
--        GM-Tool 화면 자동 생성 및 입력값 검증에 사용
--        code_group_id 는 미사용일 수 있으므로 FK 지정 안함
--            단, code_group.status = 1 인 것만 대상이다.
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `api_request`;
CREATE TABLE `api_request` (
  `api_request_id`			BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT 'API 요청 파라미터 ID',
  `api_id`					BIGINT		UNSIGNED	NOT NULL															COMMENT 'API ID',
  `parameter_name`			VARCHAR(100)			NOT NULL															COMMENT '파라미터명(JSON Key)',
  `parameter_label`			VARCHAR(100)			NOT NULL															COMMENT '파라미터 화면 표시명',
  `parameter_type`			TINYINT		UNSIGNED	NOT NULL															COMMENT '데이터 타입 (1:STRING, 2:NUMBER, 3:BOOLEAN, 4:DATE, 5:DATETIME, 6:JSON)',
  `component_type`			TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '입력 컴포넌트 타입 (1:TEXT, 2:NUMBER, 3:DATE, 4:DATETIME, 5:SELECT, 6:RADIO, 7:CHECKBOX)',
  `code_group_id`			INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT 'code_group.code_group_id 코드 그룹 ID (0:사용안함. 단, 등록 시 component_type 이 5, 6, 7 일 경우 0이면 오류)',
  `is_required`				TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '필수 여부 (0:선택, 1:필수)',
  `description`				VARCHAR(1000)						DEFAULT NULL											COMMENT '파라미터 설명',
  `display_order`			INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '화면 표시 순서',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `created_by`				BIGINT		UNSIGNED	NOT NULL															COMMENT '생성자 사용자 ID',
  `updated_by`				BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '수정자 사용자 ID',
  `created_at`				DATETIME				NOT NULL	DEFAULT	CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT	CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`api_request_id`),
  UNIQUE KEY `uk_api_request_parameter_name` (`api_id`,`parameter_name`),
  KEY `ix_api_id` (`api_id`),
  KEY `ix_code_group_id` (`code_group_id`),
  KEY `ix_status` (`status`),
  CONSTRAINT `fk_api_request_api` FOREIGN KEY (`api_id`) REFERENCES `api` (`api_id`),
  CONSTRAINT `fk_api_request_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_api_request_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='API 요청 파라미터 정의';
INSERT INTO `api_request` (`api_request_id`, `api_id`, `parameter_name`, `parameter_label`, `parameter_type`, `component_type`, `code_group_id`, `is_required`, `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`)
VALUES
(1, 1, 'user_id', '유저 ID', 2, 2, 0, 1, NULL, 1, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(2, 2, 'nickname', '닉네임(포함검색)', 1, 1, 0, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(3, 2, 'from_created_at', '생성일시(시작)', 5, 4, 0, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(4, 2, 'to_created_at', '생성일시(종료)', 5, 4, 0, 0, NULL, 3, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(5, 2, 'from_updated_at', '수정일시(시작)', 5, 4, 0, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(6, 2, 'to_updated_at', '수정일시(종료)', 5, 4, 0, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(7, 3, 'user_id', '유저 ID', 2, 2, 0, 1, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(8, 3, 'status', '변경할 상태', 2, 5, 1, 1, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(9, 4, 'user_id', '유저 ID', 2, 2, 0, 1, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(10, 5, 'user_id', '유저 ID', 2, 2, 0, 1, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(11, 5, 'currency_type', '재화 종류', 2, 5, 2, 1, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(12, 5, 'amount', '증감량(음수=차감)', 2, 2, 0, 1, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(13, 6, 'user_id', '유저 ID', 2, 2, 0, 1, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(14, 6, 'card_type', '카드 종류(1:캐릭터,2:아이템)', 2, 2, 0, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(15, 6, 'card_code', '카드 코드', 1, 5, 3, 0, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(16, 6, 'from_acquired_at', '획득일시(시작)', 5, 4, 0, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(17, 6, 'to_acquired_at', '획득일시(종료)', 5, 4, 0, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(18, 6, 'from_updated_at', '수정일시(시작)', 5, 4, 0, 0, NULL, 6, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(19, 6, 'to_updated_at', '수정일시(종료)', 5, 4, 0, 0, NULL, 7, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(20, 7, 'user_id', '유저 ID', 2, 2, 0, 1, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(21, 7, 'card_type', '카드 종류(1:캐릭터,2:아이템)', 2, 2, 0, 1, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(22, 7, 'card_code', '카드 코드', 1, 5, 3, 1, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(23, 7, 'quantity', '지급 수량', 2, 2, 0, 1, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58');
SET FOREIGN_KEY_CHECKS = 1;