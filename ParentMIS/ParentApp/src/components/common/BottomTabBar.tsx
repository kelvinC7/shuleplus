import React from 'react';
import { Home, BookOpen, CreditCard, MessageSquare, MoreHorizontal } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomTabBar: React.FC = () => {
  const { activeTab, setActiveTab, threads, t } = useApp();

  const unreadMessagesCount = threads.reduce((acc, th) => acc + th.unreadCount, 0);

  const tabs: Array<{
    id: 'home' | 'learn' | 'wallet' | 'chat' | 'more';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'home', label: t('Home'), icon: Home },
    { id: 'learn', label: t('Learning'), icon: BookOpen },
    { id: 'wallet', label: t('ShuleCard'), icon: CreditCard },
    { id: 'chat', label: t('Chat'), icon: MessageSquare, badge: unreadMessagesCount },
    { id: 'more', label: t('More'), icon: MoreHorizontal },
  ];

  return (
    <nav className="fixed bottom-3 left-4 right-4 h-[68px] bg-[#13213D] rounded-[24px] flex items-center justify-around shadow-tabbar z-30 select-none border border-white/5 backdrop-blur-md">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 w-16 relative py-1.5 transition-all ${
              isActive ? 'text-[#F5A623] scale-105' : 'text-[#8D9AB8] hover:text-white'
            }`}
          >
            {/* Active top amber indicator line */}
            {isActive && (
              <span className="absolute -top-2 w-6 h-[3px] bg-[#F5A623] rounded-full animate-in fade-in" />
            )}

            <div className="relative">
              <Icon className="w-5 h-5 stroke-[2]" />
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2.5 bg-[#F5A623] text-[#13213D] text-[9px] font-extrabold px-1.5 h-4 rounded-full flex items-center justify-center shadow-sm">
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] font-bold tracking-tight">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
