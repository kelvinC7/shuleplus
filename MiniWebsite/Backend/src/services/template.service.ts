import { env } from '../config/env';
import { normalizeAdmissionForm, type AdmissionFormField } from '../constants/admission-form';
import { resolveAnyAssetUrl } from '../utils/asset-url';
import {
  buildMapEmbedUrl,
  buildMapQuery,
  formatLocationAddress,
  locationSummary,
} from '../utils/location';
import { normalizeGallery, galleryAlbums } from '../utils/gallery';
import { normalizeLeaders, leaderInitials } from '../utils/leaders';

export interface TemplateSite {
  slug: string;
  organizationId: string;
  title: string;
  tagline: string | null;
  heroTitle: string | null;
  heroText: string | null;
  heroImageUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  cell: string | null;
  village: string | null;
  schoolCategory: string | null;
  schoolProgram: string | null;
  educationLevels: string[] | null;
  leaders: unknown;
  websiteUrl: string | null;
  about: string | null;
  vision: string | null;
  mission: string | null;
  admissionInfo: string | null;
  admissionsEnabled: boolean;
  admissionForm: AdmissionFormField[] | null;
  customCss: string | null;
  stats: Array<{ label: string; value: string }> | null;
  programs: Array<{ name: string; description: string }> | null;
  news: Array<{ title: string; date: string; excerpt: string }> | null;
  gallery: unknown;
}

export interface TemplatePage {
  slug: string;
  title: string;
  content: string;
}

export interface RenderOptions {
  publicBaseUrl: string;
}

