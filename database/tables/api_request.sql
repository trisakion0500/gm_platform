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
SET FOREIGN_KEY_CHECKS = 1;