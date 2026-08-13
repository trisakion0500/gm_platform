import { useRef, useState } from 'react';
import { Alert, Card, Empty, Input, List, Space, Spin, Tag, Typography } from 'antd';
import PageHeader from '../../../components/common/PageHeader';
import * as apiSearchApi from '../../../api/apiSearch.api';
import { getErrorMessage } from '../../../utils/error';
import type { ApiSearchResult } from '../../../types';

function ApiSearchPage() {
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<ApiSearchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // DocSearchPage와 동일한 이유 — axios signal 미연동이라 취소 대신 "가장 마지막 요청인가"로 최신성 판정
  const requestIdRef = useRef(0);

  async function handleSearch(query: string): Promise<void> {
    if (!query.trim())
      return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setErrorMessage(null);
    setResults([]);
    try {
      const data = await apiSearchApi.searchApis(query);
      if (requestId !== requestIdRef.current)
        return;
      setResults(data);
      setHasSearched(true);
    } catch (err) {
      if (requestId !== requestIdRef.current)
        return;
      setErrorMessage(getErrorMessage(err, 'API 검색에 실패했습니다.'));
    } finally {
      if (requestId === requestIdRef.current)
        setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="API 검색" />

      <Input.Search
        placeholder="질의어를 입력하세요 (예: 아이템 지급 API)"
        allowClear
        enterButton="검색"
        size="large"
        loading={loading}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />

      {errorMessage && <Alert type="error" message={errorMessage} showIcon style={{ marginBottom: 16 }} />}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && !errorMessage && <Empty description="검색 결과가 없습니다." />}

      {!loading && results.length > 0 && (
        <List
          dataSource={results}
          renderItem={(item) => (
            <List.Item style={{ padding: 0, marginBottom: 12 }}>
              <Card size="small" style={{ width: '100%' }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Typography.Text strong>{item.api_name}</Typography.Text>
                    <Tag color="blue">유사도 {item.score.toFixed(2)}</Tag>
                  </Space>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {item.project_name}
                  </Typography.Text>
                  <Space size={8}>
                    <Tag>{item.api_code}</Tag>
                    <Typography.Text code>{item.endpoint}</Typography.Text>
                  </Space>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      )}
    </>
  );
}

export default ApiSearchPage;