function esc(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function json(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  const raw = String(value ?? '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const h = raw.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return fallback;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function hexAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function imageStyle(url: string | null | undefined, fallback: string): string {
  return url ? `background-image: url('${esc(url)}');` : `background: ${fallback};`;
}

type IconName =
  | 'pin'
  | 'phone'
  | 'mail'
  | 'target'
  | 'bulb'
  | 'check'
  | 'send'
  | 'x'
  | 'menu'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'newspaper'
  | 'calendar'
  | 'camera'
  | 'cap'
  | 'book'
  | 'users'
  | 'award'
  | 'refresh'
  | 'printer';

const ICONS: Record<IconName, string> = {
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  menu: '<path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  newspaper: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  cap: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
  refresh: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
  printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
};

function icon(name: IconName, size = 16): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

// Hand-drawn underline used under the handwritten "Welcome to" kicker and
// the "Future Leaders" accent — same curve as the ShuleKit order page.
const HAND_SVG = (stroke: string, width: string, height: string): string =>
  `<svg viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 6 Q30 1 60 6 Q90 11 118 5" fill="none" stroke="${stroke}" stroke-width="3.2" stroke-linecap="round"/></svg>`;

function navSections(site: TemplateSite): Array<[string, string]> {
  const out: Array<[string, string]> = [
    ['about', 'About'],
    ['programs', 'Programs'],
  ];
  if (normalizeLeaders(site.leaders).length) out.push(['leadership', 'Leadership']);
  if (site.news?.length) out.push(['news', 'News']);
  if (normalizeGallery(site.gallery).length) out.push(['gallery', 'Gallery']);
  out.push(['circulars', 'Circular']);
  if (site.admissionsEnabled) out.push(['admissions', 'Admissions']);
  out.push(['contact', 'Contact']);
  return out;
}

function renderNavLinks(site: TemplateSite, pages: TemplatePage[]): string {
  const links = navSections(site).map(([id, label]) => {
    if (id === 'circulars') {
      return `<a class="nav-link circ-open-link" href="#" data-circ-open="1">${label}</a>`;
    }
    return `<a class="nav-link" href="#${id}">${label}</a>`;
  });
  const pageLinks = pages
    .filter((p) => p.slug !== 'home')
    .map((p) => `<a class="nav-link" href="#page-${esc(p.slug)}">${esc(p.title)}</a>`);
  return `${links.join('')}${pageLinks.join('')}`;
}

function renderDrawerLinks(site: TemplateSite, pages: TemplatePage[]): string {
  const links = navSections(site).map(([id, label]) => {
    if (id === 'circulars') {
      return `<a class="drawer-link circ-open-link" href="#" data-circ-open="1">${icon('chevron-right', 12)}${label}</a>`;
    }
    return `<a class="drawer-link" href="#${id}">${icon('chevron-right', 12)}${label}</a>`;
  });
  const pageLinks = pages
    .filter((p) => p.slug !== 'home')
    .map(
      (p) =>
        `<a class="drawer-link" href="#page-${esc(p.slug)}">${icon('chevron-right', 12)}${esc(p.title)}</a>`
    );
  return `${links.join('')}${pageLinks.join('')}`;
}

function educationLevelsLabel(levels: string[] | null | undefined): string {
  if (!Array.isArray(levels) || !levels.length) return '';
  return levels.map((level) => String(level).trim()).filter(Boolean).join(', ');
}

function renderProfileRow(iconName: IconName, label: string, value: string): string {
  if (!value.trim()) return '';
  return `
  <div class="profile-tile">
    <div class="profile-ic">${icon(iconName, 16)}</div>
    <div class="profile-tile-body">
      <div class="profile-label">${esc(label)}</div>
      <div class="profile-val">${esc(value)}</div>
    </div>
  </div>`;
}

function renderSchoolProfilePanel(site: TemplateSite): string {
  const location = locationSummary({
    province: site.province,
    district: site.district,
    sector: site.sector,
    cell: site.cell,
  });
  const levels = educationLevelsLabel(site.educationLevels);

  const facts = [
    renderProfileRow('pin', 'Location', location),
    renderProfileRow('target', 'School category', site.schoolCategory ?? ''),
    renderProfileRow('cap', 'School program', site.schoolProgram ?? ''),
    renderProfileRow('book', 'Education levels', levels),
    site.websiteUrl
      ? renderProfileRow(
          'mail',
          'Website',
          site.websiteUrl.startsWith('http') ? site.websiteUrl : `https://${site.websiteUrl}`
        )
      : '',
    renderProfileRow('phone', 'Phone', site.phone ?? ''),
    renderProfileRow('mail', 'Email', site.email ?? ''),
  ]
    .filter(Boolean)
    .join('');

  if (!facts) return '';

  return `
  <section class="hero-profile" aria-label="School profile">
    <div class="container">
      <div class="hero-profile-card">
        <div class="hero-profile-intro">
          <p class="hero-profile-heading">School profile</p>
          <p class="hero-profile-desc">Essential information about ${esc(site.title)}</p>
        </div>
        <div class="profile-grid">${facts}</div>
      </div>
    </div>
  </section>`;
}

function renderLeadershipSection(site: TemplateSite): string {
  const leaders = normalizeLeaders(site.leaders);
  if (!leaders.length) return '';

  return `
  <section id="leadership" class="section leadership-section">
    <div class="container">
      <div class="sec-head">
        <div class="eyebrow">Our Team</div>
        <h2 class="sec-title">Meet Our Leaders</h2>
        <p class="sec-sub">The dedicated team guiding ${esc(site.title)} toward excellence</p>
      </div>
      <div class="leaders-showcase">
        ${leaders
          .map(
            (leader) => `
        <article class="leader-card-v2">
          <div class="leader-card-v2-inner">
            <div class="leader-card-v2-photo">
              ${leader.photoUrl ? `<img src="${esc(leader.photoUrl)}" alt="${esc(leader.name)}" />` : `<span>${esc(leaderInitials(leader.name))}</span>`}
            </div>
            <div class="leader-card-v2-body">
              <h3 class="leader-card-v2-name">${esc(leader.name)}</h3>
              <p class="leader-card-v2-role">${esc(leader.role)}</p>
              <div class="leader-card-v2-links">
                ${leader.phone ? `<a class="leader-card-v2-link" href="tel:${esc(leader.phone)}">${icon('phone', 14)}${esc(leader.phone)}</a>` : ''}
                ${leader.email ? `<a class="leader-card-v2-link" href="mailto:${esc(leader.email)}">${icon('mail', 14)}${esc(leader.email)}</a>` : ''}
              </div>
            </div>
          </div>
        </article>`
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

function renderContactSection(site: TemplateSite): string {
  const formattedAddress = formatLocationAddress({
    village: site.village,
    cell: site.cell,
    sector: site.sector,
    district: site.district,
    province: site.province,
    address: site.address,
    country: 'Rwanda',
  });
  const mapQuery = buildMapQuery({
    village: site.village,
    cell: site.cell,
    sector: site.sector,
    district: site.district,
    province: site.province,
    address: site.address,
    country: 'Rwanda',
  });
  const locationLine = locationSummary({
    cell: site.cell,
    sector: site.sector,
    district: site.district,
    province: site.province,
  });
  const mapSrc = buildMapEmbedUrl({
    village: site.village,
    cell: site.cell,
    sector: site.sector,
    district: site.district,
    province: site.province,
    address: site.address,
    country: 'Rwanda',
  });
  const mapPinLabel = site.cell || site.sector || site.district || site.province || site.title;

  return `
  <!-- ── CONTACT ── -->
  <section id="contact" class="section sec-cream">
    <div class="container">
      <div class="sec-head">
        <div class="eyebrow">Get In Touch</div>
        <h2 class="sec-title">Contact Us</h2>
        <p class="sec-sub">Reach our school office or visit us in person</p>
      </div>
      <div class="contact-grid">
        <div class="contact-panel">
          <div class="contact-list">
            ${site.phone ? `
            <div class="contact-item">
              <div class="contact-ic">${icon('phone', 17)}</div>
              <div>
                <div class="contact-label">Phone</div>
                <div class="contact-val"><a href="tel:${esc(site.phone)}">${esc(site.phone)}</a></div>
              </div>
            </div>` : ''}
            ${site.email ? `
            <div class="contact-item">
              <div class="contact-ic">${icon('mail', 17)}</div>
              <div>
                <div class="contact-label">Email</div>
                <div class="contact-val"><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></div>
              </div>
            </div>` : ''}
            ${formattedAddress ? `
            <div class="contact-item">
              <div class="contact-ic">${icon('pin', 17)}</div>
              <div>
                <div class="contact-label">Address</div>
                <div class="contact-val">${esc(formattedAddress)}</div>
              </div>
            </div>` : ''}
            ${locationLine ? `
            <div class="contact-item">
              <div class="contact-ic">${icon('target', 17)}</div>
              <div>
                <div class="contact-label">Location</div>
                <div class="contact-val">${esc(locationLine)}</div>
                ${site.cell ? `<div class="contact-meta contact-meta--cell">${icon('pin', 12)}Pinned to cell: <strong>${esc(site.cell)}</strong>${site.village ? ` · ${esc(site.village)}` : ''}</div>` : ''}
              </div>
            </div>` : ''}
          </div>
          <a class="btn btn-amber contact-directions" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}" target="_blank" rel="noopener noreferrer">
            ${icon('pin', 15)} Get directions
          </a>
        </div>
        <div class="map-card">
          <div class="map-card-head">
            <div>
              <div class="map-card-label">School location</div>
              <div class="map-card-place">${esc(mapPinLabel)}</div>
            </div>
            <span class="map-card-level">${site.cell ? 'Cell level' : site.sector ? 'Sector level' : 'District level'}</span>
          </div>
          <iframe
            class="map-iframe"
            title="${esc(site.title)} location map"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            src="${esc(mapSrc)}"
            allowfullscreen
          ></iframe>
          <div class="map-badge">
            <span class="map-badge-dot"></span>
            ${esc(mapPinLabel)}
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function renderPages(site: TemplateSite, pages: TemplatePage[]): string {
  return pages
    .filter((p) => p.slug !== 'home')
    .map(
      (p) => `
  <section class="site-page" id="page-${esc(p.slug)}">
    <div class="container">
      <div class="sec-head">
        <div class="eyebrow">Overview</div>
        <h2 class="sec-title">${esc(p.title)}</h2>
      </div>
      <div class="page-card">${p.content}</div>
    </div>
  </section>`
    )
    .join('\n');
}

function renderStats(site: TemplateSite): string {
  const stats = site.stats?.length
    ? site.stats
    : [
        { label: 'Years of Excellence', value: '25+' },
        { label: 'Happy Learners', value: '1,200+' },
        { label: 'Qualified Staff', value: '80+' },
        { label: 'Subjects Taught', value: '18' },
      ];
  return stats
    .map(
      (s) => `
      <div class="stat">
        <div class="stat-value">${esc(s.value)}</div>
        <div class="stat-label">${esc(s.label)}</div>
      </div>`
    )
    .join('');
}

function renderPrograms(site: TemplateSite): string {
  const programs = site.programs?.length
    ? site.programs
    : [
        { name: 'Nursery', description: 'Play-based early learning for children aged 3–6 (N1–N3).' },
        { name: 'Primary', description: 'Strong foundations across P1–P6 with modern teaching methods.' },
        { name: 'O-Level', description: 'Ordinary Level studies (S1–S3) with a wide subject choice.' },
        { name: 'A-Level', description: 'Advanced Level combinations (S4–S6) preparing for university.' },
      ];
  const themes = [
    { cls: 'pc-dark', iconBg: 'rgba(251,191,36,0.15)', iconColor: '#FBBF24' },
    { cls: 'pc-amber', iconBg: 'rgba(251,191,36,0.2)', iconColor: '#1F2937' },
    { cls: 'pc-light', iconBg: 'rgba(31,41,55,0.07)', iconColor: '#1F2937' },
  ];
  return programs
    .map((p, i) => {
      const th = themes[i % themes.length];
      return `
      <div class="program-card ${th.cls}">
        <div class="pc-icon" style="background:${th.iconBg};color:${th.iconColor}">${esc(String.fromCharCode(65 + i))}</div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.description)}</p>
      </div>`;
    })
    .join('');
}

function renderNews(site: TemplateSite): string {
  const news = site.news ?? [];
  if (!news.length) return '';
  return news
    .map(
      (n) => `
      <button type="button" class="news-card" data-title="${esc(n.title)}" data-date="${esc(n.date)}" data-body="${esc(n.excerpt ?? '')}">
        <div class="news-date">${icon('calendar', 12)}${esc(n.date)}</div>
        <h3>${esc(n.title)}</h3>
        ${n.excerpt ? `<p>${esc(n.excerpt)}</p>` : ''}
        <span class="news-more">Read more ${icon('chevron-right', 11)}</span>
      </button>`
    )
    .join('');
}

function renderGallerySection(site: TemplateSite): string {
  const items = normalizeGallery(site.gallery);
  if (!items.length) return '';

  const albums = galleryAlbums(items);
  const filters = [
    `<button type="button" class="gallery-filter active" data-album="all">All photos (${items.length})</button>`,
    ...albums.map(
      (album) =>
        `<button type="button" class="gallery-filter" data-album="${esc(album)}">${esc(album)} (${items.filter((item) => (item.album || 'General') === album).length})</button>`
    ),
  ].join('');

  const cards = items
    .map((item, i) => {
      const layout =
        i === 0 ? 'gallery-card gallery-card--hero' : i % 7 === 4 ? 'gallery-card gallery-card--wide' : 'gallery-card';
      const caption = item.caption?.trim()
        ? `<span class="gallery-cap">${esc(item.caption)}</span>`
        : `<span class="gallery-cap">${esc(item.album || 'General')}</span>`;
      return `
      <button
        type="button"
        class="${layout}"
        data-album="${esc(item.album || 'General')}"
        data-index="${i}"
        onclick="openLightbox(${i})"
        aria-label="Gallery image ${i + 1}"
      >
        <img src="${esc(item.url)}" alt="${esc(item.caption || `Gallery image ${i + 1}`)}" loading="lazy" />
        ${caption}
      </button>`;
    })
    .join('');

  return `
  <!-- ── GALLERY ── -->
  <section id="gallery" class="section sec-white">
    <div class="container">
      <div class="sec-head">
        <div class="eyebrow">Memories</div>
        <h2 class="sec-title">Photo Gallery</h2>
        <p class="sec-sub">Campus life, events, and moments from our school community</p>
      </div>
      <div class="gallery-shell">
        <div class="gallery-filters" role="tablist" aria-label="Gallery albums">${filters}</div>
        <div class="gallery-masonry">${cards}</div>
      </div>
    </div>
  </section>`;
}

function inputTypeForField(field: AdmissionFormField): string {
  if (field.type === 'email') return 'email';
  if (field.type === 'phone') return 'tel';
  if (field.type === 'date') return 'date';
  return 'text';
}

function renderAdmissionField(field: AdmissionFormField): string {
  const req = field.required ? ' required' : '';
  const full = field.type === 'textarea' ? ' full' : '';
  const label = `<label class="f-label" for="${esc(field.id)}">${esc(field.label)}${field.required ? ' *' : ''}</label>`;

  if (field.type === 'textarea') {
    return `<div class="full">${label}<textarea class="f-input" id="${esc(field.id)}" name="${esc(field.id)}" placeholder="${esc(field.placeholder ?? '')}"${req}></textarea></div>`;
  }
  if (field.type === 'select') {
    const opts = (field.options ?? [])
      .map((o) => `<option value="${esc(o)}">${esc(o)}</option>`)
      .join('');
    return `<div class="${full.trim()}">${label}<select class="f-input" id="${esc(field.id)}" name="${esc(field.id)}"${req}><option value="">Select</option>${opts}</select></div>`;
  }
  if (field.type === 'file') {
    return `<div class="${full.trim()}">${label}<input class="f-input f-file" id="${esc(field.id)}" name="${esc(field.id)}" type="file" accept="image/*,application/pdf"${req} data-file-field="1" /></div>`;
  }
  return `<div class="${full.trim()}">${label}<input class="f-input" id="${esc(field.id)}" name="${esc(field.id)}" type="${inputTypeForField(field)}" placeholder="${esc(field.placeholder ?? '')}"${req} /></div>`;
}

function renderAdmissionForm(site: TemplateSite): string {
  const fields = normalizeAdmissionForm(site.admissionForm);
  return fields.map(renderAdmissionField).join('\n');
}

function renderAdmissionsSection(site: TemplateSite, admissionInfo: string, publicBaseUrl: string): string {
  if (!site.admissionsEnabled) return '';
  return `
  <!-- ── ADMISSIONS ── -->
  <section id="admissions" class="section sec-white">
    <div class="container">
      <div class="sec-head">
        <div class="eyebrow">Admissions</div>
        <h2 class="sec-title">Join Our School</h2>
        <p class="sec-sub">Everything you need to know about applying</p>
      </div>
      <div class="adm-grid">
        <div class="adm-note">
          <p>${esc(admissionInfo)}</p>
          <p>For questions, reach us at
            ${site.phone ? `<strong>${esc(site.phone)}</strong>` : 'our office'}${site.email ? ` or <a href="mailto:${esc(site.email)}" style="color:var(--a);font-weight:700">${esc(site.email)}</a>` : ''}.
          </p>
          <ol class="adm-steps">
            <li><span class="adm-step-num">1</span>Submit the application form below</li>
            <li><span class="adm-step-num">2</span>Our team reviews and contacts you</li>
            <li><span class="adm-step-num">3</span>Complete enrolment and join us</li>
          </ol>
        </div>
        <form class="form-card" id="apply-form" novalidate>
          <div class="form-head">
            <div class="form-head-icon">${icon('send', 17)}</div>
            <h3>Student Application Form</h3>
          </div>
          <div class="form-body">
            ${renderAdmissionForm(site)}
            <button class="btn btn-amber form-submit" type="submit">${icon('send', 14)}Submit Application</button>
            <div class="form-message" id="form-message"></div>
          </div>
        </form>
      </div>
    </div>
  </section>`;
}

function renderCircularsSection(): string {
  return `
  <!-- ── CIRCULARS LAUNCH (button only — list opens in modal) ── -->
  <section id="circulars" class="section sec-cream circ-launch-section">
    <div class="container">
      <div class="circ-launch-card">
        <div class="circ-launch-icon" aria-hidden="true">${icon('newspaper', 28)}</div>
        <div class="circ-launch-copy">
          <span class="circ-launch-tag">Babyeyi · School documents</span>
          <h2 class="circ-launch-title">Fee &amp; requirement circulars</h2>
          <p class="circ-launch-desc">Browse official Babyeyi documents by academic year and term — view or print from one place.</p>
        </div>
        <button type="button" class="btn btn-amber circ-open-link circ-launch-btn" data-circ-open="1">
          Browse circulars ${icon('chevron-right', 16)}
        </button>
      </div>
    </div>
  </section>

  <!-- ── CIRCULARS LIST MODAL ── -->
  <div class="circ-modal" id="circ-modal" aria-hidden="true">
    <div class="circ-modal-back" data-circ-close="1"></div>
    <div class="circ-modal-panel" role="dialog" aria-modal="true" aria-labelledby="circ-modal-title">
      <div class="circ-modal-head">
        <div>
          <p class="circ-modal-kicker">Babyeyi · School circulars</p>
          <h2 id="circ-modal-title" class="circ-modal-title">Select a document</h2>
          <p class="circ-modal-sub">Filter by year and term, then open a circular to view or print.</p>
        </div>
        <button type="button" class="circ-modal-close" data-circ-close="1" aria-label="Close">${icon('x', 18)}</button>
      </div>
      <div class="circ-modal-toolbar">
        <div class="circ-filters">
          <label class="circ-filter">
            <span>Academic year</span>
            <select id="circ-year" class="circ-select"></select>
          </label>
          <label class="circ-filter">
            <span>Term</span>
            <select id="circ-term" class="circ-select"></select>
          </label>
        </div>
        <button type="button" class="btn btn-amber circ-refresh" id="circ-refresh">${icon('refresh', 14)}Refresh</button>
      </div>
      <div class="circ-modal-body">
        <div class="circ-grid" id="circ-grid">
          <div class="circ-loading">Loading circulars…</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── CIRCULAR DOCUMENT PREVIEW MODAL ── -->
  <div class="circ-doc-modal" id="circ-doc-modal" aria-hidden="true">
    <div class="circ-modal-back" data-circ-doc-close="1"></div>
    <div class="circ-doc-panel" role="dialog" aria-modal="true" aria-labelledby="circ-doc-title">
      <div class="circ-doc-head">
        <div>
          <p class="circ-modal-kicker">Document preview</p>
          <h2 id="circ-doc-title" class="circ-modal-title">School circular</h2>
        </div>
        <div class="circ-doc-actions">
          <button type="button" class="circ-btn primary" id="circ-doc-print">${icon('printer', 14)}Print</button>
          <button type="button" class="circ-modal-close" data-circ-doc-close="1" aria-label="Close">${icon('x', 18)}</button>
        </div>
      </div>
      <div class="circ-doc-frame-wrap">
        <iframe id="circ-doc-frame" class="circ-doc-frame" title="Circular document preview"></iframe>
      </div>
    </div>
  </div>`;
}

/**
 * Renders the self-contained school website template — a modern editorial
 * design (amber + navy #1F2937 + cream, Montserrat typography) modelled on
 * the live babyeyi "modern" template, with handwritten Patrick-Hand-style
 * accents drawn in the Caveat cursive font (hero kicker + about heading).
 * Output is stored as an HTML file on disk and served at /:slug.
 */
export function renderVSchoolSite(
  site: TemplateSite,
  pages: TemplatePage[],
  options: RenderOptions
): string {
  const publicBaseUrl = options.publicBaseUrl.replace(/\/$/, '');
  const defaultHero = `Welcome to ${site.title}`;
  const heroTitle = site.heroTitle?.trim() ? site.heroTitle.trim() : defaultHero;
  const heroText =
    site.heroText ??
    (site.tagline ??
      'Excellence in education, shaping the future leaders of Rwanda.');
  const about =
    site.about ??
    `${site.title} is a leading school committed to academic excellence, character formation and holistic development of every learner.`;
  const admissionInfo =
    site.admissionInfo ??
    'Admissions are open for the new academic year. Fill in the application form below and our team will contact you with the next steps.';

  const p = normalizeHexColor(site.primaryColor, '#001121');
  const a = normalizeHexColor(site.secondaryColor, '#f59e0b');
  const aSoft = hexAlpha(a, 0.12);
  const aBorder = hexAlpha(a, 0.3);
  const aShadow = hexAlpha(a, 0.4);
  const ink = '#1F2937';
  const heroKicker = heroTitle.toLowerCase().startsWith('welcome') ? 'Welcome to' : 'Welcome to';
  const heroName = site.title;
  const heroSub = heroTitle === defaultHero ? heroText : heroTitle;

  const coverSrc = site.heroImageUrl;
  const logoSrc = resolveAnyAssetUrl(site.logoUrl);
  const aboutSrc = site.heroImageUrl;

  const pills: Array<{ icon: IconName; val: string }> = [];
  const displayAddress = formatLocationAddress({
    village: site.village,
    cell: site.cell,
    sector: site.sector,
    district: site.district,
    province: site.province,
    address: site.address,
    country: 'Rwanda',
  });
  if (displayAddress) pills.push({ icon: 'pin', val: displayAddress });
  if (site.phone) pills.push({ icon: 'phone', val: site.phone });
  if (site.email) pills.push({ icon: 'mail', val: site.email });

  const tags = (site.programs ?? []).slice(0, 3).map((prog) => prog.name);

  const galleryItems = normalizeGallery(site.gallery);
  const galleryJson = json(galleryItems);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(site.title)} | Official School Website</title>
<meta name="description" content="${esc(heroText)}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Caveat:wght@600;700&display=swap" rel="stylesheet" />
<style>
:root {
  --p: ${esc(p)};
  --a: ${a};
  --a2: ${a};
  --a-soft: ${aSoft};
  --a-border: ${aBorder};
  --a-shadow: ${aShadow};
  --ink: ${ink};
  --ink2: #111827;
  --cream: #F8F7F4;
  --muted: #6B7280;
  --line: #E8E4DC;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-family: 'Montserrat', sans-serif; color: var(--ink); background: #fff; line-height: 1.6; -webkit-font-smoothing: antialiased; }
img { max-width: 100%; }
button { font-family: inherit; cursor: pointer; }
a { text-decoration: none; color: inherit; }
svg { display: inline-block; flex-shrink: 0; }
.container { width: min(1280px, 100%); margin: 0 auto; padding: 0 1.25rem; }
@media (min-width: 640px) { .container { padding: 0 2rem; } }

/* ── NAVBAR ─────────────────────────────────────────── */
.nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: linear-gradient(180deg, var(--p) 0%, color-mix(in srgb, var(--p) 88%, #000) 100%); box-shadow: 0 4px 24px rgba(0,0,0,0.18); border-bottom: 1px solid rgba(255,255,255,0.06); }
.nav-inner { max-width: 1280px; margin: 0 auto; padding: 0.7rem 1.25rem; display: flex; align-items: center; justify-content: center; position: relative; min-height: 58px; }
.nav-links { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 0.2rem; }
.nav-link { color: rgba(255,255,255,0.9); font-size: 0.74rem; font-weight: 700; padding: 0.5rem 0.85rem; border-radius: 999px; transition: all 0.22s; letter-spacing: 0.02em; }
.nav-link:hover { background: rgba(255,255,255,0.14); color: #fff; transform: translateY(-1px); }
.nav-link.active { background: var(--a); color: var(--ink); box-shadow: 0 4px 14px var(--a-shadow); }
.nav-apply { position: absolute; right: 1.25rem; display: inline-flex; align-items: center; gap: 0.35rem; background: var(--a); color: var(--ink); font-weight: 900; font-size: 0.72rem; padding: 0.58rem 1rem; border-radius: 999px; transition: transform 0.15s, box-shadow 0.15s; white-space: nowrap; box-shadow: 0 6px 20px var(--a-shadow); }
.nav-apply:hover { transform: scale(1.04); }
.nav-burger { display: none; position: absolute; left: 1.25rem; width: 40px; height: 40px; border-radius: 0.75rem; align-items: center; justify-content: center; background: rgba(255,255,255,0.12); color: #fff; border: 0; }
.nav-spacer { height: 64px; }

/* ── MOBILE DRAWER ──────────────────────────────────── */
.drawer { position: fixed; left: 0; top: 0; bottom: 0; width: 280px; z-index: 400; background: var(--ink); transform: translateX(-100%); transition: transform 0.3s cubic-bezier(0.4,0,0.2,1); display: flex; flex-direction: column; }
.drawer.open { transform: translateX(0); box-shadow: 8px 0 40px rgba(0,0,0,0.4); }
.drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 1.3rem 1.2rem 1rem; border-bottom: 1px solid var(--a-border); }
.drawer-name { color: #fff; font-weight: 800; font-size: 0.95rem; }
.drawer-close { width: 38px; height: 38px; border-radius: 0.75rem; background: rgba(255,255,255,0.08); color: #fff; display: flex; align-items: center; justify-content: center; border: 0; }
.drawer-nav { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.35rem; }
.drawer-link { display: flex; align-items: center; gap: 0.7rem; padding: 0.85rem 1rem; border-radius: 0.9rem; font-size: 0.9rem; font-weight: 700; color: rgba(255,255,255,0.75); transition: all 0.2s; }
.drawer-link svg { color: var(--a); }
.drawer-link:hover, .drawer-link.active { background: var(--a); color: var(--ink); }
.drawer-link:hover svg, .drawer-link.active svg { color: var(--ink); }
.drawer-cta { padding: 1rem; border-top: 1px solid var(--a-border); }
.drawer-overlay { position: fixed; inset: 0; z-index: 350; background: rgba(0,0,0,0.6); backdrop-filter: blur(3px); opacity: 0; pointer-events: none; transition: opacity 0.3s; }
.drawer-overlay.open { opacity: 1; pointer-events: auto; }

/* ── HERO ───────────────────────────────────────────── */
.hero { position: relative; min-height: min(92vh, 780px); display: flex; align-items: flex-end; overflow: hidden; }
.hero-cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hero-grad { position: absolute; inset: 0; background: linear-gradient(135deg, #111827 0%, var(--p) 100%); }
.hero-overlay { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(15,20,30,0.95) 0%, rgba(15,20,30,0.8) 20%, rgba(15,20,30,0.55) 42%, rgba(15,20,30,0.25) 70%, rgba(15,20,30,0.06) 90%, transparent 100%); }
.hero-overlay-bottom { position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,20,30,0.9) 25%, rgba(15,20,30,0.3) 60%, rgba(0,0,0,0.05) 100%); }
.hero-amber-line { position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, transparent, var(--a), transparent); }
.hero-inner { position: relative; z-index: 5; width: min(1280px, 100%); margin: 0 auto; padding: 5rem 1.25rem 5rem; }
@media (min-width: 640px) { .hero-inner { padding: 6rem 2rem 5.5rem; } }
.hero-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.95rem; border-radius: 999px; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: var(--a); background: var(--a-soft); border: 1px solid var(--a-border); margin-bottom: 0.9rem; }
.hero-badge .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--a); animation: pulse 1.6s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }
.hand-kicker { font-family: 'Caveat','Kalam','Patrick Hand',cursive; font-style: italic; font-weight: 700; font-size: clamp(1.9rem, 3.2vw, 2.6rem); color: var(--a); letter-spacing: -0.03em; text-shadow: 0 2px 14px rgba(0,0,0,0.35); display: inline-block; margin-bottom: 0.35rem; }
.kicker-underline { display: block; width: 135px; height: 14px; }
.hero-title-row { display: flex; align-items: center; gap: 1.1rem; margin-bottom: 1.1rem; }
.hero-logo { width: clamp(72px, 9vw, 100px); height: clamp(72px, 9vw, 100px); border-radius: 1rem; background: #fff; padding: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); border: 4px solid rgba(255,255,255,0.35); flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.hero-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
.hero-name { font-size: clamp(1.7rem, 4vw, 3rem); font-weight: 900; color: #fff; line-height: 1.1; letter-spacing: -0.02em; }
.hero-sub { color: rgba(255,255,255,0.85); font-size: 1rem; line-height: 1.65; max-width: 42rem; margin-bottom: 1.2rem; }
.hero-pills { display: flex; flex-wrap: wrap; gap: 0.55rem; margin-bottom: 1.5rem; }
.pill { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); color: rgba(255,255,255,0.85); }
.pill svg { color: var(--a); }
.btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.85rem 1.4rem; border-radius: 1rem; font-weight: 900; font-size: 0.82rem; transition: all 0.2s; }
.btn-amber { background: var(--a); color: var(--ink); box-shadow: 0 8px 30px var(--a-shadow); }
.btn-amber:hover { transform: scale(1.04); }
.btn-ghost { border: 2px solid rgba(255,255,255,0.3); color: #fff; }
.btn-ghost:hover { background: rgba(255,255,255,0.1); }
.hero-scroll { position: absolute; bottom: 1.4rem; left: 50%; transform: translateX(-50%); color: #fff; opacity: 0.5; animation: bounce 2s infinite; }
@keyframes bounce { 0%,100% { transform: translate(-50%,0); } 50% { transform: translate(-50%,8px); } }
.hero-ctas { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.hero-profile { position: relative; z-index: 6; margin-top: -3.5rem; margin-bottom: 1.5rem; }
.hero-profile-card { background: rgba(255,255,255,0.97); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.9); border-radius: 1.5rem; overflow: hidden; box-shadow: 0 28px 70px rgba(0,17,33,0.14); padding: 1.75rem 1.85rem; }
.hero-profile-intro { margin-bottom: 1.35rem; padding-bottom: 1.15rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
.hero-profile-heading { font-size: 0.68rem; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; color: var(--a); margin-bottom: 0.35rem; }
.hero-profile-desc { font-size: 0.92rem; font-weight: 600; color: var(--muted); line-height: 1.5; }
.profile-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.85rem; }
.profile-tile { display: flex; gap: 0.85rem; align-items: flex-start; padding: 1rem 1.05rem; background: var(--cream); border-radius: 1rem; border: 1px solid rgba(0,0,0,0.04); transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease; }
.profile-tile:hover { border-color: var(--a-border); box-shadow: 0 8px 24px rgba(0,17,33,0.06); transform: translateY(-2px); }
.profile-tile-body { min-width: 0; flex: 1; }
.profile-ic { width: 38px; height: 38px; border-radius: 0.85rem; background: #fff; color: var(--a); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,17,33,0.06); border: 1px solid rgba(0,0,0,0.04); }
.profile-label { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
.profile-val { font-size: 0.88rem; font-weight: 700; color: var(--ink); margin-top: 0.18rem; line-height: 1.45; word-break: break-word; }
.profile-empty { font-size: 0.82rem; color: var(--muted); line-height: 1.6; }
.leaders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 1.15rem; }
.leader-card { background: #fff; border: 1px solid var(--line); border-radius: 1.25rem; padding: 1.5rem 1.25rem; text-align: center; transition: transform 0.22s ease, box-shadow 0.22s ease; }
.leader-card:hover { transform: translateY(-4px); box-shadow: 0 18px 40px rgba(0,0,0,0.08); border-color: var(--a-border); }
.leader-card-avatar { width: 72px; height: 72px; margin: 0 auto 0.9rem; border-radius: 999px; background: var(--p); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.2rem; overflow: hidden; box-shadow: 0 10px 24px rgba(0,17,33,0.18); }
.leader-card-avatar img { width: 100%; height: 100%; object-fit: cover; }
.leader-card-name { font-size: 1rem; font-weight: 900; color: var(--ink); }
.leader-card-role { font-size: 0.78rem; font-weight: 800; color: var(--a); margin: 0.25rem 0 0.85rem; text-transform: uppercase; letter-spacing: 0.06em; }
.leader-card-link { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.76rem; font-weight: 700; color: var(--muted); margin: 0.18rem 0; }
.leader-card-link:hover { color: var(--p); }

/* ── LEADERSHIP ────────────────────────────────────── */
.leadership-section { background: var(--cream); }
.leaders-showcase { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 1.25rem; }
.leader-card-v2 { background: #fff; border: 1px solid var(--line); border-radius: 1.25rem; transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease; }
.leader-card-v2:hover { transform: translateY(-4px); border-color: var(--a-border); box-shadow: 0 16px 40px rgba(0,17,33,0.08); }
.leader-card-v2-inner { display: flex; gap: 1.1rem; padding: 1.35rem; align-items: flex-start; }
.leader-card-v2-photo { width: 68px; height: 68px; border-radius: 1rem; background: var(--p); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.05rem; flex-shrink: 0; overflow: hidden; }
.leader-card-v2-photo img { width: 100%; height: 100%; object-fit: cover; }
.leader-card-v2-body { flex: 1; min-width: 0; }
.leader-card-v2-name { font-size: 1rem; font-weight: 900; color: var(--ink); line-height: 1.25; }
.leader-card-v2-role { font-size: 0.72rem; font-weight: 800; color: var(--a); text-transform: uppercase; letter-spacing: 0.07em; margin: 0.28rem 0 0.7rem; }
.leader-card-v2-links { display: flex; flex-direction: column; gap: 0.3rem; }
.leader-card-v2-link { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.76rem; font-weight: 600; color: var(--muted); word-break: break-word; }
.leader-card-v2-link:hover { color: var(--p); }

/* ── STATS ──────────────────────────────────────────── */
.stats { background: var(--ink); padding: 2.2rem 0; }
.stats-inner { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.4rem; }
.stat { text-align: center; }
.stat-value { font-weight: 900; font-size: clamp(1.6rem, 3vw, 2.2rem); color: var(--a); }
.stat-label { font-size: 0.72rem; color: rgba(255,255,255,0.55); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 0.25rem; }

/* ── SECTIONS ───────────────────────────────────────── */
section { scroll-margin-top: 70px; }
.section { padding: 5rem 0; }
.sec-white { background: #fff; }
.sec-cream { background: var(--cream); }
.sec-head { text-align: center; margin-bottom: 3rem; }
.eyebrow { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: var(--a); margin-bottom: 0.9rem; }
.eyebrow::before, .eyebrow::after { content: ''; width: 24px; height: 1px; background: var(--a); }
.sec-title { font-size: clamp(1.7rem, 3.4vw, 2.6rem); font-weight: 900; color: var(--ink); line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 0.6rem; }
.sec-sub { color: var(--muted); font-size: 0.95rem; max-width: 36rem; margin: 0 auto; line-height: 1.6; }

/* ── ABOUT ──────────────────────────────────────────── */
.about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; }
.about-eyebrow { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: var(--a); margin-bottom: 1.1rem; }
.about-eyebrow::before { content: ''; width: 24px; height: 1px; background: var(--a); }
.about-title { font-size: clamp(1.8rem, 3.6vw, 2.8rem); font-weight: 900; color: var(--ink); line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 1.2rem; }
.hand-accent { font-family: 'Caveat','Kalam','Patrick Hand',cursive; font-style: italic; font-weight: 700; color: var(--a); letter-spacing: -0.03em; text-shadow: 0 2px 14px rgba(0,0,0,0.18); position: relative; white-space: nowrap; }
.hand-accent svg { position: absolute; left: 0; bottom: -8px; width: 100%; height: 14px; }
.about-text { color: var(--muted); font-size: 0.95rem; line-height: 1.7; margin-bottom: 1.4rem; white-space: pre-line; }
.tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.4rem; }
.tag { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem; border-radius: 0.75rem; font-size: 0.75rem; font-weight: 700; background: rgba(251,191,36,0.1); color: var(--ink); border: 1px solid rgba(251,191,36,0.25); }
.tag svg { color: var(--a); }
.about-media { position: relative; }
.about-media > img { width: 100%; height: 380px; object-fit: cover; border-radius: 1.5rem; box-shadow: 0 24px 60px rgba(0,0,0,0.2); position: relative; z-index: 1; }
.about-block-amber { position: absolute; bottom: -1rem; right: -1rem; width: 6rem; height: 6rem; border-radius: 1.5rem; background: rgba(251,191,36,0.25); }
.about-block-navy { position: absolute; top: -1rem; left: -1rem; width: 4rem; height: 4rem; border-radius: 1rem; background: var(--ink); opacity: 0.15; }
.about-fallback { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.af-tile { border-radius: 1.5rem; padding: 2.2rem 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; transition: transform 0.25s; }
.af-tile:hover { transform: scale(1.04); }
.af-tile span { font-size: 0.75rem; font-weight: 900; margin-top: 0.9rem; }
.af-tile:nth-child(odd) { background: var(--ink); }
.af-tile:nth-child(odd) svg { color: var(--a); }
.af-tile:nth-child(odd) span { color: #fff; }
.af-tile:nth-child(even) { background: rgba(251,191,36,0.08); margin-top: 2rem; }
.af-tile:nth-child(even) svg { color: var(--ink); }
.af-tile:nth-child(even) span { color: var(--ink); }

/* ── MISSION & VISION ───────────────────────────────── */
.mission-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4rem; }
.m-card { border-radius: 1.5rem; padding: 2.2rem; position: relative; overflow: hidden; }
.m-card-dark { background: var(--ink); }
.m-card-dark h3 { color: #fff; }
.m-card-dark .m-text { color: rgba(255,255,255,0.6); }
.m-card-light { background: #fff; border: 2px solid rgba(251,191,36,0.3); }
.m-card-light h3 { color: var(--ink); }
.m-card-light .m-text { color: var(--muted); }
.m-icon { width: 52px; height: 52px; border-radius: 1rem; display: flex; align-items: center; justify-content: center; background: rgba(251,191,36,0.15); color: var(--a); margin-bottom: 1.1rem; }
.m-title { font-size: 1.5rem; font-weight: 900; margin-bottom: 0.8rem; }
.m-text { font-size: 0.95rem; line-height: 1.7; position: relative; z-index: 1; }
.m-orb { position: absolute; top: 0; right: 0; width: 12rem; height: 12rem; border-radius: 50%; opacity: 0.06; transform: translate(50%, -50%); }
.m-orb-dark { background: var(--a); }
.m-orb-navy { background: var(--ink); }

/* ── PROGRAMS ───────────────────────────────────────── */
.programs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.2rem; }
.program-card { border-radius: 1.5rem; padding: 1.8rem 1.5rem; text-align: center; border: 2px solid transparent; transition: all 0.25s; }
.program-card:hover { transform: scale(1.04); box-shadow: 0 18px 40px rgba(0,0,0,0.08); }
.pc-dark { background: var(--ink); }
.pc-dark h3 { color: #fff; }
.pc-dark p { color: rgba(255,255,255,0.5); }
.pc-amber { background: rgba(251,191,36,0.08); border-color: rgba(251,191,36,0.25); }
.pc-amber h3 { color: var(--ink); }
.pc-amber p { color: var(--muted); }
.pc-light { background: var(--cream); }
.pc-light h3 { color: var(--ink); }
.pc-light p { color: var(--muted); }
.pc-icon { width: 52px; height: 52px; border-radius: 1rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-weight: 900; font-size: 1.15rem; }
.program-card h3 { font-size: 1rem; font-weight: 900; margin-bottom: 0.5rem; }
.program-card p { font-size: 0.82rem; line-height: 1.6; }

/* ── NEWS ───────────────────────────────────────────── */
.news-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2rem; }
.news-card { text-align: left; width: 100%; background: #FDFCFA; border: 1px solid var(--line); border-radius: 1rem; padding: 1.4rem; transition: all 0.3s; }
.news-card:hover { box-shadow: 0 16px 40px rgba(0,0,0,0.08); border-color: rgba(251,191,36,0.5); transform: translateY(-2px); }
.news-date { display: flex; align-items: center; gap: 0.45rem; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--a); margin-bottom: 0.6rem; }
.news-card h3 { font-size: 0.95rem; font-weight: 900; color: var(--ink); line-height: 1.35; margin-bottom: 0.5rem; }
.news-card p { font-size: 0.8rem; color: var(--muted); line-height: 1.6; }
.news-more { display: inline-flex; align-items: center; gap: 0.3rem; margin-top: 0.7rem; font-size: 0.75rem; font-weight: 900; color: var(--p); }
.news-more svg { color: var(--p); }

/* ── MODAL ──────────────────────────────────────────── */
.modal { position: fixed; inset: 0; z-index: 300; display: none; align-items: center; justify-content: center; padding: 1.25rem; }
.modal.open { display: flex; }
.modal-back { position: absolute; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
.modal-box { position: relative; z-index: 2; width: min(560px, 100%); max-height: 90vh; display: flex; flex-direction: column; border-radius: 1.5rem; overflow: hidden; background: linear-gradient(165deg, #1F2937 0%, #111827 100%); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 30px 80px rgba(0,0,0,0.5); }
.modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.1rem 1.2rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
.modal-date { font-size: 0.68rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: var(--a); margin-bottom: 0.3rem; }
.modal-title { font-size: 1.05rem; font-weight: 900; color: #fff; line-height: 1.3; }
.modal-close { background: rgba(255,255,255,0.08); border: 0; border-radius: 0.7rem; padding: 0.5rem; color: #fff; display: flex; flex-shrink: 0; }
.modal-close:hover { background: rgba(255,255,255,0.16); }
.modal-body { overflow-y: auto; padding: 1.2rem 1.2rem; color: rgba(255,255,255,0.85); font-size: 0.9rem; line-height: 1.7; white-space: pre-wrap; }
.modal-foot { padding: 1rem 1.2rem; border-top: 1px solid rgba(255,255,255,0.1); }
.modal-foot .btn-amber { width: 100%; justify-content: center; }

/* ── GALLERY ────────────────────────────────────────── */
.gallery-shell { display: flex; flex-direction: column; gap: 1.5rem; }
.gallery-filters { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.55rem; }
.gallery-filter { border: 1px solid var(--line); background: #fff; color: var(--muted); padding: 0.55rem 0.95rem; border-radius: 999px; font-size: 0.72rem; font-weight: 800; transition: all 0.2s; }
.gallery-filter:hover, .gallery-filter.active { background: var(--p); border-color: var(--p); color: #fff; box-shadow: 0 10px 24px rgba(0,17,33,0.12); }
.gallery-masonry { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: 150px; gap: 0.85rem; }
.gallery-card { position: relative; border: 0; padding: 0; border-radius: 1rem; overflow: hidden; cursor: zoom-in; background: #eef2f7; min-height: 100%; }
.gallery-card img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.35s ease; }
.gallery-card:hover img { transform: scale(1.05); }
.gallery-card::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to top, rgba(15,23,42,0.72), rgba(15,23,42,0.05) 55%, transparent); opacity: 0; transition: opacity 0.25s; }
.gallery-card:hover::after { opacity: 1; }
.gallery-cap { position: absolute; left: 0.85rem; right: 0.85rem; bottom: 0.75rem; color: #fff; font-size: 0.76rem; font-weight: 700; z-index: 2; opacity: 0; transform: translateY(8px); transition: all 0.25s; text-align: left; }
.gallery-card:hover .gallery-cap { opacity: 1; transform: translateY(0); }
.gallery-card--hero { grid-column: span 2; grid-row: span 2; }
.gallery-card--wide { grid-column: span 2; }
.lightbox { position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,0.96); display: none; flex-direction: column; }
.lightbox.open { display: flex; }
.lb-top { display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 1.2rem; }
.lb-count { color: rgba(255,255,255,0.4); font-size: 0.75rem; font-family: monospace; }
.lb-close { width: 40px; height: 40px; border-radius: 0.75rem; background: rgba(255,255,255,0.08); color: #fff; display: flex; align-items: center; justify-content: center; border: 0; }
.lb-stage { flex: 1; display: flex; align-items: center; justify-content: center; padding: 1rem; position: relative; min-height: 0; }
.lb-stage img { max-height: 68vh; max-width: 100%; object-fit: contain; border-radius: 1rem; box-shadow: 0 30px 80px rgba(0,0,0,0.6); }
.lb-meta { text-align: center; padding: 0 1rem 0.75rem; }
.lb-caption { color: #fff; font-size: 0.92rem; font-weight: 700; }
.lb-album { color: rgba(255,255,255,0.45); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.25rem; }
.lb-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 1rem; background: rgba(255,255,255,0.08); color: #fff; display: flex; align-items: center; justify-content: center; border: 0; }
.lb-nav:hover { background: rgba(255,255,255,0.16); }
.lb-prev { left: 0.75rem; }
.lb-next { right: 0.75rem; }
.lb-thumbs { display: flex; gap: 0.5rem; justify-content: center; padding: 0 1rem 1rem; flex-wrap: wrap; }
.lb-thumb { width: 48px; height: 48px; border-radius: 0.7rem; overflow: hidden; border: 2px solid transparent; opacity: 0.4; background-size: cover; background-position: center; transition: all 0.2s; }
.lb-thumb.active { border-color: var(--a); opacity: 1; transform: scale(1.08); }

/* ── ADMISSIONS ─────────────────────────────────────── */
.adm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; align-items: start; }
.adm-note { background: var(--cream); border: 2px solid rgba(251,191,36,0.25); border-radius: 1.5rem; padding: 1.6rem; color: var(--muted); font-size: 0.9rem; line-height: 1.7; }
.adm-note p { margin-bottom: 0.8rem; }
.adm-steps { list-style: none; margin-top: 1.1rem; }
.adm-steps li { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.8rem; font-size: 0.85rem; font-weight: 600; color: var(--ink); }
.adm-step-num { width: 26px; height: 26px; border-radius: 50%; background: var(--a); color: var(--ink); font-weight: 900; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
.form-card { background: #fff; border-radius: 1.5rem; overflow: hidden; box-shadow: 0 24px 60px rgba(17,24,39,0.1); border: 1px solid #f1f1f1; }
.form-head { background: var(--ink); padding: 1.2rem 1.4rem; display: flex; align-items: center; gap: 0.8rem; }
.form-head-icon { width: 42px; height: 42px; border-radius: 1rem; background: rgba(251,191,36,0.2); color: var(--a); display: flex; align-items: center; justify-content: center; }
.form-head h3 { color: #fff; font-size: 1rem; font-weight: 900; }
.form-body { padding: 1.5rem; display: grid; gap: 1rem; grid-template-columns: 1fr 1fr; }
.form-body .full { grid-column: 1 / -1; }
.f-label { display: block; font-size: 0.68rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #92620a; margin-bottom: 0.4rem; }
.f-input { width: 100%; padding: 0.7rem 0.9rem; border-radius: 0.8rem; border: 2px solid #E5E0D0; background: #F9F8F5; font-size: 0.85rem; font-family: inherit; font-weight: 500; color: var(--ink); outline: none; transition: all 0.2s; }
.f-input:focus { border-color: var(--a); box-shadow: 0 0 0 3px rgba(251,191,36,0.15); }
select.f-input { appearance: none; }
textarea.f-input { resize: vertical; min-height: 80px; }
.form-submit { grid-column: 1 / -1; justify-content: center; width: 100%; border: 0; }
.form-message { grid-column: 1 / -1; font-size: 0.85rem; font-weight: 600; min-height: 1.2em; }

/* ── CONTACT ────────────────────────────────────────── */
.contact-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 2rem; align-items: stretch; }
.contact-panel { display: flex; flex-direction: column; gap: 1.25rem; }
.contact-list { display: flex; flex-direction: column; gap: 0.8rem; flex: 1; }
.contact-item { display: flex; gap: 1rem; padding: 1.2rem; border-radius: 1rem; background: #fff; border: 1px solid #F0ECE0; transition: all 0.2s; }
.contact-item:hover { box-shadow: 0 10px 30px rgba(0,0,0,0.06); border-color: var(--a-border); }
.contact-ic { width: 44px; height: 44px; border-radius: 1rem; background: var(--a-soft); color: var(--a); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.contact-label { font-size: 0.68rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #9CA3AF; margin-bottom: 0.2rem; }
.contact-val { font-size: 0.9rem; font-weight: 600; color: var(--ink); word-break: break-word; }
.contact-val a { color: inherit; }
.contact-val a:hover { color: var(--a); }
.contact-meta { margin-top: 0.35rem; font-size: 0.78rem; color: var(--muted); font-weight: 500; }
.contact-meta--cell { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.65rem; border-radius: 999px; background: var(--a-soft); color: var(--ink); font-weight: 600; }
.contact-meta--cell strong { color: var(--p); }
.contact-directions { width: fit-content; margin-top: auto; }
.map-card { position: relative; border-radius: 1.5rem; border: 1px solid #E5E7EB; background: #fff; min-height: 360px; overflow: hidden; box-shadow: 0 18px 50px rgba(15,23,42,0.1); display: flex; flex-direction: column; }
.map-card-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.15rem; border-bottom: 1px solid #F0ECE0; background: linear-gradient(180deg, #fff 0%, var(--cream) 100%); }
.map-card-label { font-size: 0.64rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #9CA3AF; }
.map-card-place { font-size: 0.95rem; font-weight: 800; color: var(--ink); margin-top: 0.15rem; }
.map-card-level { font-size: 0.64rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--a); background: var(--a-soft); padding: 0.35rem 0.7rem; border-radius: 999px; white-space: nowrap; }
.map-iframe { width: 100%; flex: 1; min-height: 320px; border: 0; display: block; }
.map-badge { position: absolute; left: 1rem; bottom: 1rem; display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.55rem 0.85rem; border-radius: 999px; background: rgba(255,255,255,0.95); color: var(--ink); font-size: 0.72rem; font-weight: 800; box-shadow: 0 8px 24px rgba(15,23,42,0.12); }
.map-badge-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--a); box-shadow: 0 0 0 4px var(--a-soft); }

/* ── FOOTER ─────────────────────────────────────────── */
.footer { background: var(--ink); color: rgba(255,255,255,0.6); padding: 2.6rem 0 1.4rem; }
.footer-top { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.6rem; }
.footer-brand { display: flex; align-items: center; gap: 0.9rem; }
.footer-logo { width: 48px; height: 48px; border-radius: 1rem; border: 2px solid rgba(251,191,36,0.3); background: rgba(251,191,36,0.15); color: var(--a); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1rem; overflow: hidden; flex-shrink: 0; }
.footer-logo img { width: 100%; height: 100%; object-fit: cover; }
.footer-name { color: #fff; font-weight: 900; font-size: 1.05rem; }
.footer-links { display: flex; flex-wrap: wrap; gap: 1.1rem; }
.footer-links a { color: rgba(255,255,255,0.55); font-size: 0.8rem; }
.footer-links a:hover { color: var(--a); }
.footer-bottom { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.1rem; text-align: center; font-size: 0.75rem; color: rgba(255,255,255,0.35); }
.powered { color: var(--a); font-weight: 800; }

/* ── CUSTOM PAGES ───────────────────────────────────── */
.site-page { background: #fff; }
.page-card { background: var(--cream); border: 1px solid #EDE8DC; border-radius: 1.5rem; padding: 2rem; color: var(--muted); line-height: 1.7; font-size: 0.9rem; }
.page-card img { border-radius: 1rem; margin: 1rem 0; max-width: 100%; }
.page-card h2, .page-card h3, .page-card h4 { color: var(--ink); margin: 1.2rem 0 0.5rem; }

/* ── CIRCULARS ─────────────────────────────────────── */
.circ-launch-section { padding: 2.5rem 0; }
.circ-launch-card { display: grid; grid-template-columns: auto 1fr auto; gap: 1.25rem 1.5rem; align-items: center; background: linear-gradient(135deg, #fff 0%, #faf7f0 55%, #fff8eb 100%); border: 1px solid #EDE8DC; border-radius: 1.35rem; padding: 1.75rem 2rem; box-shadow: 0 20px 50px rgba(15,23,42,0.07); }
.circ-launch-icon { width: 64px; height: 64px; border-radius: 1rem; display: flex; align-items: center; justify-content: center; background: var(--p); color: var(--a); box-shadow: 0 10px 24px rgba(0,17,33,0.18); }
.circ-launch-tag { display: inline-block; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--a); margin-bottom: 0.35rem; }
.circ-launch-title { margin: 0; font-size: clamp(1.25rem, 2.5vw, 1.55rem); font-weight: 900; color: var(--ink); line-height: 1.2; }
.circ-launch-desc { margin: 0.45rem 0 0; font-size: 0.88rem; color: var(--muted); line-height: 1.55; max-width: 42rem; }
.circ-launch-btn { min-width: 200px; justify-content: center; font-size: 0.88rem; padding: 0.9rem 1.35rem; box-shadow: 0 10px 24px rgba(251,191,36,0.35); white-space: nowrap; }
@media (max-width: 768px) {
  .circ-launch-card { grid-template-columns: 1fr; text-align: center; }
  .circ-launch-icon { margin: 0 auto; }
  .circ-launch-btn { width: 100%; }
}
.circ-doc-modal { position: fixed; inset: 0; z-index: 450; display: none; align-items: center; justify-content: center; padding: 1rem; }
.circ-doc-modal.open { display: flex; }
.circ-doc-panel { position: relative; z-index: 2; width: min(920px, 100%); height: min(90vh, 820px); display: flex; flex-direction: column; background: #fff; border-radius: 1.25rem; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.32); border: 1px solid rgba(255,255,255,0.12); }
.circ-doc-head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; padding: 1rem 1.25rem; border-bottom: 1px solid #EDE8DC; background: linear-gradient(180deg, #faf7f0 0%, #fff 100%); }
.circ-doc-actions { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; }
.circ-doc-frame-wrap { flex: 1; min-height: 0; background: #f8fafc; }
.circ-doc-frame { width: 100%; height: 100%; border: 0; background: #fff; }
.circ-modal { position: fixed; inset: 0; z-index: 400; display: none; align-items: center; justify-content: center; padding: 1rem; }
.circ-modal.open { display: flex; }
.circ-modal-back { position: absolute; inset: 0; background: rgba(15,23,42,0.72); backdrop-filter: blur(6px); }
.circ-modal-panel { position: relative; z-index: 2; width: min(980px, 100%); max-height: min(88vh, 900px); display: flex; flex-direction: column; background: #fff; border-radius: 1.25rem; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,0.28); border: 1px solid rgba(255,255,255,0.12); }
.circ-modal-head { display: flex; justify-content: space-between; gap: 1rem; padding: 1.25rem 1.5rem; border-bottom: 1px solid #EDE8DC; background: linear-gradient(180deg, #faf7f0 0%, #fff 100%); }
.circ-modal-kicker { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--a); margin: 0 0 0.25rem; }
.circ-modal-title { margin: 0; font-size: 1.35rem; font-weight: 900; color: var(--ink); }
.circ-modal-sub { margin: 0.35rem 0 0; font-size: 0.82rem; color: var(--muted); }
.circ-modal-close { width: 40px; height: 40px; border: 1px solid #EDE8DC; border-radius: 0.75rem; background: #fff; color: var(--ink); display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; }
.circ-modal-close:hover { background: #f8fafc; }
.circ-modal-toolbar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid #f1f5f9; }
.circ-modal-body { flex: 1; overflow: auto; padding: 1.25rem 1.5rem 1.5rem; }
.circ-toolbar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; justify-content: space-between; margin-bottom: 1.5rem; }
.circ-filters { display: flex; flex-wrap: wrap; gap: 1rem; }
.circ-filter { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.72rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
.circ-select { min-width: 160px; padding: 0.55rem 0.75rem; border: 1px solid #EDE8DC; border-radius: 0.65rem; background: #fff; font: inherit; color: var(--ink); }
.circ-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.circ-card { background: #fff; border: 1px solid #e8edf5; border-radius: 1rem; padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.65rem; box-shadow: 0 10px 30px rgba(15,23,42,0.05); transition: transform .15s, box-shadow .15s, border-color .15s; }
.circ-card:hover { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(15,23,42,0.1); border-color: rgba(251,191,36,0.45); }
.circ-badge { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--p); background: rgba(0,17,33,0.06); padding: 0.25rem 0.55rem; border-radius: 999px; width: fit-content; }
.circ-title { font-size: 1rem; font-weight: 800; color: var(--ink); margin: 0; }
.circ-meta { font-size: 0.78rem; color: var(--muted); line-height: 1.5; }
.circ-actions { display: flex; gap: 0.5rem; margin-top: auto; }
.circ-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem; padding: 0.55rem 0.75rem; border-radius: 0.55rem; font-size: 0.75rem; font-weight: 700; border: 1px solid #EDE8DC; background: #fff; color: var(--p); cursor: pointer; text-decoration: none; }
.circ-btn.primary { background: var(--a); border-color: var(--a); color: var(--p); }
.circ-loading, .circ-empty { grid-column: 1 / -1; text-align: center; padding: 2.5rem 1rem; color: var(--muted); font-size: 0.9rem; }

/* ── RESPONSIVE ─────────────────────────────────────── */
@media (max-width: 900px) {
  .nav-links { display: none; }
  .nav-burger { display: flex; }
  .nav-inner { justify-content: flex-end; }
  .about-grid, .mission-grid, .adm-grid, .contact-grid { grid-template-columns: 1fr; }
  .profile-grid { grid-template-columns: 1fr 1fr; }
  .programs-grid { grid-template-columns: 1fr 1fr; }
  .news-grid { grid-template-columns: 1fr 1fr; }
  .gallery-masonry { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 130px; }
  .stats-inner { grid-template-columns: 1fr 1fr; }
  .hero-inner { padding-top: 4rem; }
  .leader-card-v2-inner { flex-direction: column; align-items: center; text-align: center; }
  .leader-card-v2-links { align-items: center; }
}
@media (max-width: 560px) {
  .programs-grid, .news-grid { grid-template-columns: 1fr; }
  .profile-grid { grid-template-columns: 1fr; }
  .form-body { grid-template-columns: 1fr; }
  .hero-title-row { flex-direction: column; align-items: flex-start; }
}
${site.customCss ?? ''}
</style>
</head>
<body>
  <!-- ── NAVBAR ── -->
  <header class="nav">
    <div class="nav-inner">
      <button class="nav-burger" id="navBurger" type="button" aria-label="Open menu">${icon('menu', 18)}</button>
      <nav class="nav-links" aria-label="Main navigation">
        ${renderNavLinks(site, pages)}
      </nav>
      ${site.admissionsEnabled ? `<a class="nav-apply" href="#admissions">${icon('send', 11)}Apply</a>` : ''}
    </div>
  </header>
  <div class="nav-spacer" aria-hidden="true"></div>

  <!-- ── HERO ── -->
  <section id="hero" class="hero">
    ${coverSrc ? `<img class="hero-cover" src="${esc(coverSrc)}" alt="" />` : `<div class="hero-grad"></div>`}
    <div class="hero-overlay"></div>
    <div class="hero-overlay-bottom"></div>
    <div class="hero-amber-line"></div>
    <div class="hero-inner">
      ${site.admissionsEnabled ? `<div class="hero-badge"><span class="dot"></span>Admissions Open</div>` : ''}
      <div class="hand-kicker">${esc(heroKicker)} ${HAND_SVG(a, '135', '14')}</div>
      <div class="hero-title-row">
        ${logoSrc ? `<div class="hero-logo"><img src="${esc(logoSrc)}" alt="${esc(site.title)} logo" /></div>` : ''}
        <h1 class="hero-name">${esc(heroName)}</h1>
      </div>
      <p class="hero-sub">${esc(heroSub)}</p>
      ${pills.length ? `
      <div class="hero-pills">
        ${pills.map((pil) => `<span class="pill">${icon(pil.icon, 12)}${esc(pil.val)}</span>`).join('')}
      </div>` : ''}
      <div class="hero-ctas">
        ${site.admissionsEnabled ? `<a class="btn btn-amber" href="#admissions">${icon('send', 15)}Apply for Admission</a>` : ''}
        <a class="btn btn-ghost" href="#contact">${icon('phone', 15)}Contact School</a>
      </div>
    </div>
    <div class="hero-scroll" aria-hidden="true">${icon('chevron-down', 18)}</div>
  </section>

  ${renderSchoolProfilePanel(site)}

  <!-- ── STATS ── -->
  <section class="stats" aria-label="School statistics">
    <div class="container">
      <div class="stats-inner">${renderStats(site)}</div>
    </div>
  </section>

  <!-- ── ABOUT ── -->
  <section id="about" class="section sec-white">
    <div class="container">
      <div class="about-grid">
        <div>
          <div class="about-eyebrow">Who We Are</div>
          <h2 class="about-title">Shaping Rwanda's <span class="hand-accent">Future Leaders${HAND_SVG(a, '100', '14')}</span></h2>
          <div class="about-text">${esc(about)}</div>
          ${tags.length ? `
          <div class="tags">
            ${tags.map((tag) => `<span class="tag">${icon('check', 11)}${esc(tag)}</span>`).join('')}
          </div>` : ''}
          <div>
            ${site.admissionsEnabled ? `<a class="btn btn-amber" href="#admissions">${icon('cap', 15)}Join Our Community</a>` : `<a class="btn btn-amber" href="#contact">${icon('phone', 15)}Contact Us</a>`}
          </div>
        </div>
        <div class="about-media">
          ${aboutSrc
            ? `<img src="${esc(aboutSrc)}" alt="About ${esc(site.title)}" />
               <div class="about-block-amber"></div>
               <div class="about-block-navy"></div>`
            : `<div class="about-fallback">
                 <div class="af-tile">${icon('cap', 28)}<span>Academic Excellence</span></div>
                 <div class="af-tile">${icon('users', 28)}<span>Student Community</span></div>
                 <div class="af-tile">${icon('book', 28)}<span>Quality Learning</span></div>
                 <div class="af-tile">${icon('award', 28)}<span>Achievements</span></div>
               </div>`}
        </div>
      </div>
    </div>
  </section>

  <!-- ── MISSION & VISION ── -->
  <section id="mission" class="section sec-cream">
    <div class="container">
      <div class="sec-head">
        <div class="eyebrow">Our Purpose</div>
        <h2 class="sec-title">Mission &amp; Vision</h2>
      </div>
      <div class="mission-grid">
        <div class="m-card m-card-dark">
          <div class="m-orb m-orb-dark"></div>
          <div class="m-icon">${icon('target', 26)}</div>
          <h3 class="m-title">Our Mission</h3>
          <p class="m-text">${esc(site.mission ?? about)}</p>
        </div>
        <div class="m-card m-card-light">
          <div class="m-orb m-orb-navy"></div>
          <div class="m-icon">${icon('bulb', 26)}</div>
          <h3 class="m-title">Our Vision</h3>
          <p class="m-text">${esc(site.vision ?? site.tagline ?? site.heroText ?? 'To be a centre of excellence producing confident, compassionate and future-ready citizens.')}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ── PROGRAMS ── -->
  <section id="programs" class="section sec-white">
    <div class="container">
      <div class="sec-head">
        <div class="eyebrow">Academics</div>
        <h2 class="sec-title">Our Programs</h2>
        <p class="sec-sub">Comprehensive education pathways for every learner</p>
      </div>
      <div class="programs-grid">${renderPrograms(site)}</div>
    </div>
  </section>

  ${renderLeadershipSection(site)}

  ${site.news?.length ? `
  <!-- ── NEWS ── -->
  <section id="news" class="section sec-cream">
    <div class="container">
      <div class="sec-head">
        <div class="eyebrow">Updates</div>
        <h2 class="sec-title">News &amp; Announcements</h2>
        <p class="sec-sub">Stay informed about events and stories from our school community</p>
      </div>
      <div class="news-grid">${renderNews(site)}</div>
    </div>
  </section>` : ''}

  ${renderGallerySection(site)}

  ${renderPages(site, pages)}

  ${renderCircularsSection()}

  ${renderAdmissionsSection(site, admissionInfo, publicBaseUrl)}

  ${renderContactSection(site)}

  <!-- ── FOOTER ── -->
  <footer class="footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <div class="footer-logo">
            ${logoSrc ? `<img src="${esc(logoSrc)}" alt="${esc(site.title)} logo" />` : `<span>${esc(site.title.charAt(0))}</span>`}
          </div>
          <div>
            <div class="footer-name">${esc(site.title)}</div>
            <div style="font-size:0.75rem;color:rgba(255,255,255,0.4)">${esc(site.tagline ?? '')}</div>
          </div>
        </div>
        <div class="footer-links">
          <a href="#about">About</a>
          <a href="#programs">Programs</a>
          ${normalizeGallery(site.gallery).length ? `<a href="#gallery">Gallery</a>` : ''}
          ${normalizeLeaders(site.leaders).length ? `<a href="#leadership">Leadership</a>` : ''}
          ${site.admissionsEnabled ? `<a href="#admissions">Admissions</a>` : ''}
          <a href="#circulars" class="circ-open-link" data-circ-open="1">Circular</a>
          <a href="#contact">Contact</a>
        </div>
      </div>
      <div class="footer-bottom">
        &copy; ${new Date().getFullYear()} ${esc(site.title)}. All rights reserved.
        <span style="display:block;margin-top:0.25rem">Powered by <span class="powered">ShulePlus</span></span>
      </div>
    </div>
  </footer>

  <!-- ── NEWS MODAL ── -->
  <div class="modal" id="newsModal" role="dialog" aria-modal="true">
    <button type="button" class="modal-back" id="newsModalBack" aria-label="Close"></button>
    <div class="modal-box">
      <div class="modal-head">
        <div class="min-w-0">
          <div class="modal-date" id="newsModalDate"></div>
          <h4 class="modal-title" id="newsModalTitle"></h4>
        </div>
        <button type="button" class="modal-close" id="newsModalClose" aria-label="Close">${icon('x', 18)}</button>
      </div>
      <div class="modal-body" id="newsModalBody"></div>
      <div class="modal-foot">
        <button type="button" class="btn btn-amber" id="newsModalCloseBtn">Close</button>
      </div>
    </div>
  </div>

  <!-- ── LIGHTBOX ── -->
  <div class="lightbox" id="lightbox">
    <div class="lb-top">
      <span class="lb-count" id="lbCount"></span>
      <button type="button" class="lb-close" id="lbClose" aria-label="Close">${icon('x', 18)}</button>
    </div>
    <div class="lb-stage" id="lbBack">
      <button type="button" class="lb-nav lb-prev" id="lbPrev" aria-label="Previous">${icon('chevron-left', 20)}</button>
      <img id="lbStageImg" alt="" />
      <button type="button" class="lb-nav lb-next" id="lbNext" aria-label="Next">${icon('chevron-right', 20)}</button>
    </div>
    <div class="lb-meta">
      <div class="lb-caption" id="lbCaption"></div>
      <div class="lb-album" id="lbAlbum"></div>
    </div>
    <div class="lb-thumbs" id="lbThumbs"></div>
  </div>

  <!-- ── MOBILE DRAWER ── -->
  <div class="drawer-overlay" id="drawerOverlay"></div>
  <aside class="drawer" id="drawer">
    <div class="drawer-head">
      <div class="drawer-name">${esc(site.title)}</div>
      <button type="button" class="drawer-close" id="drawerClose" aria-label="Close menu">${icon('x', 16)}</button>
    </div>
    <nav class="drawer-nav" aria-label="Mobile navigation">
      ${renderDrawerLinks(site, pages)}
    </nav>
    ${site.admissionsEnabled ? `<div class="drawer-cta">
      <a class="btn btn-amber" href="#admissions" style="width:100%;justify-content:center">${icon('send', 14)}Get Admission</a>
    </div>` : ''}
  </aside>

<script>
(function () {
  var GALLERY = ${galleryJson};
  function qs(s, r) { return (r || document).querySelector(s); }
  function qsa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var body = document.body;

  /* ── Drawer ── */
  var drawer = qs('#drawer');
  var overlay = qs('#drawerOverlay');
  function openDrawer() { if (drawer) drawer.classList.add('open'); if (overlay) overlay.classList.add('open'); body.style.overflow = 'hidden'; }
  function closeDrawer() { if (drawer) drawer.classList.remove('open'); if (overlay) overlay.classList.remove('open'); body.style.overflow = ''; }
  var burger = qs('#navBurger');
  if (burger) burger.addEventListener('click', openDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);
  var drawerClose = qs('#drawerClose');
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  qsa('.drawer-link').forEach(function (l) { l.addEventListener('click', closeDrawer); });

  /* ── Scrollspy ── */
  var sections = qsa('section[id]');
  function setActive(id) {
    if (!id) return;
    qsa('.nav-link').forEach(function (l) { l.classList.toggle('active', l.getAttribute('href') === '#' + id); });
    qsa('.drawer-link').forEach(function (l) { l.classList.toggle('active', l.getAttribute('href') === '#' + id); });
  }
  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { threshold: 0.25 });
    sections.forEach(function (sec) { spy.observe(sec); });
  } else {
    var ids = sections.map(function (s) { return s.id; });
    function onScroll() {
      var pos = window.scrollY + 130;
      var current = ids[0];
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el && el.offsetTop <= pos) current = ids[i];
      }
      setActive(current);
    }
    window.addEventListener('scroll', onScroll);
    onScroll();
  }

  /* ── News modal ── */
  var newsModal = qs('#newsModal');
  function openNews(card) {
    if (!newsModal) return;
    qs('#newsModalTitle').textContent = card.getAttribute('data-title') || '';
    qs('#newsModalDate').textContent = card.getAttribute('data-date') || '';
    qs('#newsModalBody').textContent = card.getAttribute('data-body') || '';
    newsModal.classList.add('open');
    body.style.overflow = 'hidden';
  }
  function closeNews() {
    if (!newsModal) return;
    newsModal.classList.remove('open');
    body.style.overflow = '';
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('.news-card')) { openNews(t.closest('.news-card')); return; }
    if (t.closest('#newsModalClose') || t.closest('#newsModalCloseBtn') || t.closest('#newsModalBack')) closeNews();
  });

  /* ── Lightbox ── */
  var lightbox = qs('#lightbox');
  var lbIndex = 0;
  function renderLightbox() {
    if (!lightbox || !GALLERY.length) return;
    var idx = ((lbIndex % GALLERY.length) + GALLERY.length) % GALLERY.length;
    var item = GALLERY[idx] || {};
    qs('#lbCount').textContent = (idx + 1) + ' / ' + GALLERY.length;
    qs('#lbStageImg').src = item.url || '';
    qs('#lbStageImg').alt = item.caption || ('Gallery image ' + (idx + 1));
    qs('#lbCaption').textContent = item.caption || '';
    qs('#lbAlbum').textContent = item.album ? item.album : '';
    var thumbs = qs('#lbThumbs');
    thumbs.innerHTML = '';
    GALLERY.forEach(function (entry, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lb-thumb' + (i === idx ? ' active' : '');
      b.style.backgroundImage = "url('" + String(entry.url || '').replace(/'/g, "\\\\'") + "')";
      b.setAttribute('aria-label', 'Image ' + (i + 1));
      b.addEventListener('click', function () { lbIndex = i; renderLightbox(); });
      thumbs.appendChild(b);
    });
  }
  window.openLightbox = function (i) {
    if (!lightbox || !GALLERY.length) return;
    lbIndex = i;
    renderLightbox();
    lightbox.classList.add('open');
    body.style.overflow = 'hidden';
  };
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    body.style.overflow = '';
  }
  if (lightbox) {
    qs('#lbClose').addEventListener('click', closeLightbox);
    qs('#lbBack').addEventListener('click', function (e) { if (e.target.id === 'lbBack') closeLightbox(); });
    qs('#lbPrev').addEventListener('click', function () { lbIndex -= 1; renderLightbox(); });
    qs('#lbNext').addEventListener('click', function () { lbIndex += 1; renderLightbox(); });
  }

  /* ── Gallery filters ── */
  qsa('.gallery-filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var album = btn.getAttribute('data-album') || 'all';
      qsa('.gallery-filter').forEach(function (b) { b.classList.toggle('active', b === btn); });
      qsa('.gallery-card').forEach(function (card) {
        var show = album === 'all' || card.getAttribute('data-album') === album;
        card.style.display = show ? '' : 'none';
      });
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeNews(); closeLightbox(); closeCircModal(); }
    if (e.key === 'ArrowLeft' && lightbox && lightbox.classList.contains('open')) { lbIndex -= 1; renderLightbox(); }
    if (e.key === 'ArrowRight' && lightbox && lightbox.classList.contains('open')) { lbIndex += 1; renderLightbox(); }
  });

  /* ── Circulars (Babyeyi modal) ── */
  var circModal = qs('#circ-modal');
  var circGrid = qs('#circ-grid');
  var circYear = qs('#circ-year');
  var circTerm = qs('#circ-term');
  var circRefresh = qs('#circ-refresh');
  var circApi = '${publicBaseUrl}/api/public/${esc(site.slug)}/circulars';
  var circDefaults = { year: '', term: '' };
  var circDocModal = qs('#circ-doc-modal');
  var circDocFrame = qs('#circ-doc-frame');
  var circDocTitle = qs('#circ-doc-title');
  var circDocPrint = qs('#circ-doc-print');
  var circDocUrl = '';

  function escHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fillSelect(el, values, allLabel, preferred) {
    if (!el) return;
    el.innerHTML = '';
    if (allLabel) {
      var all = document.createElement('option');
      all.value = '';
      all.textContent = allLabel;
      el.appendChild(all);
    }
    (values || []).forEach(function (v) {
      var o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      el.appendChild(o);
    });
    if (preferred && values && values.indexOf(preferred) >= 0) el.value = preferred;
  }

  function renderCircularCards(items) {
    if (!circGrid) return;
    if (!items || !items.length) {
      circGrid.innerHTML = '<div class="circ-empty">No Babyeyi circulars found for the selected academic year and term.</div>';
      return;
    }
    circGrid.innerHTML = items.map(function (c) {
      var fee = c.totalFee != null && c.totalFee !== '' ? Number(c.totalFee).toLocaleString() + ' RWF' : '—';
      var printBase = circApi + '/' + encodeURIComponent(c.id) + '/print';
      var title = escHtml(c.className || 'School circular');
      return '<article class="circ-card">' +
        '<span class="circ-badge">' + escHtml(c.status || 'PUBLISHED') + '</span>' +
        '<h3 class="circ-title">' + title + '</h3>' +
        '<div class="circ-meta">' + escHtml(c.academicYear) + ' · ' + escHtml(c.term) + '<br/>Total fee: ' + fee + '</div>' +
        '<div class="circ-actions">' +
          '<button type="button" class="circ-btn" data-circ-view="' + printBase + '" data-circ-title="' + title + '">View</button>' +
          '<button type="button" class="circ-btn primary" data-circ-print="' + printBase + '?autoprint=1" data-circ-title="' + title + '">Print</button>' +
        '</div></article>';
    }).join('');
  }

  function openCircDocModal(url, title, autoprint) {
    if (!circDocModal || !circDocFrame) return;
    circDocUrl = url;
    if (circDocTitle) circDocTitle.textContent = title || 'School circular';
    circDocFrame.src = url;
    circDocModal.classList.add('open');
    circDocModal.setAttribute('aria-hidden', 'false');
    if (autoprint) {
      circDocFrame.onload = function () {
        try { circDocFrame.contentWindow && circDocFrame.contentWindow.print(); } catch (e) {}
      };
    } else {
      circDocFrame.onload = null;
    }
  }

  function closeCircDocModal() {
    if (!circDocModal || !circDocFrame) return;
    circDocModal.classList.remove('open');
    circDocModal.setAttribute('aria-hidden', 'true');
    circDocFrame.src = 'about:blank';
    circDocUrl = '';
  }

  function loadCircularOptions() {
    return fetch(circApi + '/options')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.success || !res.data) return;
        circDefaults.year = res.data.currentAcademicYear || '';
        circDefaults.term = res.data.currentTerm || '';
        fillSelect(circYear, res.data.academicYears || [], '', circDefaults.year);
        fillSelect(circTerm, res.data.terms || [], 'All terms', circDefaults.term);
      })
      .catch(function () {});
  }

  function loadCirculars() {
    if (!circGrid) return;
    circGrid.innerHTML = '<div class="circ-loading">Loading circulars…</div>';
    var params = [];
    if (circYear && circYear.value) params.push('academicYear=' + encodeURIComponent(circYear.value));
    if (circTerm && circTerm.value) params.push('term=' + encodeURIComponent(circTerm.value));
    var url = circApi + (params.length ? '?' + params.join('&') : '');
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (res) { renderCircularCards(res.success ? res.data : []); })
      .catch(function () {
        circGrid.innerHTML = '<div class="circ-empty">Could not load circulars. Please try again.</div>';
      });
  }

  function openCircModal() {
    if (!circModal) return;
    circModal.classList.add('open');
    circModal.setAttribute('aria-hidden', 'false');
    body.style.overflow = 'hidden';
    loadCircularOptions().then(loadCirculars);
  }

  function closeCircModal() {
    if (!circModal) return;
    circModal.classList.remove('open');
    circModal.setAttribute('aria-hidden', 'true');
    body.style.overflow = '';
  }

  qsa('.circ-open-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      openCircModal();
    });
  });
  qsa('[data-circ-close]').forEach(function (el) {
    el.addEventListener('click', closeCircModal);
  });
  if (circYear) circYear.addEventListener('change', loadCirculars);
  if (circTerm) circTerm.addEventListener('change', loadCirculars);
  if (circRefresh) circRefresh.addEventListener('click', function () { loadCircularOptions().then(loadCirculars); });

  if (circGrid) {
    circGrid.addEventListener('click', function (e) {
      var viewBtn = e.target.closest('[data-circ-view]');
      if (viewBtn) {
        openCircDocModal(viewBtn.getAttribute('data-circ-view'), viewBtn.getAttribute('data-circ-title'), false);
        return;
      }
      var printBtn = e.target.closest('[data-circ-print]');
      if (printBtn) {
        openCircDocModal(printBtn.getAttribute('data-circ-print'), printBtn.getAttribute('data-circ-title'), true);
      }
    });
  }
  qsa('[data-circ-doc-close]').forEach(function (el) {
    el.addEventListener('click', closeCircDocModal);
  });
  if (circDocPrint) {
    circDocPrint.addEventListener('click', function () {
      if (!circDocUrl) return;
      try { circDocFrame.contentWindow && circDocFrame.contentWindow.print(); } catch (e) {
        openCircDocModal(circDocUrl + (circDocUrl.indexOf('?') >= 0 ? '&' : '?') + 'autoprint=1', circDocTitle ? circDocTitle.textContent : 'School circular', true);
      }
    });
  }

  /* ── Apply form ── */
  var form = qs('#apply-form');
  var msg = qs('#form-message');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = { formData: {} };
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === 'submit' || el.type === 'button') return;
        if (el.type === 'file') return;
        payload.formData[el.name] = el.value;
      });

      var fileInputs = form.querySelectorAll('input[data-file-field]');
      var readers = [];
      Array.prototype.forEach.call(fileInputs, function (input) {
        if (!input.files || !input.files[0]) return;
        readers.push(new Promise(function (resolve) {
          var file = input.files[0];
          var reader = new FileReader();
          reader.onload = function () {
            payload.formData[input.name] = {
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              contentBase64: String(reader.result || '')
            };
            resolve();
          };
          reader.onerror = function () { resolve(); };
          reader.readAsDataURL(file);
        }));
      });

      Promise.all(readers).then(function () {
        if (!payload.formData.fullName || !payload.formData.phone) {
          msg.textContent = 'Please fill in required fields (name and phone).';
          msg.style.color = '#dc2626';
          return;
        }
        msg.textContent = 'Submitting\u2026';
        msg.style.color = 'var(--p)';
        fetch('${publicBaseUrl}/api/public/${esc(site.slug)}/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res.success) {
              msg.textContent = 'Thank you! Your application has been received. We will contact you soon.';
              msg.style.color = '#059669';
              form.reset();
            } else {
              msg.textContent = res.message || 'Something went wrong. Please try again.';
              msg.style.color = '#dc2626';
            }
          })
          .catch(function () {
            msg.textContent = 'Network error. Please try again later.';
            msg.style.color = '#dc2626';
          });
      });
    });
  }
})();
</script>
</body>
</html>`;
}

/**
 * Builds a full site document from the stored website + pages.
 * Falls back gracefully when the site is empty (new tenant).
 */
export function renderSiteDocument(
  site: {
    slug: string;
    organizationId: string;
    title: string;
    tagline: string | null;
    heroTitle: string | null;
    heroText: string | null;
    heroImageUrl: string | null;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    province?: string | null;
    district?: string | null;
    sector?: string | null;
    cell?: string | null;
    village?: string | null;
    schoolCategory?: string | null;
    schoolProgram?: string | null;
    educationLevels?: string[] | null;
    leaders?: unknown;
    websiteUrl?: string | null;
    about: string | null;
    vision: string | null;
    mission: string | null;
    admissionInfo: string | null;
    admissionsEnabled: boolean;
    admissionForm: unknown;
    customCss: string | null;
    stats: unknown;
    programs: unknown;
    news: unknown;
    gallery: unknown;
  },
  pages: TemplatePage[]
): string {
  const base = env.PUBLIC_BASE_URL;
  const siteModel: TemplateSite = {
    slug: site.slug,
    organizationId: site.organizationId,
    title: site.title,
    tagline: site.tagline,
    heroTitle: site.heroTitle,
    heroText: site.heroText,
    heroImageUrl: site.heroImageUrl,
    logoUrl: resolveAnyAssetUrl(site.logoUrl),
    primaryColor: site.primaryColor,
    secondaryColor: site.secondaryColor,
    email: site.email,
    phone: site.phone,
    address: site.address,
    province: site.province ?? null,
    district: site.district ?? null,
    sector: site.sector ?? null,
    cell: site.cell ?? null,
    village: site.village ?? null,
    schoolCategory: site.schoolCategory ?? null,
    schoolProgram: site.schoolProgram ?? null,
    educationLevels: Array.isArray(site.educationLevels)
      ? (site.educationLevels as string[])
      : [],
    leaders: site.leaders ?? [],
    websiteUrl: site.websiteUrl ?? null,
    about: site.about,
    vision: site.vision ?? null,
    mission: site.mission ?? null,
    admissionInfo: site.admissionInfo,
    admissionsEnabled: Boolean(site.admissionsEnabled),
    admissionForm: normalizeAdmissionForm(site.admissionForm),
    customCss: site.customCss,
    stats: Array.isArray(site.stats) ? (site.stats as Array<{ label: string; value: string }>) : [],
    programs: Array.isArray(site.programs)
      ? (site.programs as Array<{ name: string; description: string }>)
      : [],
    news: Array.isArray(site.news)
      ? (site.news as Array<{ title: string; date: string; excerpt: string }>)
      : [],
    gallery: normalizeGallery(site.gallery),
  };
  return renderVSchoolSite(siteModel, pages, { publicBaseUrl: base });
}
