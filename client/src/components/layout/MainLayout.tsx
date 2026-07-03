import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

const { Sider, Content } = Layout;

function MainLayout() {
  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Header />
      <Layout style={{ overflow: 'hidden' }}>
        <Sider width={200} theme="light">
          <Sidebar variant="main" />
        </Sider>
        <Content style={{ padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </Content>
      </Layout>
      <Footer />
    </Layout>
  );
}

export default MainLayout;
