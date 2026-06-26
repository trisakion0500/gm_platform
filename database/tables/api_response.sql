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
SET FOREIGN_KEY_CHECKS = 1;