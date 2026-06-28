import mysql from 'mysql2/promise';
import { env } from './env';

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00', // MySQL 날짜/시간을 항상 UTC 기준으로 처리
  charset: 'utf8mb4',
});

export default pool;
