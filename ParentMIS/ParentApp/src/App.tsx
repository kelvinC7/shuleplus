import React, { useEffect } from 'react';
import { useApp } from './context/AppContext';
import { initPush } from './services/push';
import { StatusBar } from './components/common/StatusBar';
import { AppHeader } from './components/common/AppHeader';
import { BottomTabBar } from './components/common/BottomTabBar';
import { SheetModal } from './components/common/SheetModal';
import { SlidePanel } from './components/common/SlidePanel';
import { Toast } from './components/common/Toast';
import { LandingView } from './components/views/LandingView';
import { HomeView } from './components/views/HomeView';
import { LearningView } from './components/views/LearningView';
import { WalletView } from './components/views/WalletView';
import { ChatView } from './components/views/ChatView';
import { MoreView } from './components/views/MoreView';
import { NotificationsSheet } from './components/modals/NotificationsSheet';
import { Sparkles, Check, Smartphone, GraduationCap } from 'lucide-react';

export const App: React.FC = () => {
  const { showLanding, activeTab, openSheet, lang } = useApp();

  useEffect(() => {
    initPush().catch(() => {});
  }, []);

  const handleOpenNotifications = () => {
    openSheet(<NotificationsSheet />);
  };

  return (
    <div lang={lang} className="min-h-screen bg-[#F4F5F8] flex items-center justify-center p-0 md:p-8 font-montserrat">
      {/* Desktop Stage Layout (Adaptive phone simulator on desktop, native mobile on small screens) */}
      <div className="flex flex-col lg:flex-row items-center gap-12 max-w-6xl w-full justify-center">
        {/* Left Side Pitch / Information (Visible on larger desktop displays) */}
        <aside className="hidden lg:block max-w-[340px] text-[#C9D1E3] space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#F5A623] text-[#13213D] font-black flex items-center justify-center text-sm shadow-md">
              yo
            </div>
            <span className="font-extrabold text-3xl text-white tracking-tight">
              yo<span className="text-[#F5A623]">Shule</span>
            </span>
          </div>

          <h1 className="text-xs font-bold text-[#F5A623] uppercase tracking-widest">
            Parent App · Smart Portal
          </h1>

          <p className="text-xs text-[#9FB0D3] leading-relaxed">
            Follow your child’s learning journey from anywhere. Built with Vite, React & Tailwind CSS for fast native Android APK packaging.
          </p>

          <ul className="space-y-2 text-xs border-t border-white/10 pt-4">
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[#1FA971] flex items-center justify-center font-bold text-[10px]">
                ✓
              </span>
              <span><b>Start Page:</b> Code lookup, QR scan & linking</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[#1FA971] flex items-center justify-center font-bold text-[10px]">
                ✓
              </span>
              <span><b>Learning:</b> Marks, report cards & attendance</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[#1FA971] flex items-center justify-center font-bold text-[10px]">
                ✓
              </span>
              <span><b>ShuleCard:</b> Canteen pocket money & limits</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[#1FA971] flex items-center justify-center font-bold text-[10px]">
                ✓
              </span>
              <span><b>Chat:</b> Teacher DMs, circulars & events</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[#1FA971] flex items-center justify-center font-bold text-[10px]">
                ✓
              </span>
              <span><b>Multi-language:</b> 7 national languages</span>
            </li>
          </ul>
        </aside>

        {/* Mobile Device Mockup / Mobile Native Viewport */}
        <div className="w-full md:w-[390px] h-[100dvh] md:h-[844px] md:rounded-[54px] bg-[#05080F] md:p-3 shadow-phone relative flex-shrink-0 flex flex-col overflow-hidden border-0 md:border-2 md:border-[#2A3550]">
          {/* Inner Screen */}
          <div className="w-full h-full md:rounded-[43px] overflow-hidden bg-[#F4F5F8] relative flex flex-col">
            {/* Top Device Notch on Desktop */}
            <div className="hidden md:block absolute top-2.5 left-1/2 -translate-x-1/2 w-[118px] h-[30px] bg-black rounded-full z-50 pointer-events-none" />

            {/* Status Bar */}
            <StatusBar />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
              {showLanding ? (
                <LandingView />
              ) : (
                <>
                  <AppHeader onOpenNotifications={handleOpenNotifications} />

                  <main className="flex-1">
                    {activeTab === 'home' && <HomeView />}
                    {activeTab === 'learn' && <LearningView />}
                    {activeTab === 'wallet' && <WalletView />}
                    {activeTab === 'chat' && <ChatView />}
                    {activeTab === 'more' && <MoreView />}
                  </main>

                  {/* Mobile Bottom Tab Bar */}
                  <BottomTabBar />
                </>
              )}
            </div>

            {/* Overlays */}
            <SlidePanel />
            <SheetModal />
            <Toast />
          </div>
        </div>
      </div>
    </div>
  );
};
