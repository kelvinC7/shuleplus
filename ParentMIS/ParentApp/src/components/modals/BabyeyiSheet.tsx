import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { parentApi } from '../../services/parentApi';
import { Download, CheckCircle, FileText, Globe, RefreshCw } from 'lucide-react';
import { LANGUAGES } from '../../constants/translations';

interface DocumentItem {
  id: string;
  title: string;
  category: string;
  description?: string;
  url?: string;
  date: string;
}

export const BabyeyiSheet: React.FC = () => {
  const { activeKid, closeSheet, showToast, lang, setLang, t } = useApp();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDocs() {
      setLoading(true);
      const res = await parentApi.getDocuments(activeKid?.id, lang);
      if (res && res.data) {
        setDocuments(res.data);
      }
      setLoading(false);
    }
    loadDocs();
  }, [activeKid?.id, lang]);

  const handleDownloadPdf = (docTitle: string) => {
    showToast(`${t('Downloading official notice:')} ${docTitle}`);
  };

  return (
    <div className="space-y-4 select-none">
      {/* Language Picker */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E5E8EF] bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#F5A623]/12 text-[#C2410C]">
            <Globe className="h-4 w-4 text-[#D97706]" />
          </div>
          <div className="leading-tight">
            <span className="block text-xs font-bold text-[#13213D]">{t('Notice language')}</span>
            <span className="text-[11px] text-[#6B7385]">{t('Choose your preferred language')}</span>
          </div>
        </div>
        <div className="flex gap-1 rounded-xl bg-[#F4F6FA] p-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                lang === l.code
                  ? 'bg-white text-[#13213D] shadow-sm ring-1 ring-[#E5E8EF]'
                  : 'text-slate-500 hover:text-[#13213D]'
              }`}
              title={l.label}
            >
              {l.code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Official Babyeyi Notice Card */}
      <div className="overflow-hidden rounded-3xl border border-[#E5E8EF] bg-white shadow-sm">
        <div className="relative border-b border-[#E5E8EF] bg-gradient-to-b from-[#FBFCFE] to-white px-5 py-5 text-center">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#13213D] via-[#F5A623] to-[#13213D] opacity-80" />
          <small className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#C2410C]">
            {t('Official school circular & requirements')} · {lang.toUpperCase()}
          </small>
          <h3 className="mt-2 text-lg font-extrabold tracking-tight text-[#13213D]">
            {activeKid ? `${activeKid.n} · ${activeKid.cls}` : t('Student academic requirements')}
          </h3>
          <p className="mt-1 text-[11px] font-medium text-[#6B7385]">
            {t('Ministry of Education & NESA compliant')}
          </p>
        </div>

        <div className="space-y-4 p-5">
          {/* Live Documents from Backend */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#13213D]">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#13213D] text-[#F5A623]">
                  <FileText className="h-3.5 w-3.5" />
                </span>
                {t('Official published documents')}
              </h4>
              {!loading && (
                <span className="rounded-full bg-[#F4F6FA] px-2.5 py-1 text-[11px] font-semibold text-[#5F6B85]">
                  {documents.length} {t(documents.length === 1 ? 'file' : 'files')}
                </span>
              )}
            </div>

            {loading ? (
              <div className="rounded-2xl border border-[#E5E8EF] bg-[#F9FAFC] p-8 text-center">
                <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#F5A623]" />
                <span className="text-sm font-medium text-[#6B7385]">{t('Fetching school notices...')}</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D8DEEA] bg-[#F9FAFC] px-5 py-8 text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#94A3B8] shadow-sm ring-1 ring-[#E5E8EF]">
                  <FileText className="h-5 w-5" />
                </div>
                <b className="block text-sm font-bold text-[#13213D]">{t('No documents published yet')}</b>
                <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-[#6B7385]">
                  {t('Official term requirements and Babyeyi directives will appear here once uploaded by the school administration.')}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-[#E5E8EF] bg-[#FCFCFD] p-3.5 transition hover:border-[#D7DEEA] hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-[#13213D]/[0.04] text-[#13213D] ring-1 ring-[#E5E8EF]">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <b className="block truncate text-sm font-bold text-[#13213D]">{doc.title}</b>
                        <span className="mt-0.5 block text-[11px] text-[#6B7385]">
                          {doc.category} · {new Date(doc.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadPdf(doc.title)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#E5E8EF] bg-white px-3 py-2 text-xs font-semibold text-[#13213D] transition hover:border-[#F5A623]/40 hover:bg-[#FFFBF3]"
                      title={t('Download document')}
                    >
                      <Download className="h-4 w-4 text-[#F5A623]" />
                      <span className="hidden sm:inline">{t('Download')}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verification stamp */}
          <div className="flex items-center gap-2.5 rounded-xl border border-[#DDF3E8] bg-[#F3FBF7] px-3.5 py-2.5 text-[11px] font-semibold text-[#15803D]">
            <CheckCircle className="h-4 w-4" />
            <span>{t('Verified by the school document service')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
