import { Tag } from 'antd';

export type StatusBadgeMap = Record<number, { label: string; color: string }>;

interface StatusBadgeProps {
  status: number;
  map: StatusBadgeMap;
}

// status 값의 의미는 엔티티마다 다르므로(user: 0~3, company/project: 0~1 등) 맵을 호출부에서 전달받는다
function StatusBadge({ status, map }: StatusBadgeProps) {
  const entry = map[status];

  if (!entry)
    return <Tag>{status}</Tag>;

  return <Tag color={entry.color}>{entry.label}</Tag>;
}

export default StatusBadge;
