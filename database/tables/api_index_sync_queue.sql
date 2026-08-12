-- ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : api_index_sync_queue
-- 작성 : 2026.08.12 trisakion
-- 내용 : API 정의(api/api_request/api_response) 변경분을 rag_server(gm_apis 컬렉션)에 반영하기 위한
--        아웃박스 큐. api_id 단위로 UNIQUE 하여, 같은 API가 짧은 시간에 여러 번 수정돼도 큐에는 1건만
--        남는다(dedup). server/의 apiIndexSync.job.ts가 주기적으로 이 테이블을 폴링해 rag_server에
--        push하고, 성공하면 해당 행을 삭제한다 — 실패하면 attempt_count/last_error만 갱신하고 남겨둬
--        다음 tick에 무기한 재시도한다("확실한 전달 보장").
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `api_index_sync_queue`;
CREATE TABLE `api_index_sync_queue` (
  `sync_id`			BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT '동기화 큐 ID',
  `api_id`			BIGINT		UNSIGNED	NOT NULL															COMMENT '동기화 대상 API ID',
  `attempt_count`	INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '재시도 횟수',
  `last_error`		VARCHAR(500)						DEFAULT NULL											COMMENT '마지막 실패 사유',
  `created_at`		DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  `updated_at`		DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP	COMMENT '수정일시',
  PRIMARY KEY (`sync_id`),
  UNIQUE KEY `uk_api_id` (`api_id`),
  CONSTRAINT `fk_api_index_sync_queue_api` FOREIGN KEY (`api_id`) REFERENCES `api` (`api_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='API 정의 rag_server 동기화 아웃박스 큐';
SET FOREIGN_KEY_CHECKS = 1;