import { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useUiStore } from '../../stores/uiStore';

const { Sider, Content } = Layout;

// 160px 밑으로는 메뉴 한글 라벨이 줄바꿈되기 시작하고, 400px 위로는 사이드바가 본문을 과도하게 잠식한다.
const MIN_SIDEBAR_WIDTH = 160;
const MAX_SIDEBAR_WIDTH = 400;

function clampSidebarWidth(width: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

interface AppLayoutProps {
  variant: 'main' | 'admin';
}

function AppLayout({ variant }: AppLayoutProps) {
  const sidebarWidth = useUiStore((state) => state.sidebarWidth);
  const setSidebarWidth = useUiStore((state) => state.setSidebarWidth);
  // 드래그 중 임시 폭 — 매 mousemove마다 persist 스토어(localStorage)에 쓰지 않기 위해 로컬 state로만 다루다가
  // mouseup 시점에 한 번만 커밋한다.
  const [dragWidth, setDragWidth] = useState<number | null>(null);

  // handleMouseMove/handleMouseUp을 드래그 시작마다 새로 만들어 latestWidth 클로저 변수에 담는다 — useCallback으로
  // 메모이즈하면 React state(dragWidth)를 참조하는 리스너가 등록 시점의 값으로 고정되는 stale closure 문제가 생긴다.
  function handleResizeStart(e: React.MouseEvent) {
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    let latestWidth = startWidth;
    document.body.style.userSelect = 'none';

    function handleMouseMove(moveEvent: MouseEvent) {
      latestWidth = clampSidebarWidth(startWidth + (moveEvent.clientX - startX));
      setDragWidth(latestWidth);
    }
    function handleMouseUp() {
      setSidebarWidth(latestWidth);
      setDragWidth(null);
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  const displayWidth = dragWidth ?? sidebarWidth;

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Header />
      <Layout style={{ overflow: 'hidden' }}>
        <Sider width={displayWidth} theme="light" style={{ position: 'relative' }}>
          {/* API 목록이 길어지면 내용만 세로 스크롤되어야 하므로, 리사이즈 핸들과 분리된 별도 래퍼에 overflow를 둔다
              — 핸들까지 이 안에 두면 핸들도 스크롤을 따라 움직여 드래그 영역이 일부 구간에서 사라진다. */}
          <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
            <Sidebar variant={variant} />
          </div>
          <div
            onMouseDown={handleResizeStart}
            style={{ position: 'absolute', top: 0, right: 0, width: 4, height: '100%', cursor: 'col-resize', zIndex: 10 }}
          />
        </Sider>
        <Content style={{ padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </Content>
      </Layout>
      <Footer />
    </Layout>
  );
}

export default AppLayout;
