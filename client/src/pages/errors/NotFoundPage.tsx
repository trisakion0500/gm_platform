import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="존재하지 않는 페이지입니다."
      extra={
        <Button type="primary" onClick={() => navigate('/apis')}>
          홈으로
        </Button>
      }
    />
  );
}

export default NotFoundPage;
