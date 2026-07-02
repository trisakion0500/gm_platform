import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <Result
      status="403"
      title="403"
      subTitle="이 페이지에 접근할 권한이 없습니다."
      extra={
        <Button type="primary" onClick={() => navigate('/apis')}>
          홈으로
        </Button>
      }
    />
  );
}

export default ForbiddenPage;
