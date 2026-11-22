import React, { useMemo, useRef, useState } from 'react';
import { FileText, UploadCloud, Download, Trash2, FolderOpen, Plus, Search, CheckCircle2 } from 'lucide-react';

type TabKey = 'list' | 'upload';

interface DocItem {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  url?: string;
  file?: File;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const DocumentsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('list');
  const [query, setQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [documents, setDocuments] = useState<DocItem[]>([
    {
      id: 'seed-1',
      name: 'report.pdf',
      size: 1_048_576,
      uploadedAt: '2026-11-11T05:29:00',
    },
  ]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.name.toLowerCase().includes(q));
  }, [documents, query]);

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (!incoming.length) return;
    const mapped: DocItem[] = incoming.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      url: URL.createObjectURL(file),
      file,
    }));
    setDocuments((prev) => [...mapped, ...prev]);
    setActiveTab('list');
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeDoc = (id: string) => {
    setDocuments((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((d) => d.id !== id);
    });
  };

  const downloadDoc = (doc: DocItem) => {
    if (doc.url) {
      const a = document.createElement('a');
      a.href = doc.url;
      a.download = doc.name;
      a.click();
      return;
    }
    // Placeholder for server-hosted documents
    const a = document.createElement('a');
    a.href = '#';
    a.download = doc.name;
    a.click();
  };

  return (
    <div className="space-y-5 text-[#13213D]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A95AD]">Student Files</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#13213D]">Documents</h2>
          <p className="mt-1 text-sm text-[#6B7385]">Upload, organize, and access important documents in one place.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-[#E5E8EF] bg-white px-3 py-2 shadow-sm">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#F5A623]/15 text-[#B7791F]">
            <FolderOpen className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-semibold text-[#6B7385]">Total files</div>
            <div className="text-sm font-extrabold text-[#13213D]">{documents.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-[#E5E8EF] bg-[#F7F8FB] p-1.5 shadow-sm">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'list'
                ? 'bg-white text-[#13213D] shadow-sm ring-1 ring-[#E5E8EF]'
                : 'text-[#6B7385] hover:text-[#13213D]'
            }`}
          >
            <FileText className="h-4 w-4" />
            Document list
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-white text-[#13213D] shadow-sm ring-1 ring-[#E5E8EF]'
                : 'text-[#6B7385] hover:text-[#13213D]'
            }`}
          >
            <UploadCloud className="h-4 w-4" />
            Upload a document
          </button>
        </div>
      </div>

      {activeTab === 'upload' ? (
        <div className="space-y-4">
          <div className="rounded-3xl border border-[#E5E8EF] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight text-[#13213D]">Upload a new document</h3>
                <p className="mt-0.5 text-sm text-[#6B7385]">PDF, images, or common document files. You can add multiple files at once.</p>
              </div>
              <span className="hidden rounded-full bg-[#13213D]/5 px-3 py-1 text-xs font-semibold text-[#13213D] sm:inline-flex">
                Secure upload
              </span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
              }}
              className={`group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed p-8 text-center transition-all sm:p-10 ${
                isDragging
                  ? 'border-[#F5A623] bg-[#FFF8EC] shadow-[0_0_0_4px_rgba(245,166,35,0.12)]'
                  : 'border-[#D8DEEA] bg-gradient-to-b from-[#F9FAFC] to-[#F3F5F9] hover:border-[#F5A623]/70 hover:bg-[#FFFBF3]'
              }`}
            >
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/70 to-transparent pointer-events-none" />
              <div className="relative mx-auto flex max-w-md flex-col items-center">
                <div className={`mb-4 grid h-16 w-16 place-items-center rounded-2xl shadow-sm transition-colors ${isDragging ? 'bg-[#F5A623] text-white' : 'bg-[#13213D] text-[#F5A623]'}`}>
                  <UploadCloud className="h-7 w-7" />
                </div>
                <p className="text-base font-bold text-[#13213D]">
                  {isDragging ? 'Drop files to upload' : 'Click to select files to upload'}
                </p>
                <p className="mt-1.5 text-sm text-[#6B7385]">or drag and drop them here</p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#13213D] shadow-sm ring-1 ring-[#E5E8EF] group-hover:ring-[#F5A623]/30">
                  <Plus className="h-4 w-4 text-[#F5A623]" />
                  Choose files
                </div>
              </div>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.currentTarget.value = '';
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E8EF] bg-[#F7FAFF] p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-white text-[#2563EB] shadow-sm ring-1 ring-[#DCE7FF]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#13213D]">Tips for clean records</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#5F6B85]">Use clear file names (e.g. “Term 1 Report - John.pdf”) so documents are easy to find later. Uploaded files will appear in your document list.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A95AD]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents"
                className="w-full rounded-xl border border-[#E5E8EF] bg-white py-2.5 pl-9 pr-3 text-sm text-[#13213D] outline-none ring-[#F5A623]/20 transition placeholder:text-[#9AA4B8] focus:border-[#F5A623]/50 focus:ring-4"
              />
            </div>
            <button
              onClick={() => setActiveTab('upload')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#13213D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0E1830]"
            >
              <Plus className="h-4 w-4 text-[#F5A623]" />
              Upload document
            </button>
          </div>

          <div className="rounded-3xl border border-[#E5E8EF] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold tracking-tight text-[#13213D]">Uploaded documents</h3>
                <p className="text-xs text-[#6B7385]">{filtered.length} {filtered.length === 1 ? 'file' : 'files'} available</p>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D8DEEA] bg-[#F9FAFC] px-6 py-10 text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#8A95AD] shadow-sm ring-1 ring-[#E5E8EF]">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-[#13213D]">No documents found</p>
                <p className="mt-1 text-sm text-[#6B7385]">
                  {documents.length ? 'Try a different search term.' : 'Upload your first document to see it here.'}
                </p>
                {!documents.length && (
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#13213D] px-4 py-2 text-sm font-semibold text-white"
                  >
                    <UploadCloud className="h-4 w-4 text-[#F5A623]" /> Upload a document
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((doc) => (
                  <div
                    key={doc.id}
                    className="group flex flex-col gap-3 rounded-2xl border border-[#E5E8EF] bg-[#FCFCFD] p-4 transition hover:border-[#D5DBE8] hover:bg-white hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-[#13213D] text-[#F5A623] shadow-sm">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#13213D] sm:text-[15px]">{doc.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6B7385]">
                          <span className="font-medium">{formatBytes(doc.size)}</span>
                          <span className="h-1 w-1 rounded-full bg-[#CBD2E1]" />
                          <span>Uploaded {formatDateTime(doc.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:flex-shrink-0">
                      <button
                        onClick={() => downloadDoc(doc)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#DCE2EF] bg-white px-3.5 py-2 text-sm font-semibold text-[#13213D] transition hover:border-[#C9D3E6] hover:bg-[#F7F9FC] sm:flex-none"
                      >
                        <Download className="h-4 w-4 text-[#3B82F6]" />
                        Download
                      </button>
                      <button
                        onClick={() => removeDoc(doc.id)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#F3D2D5] bg-[#FFF7F7] px-3.5 py-2 text-sm font-semibold text-[#B42318] transition hover:bg-[#FFF1F2] sm:flex-none"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPanel;
