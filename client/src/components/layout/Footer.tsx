import { Layout } from 'antd';

const { Footer: AntFooter } = Layout;

function Footer() {
  return (
    <AntFooter style={{ textAlign: 'center', color: 'rgba(0,0,0,0.45)' }}>
      {import.meta.env.VITE_FOOTER_COPYRIGHT}&nbsp;|&nbsp;{import.meta.env.VITE_APP_VERSION}&nbsp;|&nbsp;문의:{' '}
      {import.meta.env.VITE_SUPPORT_EMAIL}
    </AntFooter>
  );
}

export default Footer;
