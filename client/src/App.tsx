import LoginPage from './pages/auth/LoginPage';

// 라우터는 Stage 2에서 구성 — 그 전까지 로그인 검증을 위해 임시로 직접 렌더링한다
function App() {
  return <LoginPage />;
}

export default App;
