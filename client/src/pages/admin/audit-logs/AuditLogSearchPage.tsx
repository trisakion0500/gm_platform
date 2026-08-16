import { useRef, useState } from 'react';
import { Alert, Card, Empty, Input, List, Space, Spin, Tag, Typography } from 'antd';
import PageHeader from '../../../components/common/PageHeader';
import StatusBadge from '../../../components/common/StatusBadge';
import * as logAuditSearchApi from '../../../api/logAuditSearch.api';
import { useGlobalStore } from '../../../stores/globalStore';
import { LOG_AUDIT_ACTION_TYPE_MAP, LOG_AUDIT_TABLE_NAME_LABEL } from '../../../constants/statusMaps';
import { getErrorMessage } from '../../../utils/error';
import type { LogAuditSearchResult } from '../../../types';

function AuditLogSearchPage() {
  const selectedCompanyId = useGlobalStore((state) => state.selectedCompanyId);
  const selectedProjectId = useGlobalStore((state) => state.selectedProjectId);
  const companyList = useGlobalStore((state) => state.companyList);
  const projectList = useGlobalStore((state) => state.projectList);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<LogAuditSearchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // DocSearchPage/ApiSearchPage와 동일한 이유 — axios signal 미연동이라 취소 대신 "가장 마지막 요청인가"로 최신성 판정
  const requestIdRef = useRef(0);

  // 헤더에서 선택된 프로젝트/회사로 검색 범위를 좁힌다 — null이면 "전체"(server/rag_server가 권한
  // 스코프 그대로 사용). 프로젝트가 선택돼 있으면 그것만으로 좁히고 회사값은 보내지 않는다
  // (logAuditSearch.service.ts와 동일한 우선순위 — 프로젝트가 회사보다 더 좁은 조건).
  const scopeLabel = selectedProjectId
    ? (projectList.find((p) => p.project_id === selectedProjectId)?.project_name ?? '선택된 프로젝트')
    : selectedCompanyId
      ? (companyList.find((c) => c.company_id === selectedCompanyId)?.company_name ?? '선택된 회사')
      : '전체';

  async function handleSearch(query: string): Promise<void> {
    if (!query.trim())
      return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setErrorMessage(null);
    setResults([]);
    try {
      const data = await logAuditSearchApi.searchLogAudits(
        query,
        undefined,
        selectedProjectId,
        selectedProjectId ? null : selectedCompanyId,
      );
      if (requestId !== requestIdRef.current)
        return;
      setResults(data);
      setHasSearched(true);
    } catch (err) {
      if (requestId !== requestIdRef.current)
        return;
      setErrorMessage(getErrorMessage(err, '감사 로그 검색에 실패했습니다.'));
    } finally {
      if (requestId === requestIdRef.current)
        setLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="감사로그 검색" />

      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        검색 범위: {scopeLabel}
      </Typography.Text>

      <Input.Search
        placeholder="질의어를 입력하세요 (예: 회사 상태 변경)"
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
                    <Space size={8}>
                      <Tag>{LOG_AUDIT_TABLE_NAME_LABEL[item.table_name] ?? item.table_name}</Tag>
                      <StatusBadge status={item.action_type} map={LOG_AUDIT_ACTION_TYPE_MAP} />
                      <Typography.Text strong>{item.target_name ?? item.target_id}</Typography.Text>
                    </Space>
                    <Tag color="blue">유사도 {item.score.toFixed(2)}</Tag>
                  </Space>
                  <Typography.Paragraph
                    type="secondary"
                    ellipsis={{ rows: 2, expandable: true, symbol: '더보기' }}
                    style={{ marginBottom: 0, fontSize: 13, whiteSpace: 'pre-line' }}
                  >
                    {item.embed_text}
                  </Typography.Paragraph>
                  <Space size={16}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {item.project_name ?? '-'}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {item.created_by_name ?? '-'}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {item.created_at}
                    </Typography.Text>
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

export default AuditLogSearchPage;
