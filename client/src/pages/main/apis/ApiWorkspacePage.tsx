import { useEffect, useMemo, useState } from 'react';
import { Empty, Spin } from 'antd';
import PageHeader from '../../../components/common/PageHeader';
import * as apiApi from '../../../api/api.api';
import * as codeGroupApi from '../../../api/codeGroup.api';
import { useApiWorkspaceStore } from '../../../stores/apiWorkspaceStore';
import { useGlobalStore } from '../../../stores/globalStore';
import type { ActiveCodeGroupWithItems, ApiDetail } from '../../../types';
import ApiPanel from './ApiPanel';

// 좌측 사이드바(ApiMenuSection)에서 체크한 API들을 선택 순서대로 세로 패널로 렌더링한다.
// 패널 자체의 열림/닫힘·순서는 store(openApiIds)가 단일 진실 소스이며, 이 페이지는 그 순서에 맞춰
// 아직 조회하지 않은 API의 상세(ApiDetail)와, 프로젝트 단위 코드값(SELECT/RADIO/CHECKBOX 옵션·응답 코드 치환용)만 채워 넣는다.
function ApiWorkspacePage() {
  const selectedProjectId = useGlobalStore((state) => state.selectedProjectId);
  const openApiIds = useApiWorkspaceStore((state) => state.openApiIds);
  const [detailCache, setDetailCache] = useState<Record<number, ApiDetail>>({});
  const [codeGroups, setCodeGroups] = useState<ActiveCodeGroupWithItems[]>([]);

  useEffect(() => {
    const missingIds = openApiIds.filter((id) => !(id in detailCache));
    if (missingIds.length === 0)
      return;
    missingIds.forEach((apiId) => {
      apiApi.getApi(apiId).then((detail) => {
        setDetailCache((prev) => ({ ...prev, [apiId]: detail }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openApiIds]);

  useEffect(() => {
    if (!selectedProjectId) {
      setCodeGroups([]);
      return;
    }
    codeGroupApi.getActiveCodeGroupsWithItems(selectedProjectId).then(setCodeGroups);
  }, [selectedProjectId]);

  const codeGroupMap = useMemo(
    () => Object.fromEntries(codeGroups.map((g) => [g.code_group_id, g])) as Record<number, ActiveCodeGroupWithItems>,
    [codeGroups],
  );

  return (
    <>
      <PageHeader title="API" />

      {openApiIds.length === 0 && <Empty description="좌측에서 API를 선택하세요" style={{ marginTop: 80 }} />}

      {openApiIds.map((apiId) => {
        const detail = detailCache[apiId];
        if (!detail)
          return <Spin key={apiId} size="small" style={{ display: 'block', marginBottom: 16 }} />;
        return <ApiPanel key={apiId} apiId={apiId} detail={detail} codeGroupMap={codeGroupMap} />;
      })}
    </>
  );
}

export default ApiWorkspacePage;
