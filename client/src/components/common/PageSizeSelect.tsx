import { Select } from 'antd';

const PAGE_SIZE_OPTIONS = [20, 30, 50, 100];

interface PageSizeSelectProps {
  value: number;
  onChange: (pageSize: number) => void;
}

// 목록 화면 검색조건 라인의 맨 우측에 두는 페이지 크기 선택 콤보박스 — 서버가 허용하는 20/30/50/100과 항상 일치시킨다.
function PageSizeSelect({ value, onChange }: PageSizeSelectProps) {
  return (
    <Select
      style={{ width: 80 }}
      value={value}
      onChange={onChange}
      options={PAGE_SIZE_OPTIONS.map((n) => ({ value: n, label: n }))}
    />
  );
}

export default PageSizeSelect;
