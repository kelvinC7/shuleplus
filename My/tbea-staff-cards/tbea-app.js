import {
  renderTbeaStaffCardToCanvas,
  renderTbeaStaffCardBackToCanvas,
  canvasToBlob,
  downloadBlob,
  safeFilename,
  DEFAULT_LOGO_URL,
} from './tbea-card-renderer.js';
import {
  CARDS_PER_SHEET,
  chunk,
  composeA4SheetCanvas,
  openA4PrintWindow,
} from './tbea-sheet-layout.js';

/** @typedef {{ id: string; fullName: string; staffPhone: string; staffEmail: string; role: string; photoUrl: string }} StaffRow */

export function createStaffApp() {
  const $ = (id) => document.getElementById(id);
  const els = {
    companyName: $('companyName'),
    companyPhone: $('companyPhone'),
    companyEmail: $('companyEmail'),
    website: $('website'),
    staffList: $('staffList'),
    staffCount: $('staffCount'),
    preview: $('preview'),
    formStatus: $('formStatus'),
    btnAddStaff: $('btnAddStaff'),
    btnPrint: $('btnPrint'),
    btnPngSheets: $('btnPngSheets'),
    btnPngCards: $('btnPngCards'),
    previewTabs: document.querySelectorAll('.preview-tabs .tab'),
    btnPng: $('btnPng'),
    modal: $('staffModal'),
    modalTitle: $('modalTitle'),
    modalForm: $('staffForm'),
    modalFullName: $('modalFullName'),
    modalStaffPhone: $('modalStaffPhone'),
    modalStaffEmail: $('modalStaffEmail'),
    modalRole: $('modalRole'),
    modalPhoto: $('modalPhoto'),
    modalPhotoPreview: $('modalPhotoPreview'),
    modalCancel: $('modalCancel'),
    modalSave: $('modalSave'),
  };

  /** @type {StaffRow[]} */
  let staffRows = [];
  /** @type {{ front: HTMLCanvasElement; back: HTMLCanvasElement; label: string }[]} */
  let lastRendered = [];
  /** @type {HTMLCanvasElement | null} */
  let sharedBackCanvas = null;
  /** @type {HTMLCanvasElement[]} */
  let lastSheetCanvases = [];
  let activeSide = 'front';
  let renderSeq = 0;
  let renderPromise = Promise.resolve();
  let editingId = null;
  let modalPhotoUrl = '';

  function isPhotoUrlUsedByStaff(url) {
    if (!url) return false;
    return staffRows.some((r) => r.photoUrl === url);
  }

  /** Revoke blob URLs only when no staff row still references them. */
  function revokeBlobIfOrphan(url) {
    if (url?.startsWith('blob:') && !isPhotoUrlUsedByStaff(url)) {
      URL.revokeObjectURL(url);
    }
  }

  async function normalizePhotoForStorage(url) {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (url.startsWith('blob:')) {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read photo'));
        reader.readAsDataURL(blob);
      });
    }
    return url;
  }

  function companyBlock() {
    return {
      companyName: els.companyName.value.trim() || 'TBEA Co., Ltd.',
      poBox: '',
      phone: els.companyPhone.value.trim(),
      email: els.companyEmail.value.trim(),
      website: els.website.value.trim(),
      logoUrl: DEFAULT_LOGO_URL,
    };
  }

  function setStatus(message, isError = false) {
    els.formStatus.textContent = message;
    els.formStatus.classList.toggle('error', isError);
  }

  function saveStaffToStorage() {
    const serializable = staffRows.map(({ id, fullName, staffPhone, staffEmail, role, photoUrl }) => ({
      id,
      fullName,
      staffPhone,
      staffEmail,
      role,
      photoUrl: photoUrl?.startsWith('data:') ? photoUrl : '',
    }));
    try {
      localStorage.setItem('tbea-staff-rows', JSON.stringify(serializable));
    } catch {
      /* ignore quota */
    }
  }

  function loadStaffFromStorage() {
    try {
      const raw = localStorage.getItem('tbea-staff-rows');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        staffRows = parsed.map((r) => ({
          id: r.id || crypto.randomUUID(),
          fullName: String(r.fullName || '').trim(),
          staffPhone: String(r.staffPhone || '').trim(),
          staffEmail: String(r.staffEmail || '').trim(),
          role: String(r.role || 'Staff').trim(),
          photoUrl: String(r.photoUrl || '').trim(),
        })).filter((r) => r.fullName);
      }
    } catch {
      staffRows = [];
    }
  }

  function renderStaffList() {
    els.staffCount.textContent = String(staffRows.length);
    if (!staffRows.length) {
      els.staffList.innerHTML = '<li class="staff-empty">No staff yet — click <strong>Add staff</strong>.</li>';
      return;
    }
    els.staffList.innerHTML = staffRows
      .map(
        (row) => `
      <li class="staff-item" data-id="${row.id}">
        <div class="staff-item-main">
          <span class="staff-item-name">${escapeHtml(row.fullName)}</span>
          <span class="staff-item-meta">${escapeHtml(row.role || 'Staff')}</span>
        </div>
        <div class="staff-item-actions">
          <button type="button" class="icon-btn edit" data-action="edit" aria-label="Edit">Edit</button>
          <button type="button" class="icon-btn danger" data-action="delete" aria-label="Delete">×</button>
        </div>
      </li>`,
      )
      .join('');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openModal(row = null) {
    editingId = row?.id ?? null;
    els.modalTitle.textContent = row ? 'Edit staff' : 'Add staff';
    els.modalFullName.value = row?.fullName ?? '';
    els.modalStaffPhone.value = row?.staffPhone ?? '';
    els.modalStaffEmail.value = row?.staffEmail ?? '';
    els.modalRole.value = row?.role ?? '';
    els.modalPhoto.value = '';
    revokeBlobIfOrphan(modalPhotoUrl);
    modalPhotoUrl = row?.photoUrl ?? '';
    els.modalPhotoPreview.src = modalPhotoUrl || '';
    els.modalPhotoPreview.hidden = !modalPhotoUrl;
    els.modal.hidden = false;
    document.body.classList.add('modal-open');
    els.modalFullName.focus();
  }

  function closeModal() {
    els.modal.hidden = true;
    document.body.classList.remove('modal-open');
    revokeBlobIfOrphan(modalPhotoUrl);
    editingId = null;
    modalPhotoUrl = '';
  }

  function applyPreviewSide() {
    els.btnPng.textContent =
      activeSide === 'front' ? 'Download PNG (this side)' : 'Download PNG (this side)';
    els.previewTabs.forEach((tab) => {
      const on = tab.dataset.side === activeSide;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  async function renderAll() {
    const seq = ++renderSeq;
    if (!staffRows.length) {
      els.preview.innerHTML = '<p class="hint">Add staff to see 3×3 A4 sheet preview.</p>';
      lastRendered = [];
      lastSheetCanvases = [];
      setStatus('');
      return;
    }

    setStatus(`Rendering ${staffRows.length} staff…`);
    const base = companyBlock();

    sharedBackCanvas = await renderTbeaStaffCardBackToCanvas(base);
    if (seq !== renderSeq) return;

    lastRendered = [];
    for (const person of staffRows) {
      const payload = {
        ...base,
        fullName: person.fullName,
        staffPhone: person.staffPhone,
        staffEmail: person.staffEmail,
        role: person.role || 'Staff',
        photoUrl: person.photoUrl || '',
      };
      const front = await renderTbeaStaffCardToCanvas(payload);
      if (seq !== renderSeq) return;
      lastRendered.push({
        front,
        back: sharedBackCanvas,
        label: person.fullName,
      });
    }

    const staffPages = chunk(lastRendered, CARDS_PER_SHEET);
    lastSheetCanvases = staffPages.map((pageStaff) => {
      const padded =
        activeSide === 'back'
          ? pageStaff.map(() => sharedBackCanvas)
          : pageStaff.map((r) => r.front);
      while (padded.length < CARDS_PER_SHEET) padded.push(null);
      return composeA4SheetCanvas(padded);
    });

    els.preview.innerHTML = '';
    lastSheetCanvases.forEach((sheet, index) => {
      const wrap = document.createElement('figure');
      wrap.className = 'sheet-figure';
      sheet.className = 'sheet-preview-canvas';
      wrap.appendChild(sheet);
      const cap = document.createElement('figcaption');
      cap.textContent = `A4 sheet ${index + 1} of ${lastSheetCanvases.length} · 3×3 · ${activeSide}`;
      wrap.appendChild(cap);
      els.preview.appendChild(wrap);
    });

    setStatus(
      `${staffRows.length} staff · ${lastSheetCanvases.length} sheet(s) · ${activeSide} side`,
    );
    applyPreviewSide();
  }

  function scheduleRender() {
    renderPromise = renderAll().catch((e) => setStatus(e.message || String(e), true));
  }

  async function ensureRendered() {
    await renderPromise;
    if (!lastSheetCanvases.length) await renderAll();
    if (!lastSheetCanvases.length) {
      throw new Error('Add at least one staff member first.');
    }
  }

  function cardDataUrlsForPrint() {
    const backUrl = sharedBackCanvas?.toDataURL('image/png') ?? '';
    return lastRendered.map((r) =>
      activeSide === 'back' ? backUrl : r.front.toDataURL('image/png'),
    );
  }

  els.staffList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const li = btn.closest('.staff-item');
    const id = li?.dataset.id;
    if (!id) return;
    const row = staffRows.find((r) => r.id === id);
    if (!row) return;
    if (btn.dataset.action === 'edit') openModal(row);
    if (btn.dataset.action === 'delete') {
      revokeBlobIfOrphan(row.photoUrl);
      staffRows = staffRows.filter((r) => r.id !== id);
      saveStaffToStorage();
      renderStaffList();
      scheduleRender();
    }
  });

  els.btnAddStaff.addEventListener('click', () => openModal());

  els.modalCancel.addEventListener('click', closeModal);
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) closeModal();
  });

  els.modalPhoto.addEventListener('change', () => {
    const file = els.modalPhoto.files?.[0];
    const previous = modalPhotoUrl;
    if (file) {
      modalPhotoUrl = URL.createObjectURL(file);
    } else if (editingId) {
      modalPhotoUrl = staffRows.find((r) => r.id === editingId)?.photoUrl ?? '';
    } else {
      modalPhotoUrl = '';
    }
    revokeBlobIfOrphan(previous);
    els.modalPhotoPreview.src = modalPhotoUrl;
    els.modalPhotoPreview.hidden = !modalPhotoUrl;
  });

  els.modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = els.modalFullName.value.trim();
    if (!fullName) {
      setStatus('Staff name is required.', true);
      return;
    }
    els.modalSave.disabled = true;
    let storedPhoto = modalPhotoUrl;
    try {
      storedPhoto = await normalizePhotoForStorage(modalPhotoUrl);
    } catch {
      setStatus('Could not process photo. Try another image.', true);
      els.modalSave.disabled = false;
      return;
    }

    const entry = {
      id: editingId || crypto.randomUUID(),
      fullName,
      staffPhone: els.modalStaffPhone.value.trim(),
      staffEmail: els.modalStaffEmail.value.trim(),
      role: els.modalRole.value.trim() || 'Staff',
      photoUrl: storedPhoto,
    };

    if (editingId) {
      const prev = staffRows.find((r) => r.id === editingId);
      revokeBlobIfOrphan(prev?.photoUrl);
      staffRows = staffRows.map((r) => (r.id === editingId ? entry : r));
    } else {
      staffRows.push(entry);
    }
    revokeBlobIfOrphan(modalPhotoUrl);
    saveStaffToStorage();
    renderStaffList();
    closeModal();
    scheduleRender();
    els.modalSave.disabled = false;
  });

  document.querySelectorAll('.controls input').forEach((input) => {
    input.addEventListener('input', scheduleRender);
    input.addEventListener('change', scheduleRender);
  });

  els.previewTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activeSide = tab.dataset.side === 'back' ? 'back' : 'front';
      scheduleRender();
    });
  });

  els.btnPrint.addEventListener('click', async () => {
    try {
      els.btnPrint.disabled = true;
      await ensureRendered();
      openA4PrintWindow(`TBEA ${activeSide} · 3×3`, cardDataUrlsForPrint());
    } catch (e) {
      setStatus(e.message || String(e), true);
    } finally {
      els.btnPrint.disabled = false;
    }
  });

  els.btnPngSheets.addEventListener('click', async () => {
    try {
      els.btnPngSheets.disabled = true;
      await ensureRendered();
      for (let i = 0; i < lastSheetCanvases.length; i += 1) {
        const blob = await canvasToBlob(lastSheetCanvases[i]);
        downloadBlob(blob, `tbea-${activeSide}-sheet-${String(i + 1).padStart(2, '0')}.png`);
      }
      setStatus(`Downloaded ${lastSheetCanvases.length} A4 sheet PNG(s)`);
    } catch (e) {
      setStatus(e.message || String(e), true);
    } finally {
      els.btnPngSheets.disabled = false;
    }
  });

  els.btnPngCards.addEventListener('click', async () => {
    try {
      els.btnPngCards.disabled = true;
      await ensureRendered();
      for (const item of lastRendered) {
        const canvas = activeSide === 'back' ? item.back : item.front;
        const blob = await canvasToBlob(canvas);
        downloadBlob(blob, `tbea-${safeFilename(item.label)}-${activeSide}.png`);
      }
      setStatus(`Downloaded ${lastRendered.length} card PNG(s)`);
    } catch (e) {
      setStatus(e.message || String(e), true);
    } finally {
      els.btnPngCards.disabled = false;
    }
  });

  els.btnPng.addEventListener('click', () => els.btnPngSheets.click());

  loadStaffFromStorage();
  renderStaffList();
  scheduleRender();
}
