import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Child,
  ParentUser,
  LanguageCode,
  SchoolTrip,
  SavingsGoal,
  UniformOrder,
  TeacherThread,
  NotificationItem,
} from '../types';
import {
  INITIAL_PARENT,
  INITIAL_KIDS,
  INITIAL_TRIPS,
  INITIAL_GOALS,
  INITIAL_ORDERS,
  INITIAL_THREADS,
  INITIAL_NOTIFICATIONS,
} from '../constants/mockData';
import { getTranslation, LANGUAGES } from '../constants/translations';
import { parentApi } from '../services/parentApi';
import {
  getStoredNotifications,
  markAllNotificationsReadLocal,
  PUSH_UPDATED_EVENT,
  saveStoredNotifications,
} from '../services/push';

interface PanelItem {
  id: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

interface SheetState {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  content: React.ReactNode | null;
}

interface AppContextType {
  parent: ParentUser;
  isLoggedIn: boolean;
  showLanding: boolean;
  setShowLanding: (val: boolean) => void;
  kids: Child[];
  activeKidIndex: number;
  activeKid: Child;
  setActiveKidIndex: (idx: number) => void;
  linkChild: (child: Child) => void;
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  activeTab: 'home' | 'learn' | 'wallet' | 'chat' | 'more';
  setActiveTab: (tab: 'home' | 'learn' | 'wallet' | 'chat' | 'more') => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  sheet: SheetState;
  openSheet: (content: React.ReactNode, title?: string, subtitle?: string) => void;
  closeSheet: () => void;
  panels: PanelItem[];
  pushPanel: (panel: { title: string; subtitle?: string; content: React.ReactNode }) => void;
  popPanel: () => void;
  trips: SchoolTrip[];
  goals: SavingsGoal[];
  orders: UniformOrder[];
  threads: TeacherThread[];
  circulars: any[];
  events: any[];
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  savedKidCodes: string[];
  toggleSaveKidCode: (code: string) => void;
  updateKidWallet: (kidId: string, amount: number, tx: any) => void;
  saveKidLimits: (kidId: string, limits: any) => void;
  giveTripConsent: (tripId: string, details: any) => void;
  payTripFeeAction: (tripId: string, amount: number) => void;
  createGoal: (goal: SavingsGoal) => void;
  topUpGoal: (goalId: string, amount: number) => void;
  toggleGoalAutoSave: (goalId: string) => void;
  createOrder: (order: UniformOrder) => void;
  requestOrderExchange: (orderId: string, item: string, oldSize: string, newSize: string) => void;
  reportAbsenceAction: (date: string, reason: string, notes?: string) => Promise<void>;
  sendChatMessage: (threadId: string, text: string) => void;
  markNotificationsAsRead: () => void;
  login: (phone?: string, pin?: string) => Promise<boolean> | void;
  logout: () => void;
  discipline?: any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getInitialLanguage = (): LanguageCode => {
  try {
    const saved = localStorage.getItem('parent-app-language');
    return LANGUAGES.some(({ code }) => code === saved) ? (saved as LanguageCode) : 'en';
  } catch {
    return 'en';
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [parent, setParent] = useState<ParentUser>(INITIAL_PARENT);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [showLanding, setShowLanding] = useState<boolean>(false);
  const [kids, setKids] = useState<Child[]>(INITIAL_KIDS);
  const [activeKidIndex, setActiveKidIndex] = useState<number>(0);
  const [lang, setLang] = useState<LanguageCode>(getInitialLanguage);
  const [activeTab, setActiveTab] = useState<'home' | 'learn' | 'wallet' | 'chat' | 'more'>('home');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [sheet, setSheet] = useState<SheetState>({
    isOpen: false,
    title: undefined,
    subtitle: undefined,
    content: null,
  });

  const [panels, setPanels] = useState<PanelItem[]>([]);
  const [trips, setTrips] = useState<SchoolTrip[]>(INITIAL_TRIPS);
  const [goals, setGoals] = useState<SavingsGoal[]>(INITIAL_GOALS);
  const [orders, setOrders] = useState<UniformOrder[]>(INITIAL_ORDERS);
  const [threads, setThreads] = useState<TeacherThread[]>(INITIAL_THREADS);
  const [circulars] = useState<any[]>([]);
  const [events] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const stored = getStoredNotifications() as any;
    return Array.isArray(stored) && stored.length ? stored : INITIAL_NOTIFICATIONS;
  });
  const [savedKidCodes, setSavedKidCodes] = useState<string[]>(['SDM-2024-004821']);
  const [discipline, setDiscipline] = useState<any>({ score: 100, totalPoints: 0, records: [] });

