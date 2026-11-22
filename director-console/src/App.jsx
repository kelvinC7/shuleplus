import { useState, useCallback, useEffect } from 'react';
import './styles.css';
import './styles/app.css';
import { useAuth } from './auth/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import Splash from './components/Splash';
import PwaPrompts from './components/PwaPrompts';

import { StatusBar } from './components/StatusBar';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { Sheet } from './components/Sheet';
import { HomeView } from './components/HomeView';
import { LiveView } from './components/LiveView';
import { ApproveView } from './components/ApproveView';
import { InsightsView } from './components/InsightsView';
import { ConsoleView } from './components/ConsoleView';
import { CameraViewer } from './components/CameraViewer';
import { YoInfo } from './components/YoInfo';
import { BlastWizard } from './components/BlastWizard';
import { MeetingWizard } from './components/MeetingWizard';
import { AttentionPopup, useAttentionOnce } from './components/AttentionPopup';
import { TeachingSheet } from './components/TeachingSheet';
import { ShuleKitPanel } from './components/ShuleKitPanel';
import { ShuleMartPanel } from './components/ShuleMartPanel';
import { ClassDetail } from './components/ClassDetail';
import { PanelProvider } from './components/PanelStack';
import {
  NotificationsPanel,
  BusesPanel,
  GuardsPanel,
  DetailPanel,
  QuickLookPanel,
  SOSPanel,
} from './components/SecondaryPanels';
import { useToast } from './hooks/useToast';
import { useClock } from './hooks/useClock';
import { cams } from './data/cams';
import { useData } from './auth/DataContext';

