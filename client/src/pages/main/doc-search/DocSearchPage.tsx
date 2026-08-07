import { useRef, useState } from 'react';
import { Alert, Card, Empty, Input, List, Space, Spin, Tag, Typography } from 'antd';
import PageHeader from '../../../components/common/PageHeader';
import * as docSearchApi from '../../../api/docSearch.api';
import { getErrorMessage } from '../../../utils/error';
import type { DocSearchResult } from '../../../types';

function DocSearchPage() {
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<DocSearchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 진행 중인 검색을 취소할 수단이 없어(axios signal 미연동), 응답 도착 순서 대신 "가장 마지막에 시작한
  // 요청인가"로 최신성을 판정한다 — 먼저 시작해 늦게 응답한 검색 결과가 이후 검색 결과를 덮어쓰는 것을 방지.
  const requestIdRef = useRef(0);

  async function handleSearch(query: string): Promise<void> {
    if (!query.trim())
      return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setErrorMessage(null);
    setResults([]);
    try {
      const data = await docSearchApi.searchDocs(query);
      if (requestId !== requestIdRef.current)
        return;
      setResults(data);
      setHasSearched(true);
    } catch (err) {
      if (requestId !== requestIdRef.current)
        return;
      setErrorMessage(getErrorMessage(err, '문서 검색에 실패했습니다.'));
    } finally {
      if (requestId === requestIdRef.current)
        setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="문서 검색" />

      <Input.Search
        placeholder="질의어를 입력하세요 (예: 비밀번호 변경 시 세션은 어떻게 되나요?)"
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
                    <Typography.Text strong>{item.heading}</Typography.Text>
                    <Tag color="blue">유사도 {item.score.toFixed(2)}</Tag>
                  </Space>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {item.file}
                  </Typography.Text>
                  <Typography.Paragraph
                    style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}
                    ellipsis={{ rows: 6, expandable: true, symbol: '더 보기' }}
                  >
                    {item.text}
                  </Typography.Paragraph>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      )}
    </>
  );
}

export default DocSearchPage;