  useEffect(() => {
    try {
      localStorage.setItem('parent-app-language', lang);
    } catch {}
  }, [lang]);

  const activeKid = kids[activeKidIndex] || kids[0];

  const t = (key: string, params?: Record<string, string | number>) => {
    const translated = getTranslation(key, lang);
    if (!params) return translated;
    return Object.entries(params).reduce(
      (message, [name, value]) => message.split(`{{${name}}}`).join(String(value)),
      translated,
    );
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const toggleSaveKidCode = (code: string) => {
    setSavedKidCodes((prev) => {
      const exists = prev.includes(code);
      if (exists) {
        showToast('Child removed from device bookmarks');
        return prev.filter((c) => c !== code);
      } else {
        showToast('Child bookmarked on this device');
        return [...prev, code];
      }
    });
  };

  const openSheet = (content: React.ReactNode, title?: string, subtitle?: string) => {
    setSheet({ isOpen: true, title, subtitle, content });
  };

  const closeSheet = () => {
    setSheet((prev) => ({ ...prev, isOpen: false }));
  };

  const pushPanel = (p: { title: string; subtitle?: string; content: React.ReactNode }) => {
    const id = 'panel-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setPanels((prev) => [...prev, { ...p, id }]);
  };

  const popPanel = () => {
    setPanels((prev) => prev.slice(0, prev.length - 1));
  };

  const linkChild = (newChild: Child) => {
    setKids((prev) => {
      if (prev.find((k) => k.id === newChild.id || k.sdms === newChild.sdms)) {
        return prev;
      }
      return [...prev, newChild];
    });
    setActiveKidIndex(kids.length);
    showToast(`${newChild.first} successfully linked!`);
  };

  const updateKidWallet = (kidId: string, amount: number, tx: any) => {
    setKids((prev) =>
      prev.map((k) => {
        if (k.id === kidId) {
          const newCard = tx.isCredit ? k.card + amount : Math.max(0, k.card - amount);
          const newTx = [tx, ...(k.transactions || [])];
          return { ...k, card: newCard, transactions: newTx };
        }
        return k;
      })
    );
  };

  const saveKidLimits = (kidId: string, limits: any) => {
    setKids((prev) =>
      prev.map((k) => (k.id === kidId ? { ...k, limits: { ...k.limits, ...limits } } : k))
    );
    showToast('Spend limits updated');
  };

  const giveTripConsent = (tripId: string, details: any) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId ? { ...t, consented: true, consentDetails: details } : t
      )
    );
    parentApi.submitTripConsent(tripId, details);
    showToast('Trip consent signed and transmitted');
  };

  const payTripFeeAction = (tripId: string, amount: number) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId ? { ...t, paid: Math.min(t.fee, (t.paid || 0) + amount) } : t
      )
    );
    parentApi.payTripFee(tripId, { amount, method: 'MTN Mobile Money' });
    showToast(`RWF ${amount.toLocaleString()} paid for trip fee`);
  };

  const createGoal = (goal: SavingsGoal) => {
    setGoals((prev) => [goal, ...prev]);
    showToast(`Savings goal created: ${goal.name}`);
  };

  const topUpGoal = (goalId: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, saved: Math.min(g.target, g.saved + amount) } : g
      )
    );
    parentApi.topUpSavingsGoal(goalId, amount);
    showToast(`Added RWF ${amount.toLocaleString()} to savings goal`);
  };

  const toggleGoalAutoSave = (goalId: string) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const newAuto = !g.auto;
          showToast(newAuto ? 'Auto-save scheduled weekly' : 'Auto-save paused');
          return { ...g, auto: newAuto };
        }
        return g;
      })
    );
  };

  const createOrder = (order: UniformOrder) => {
    setOrders((prev) => [order, ...prev]);
    parentApi.createStoreOrder(order);
    showToast(`Order placed: ${order.id}`);
  };

  const requestOrderExchange = (orderId: string, item: string, oldSize: string, newSize: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          return {
            ...o,
            exchange: {
              item,
              oldSize,
              newSize,
              status: 'Exchange requested (Bring item to school store)',
              requestedDate: 'Today',
            },
          };
        }
        return o;
      })
    );
    parentApi.requestSizeExchange(orderId, { item, oldSize, newSize });
    showToast(`Exchange requested: Size ${oldSize} ➔ ${newSize}`);
  };

  const reportAbsenceAction = async (date: string, reason: string, notes?: string) => {
    await parentApi.reportAbsence({
      studentId: activeKid.id,
      date,
      reason,
      notes,
    });
    // Add absent indicator in local state
    setKids((prev) =>
      prev.map((k) => {
        if (k.id === activeKid.id) {
          const newMonth = [...(k.attendanceMonth || [])];
          newMonth.push({
            day: new Date().getDate(),
            status: 'A',
            dateStr: `Reported: ${reason}`,
          });
          return { ...k, attendanceMonth: newMonth };
        }
        return k;
      })
    );
    showToast('Absence reported to class teacher & school office');
  };

  const sendChatMessage = (threadId: string, text: string) => {
    const newMsg = {
      id: 'm-' + Date.now(),
      threadId,
      sender: 'parent' as const,
      senderName: parent.n,
      text,
      timestamp: 'Just now',
      read: true,
    };
    setThreads((prev) =>
      prev.map((th) => {
        if (th.id === threadId) {
          return {
            ...th,
            lastMessage: text,
            lastTime: 'Just now',
            messages: [...th.messages, newMsg],
          };
        }
        return th;
      })
    );
    parentApi.sendTeacherMessage({ threadId, message: text });
    showToast('Message sent to teacher');

    // Simulated teacher reply after 3 seconds for realistic interactive feel
    setTimeout(() => {
      const replyMsg = {
        id: 'm-reply-' + Date.now(),
        threadId,
        sender: 'teacher' as const,
        senderName: 'Teacher',
        text: 'Received with thanks. I will check on this and keep you updated.',
        timestamp: 'Just now',
        read: false,
      };
      setThreads((prev) =>
        prev.map((th) => {
          if (th.id === threadId) {
            return {
              ...th,
              lastMessage: replyMsg.text,
              lastTime: 'Just now',
              unreadCount: th.unreadCount + 1,
              messages: [...th.messages, replyMsg],
            };
          }
          return th;
        })
      );
    }, 3000);
  };

  const markNotificationsAsRead = () => {
    const next = markAllNotificationsReadLocal() as any;
    setNotifications(Array.isArray(next) && next.length ? next : (prev => prev.map((n) => ({ ...n, read: true }))) as any);
  };

  useEffect(() => {
    const sync = () => {
      const stored = getStoredNotifications() as any;
      if (Array.isArray(stored) && stored.length) setNotifications(stored);
    };
    sync();
    window.addEventListener(PUSH_UPDATED_EVENT, sync as any);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'yoshule_notifications_v1') sync();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PUSH_UPDATED_EVENT, sync as any);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('parent_login_data');
      if (raw) {
        const data = JSON.parse(raw);
        if (data?.parent) {
          setParent({
            id: data.parent.id,
            n: `${data.parent.firstName || ''} ${data.parent.lastName || ''}`.trim() || 'Parent',
            first: data.parent.firstName || 'Parent',
            ph: data.parent.phone || '',
            email: data.parent.email || '',
          });
        }
        if (data?.students && Array.isArray(data.students) && data.students.length > 0) {
          setKids(
            data.students.map((s: any) => ({
              id: s.id,
              n: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
              first: s.firstName || s.name?.split(' ')[0] || 'Child',
              cls: s.className || 'Student',
              lvl: s.className?.startsWith('S') ? 'Secondary' : s.className?.startsWith('P') ? 'Primary' : 'Nursery',
              code: s.studentCode || '',
              sdms: s.studentCode || '',
              cardno: '',
              photo: s.photo || null,
              gender: s.gender || 'MALE',
              role: s.role || 'FATHER',
              type: 'Day scholar',
              ct: '',
              card: 0,
              fees: 0,
              att: 98,
              avg: 80,
              prev: 78,
              trend: [75, 78, 80],
              cls_avg: [65, 66, 68],
              rank: '—',
              conduct: 100,
              subj: [],
              hw: [],
            }))
          );
        }
      }
    } catch {}
  }, []);

  const login = async (phone?: string, pin?: string) => {
    try {
      if (phone && pin) {
        const { parentApi } = await import('../services/parentApi');
        const res = await parentApi.login(phone, pin);
        if (res && res.data?.token) {
          try {
            localStorage.setItem('parent_access_token', res.data.token);
            localStorage.setItem('parent_login_data', JSON.stringify(res.data));
          } catch {}
          if (res.data?.parent) {
            setParent({
              id: res.data.parent.id,
              n: `${res.data.parent.firstName || ''} ${res.data.parent.lastName || ''}`.trim() || 'Parent',
              first: res.data.parent.firstName || 'Parent',
              ph: res.data.parent.phone || phone,
              email: res.data.parent.email || '',
            });
          }
          if (res.data?.students && Array.isArray(res.data.students) && res.data.students.length > 0) {
            setKids(
              res.data.students.map((s: any) => ({
                id: s.id,
                n: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim(),
                first: s.firstName || s.name?.split(' ')[0] || 'Child',
                cls: s.className || 'Student',
                lvl: s.className?.startsWith('S') ? 'Secondary' : s.className?.startsWith('P') ? 'Primary' : 'Nursery',
                code: s.studentCode || '',
                sdms: s.studentCode || '',
                cardno: '',
                photo: s.photo || null,
                gender: s.gender || 'MALE',
                role: s.role || 'FATHER',
                type: 'Day scholar',
                ct: '',
                card: 0,
                fees: 0,
                att: 98,
                avg: 80,
                prev: 78,
                trend: [75, 78, 80],
                cls_avg: [65, 66, 68],
                rank: '—',
                conduct: 100,
                subj: [],
                hw: [],
              }))
            );
          }
          setIsLoggedIn(true);
          setShowLanding(false);
          showToast(`Welcome, ${res.data?.parent?.firstName || 'Parent'}`);
          return true;
        }
      }
    } catch (e) {}
    // fallback to previous behavior
    setIsLoggedIn(true);
    setShowLanding(false);
    showToast('Welcome to yoShule Parent Console');
    return true;
  };

  const logout = () => {
    setIsLoggedIn(false);
    setShowLanding(true);
    setPanels([]);
    closeSheet();
    showToast('Signed out');
  };

  // Synchronize discipline & child data whenever activeKid changes
  useEffect(() => {
    if (activeKid) {
      const fallbackRecords = activeKid.disciplineRecords || [];
      const fallbackTotal = fallbackRecords.reduce((acc, r) => acc + r.points, 0);
      setDiscipline({
        score: activeKid.conduct ?? 100,
        totalPoints: fallbackTotal,
        records: fallbackRecords,
      });
    }

    async function syncBackend() {
      try {
        const dash = await parentApi.getDashboard(activeKid?.id);
        if (dash && dash.data) {
          console.log('[ParentApp] Live backend synchronized:', dash);
        }
        const disc = await parentApi.getDiscipline(activeKid?.id);
        if (disc && (disc.data || disc.score !== undefined || disc.records)) {
          setDiscipline(disc.data || disc);
        }
      } catch {}
    }
    syncBackend();
  }, [activeKid?.id]);

  return (
    <AppContext.Provider
      value={{
        parent,
        isLoggedIn,
        showLanding,
        setShowLanding,
        kids,
        activeKidIndex,
        activeKid,
        setActiveKidIndex,
        linkChild,
        lang,
        setLang,
        t,
        activeTab,
        setActiveTab,
        toastMessage,
        showToast,
        sheet,
        openSheet,
        closeSheet,
        panels,
        pushPanel,
        popPanel,
        trips,
        goals,
        orders,
        threads,
        circulars,
        events,
        notifications,
        unreadNotifsCount,
        savedKidCodes,
        toggleSaveKidCode,
        updateKidWallet,
        saveKidLimits,
        giveTripConsent,
        payTripFeeAction,
        createGoal,
        topUpGoal,
        toggleGoalAutoSave,
        createOrder,
        requestOrderExchange,
        reportAbsenceAction,
        sendChatMessage,
        markNotificationsAsRead,
        login,
        logout,
        discipline,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