export default function App() {
  const { user, loading } = useAuth();
  const { branches, setSelectedOrgId, context } = useData();
  const [view, setView] = useState('home');
  const [scope, setScope] = useState(null);
  const [viewerCam, setViewerCam] = useState(null);
  const [sheetContent, setSheetContent] = useState(null);
  const [sheetClass, setSheetClass] = useState('');
  const { message, visible, showToast } = useToast();
  const clock = useClock();
  const [attnOpen, setAttnOpen] = useAttentionOnce();
  const [feesToday, setFeesToday] = useState(0);

  useEffect(() => {
    if (branches && branches.length) {
      if (!scope || !branches.some(b => b.id === scope)) {
        setScope(branches[0].id);
        setSelectedOrgId(branches[0].id);
      }
      const cur = (!scope || !branches.some(b => b.id === scope)) ? branches[0].id : scope;
      const scoped = branches.filter(b => b.id === cur);
      setFeesToday(+scoped.reduce((a, b) => a + (Number(b.ft) || Number(b._feesCollected) || 0), 0).toFixed(2));
    } else {
      setFeesToday(0);
    }
  }, [branches, scope, setSelectedOrgId]);

  const setScopeAndOrg = useCallback((s) => { setScope(s); setSelectedOrgId(s); }, [setSelectedOrgId]);

  const go = useCallback((v) => setView(v), []);
  const openCam = useCallback((cam) => setViewerCam(cam), []);
  const closeCam = useCallback(() => setViewerCam(null), []);

  const closeSheet = useCallback(() => {
    setSheetContent(null);
    setSheetClass('');
  }, []);

  const openSheet = useCallback((content, cls = '') => {
    setSheetContent(content);
    setSheetClass(cls);
  }, []);

  const openBlast = useCallback(() => {
    openSheet(
      <BlastWizard scope={scope} onClose={closeSheet} showToast={showToast} />
    );
  }, [scope, openSheet, closeSheet, showToast]);

  const openMeeting = useCallback(() => {
    openSheet(
      <MeetingWizard onClose={closeSheet} showToast={showToast} />,
      'wiz'
    );
  }, [openSheet, closeSheet, showToast]);

  const openTeaching = useCallback(() => {
    openSheet(
      <TeachingSheet
        onClose={closeSheet}
        showToast={showToast}
        onOpenClass={(id) => {
          openSheet(
            <ClassDetail
              classId={id}
              onClose={closeSheet}
              showToast={showToast}
              onAssignCover={(cid, teacher) => showToast(`${teacher} covering ${cid}`)}
            />
          );
        }}
      />
    );
  }, [openSheet, closeSheet, showToast]);

  const onAttnAction = useCallback(
    (action) => {
      if (action === 'approve') go('approve');
      else if (action === 'cam7') {
        const c = cams.find((x) => x.id === 7);
        if (c) openCam(c);
      } else if (action === 'buses') showToast('Opening buses');
    },
    [go, openCam, showToast]
  );


  const openBuses = useCallback(() => {
    openSheet(<BusesPanel onClose={closeSheet} showToast={showToast} />);
  }, [openSheet, closeSheet, showToast]);

  const openGuards = useCallback(() => {
    openSheet(
      <GuardsPanel
        onClose={closeSheet}
        showToast={showToast}
        onOpenCam={(id) => {
          const c = cams.find((x) => x.id === id);
          if (c) openCam(c);
        }}
      />
    );
  }, [openSheet, closeSheet, showToast, openCam]);

  const openNotif = useCallback(() => {
    openSheet(
      <NotificationsPanel
        onClose={closeSheet}
        showToast={showToast}
        onAction={(a) => {
          if (a === 'live') go('live');
          if (a === 'approve') go('approve');
        }}
      />
    );
  }, [openSheet, closeSheet, showToast, go]);

  const openDet = useCallback(
    (kind) => {
      openSheet(<DetailPanel kind={kind} onClose={closeSheet} showToast={showToast} />);
    },
    [openSheet, closeSheet, showToast]
  );

  const openQuick = useCallback(
    (name) => {
      openSheet(<QuickLookPanel name={name} onClose={closeSheet} showToast={showToast} />);
    },
    [openSheet, closeSheet, showToast]
  );

  const openSOS = useCallback(() => {
    openSheet(<SOSPanel onClose={closeSheet} showToast={showToast} />);
  }, [openSheet, closeSheet, showToast]);


  const openShuleKit = useCallback(() => {
    openSheet(<ShuleKitPanel onClose={closeSheet} showToast={showToast} />);
  }, [openSheet, closeSheet, showToast]);

  const openShuleMart = useCallback(() => {
    openSheet(<ShuleMartPanel onClose={closeSheet} showToast={showToast} />);
  }, [openSheet, closeSheet, showToast]);

  const openClass = useCallback(
    (id) => {
      openSheet(
        <ClassDetail
          classId={id}
          onClose={closeSheet}
          showToast={showToast}
          onAssignCover={(cid, teacher) => showToast(`${teacher} covering ${cid}`)}
        />
      );
    },
    [openSheet, closeSheet, showToast]
  );

  if (loading) {
    return (
      <div className="stage">
        <div className="phone">
          <div className="screen" style={{ overflow: 'hidden' }}>
            <Splash />
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <LoginScreen />;

  const hour = new Date().getHours();
  const name = user?.firstName || user?.name || user?.fullName || 'Director';
  const greeting =
    (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening') +
    `, ${name}`;

  return (
    <PanelProvider>
    <div className="stage">
      <div className="phone">
        <div className="screen" id="screen">
          <div className="notch" />
          <StatusBar clock={clock} />

          <div className="views">
            {view === 'home' && (
              <HomeView
                scope={scope}
                setScope={setScopeAndOrg}
                greeting={greeting}
                feesToday={feesToday}
                setFeesToday={setFeesToday}
                onGo={go}
                onOpenCam={openCam}
                onOpenSheet={openSheet}
                showToast={showToast}
                onOpenMeeting={openMeeting}
                onOpenTeaching={openTeaching}
                onOpenAttn={() => setAttnOpen(true)}
                onOpenNotif={openNotif}
                onOpenDet={openDet}
                onOpenQuick={openQuick}
              />
            )}
            {view === 'live' && (
              <LiveView
                scope={scope}
                setScope={setScopeAndOrg}
                onOpenCam={openCam}
                showToast={showToast}
                onOpenBuses={openBuses}
                onOpenGuards={openGuards}
              />
            )}
            {view === 'approve' && <ApproveView scope={scope} showToast={showToast} />}
            {view === 'insights' && <InsightsView scope={scope} showToast={showToast} onOpenDet={openDet} />}
            {view === 'console' && (
              <ConsoleView
              showToast={showToast}
              onOpenBlast={openBlast}
              onOpenQuick={(name) => {
                if (name === 'ShuleKit') return openShuleKit();
                if (name === 'ShuleMart') return openShuleMart();
                return openQuick(name);
              }}
              onOpenSOS={openSOS}
            />
            )}
            {view === 'yo' && <YoInfo onClose={() => go('home')} showToast={showToast} />}
          </div>

          <TabBar active={view} onChange={go} approvalCount={context?.counts?.pendingApprovals ?? 0} />

          {viewerCam && (
            <CameraViewer cam={viewerCam} onClose={closeCam} showToast={showToast} />
          )}

          <Sheet open={!!sheetContent} className={sheetClass} onClose={closeSheet}>
            {sheetContent}
          </Sheet>

          <AttentionPopup
            open={attnOpen}
            onClose={() => setAttnOpen(false)}
            onAction={onAttnAction}
          />

          <PwaPrompts />
      <Toast message={message} visible={visible} />
        </div>
      </div>
    </div>
    </PanelProvider>
  );
}


