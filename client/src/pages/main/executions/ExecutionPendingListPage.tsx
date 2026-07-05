import { useState } from 'react';
import { Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/common/DataTable';
import PageHeader from '../../../components/common/PageHeader';
import PageSizeSelect from '../../../components/common/PageSizeSelect';
import * as apiExecutionApi from '../../../api/apiExecution.api';
import { useGlobalStore } from '../../../stores/globalStore';
import type { ApiExecutionRow } from '../../../types';

const columns: ColumnsType<ApiExecutionRow> = [
  { title: '실행ID', dataIndex: 'api_execution_id' },
  { title: 'API명', dataIndex: 'api_name' },
  { title: '요청자', dataIndex: 'request_user_name' },
  { title: '요청일시', dataIndex: 'requested_at' },
];

function ExecutionPendingListPage() {
  const navigate = useNavigate();
  const selectedProjectId = useGlobalStore((state) => state.selectedProjectId);
  const [pageSize, setPageSize] = useState(20);

  return (
    <>
      <PageHeader title="승인 대기" />

      {!selectedProjectId && <Empty description="프로젝트를 선택하세요" style={{ marginTop: 80 }} />}

      {selectedProjectId && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <PageSizeSelect value={pageSize} onChange={setPageSize} />
          </div>
          <DataTable<ApiExecutionRow>
            key={selectedProjectId}
            columns={columns}
            rowKey="api_execution_id"
            pageSize={pageSize}
            fetcher={(page, pageSize) => apiExecutionApi.getApiExecutionPending(selectedProjectId, page, pageSize)}
            onRowClick={(record) => navigate(`/executions/pending/${record.api_execution_id}`)}
          />
        </>
      )}
    </>
  );
}

export default ExecutionPendingListPage;
