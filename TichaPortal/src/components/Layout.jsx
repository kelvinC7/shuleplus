import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import MobileChatFab from './MobileChatFab';
import PeriodReminderBanner from './PeriodReminderBanner';

const DashboardLayout = ({ children, title }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const isChatPage = location.pathname.endsWith('/chat');
  const mainRef = useRef(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="tp-root flex h-[100dvh] bg-[#f0f2f9] font-sans overflow-hidden">
      {!isChatPage && (
        <div className="hidden lg:flex w-[min(304px,28vw)] min-w-[272px] shrink-0 min-h-0 h-full flex-col overflow-hidden bg-[#000435] z-20">
          <Sidebar />
        </div>
      )}

      {!isChatPage && (
        <>
          <div
            className={`fixed inset-0 z-[110] lg:hidden bg-[#000435]/45 backdrop-blur-md transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsSidebarOpen(false)}
          />
          <div
            className={`fixed inset-y-0 left-0 z-[120] w-[min(304px,88vw)] flex flex-col min-h-0 overflow-hidden bg-[#000435] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <Sidebar onClose={() => setIsSidebarOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopNav title={title} onMenuClick={() => setIsSidebarOpen(true)} showMenuButton={!isChatPage} />
        {!isChatPage && <PeriodReminderBanner />}

        <main
          ref={mainRef}
          className={`flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth ${!isChatPage ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0' : ''}`}
        >
          <div className="relative z-10 w-full min-w-0 animate-[fadeIn_.3s_ease-out]">
            {children}
          </div>
        </main>

        {!isChatPage && (
          <>
            <MobileChatFab />
            <BottomNav onMenuClick={() => setIsSidebarOpen(true)} />
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;
