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
