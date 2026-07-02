import { Typography } from 'antd';

interface PagePlaceholderProps {
  title: string;
}

// Stage 3 이후 그룹별 실제 화면으로 대체될 임시 페이지
function PagePlaceholder({ title }: PagePlaceholderProps) {
  return <Typography.Title level={4}>{title} (준비 중)</Typography.Title>;
}

export default PagePlaceholder;
