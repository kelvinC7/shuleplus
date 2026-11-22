import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { parentApi } from '../../services/parentApi';
import { Bell, CheckCheck, Sliders, Award, Calendar, BookOpen, Wallet, FileText, Check, ShieldCheck } from 'lucide-react';

interface NotificationsSheetProps {
  initialTab?: 'inbox' | 'settings';
}

export const NotificationsSheet: React.FC<NotificationsSheetProps> = ({ initialTab = 'inbox' }) => {
  const { notifications, markNotificationsAsRead, closeSheet, showToast, t } = useApp();
  const [activeTab, setActiveTab] = useState<'inbox' | 'settings'>(initialTab);

  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('yoshule_notification_prefs_v1') || 'null');
      if (saved && typeof saved === 'object') return saved;
    } catch {}
    return {
      gateArrival: true,
      absenceLateness: true,
      marksReports: true,
      walletLowBalance: true,
      canteenPurchases: false,
      circularsEvents: true,
      teacherMessages: true,
    };
  });

  const channels = [
    { id: 'gateArrival', label: 'Arrival and departure at the gate', desc: 'Biometric RFID gate logs' },
    { id: 'absenceLateness', label: 'Absence and lateness alerts', desc: 'Real-time SMS & push alerts' },
    { id: 'marksReports', label: 'Marks and report cards', desc: 'Continuous assessments and bulletins' },
    { id: 'walletLowBalance', label: 'ShuleCard low balance warnings', desc: 'When balance drops below RWF 1,500' },
    { id: 'canteenPurchases', label: 'Canteen & shop purchases', desc: 'Instant itemized purchase receipts' },
    { id: 'circularsEvents', label: 'School circulars & events', desc: 'Visiting day, sports gala, exams' },
    { id: 'teacherMessages', label: 'Teacher direct messages', desc: 'Replies from class teachers' },
  ];

  const handleTogglePref = (id: string) => {
    setPrefs((p: any) => {
      const updated = { ...p, [id]: !p[id] };
      try { localStorage.setItem('yoshule_notification_prefs_v1', JSON.stringify(updated)); } catch {}
      // Best-effort sync only; push routing/preferences UI works locally without notifications module
      parentApi.updateNotificationPreferences(updated).catch?.(() => {});
      return updated;
    });
  };

  const handleSaveSettings = () => {
    try { localStorage.setItem('yoshule_notification_prefs_v1', JSON.stringify(prefs)); } catch {}
    // Best-effort sync only; app push delivery does not rely on notifications module
    parentApi.updateNotificationPreferences(prefs).catch?.(() => {});
    showToast(t('Notification channels updated'));
    setActiveTab('inbox');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'academic':
        return <Award className="w-4 h-4 text-[#F5A623]" />;
      case 'attendance':
        return <Calendar className="w-4 h-4 text-[#1FA971]" />;
      case 'homework':
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'wallet':
        return <Wallet className="w-4 h-4 text-amber-600" />;
      default:
        return <FileText className="w-4 h-4 text-[#13213D]" />;
    }
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Header Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'inbox' ? 'bg-white text-[#13213D] shadow-sm' : 'text-[#6B7385]'
          }`}
        >
          <Bell className="w-3.5 h-3.5 text-[#F5A623]" />
          {t('Inbox')} ({notifications.filter((n) => !n.read).length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'settings' ? 'bg-white text-[#13213D] shadow-sm' : 'text-[#6B7385]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-[#F5A623]" />
          {t('Channels & Alerts')}
        </button>
      </div>

      {activeTab === 'inbox' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-[#6B7385]">
              {t('Recent alerts from Umucyo Secondary School')}
            </span>
            <button
              onClick={() => {
                markNotificationsAsRead();
                // Best-effort only; inbox/read state is managed locally via push store
                parentApi.markAllNotificationsRead?.().catch?.(() => {});
                showToast(t('All notifications marked as read'));
              }}
              className="text-[11px] font-bold text-[#F5A623] hover:underline"
            >
              {t('Mark all as read')}
            </button>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto no-scrollbar">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                  notif.read
                    ? 'bg-white border-[#E5E8EF]'
                    : 'bg-amber-50/70 border-amber-200 shadow-sm'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <b className="text-xs text-[#13213D] block font-bold leading-tight">
                    {notif.title}
                  </b>
                  <p className="text-[#6B7385] text-[11px] mt-0.5 leading-relaxed">
                    {notif.body}
                  </p>
                  <span className="text-[10px] text-[#6B7385] font-semibold mt-1 block">
                    {notif.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Settings Tab */
        <div className="space-y-3">
          <p className="text-[11px] text-[#6B7385] px-1">
            {t('Choose what alerts reach your SMS and mobile notification feed.')}
          </p>

          <div className="bg-white rounded-3xl p-4 shadow-card border border-[#E5E8EF] divide-y divide-[#E5E8EF]">
            {channels.map((chan) => {
              const enabled = (prefs as any)[chan.id];
              return (
                <div
                  key={chan.id}
                  onClick={() => handleTogglePref(chan.id)}
                  className="py-3 flex items-center justify-between cursor-pointer first:pt-1 last:pb-1"
                >
                  <div className="min-w-0 pr-3">
                    <b className="text-xs text-[#13213D] block">{t(chan.label)}</b>
                    <span className="text-[10.5px] text-[#6B7385] block">{t(chan.desc)}</span>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                      enabled ? 'bg-[#1FA971]' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${
                        enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSaveSettings}
            className="w-full py-3.5 bg-[#13213D] hover:bg-slate-900 text-white font-extrabold rounded-2xl shadow-md active:scale-98 transition-all"
          >
            {t('Save Preferences')}
          </button>
        </div>
      )}
    </div>
  );
};
