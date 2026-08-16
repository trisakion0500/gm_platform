-- ------------------------------------------------------------------------------------------------------------ --
-- 명칭 : log_audit_index_sync_queue
-- 작성 : 2026.08.16 trisakion
-- 내용 : 감사 로그(log_audit) 변경분을 rag_server(gm_logs 컬렉션)에 반영하기 위한 아웃박스 큐.
--        api_index_sync_queue(database/, RAG Phase 2)와 달리 log_audit은 Append-Only라 같은
--        log_audit_id가 재큐잉되는 경우가 구조적으로 없다(UPDATE로 재사용되는 PK가 아니라, 변경이
--        생길 때마다 새 로그 행이 생성됨) — 그래서 api_index_sync_queue의 updated_at 낙관적 동시성
--        가드가 여기서는 불필요하다. log_audit과 물리적으로 같은 DB(gm_platform_log)에 두는 이유는
--        SP_INSERT_LOG_AUDIT과 같은 트랜잭션으로 묶어 "log_audit 행이 있으면 큐 항목도 반드시 있다"를
--        보장하기 위함 — 메인 DB에 뒀다면 이 원자성을 낼 수 없다(서로 다른 물리 DB라 분산 트랜잭션 불가).
--        server/의 logAuditIndexSync.job.ts가 주기적으로 이 테이블을 폴링해 rag_server에 push하고,
--        성공하면 해당 행을 삭제한다 — 실패하면 attempt_count/last_error만 갱신하고 남겨둬 다음 tick에
--        무기한 재시도한다("확실한 전달 보장", RAG Phase 2와 동일 설계 의도).
-- ------------------------------------------------------------------------------------------------------------ --
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `log_audit_index_sync_queue`;
CREATE TABLE `log_audit_index_sync_queue` (
  `sync_id`			BIGINT		UNSIGNED	NOT NULL	AUTO_INCREMENT											COMMENT '동기화 큐 ID',
  `log_audit_id`	BIGINT		UNSIGNED	NOT NULL															COMMENT '동기화 대상 감사 로그 ID',
  `attempt_count`	INT			UNSIGNED	NOT NULL	DEFAULT 0												COMMENT '재시도 횟수',
  `last_error`		VARCHAR(500)						DEFAULT NULL											COMMENT '마지막 실패 사유',
  `created_at`		DATETIME				NOT NULL	DEFAULT CURRENT_TIMESTAMP								COMMENT '생성일시',
  PRIMARY KEY (`sync_id`),
  UNIQUE KEY `uk_log_audit_id` (`log_audit_id`),
  CONSTRAINT `fk_log_audit_index_sync_queue_log_audit` FOREIGN KEY (`log_audit_id`) REFERENCES `log_audit` (`log_audit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='감사 로그 rag_server 동기화 아웃박스 큐';
SET FOREIGN_KEY_CHECKS = 1;
