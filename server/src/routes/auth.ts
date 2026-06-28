import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as ctrl from '../controllers/auth.controller';

const router = Router();

router.post('/signup',   ctrl.signup);          // 회원가입 (인증 불필요)
router.post('/login',    ctrl.login);           // 로그인 (인증 불필요)
router.post('/refresh',  ctrl.refresh);         // Access Token 재발급 (인증 불필요)
router.post('/logout',   authenticate, ctrl.logout);          // 로그아웃
router.get('/me',        authenticate, ctrl.getMe);           // 내 정보 조회
router.patch('/password', authenticate, ctrl.changePassword); // 비밀번호 변경

export default router;
