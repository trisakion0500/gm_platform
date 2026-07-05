import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Footer from './Footer';

const { Content } = Layout;

// 사이드바/헤더 없음(로그인 전 화면이라 회사/프로젝트 선택·사용자 메뉴 등이 의미 없음) — 푸터(문의처)만 공통 적용
function AuthLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content>
        <Outlet />
      </Content>
      <Footer />
    </Layout>
  );
}

export default AuthLayout;
