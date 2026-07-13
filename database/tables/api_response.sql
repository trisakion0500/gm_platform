-- ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : api_response
-- 작성 : 2026.06.17 trisakion
-- 내용 : API 응답 데이터 정의
--        GM-Tool 응답 결과 화면 구성에 사용
--        응답 데이터는 Key-Value 또는 Grid 형태를 지원
--        code_group_id 는 미사용일 수 있으므로 FK 지정 안함
--        code_group_id 가 0 일 경우 응답 된 내용의 parameter_name 값을 노출하며,
--        0 이 아닐 경우 `api_response.code_group_id = code_item.code_group_id AND code_item.code_value = 응답 된 내용의 parameter_name 값` 에 맞는 code_item.code_name 을 노출한다.
--            단, 없을 경우 응답 된 내용의 parameter_name 값 그대로 노출한다.
--            단, code_group.status = 1 인 것만 대상이다.
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `api_response`;
CREATE TABLE `api_response` (
  `api_response_id`			BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT 'API 응답 정의 ID',
  `api_id`					BIGINT		UNSIGNED	NOT NULL															COMMENT 'API ID',
  `parameter_name`			VARCHAR(100)			NOT NULL															COMMENT '응답 항목명(JSON Key)',
  `parameter_label`			VARCHAR(100)			NOT NULL															COMMENT '파라미터 화면 표시명',
  `parameter_type`			TINYINT		UNSIGNED	NOT NULL															COMMENT '데이터 타입 (1:STRING, 2:NUMBER, 3:BOOLEAN, 4:DATE, 5:DATETIME, 6:JSON)',
  `code_group_id`			INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT 'code_group.code_group_id 코드 그룹 ID',
  `description`				VARCHAR(1000)						DEFAULT NULL											COMMENT '응답 항목 설명',
  `display_order`			INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '화면 표시 순서',
  `status`					TINYINT		UNSIGNED	NOT NULL	DEFAULT 1												COMMENT '상태 (1:사용, 0:중지)',
  `created_by`				BIGINT		UNSIGNED	NOT NULL															COMMENT '생성자 사용자 ID',
  `updated_by`				BIGINT		UNSIGNED				DEFAULT NULL											COMMENT '수정자 사용자 ID',
  `created_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`				DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`api_response_id`),
  UNIQUE KEY `uk_api_response_parameter_name` (`api_id`,`parameter_name`),
  KEY `ix_api_id` (`api_id`),
  KEY `ix_code_group_id` (`code_group_id`),
  KEY `ix_status` (`status`),
  CONSTRAINT `fk_api_response_api` FOREIGN KEY (`api_id`) REFERENCES `api` (`api_id`),
  CONSTRAINT `fk_api_response_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`user_id`),
  CONSTRAINT `fk_api_response_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='API 응답 데이터 정의';
INSERT INTO `api_response` (`api_response_id`, `api_id`, `parameter_name`, `parameter_label`, `parameter_type`, `code_group_id`, `description`, `display_order`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`)
VALUES
(1, 1, 'user_id', '유저 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(2, 1, 'nickname', '닉네임', 1, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(3, 1, 'status', '상태', 2, 1, NULL, 3, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(4, 1, 'created_at', '생성일시', 5, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(5, 1, 'updated_at', '수정일시', 5, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:57', '2026-07-13 21:51:57'),
(6, 2, 'user_id', '유저 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(7, 2, 'nickname', '닉네임', 1, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(8, 2, 'status', '상태', 2, 1, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(9, 2, 'created_at', '생성일시', 5, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(10, 2, 'updated_at', '수정일시', 5, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(11, 3, 'user_id', '유저 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(12, 3, 'nickname', '닉네임', 1, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(13, 3, 'status', '상태', 2, 1, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(14, 3, 'created_at', '생성일시', 5, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(15, 3, 'updated_at', '수정일시', 5, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(16, 4, 'currency_id', '재화 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(17, 4, 'user_id', '유저 ID', 2, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(18, 4, 'currency_type', '재화 종류', 2, 2, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(19, 4, 'amount', '보유 수량', 2, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(20, 4, 'updated_at', '수정일시', 5, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(21, 5, 'currency_id', '재화 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(22, 5, 'user_id', '유저 ID', 2, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(23, 5, 'currency_type', '재화 종류', 2, 2, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(24, 5, 'amount', '보유 수량', 2, 0, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(25, 5, 'updated_at', '수정일시', 5, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(26, 6, 'card_id', '카드 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(27, 6, 'user_id', '유저 ID', 2, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(28, 6, 'card_type', '카드 종류', 2, 0, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(29, 6, 'card_code', '카드', 1, 3, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(30, 6, 'quantity', '보유 수량', 2, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(31, 6, 'acquired_at', '획득일시', 5, 0, NULL, 6, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(32, 6, 'updated_at', '수정일시', 5, 0, NULL, 7, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(33, 7, 'card_id', '카드 ID', 2, 0, NULL, 1, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(34, 7, 'user_id', '유저 ID', 2, 0, NULL, 2, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(35, 7, 'card_type', '카드 종류', 2, 0, NULL, 3, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(36, 7, 'card_code', '카드', 1, 3, NULL, 4, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(37, 7, 'quantity', '보유 수량', 2, 0, NULL, 5, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(38, 7, 'acquired_at', '획득일시', 5, 0, NULL, 6, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58'),
(39, 7, 'updated_at', '수정일시', 5, 0, NULL, 7, 1, 1, 1, '2026-07-13 21:51:58', '2026-07-13 21:51:58');
SET FOREIGN_KEY_CHECKS = 1;