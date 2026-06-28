// dotenv 로드가 다른 모듈보다 먼저 실행되어야 하므로 반드시 첫 번째로 import
import './config/env';
import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import pool from './config/db';
import logger from './utils/logger';

const app = express();

app.use(cors({ origin: env.cors.allowedOrigins }));
app.use(express.json());

async function start() {
  try {
    // 실제 쿼리 없이 커넥션 획득 후 즉시 반납하여 DB 연결 가능 여부만 확인
    const conn = await pool.getConnection();
    conn.release();
    logger.info('DB 연결 성공');
  } catch (err) {
    logger.error('DB 연결 실패:', err);
    process.exit(1);
  }

  app.listen(env.port, () => {
    logger.info(`Server running on port ${env.port}`);
  });
}

start();

export default app;
