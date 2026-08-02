import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 기본값 'localhost'가 이 환경에서 ::1로만 풀려 127.0.0.1 접속이 막히는 문제 방지 (모든 인터페이스에 바인딩)
    port: 5173,
    strictPort: true,
  },
});
