import { useEffect, useState } from 'react';
import type { Key } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PaginatedResponse } from '../../types';

interface DataTableProps<T> {
  columns: ColumnsType<T>;
  fetcher: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>;
  rowKey: string | ((record: T) => Key);
  pageSize?: number;
}

// 필터가 바뀌어 재조회가 필요한 화면은 이 컴포넌트에 key prop을 바꿔 넘겨 강제로 재마운트시킨다
function DataTable<T>({ columns, fetcher, rowKey, pageSize = 20 }: DataTableProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

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

  return (
    <Table<T>
      columns={columns}
      dataSource={items}
      rowKey={rowKey}
      loading={loading}
      pagination={{
        current: page,
        pageSize,
        total: totalCount,
        showSizeChanger: false,
        onChange: setPage,
      }}
    />
  );
}

export default DataTable;
