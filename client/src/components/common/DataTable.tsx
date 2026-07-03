import { useEffect, useRef, useState } from 'react';
import type { Key } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PaginatedResponse } from '../../types';

interface DataTableProps<T> {
  columns: ColumnsType<T>;
  fetcher: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>;
  rowKey: string | ((record: T) => Key);
  pageSize?: number;
  onRowClick?: (record: T) => void;
}

// Table 자체의 헤더 행 + 페이지네이션 영역이 차지하는 높이(고정) — 컨테이너 높이에서 이만큼 뺀 값을 grid 스크롤 영역 높이로 쓴다
const TABLE_CHROME_HEIGHT = 120;

// 필터가 바뀌어 재조회가 필요한 화면은 이 컴포넌트에 key prop을 바꿔 넘겨 강제로 재마운트시킨다
// 부모가 flex column 컨테이너여야 하며, 이 컴포넌트가 flex:1로 남은 세로 공간을 모두 차지한 뒤 그 안에서 데이터 행만 스크롤한다
// (헤더/페이지 상단 필터/페이지네이션/푸터는 고정, 행이 많아져도 페이지 전체 스크롤은 생기지 않는다)
function DataTable<T>({ columns, fetcher, rowKey, pageSize = 20, onRowClick }: DataTableProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(300);

  useEffect(() => {
    setLoading(true);
    fetcher(page, pageSize)
      .then((res) => {
        setItems(res.items);
        setTotalCount(res.total_count);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el)
      return;
    const observer = new ResizeObserver(([entry]) => {
      setScrollY(Math.max(entry.contentRect.height - TABLE_CHROME_HEIGHT, 150));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} style={{ flex: 1, minHeight: 0 }}>
      <Table<T>
        columns={columns}
        dataSource={items}
        rowKey={rowKey}
        loading={loading}
        onRow={onRowClick ? (record) => ({ onClick: () => onRowClick(record), style: { cursor: 'pointer' } }) : undefined}
        scroll={{ y: scrollY }}
        pagination={{
          current: page,
          pageSize,
          total: totalCount,
          showSizeChanger: false,
          onChange: setPage,
          position: ['bottomCenter'],
        }}
      />
    </div>
  );
}

export default DataTable;
