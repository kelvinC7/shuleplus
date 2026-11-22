import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UNLINKED_CANDIDATE } from '../../constants/mockData';
import { Avatar } from '../common/Avatar';
import { BabyeyiSheet } from '../modals/BabyeyiSheet';
import { QrScannerModal } from '../modals/QrScannerModal';
import { LANGUAGES } from '../../constants/translations';
import {
  Search,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Globe,
  Plus,
  LogIn,
  CheckCircle,
  FileText,
  ShoppingBag,
  Sparkles,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { Child } from '../../types';

export const LandingView: React.FC = () => {
  const {
    kids,
    parent,
    linkChild,
    setActiveKidIndex,
    setShowLanding,
    isLoggedIn,
    login,
    openSheet,
    closeSheet,
    lang,
    setLang,
    showToast,
    savedKidCodes,
    toggleSaveKidCode,
    t,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [foundChild, setFoundChild] = useState<Child | null>(null);

  // Link Child Wizard State
  const [linkingChild, setLinkingChild] = useState<Child | null>(null);
  const [linkStep, setLinkStep] = useState<number>(0);
  const [otpCode, setOtpCode] = useState(['4', '8', '1', '9', '0', '6']);

  const openLanguagePicker = () => {
    openSheet(
      <div className="space-y-3 text-xs">
        <b className="text-sm font-extrabold text-[#13213D] block">
          {t('Choose your language')}
        </b>
        <p className="text-xs text-[#6B7385] leading-relaxed">
          {t('The whole app switches: labels, notifications, Babyeyi notices and guides.')}
        </p>
        <div className="grid grid-cols-1 gap-2 pt-1 max-h-[380px] overflow-y-auto no-scrollbar">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                closeSheet();
                showToast(`${t('Language selected')}: ${l.label}`);
              }}
              className={`p-3 rounded-2xl border text-left font-bold flex items-center justify-between transition-all ${
                lang === l.code
                  ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm'
                  : 'bg-white border-[#E5E8EF] text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div>
                <b className="text-xs block">{l.native}</b>
                <span className="text-[10.5px] text-[#6B7385] font-normal">{l.label}</span>
              </div>
              <span className="text-xs font-mono uppercase font-bold text-[#F5A623]">
                {l.code}
              </span>
            </button>
          ))}
        </div>
      </div>,
      t('Language')
    );
  };

  const handleSearch = () => {
    const q = searchQuery.trim().toUpperCase().replace(/\s+/g, '');
    if (!q) return;

    // Check existing or candidate child
    const existing = kids.find(
      (k) =>
        k.sdms.replace(/\s+/g, '').toUpperCase().includes(q) ||
        k.code.replace(/\s+/g, '').toUpperCase().includes(q) ||
        k.cardno.replace(/\s+/g, '').toUpperCase().includes(q) ||
        q === '1234'
    );

    if (existing) {
      setFoundChild(existing);
      showToast(`Found: ${existing.n}`);
      return;
    }

    if (
      UNLINKED_CANDIDATE.sdms.replace(/\s+/g, '').toUpperCase().includes(q) ||
      UNLINKED_CANDIDATE.code.replace(/\s+/g, '').toUpperCase().includes(q) ||
      q === '9944'
    ) {
      setFoundChild(UNLINKED_CANDIDATE);
      showToast(`Found: ${UNLINKED_CANDIDATE.n}`);
      return;
    }

    showToast(t('No learner found for that code'));
  };

  const startLinkProcess = (target: Child) => {
    setLinkingChild(target);
    setLinkStep(1); // Check guardian phone step
  };

  const handleConfirmLink = () => {
    if (!linkingChild) return;
    linkChild(linkingChild);
    setLinkStep(3); // Linked step
  };

  const openQrScanner = () => {
    openSheet(
      <QrScannerModal
        targetChild={kids[0] || UNLINKED_CANDIDATE}
        onSuccess={(scanned) => {
          setFoundChild(scanned);
          showToast(`Found: ${scanned.n}`);
        }}
      />,
      t('Scan ShuleCard QR')
    );
  };

  const openBabyeyiNotice = () => {
    openSheet(<BabyeyiSheet />, t('Get Babyeyi'));
  };

  return (
    <div className="min-h-full bg-[#0B1220] text-white p-5 pb-20 select-none">
      {/* Top Header: Brand + Language Switcher */}
      <div className="flex items-center justify-between pt-2 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#F5A623] text-[#13213D] font-extrabold flex items-center justify-center text-sm shadow-md">
            yo
          </div>
          <div>
            <b className="text-base font-extrabold text-white tracking-tight">yoShule</b>
            <span className="text-[10px] text-[#F5A623] uppercase font-bold tracking-wider block">
              {t('Parent App')}
            </span>
          </div>
        </div>

        {/* Language selector button */}
        <button
          onClick={openLanguagePicker}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 active:scale-95 transition-all shadow-sm"
        >
          <Globe className="w-3.5 h-3.5 text-[#F5A623]" />
          <span className="uppercase">{lang}</span>
        </button>
      </div>

      {/* Main Tagline */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white tracking-tight leading-snug">
          {t('Follow your child’s learning journey from anywhere.')}
        </h1>
        <p className="text-xs text-[#9FB0D3] mt-1.5 leading-relaxed">
          {t('Attendance, marks, report cards, ShuleCard pocket money and school messages in one simple view.')}
        </p>
      </div>

      {/* Quick Lookup Bar */}
      <div className="bg-white/10 border border-white/15 p-4 rounded-3xl backdrop-blur-md mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <b className="text-xs font-bold text-white flex items-center gap-1.5">
            <Search className="w-4 h-4 text-[#F5A623]" />
            {t('Find your child')}
          </b>
          <span className="text-[10px] text-white/60">{t('Search by SDMS code')}</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('SDMS code / ShuleCard number')}
            className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#F5A623]"
          />
          <button
            onClick={handleSearch}
            className="w-11 h-10 rounded-2xl bg-[#F5A623] text-[#13213D] flex items-center justify-center font-bold active:scale-95 transition-all shadow-md"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Demo Quick Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] text-white/50">{t('Demo chips:')}</span>
          {['1234', '9944', 'SDM-2024-004821'].map((c) => (
            <button
              key={c}
              onClick={() => {
                setSearchQuery(c);
                setTimeout(handleSearch, 50);
              }}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white/80 border border-white/10 transition-colors"
            >
              {c}
            </button>
          ))}
        </div>

        <button
          onClick={openQrScanner}
          className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center justify-center gap-2 border border-white/10 transition-colors"
        >
          <QrCode className="w-4 h-4 text-[#F5A623]" />
          {t('Scan ShuleCard QR')}
        </button>
      </div>

      {/* Search Result Card (if found) */}
      {foundChild && (
        <div className="bg-white text-[#13213D] p-4 rounded-3xl shadow-xl mb-6 space-y-3 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-[#E5E8EF] pb-3">
            <div className="flex items-center gap-3">
              <Avatar child={foundChild} size="md" />
              <div>
                <b className="text-sm font-extrabold text-[#13213D] block">{foundChild.n}</b>
                <span className="text-[11px] text-[#6B7385]">
                  {foundChild.cls} · Umucyo Secondary School
                </span>
              </div>
            </div>
            <button
              onClick={() => setFoundChild(null)}
              className="text-[#6B7385] hover:text-black text-xs font-bold px-2 py-1"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => startLinkProcess(foundChild)}
              className="py-2.5 px-3 rounded-xl bg-[#13213D] text-white font-bold text-center hover:bg-slate-900 transition-colors"
            >
              {t('Link to my account')}
            </button>
            <button
              onClick={openBabyeyiNotice}
              className="py-2.5 px-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold text-center hover:bg-amber-100 transition-colors"
            >
              {t('Get Babyeyi')}
            </button>
          </div>

          {/* Bookmark on device toggle */}
          <button
            onClick={() => toggleSaveKidCode(foundChild.sdms)}
            className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#13213D] text-[11px] font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
          >
            {savedKidCodes.includes(foundChild.sdms) ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-[#1FA971]" />
                {t('Saved on this device')} ✓
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5 text-[#F5A623]" />
                {t('Save to device for quick lookup')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Linked Children List */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9FB0D3]">
            {t('My Children')}
          </h3>
          <span className="text-xs text-[#F5A623] font-bold">
            {kids.length} {t(kids.length === 1 ? 'child' : 'children')}
          </span>
        </div>

        <div className="space-y-2.5">
          {kids.map((kid, idx) => (
            <div
              key={kid.id}
              onClick={() => {
                setActiveKidIndex(idx);
                setShowLanding(false);
              }}
              className="bg-white/10 hover:bg-white/15 border border-white/10 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-98 transition-all"
            >
              <div className="flex items-center gap-3">
                <Avatar child={kid} size="md" />
                <div>
                  <b className="text-sm font-extrabold text-white block">{kid.n}</b>
                  <span className="text-xs text-[#9FB0D3]">{kid.cls} · {kid.lvl}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-[10.5px] font-bold rounded-lg border border-emerald-500/30">
                  {kid.att}% {t('att')}
                </span>
                <span className="px-2 py-1 bg-amber-500/20 text-amber-300 text-[10.5px] font-bold rounded-lg border border-amber-500/30">
                  {kid.avg}% {t('avg')}
                </span>
                <ArrowRight className="w-4 h-4 text-white/50" />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => startLinkProcess(UNLINKED_CANDIDATE)}
          className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4 text-[#F5A623]" />
          {t('Add a child to my account')}
        </button>

        {/* Bookmarked / Saved learners quick access */}
        {savedKidCodes.includes(UNLINKED_CANDIDATE.sdms) &&
          !kids.some((k) => k.sdms === UNLINKED_CANDIDATE.sdms) && (
            <div className="bg-white/5 border border-amber-400/20 p-3 rounded-2xl flex items-center justify-between mt-2">
              <div className="flex items-center gap-2.5">
                <Avatar child={UNLINKED_CANDIDATE} size="sm" />
                <div>
                  <b className="text-xs text-white block">{UNLINKED_CANDIDATE.n}</b>
                  <span className="text-[10px] text-amber-300 font-semibold">
                    {t('Saved on this device')} · {UNLINKED_CANDIDATE.cls}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startLinkProcess(UNLINKED_CANDIDATE)}
                  className="px-2.5 py-1 bg-[#F5A623] hover:bg-amber-400 text-[#13213D] text-[10.5px] font-extrabold rounded-lg shadow-sm"
                >
                  {t('Link a child')}
                </button>
                <button
                  onClick={() => toggleSaveKidCode(UNLINKED_CANDIDATE.sdms)}
                  className="text-white/40 hover:text-white p-1 text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Enter Console CTA */}
      <div className="space-y-3">
        <button
          onClick={() => {
            if (isLoggedIn) {
              setShowLanding(false);
              showToast(t('Open Parent Console'));
            } else {
              openSheet(
                <div className="space-y-3 text-xs">
                  <b className="text-sm font-extrabold text-[#13213D] block">{t('Sign in')}</b>
                  <input id="rlph" placeholder={t('Phone e.g. 0781039986')} className="w-full border rounded-xl px-3 py-2" />
                  <input id="rlpin" type="password" placeholder={t('5-digit PIN')} className="w-full border rounded-xl px-3 py-2" />
                  <button
                    onClick={async () => {
                      const ph = (document.getElementById('rlph') as HTMLInputElement)?.value || '';
                      const pin = (document.getElementById('rlpin') as HTMLInputElement)?.value || '';
                      await login(ph, pin);
                      closeSheet();
                    }}
                    className="w-full py-2 rounded-xl bg-[#13213D] text-white font-bold"
                  >
                    {t('Sign in')}
                  </button>
                </div>,
                t('Sign in')
              );
            }
          }}
          className="w-full py-4 rounded-2xl bg-[#F5A623] hover:bg-amber-400 text-[#13213D] text-sm font-extrabold flex items-center justify-center gap-2 shadow-xl active:scale-98 transition-all"
        >
          <LogIn className="w-4 h-4" />
          {t('Enter console')}
        </button>

        <button
          onClick={openBabyeyiNotice}
          className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 border border-white/10 transition-colors"
        >
          <FileText className="w-4 h-4 text-[#F5A623]" />
          {t('Get Babyeyi')} ({t('Requirements & Term Dates')})
        </button>
      </div>

      {/* Link Child Modal Flow (Step 1 to 3) */}
      {linkingChild && linkStep > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#F4F5F8] text-[#13213D] w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#E5E8EF] pb-3">
              <div>
                <small className="text-[10px] font-extrabold uppercase text-[#F5A623] tracking-wider block">
                  {t('Link Child')} · {t('Step')} {linkStep} {t('of')} 3
                </small>
                <h3 className="text-base font-extrabold text-[#13213D]">
                  {linkStep === 1
                    ? 'Verify Guardian Number'
                    : linkStep === 2
                    ? 'Enter SMS Code'
                    : t('Child Linked!')}
                </h3>
              </div>
              <button
                onClick={() => setLinkingChild(null)}
                className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Check Guardian phone */}
            {linkStep === 1 && (
              <div className="space-y-3 text-xs">
                <div className="bg-white p-3 rounded-2xl border border-[#E5E8EF] flex items-center gap-3">
                  <Avatar child={linkingChild} size="md" />
                  <div>
                    <b className="text-sm text-[#13213D] block">{linkingChild.n}</b>
                    <span className="text-[#6B7385]">{linkingChild.cls} · Umucyo SS</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <ShieldCheck className="w-4 h-4 text-[#1FA971]" />
                    {t('Guardian Number Registered:')}
                  </div>
                  <b className="font-mono text-xs block">{parent.ph}</b>
                  <p className="text-[11px] text-amber-800 mt-1">
                    {t('Your number is verified in the school database. We will send a 6-digit one-time code to link')} {linkingChild.first}.
                  </p>
                </div>

                <button
                  onClick={() => setLinkStep(2)}
                  className="w-full py-3 bg-[#13213D] text-white font-extrabold rounded-xl hover:bg-slate-900 shadow-md transition-all"
                >
                  {t('Send Verification Code')}
                </button>
              </div>
            )}

            {/* Step 2: OTP */}
            {linkStep === 2 && (
              <div className="space-y-3 text-xs text-center">
                <p className="text-[#6B7385]">
                  {t('Enter the 6-digit code sent to')} <b className="text-[#13213D]">{parent.ph}</b>
                </p>

                <div className="flex justify-center gap-2 py-2">
                  {otpCode.map((digit, i) => (
                    <input
                      key={i}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => {
                        const newOtp = [...otpCode];
                        newOtp[i] = e.target.value;
                        setOtpCode(newOtp);
                      }}
                      className="w-10 h-12 text-center text-lg font-extrabold bg-white border border-[#E5E8EF] rounded-xl focus:border-[#F5A623] focus:outline-none"
                    />
                  ))}
                </div>

                <button
                  onClick={handleConfirmLink}
                  className="w-full py-3 bg-[#F5A623] text-[#13213D] font-extrabold rounded-xl hover:bg-amber-400 shadow-md transition-all mt-2"
                >
                  {t('Verify and Link')}
                </button>
              </div>
            )}

            {/* Step 3: Done */}
            {linkStep === 3 && (
              <div className="space-y-3 text-center py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-base font-extrabold text-[#13213D]">
                  {linkingChild.first} {t('is Linked!')}
                </h4>
                <p className="text-xs text-[#6B7385]">
                  {t('Marks, attendance, homework, and ShuleCard pocket money are now unlocked in your console.')}
                </p>
                <button
                  onClick={() => {
                    setLinkingChild(null);
                    setShowLanding(false);
                  }}
                  className="w-full py-3 bg-[#13213D] text-white font-extrabold rounded-xl hover:bg-slate-900 shadow-md transition-all"
                >
                  Open {linkingChild.first}’s Console
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
