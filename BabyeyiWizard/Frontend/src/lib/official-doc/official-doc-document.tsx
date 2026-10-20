'use client';

import type { CSSProperties, ReactNode } from 'react';
import { calcPaidAtSchoolTotal } from '@/lib/circular-totals';
import type { Circular } from '@/types';
import {
  DOC_LABELS,
  moneyRwf,
  resolveLocalizedClassReqs,
  resolveLocalizedLeaders,
  resolveLocalizedOtherInfos,
  resolveLocalizedPayments,
  resolveLocalizedRequirements,
  resolveParentMessage,
  shortDocId,
  type DocLang,
} from '@/lib/official-doc/tokens';
import { BABYEYI_PDF_WIDTH_PX, DOC, type OfficialDocBrand } from '@/lib/official-doc/types';

/** Compact official Rwanda-letter circular — prefer 1 A4 page, max 2. */

const page: CSSProperties = {
  width: BABYEYI_PDF_WIDTH_PX,
  maxWidth: '100%',
  margin: '0 auto',
  background: DOC.white,
  boxSizing: 'border-box',
  border: `2px solid ${DOC.navy}`,
  borderRadius: 14,
  padding: 3,
  fontFamily: DOC.font,
  color: DOC.body,
  fontSize: 11,
  lineHeight: 1.45,
  position: 'relative',
};

const pageInner: CSSProperties = {
  border: `1.5px solid ${DOC.amber}`,
  borderRadius: 11,
  padding: '16px 18px 14px',
  position: 'relative',
  boxSizing: 'border-box',
  minHeight: '100%',
};

const h2: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: DOC.navy,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  margin: '0 0 6px',
  paddingBottom: 3,
  borderBottom: `1px solid ${DOC.navy}`,
};

const th: CSSProperties = {
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 700,
  color: DOC.navy,
  padding: '4px 6px',
  borderBottom: `1px solid ${DOC.navy}`,
  background: 'transparent',
};

const td: CSSProperties = {
  fontSize: 11,
  color: DOC.body,
  padding: '4px 6px',
  borderBottom: `1px solid ${DOC.hairline}`,
  verticalAlign: 'top',
};

function statusColor(status: string) {
  const s = status.toUpperCase();
  if (s === 'APPROVED' || s === 'PUBLISHED') return '#16a34a';
  if (s === 'PENDING') return '#d97706';
  if (s === 'REJECTED' || s === 'ARCHIVED') return '#dc2626';
  return DOC.muted;
}

export function OfficialDocDocument({
  circular,
  brand,
  lang,
  contact,
}: {
  circular: Circular;
  brand: OfficialDocBrand;
  lang: DocLang;
  contact?: { phone?: string; email?: string; website?: string } | null;
}) {
  const L = DOC_LABELS[lang];
  const message = resolveParentMessage(circular, lang);
  const payments = resolveLocalizedPayments(circular, lang);
  const banks = (circular.banks ?? []).filter((b) => b.bank_name);
  const requirements = resolveLocalizedRequirements(circular, lang);
  const rules = resolveLocalizedOtherInfos(circular, lang);
  const notes = resolveLocalizedClassReqs(circular, lang);
  const leaders = resolveLocalizedLeaders(circular, lang);
  const announcements =
    circular.includeAnnouncements && (circular.announcements?.length ?? 0) > 0
      ? circular.announcements!
      : [];
  const docId = shortDocId(circular.id);
  const classLabel =
    circular.classes?.length > 1 ? circular.classes.join(', ') : circular.className;
  const locationLine = [brand.district, brand.sector].filter(Boolean).join(' · ');
  const issueDate = circular.publishedAt || circular.createdAt;
  const descriptionLines = (circular.descriptionLines ?? []).filter((l) => l && l.trim());
  const showSchoolDescription = Boolean(circular.includeSchoolDescription && descriptionLines.length > 0);
  const paidAtSchoolTotal = calcPaidAtSchoolTotal(payments, requirements);
  /** Sum of fee lines shown in the table — not the bank-only stored totalFee (which can be 0 when lines are school-channel). */
  const feesTableTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div id="babyeyi-pdf-doc" data-babyeyi-compact="1" style={page}>
      <div style={pageInner}>
        {/* Modern corner accent — three gold dots (matches official circular frame). */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 10,
            right: 14,
            display: 'flex',
            gap: 4,
            alignItems: 'center',
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: 999, background: DOC.amber }} />
          <span style={{ width: 5, height: 5, borderRadius: 999, background: DOC.amber }} />
          <span style={{ width: 5, height: 5, borderRadius: 999, background: DOC.amber }} />
        </div>
        {/* Top-left accent bar */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 10,
            left: 14,
            width: 28,
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${DOC.navy} 60%, ${DOC.amber} 60%)`,
          }}
        />
        {/* Bottom-left accent bar */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 10,
            left: 14,
            width: 28,
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${DOC.amber} 40%, ${DOC.navy} 40%)`,
          }}
        />

      {/* 1. COMPACT OFFICIAL HEADER — school logo left, other logo right */}
      <header
        id="babyeyi-pdf-header"
        data-babyeyi-pdf-section="header"
        style={{
          display: 'grid',
          gridTemplateColumns: '64px 1fr 64px',
          gap: 10,
          alignItems: 'center',
          marginBottom: 8,
          marginTop: 6,
        }}
      >
        <LogoBox src={brand.logoUrl} />
        <div style={{ textAlign: 'center', minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: DOC.navy,
              lineHeight: 1.25,
              textTransform: 'uppercase',
            }}
          >
            {brand.schoolName}
          </p>
          {showSchoolDescription
            ? descriptionLines.map((line, i) => (
                <p key={i} style={{ margin: '2px 0 0', fontSize: 9, color: DOC.muted, lineHeight: 1.35 }}>
                  {line}
                </p>
              ))
            : null}
          {!showSchoolDescription && locationLine ? (
            <p style={{ margin: '2px 0 0', fontSize: 9, color: DOC.muted }}>{locationLine}</p>
          ) : null}
          {!showSchoolDescription && (contact?.phone || contact?.email) ? (
            <p style={{ margin: '3px 0 0', fontSize: 8, color: DOC.muted }}>
              {[contact.phone, contact.email, contact.website].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
        <LogoBox src={brand.otherLogoUrl} />
      </header>

      {/* Metadata strip */}
      <div
        data-babyeyi-pdf-section="meta"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 6,
          marginBottom: 10,
          padding: '6px 8px',
          borderTop: `1px solid ${DOC.navy}`,
          borderBottom: `1px solid ${DOC.hairline}`,
          background: '#f8fafc',
          fontSize: 9,
        }}
      >
        <MetaCell label="Circular No." value={`BY-${docId}`} />
        <MetaCell label="Academic Year" value={circular.academicYear} />
        <MetaCell label="Term" value={circular.term} />
        <MetaCell label="Class" value={classLabel} />
        <MetaCell
          label="Issue Date"
          value={issueDate ? new Date(issueDate).toLocaleDateString() : '—'}
        />
        <div>
          <span style={{ color: DOC.muted, display: 'block', fontSize: 8, textTransform: 'uppercase' }}>Status</span>
          <span style={{ fontWeight: 700, color: statusColor(circular.status) }}>
            {circular.status === 'APPROVED' || circular.status === 'PUBLISHED' ? '✓ ' : ''}
            {circular.status}
          </span>
        </div>
      </div>

      {/* 3. Parent letter */}
      {message ? (
        <section data-babyeyi-pdf-section="parent-message" style={{ marginBottom: 10 }}>
          <h2 style={h2}>{L.parentMessage}</h2>
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{message}</p>
        </section>
      ) : null}

      {/* 4. Fees + Banking two columns */}
      {(payments.length > 0 || banks.length > 0) && (
        <section
          data-babyeyi-pdf-section="fees-banking"
          style={{
            display: 'grid',
            gridTemplateColumns:
              payments.length && banks.length
                ? banks.length >= 2
                  ? '1fr'
                  : '1.05fr 0.95fr'
                : '1fr',
            gap: 10,
            marginBottom: 10,
            alignItems: 'start',
          }}
        >
          {payments.length > 0 ? (
            <div>
              <h2 style={h2}>{L.fees}</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>{L.item}</th>
                    <th style={{ ...th, textAlign: 'right' }}>{L.amount}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={i}>
                      <td style={td}>{p.name}</td>
                      <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {moneyRwf(p.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...td, borderBottom: 'none', fontWeight: 700, color: DOC.navy }}>{L.total}</td>
                    <td
                      style={{
                        ...td,
                        borderBottom: 'none',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: DOC.navy,
                      }}
                    >
                      {moneyRwf(feesTableTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}

          {banks.length > 0 ? (
            <div>
              <h2 style={h2}>{L.banking}</h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: banks.length > 1 ? '1fr 1fr' : '1fr',
                  gap: 6,
                }}
              >
                {banks.map((b, i) => (
                  <div
                    key={`${b.bank_name}-${b.account_no}-${i}`}
                    style={{
                      border: `1px solid ${DOC.hairline}`,
                      borderRadius: 4,
                      padding: '6px 8px',
                      background: '#f8fafc',
                      pageBreakInside: 'avoid',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6,
                        marginBottom: 3,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          fontWeight: 700,
                          color: DOC.navy,
                          lineHeight: 1.3,
                        }}
                      >
                        {b.bank_name || '—'}
                      </p>
                      {b.is_primary || (i === 0 && !banks.some((x) => x.is_primary)) ? (
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            color: DOC.navy,
                            background: `${DOC.amber}33`,
                            borderRadius: 999,
                            padding: '1px 6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Primary
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 700,
                            color: DOC.muted,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {i + 1}/{banks.length}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 4,
                        fontSize: 9.5,
                        lineHeight: 1.4,
                      }}
                    >
                      <div>
                        <span style={{ color: DOC.muted, display: 'block', fontSize: 8, textTransform: 'uppercase' }}>
                          {L.account}
                        </span>
                        <span style={{ fontWeight: 600, color: DOC.body, fontFamily: 'ui-monospace, monospace' }}>
                          {b.account_no || '—'}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: DOC.muted, display: 'block', fontSize: 8, textTransform: 'uppercase' }}>
                          {L.name}
                        </span>
                        <span style={{ fontWeight: 600, color: DOC.body }}>{b.account_name || '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* Paid at School Account — fees + requirements the parent settles at the school office, not via bank. */}
      {paidAtSchoolTotal > 0 ? (
        <section
          data-babyeyi-pdf-section="paid-at-school"
          style={{
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            border: `1px solid ${DOC.amber}`,
            background: '#fffbeb',
            borderRadius: 6,
            padding: '8px 12px',
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                fontWeight: 700,
                color: '#92400e',
                textTransform: lang === 'en' ? 'uppercase' : 'none',
                letterSpacing: lang === 'en' ? '0.03em' : undefined,
              }}
            >
              {L.paidAtSchoolTitle}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 9, color: '#92400e' }}>{L.paidAtSchoolSubtitle}</p>
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#92400e', whiteSpace: 'nowrap' }}>
            {moneyRwf(paidAtSchoolTotal)}
          </p>
        </section>
      ) : null}

      {/* 5. Requirements + Rules two columns */}
      {(requirements.length > 0 || rules.length > 0) && (
        <section
          data-babyeyi-pdf-section="reqs-rules"
          style={{
            display: 'grid',
            gridTemplateColumns: requirements.length && rules.length ? '1fr 1fr' : '1fr',
            gap: 10,
            marginBottom: 10,
            alignItems: 'start',
          }}
        >
          {requirements.length > 0 ? (
            <div>
              <h2 style={h2}>{L.requirements}</h2>
              <ol
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                {requirements.map((r, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '18px 1fr',
                      gap: 7,
                      alignItems: 'start',
                      pageBreakInside: 'avoid',
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 999,
                        background: DOC.navy,
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 700,
                        fontFamily: 'system-ui, sans-serif',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div style={{ fontSize: 10, lineHeight: 1.4, minWidth: 0 }}>
                      <strong style={{ color: DOC.navy }}>{r.item}</strong>
                      {r.quantity ? (
                        <span style={{ color: DOC.muted }}> · Qty {r.quantity}</span>
                      ) : null}
                      {r.description ? (
                        <div style={{ color: DOC.muted, marginTop: 1, fontSize: 9 }}>{r.description}</div>
                      ) : null}
                      {r.pay_channel === 'school' ? (
                        <div style={{ color: '#92400e', marginTop: 2, fontSize: 9, fontWeight: 600 }}>
                          Unit price {moneyRwf(r.unitPrice ?? 0)} · Line total {moneyRwf(r.cost ?? 0)}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          {rules.length > 0 ? (
            <div>
              <h2 style={h2}>{L.other}</h2>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                {rules.map((r, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '10px 1fr',
                      gap: 7,
                      alignItems: 'start',
                      pageBreakInside: 'avoid',
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: DOC.amber,
                        border: `1.5px solid ${DOC.navy}`,
                        marginTop: 4,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 10, lineHeight: 1.4, color: DOC.body }}>{r.item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}

      {/* Announcements (optional) */}
      {announcements.length > 0 ? (
        <section data-babyeyi-pdf-section="announcements" style={{ marginBottom: 10 }}>
          <h2 style={h2}>
            {lang === 'fr' ? 'Annonces importantes' : lang === 'rw' ? 'Amatangazo y’ingenzi' : 'Important Announcements'}
          </h2>
          <ul style={{ margin: 0, paddingLeft: 14, fontSize: 10, lineHeight: 1.45 }}>
            {announcements.map((a, i) => (
              <li key={i} style={{ marginBottom: 2 }}>
                <strong>{a.title}</strong>
                {a.detail ? ` — ${a.detail}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Notes as bullets */}
      {notes.length > 0 ? (
        <section data-babyeyi-pdf-section="notes" style={{ marginBottom: 10 }}>
          <h2 style={h2}>{L.notes}</h2>
          <ul style={{ margin: 0, paddingLeft: 14, fontSize: 10, lineHeight: 1.45 }}>
            {notes.map((n, i) => (
              <li key={i} style={{ marginBottom: 2 }}>
                {n.item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* School Leadership — all leaders in 2-col print grid */}
      {leaders.length > 0 ? (
        <section data-babyeyi-pdf-section="leaders" style={{ marginBottom: 10 }}>
          <h2 style={h2}>{L.leaders}</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: leaders.length > 1 ? '1fr 1fr' : '1fr',
              gap: 6,
            }}
          >
            {leaders.map((l, i) => (
              <div
                key={`${l.name}-${l.role}-${i}`}
                style={{
                  border: `1px solid ${DOC.hairline}`,
                  borderRadius: 4,
                  padding: '6px 8px',
                  background: '#f8fafc',
                  pageBreakInside: 'avoid',
                }}
              >
                <p
                  style={{
                    margin: '0 0 3px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: DOC.navy,
                    lineHeight: 1.3,
                  }}
                >
                  {l.name || '—'}
                </p>
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: 9.5,
                    fontWeight: 600,
                    color: DOC.body,
                    lineHeight: 1.3,
                  }}
                >
                  {l.role || '—'}
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: l.phone && l.email ? '1fr 1fr' : '1fr',
                    gap: 4,
                    fontSize: 9,
                    lineHeight: 1.35,
                  }}
                >
                  {l.phone ? (
                    <div>
                      <span style={{ color: DOC.muted, display: 'block', fontSize: 8, textTransform: 'uppercase' }}>
                        {L.phone}
                      </span>
                      <span style={{ fontWeight: 600, color: DOC.body }}>{l.phone}</span>
                    </div>
                  ) : null}
                  {l.email ? (
                    <div>
                      <span style={{ color: DOC.muted, display: 'block', fontSize: 8, textTransform: 'uppercase' }}>
                        Email
                      </span>
                      <span style={{ fontWeight: 600, color: DOC.body, wordBreak: 'break-all' }}>{l.email}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Authorization */}
      <div
        id="babyeyi-pdf-auth-block"
        data-babyeyi-pdf-section="auth"
        style={{
          marginTop: 8,
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          borderTop: `1px solid ${DOC.hairline}`,
          paddingTop: 8,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            alignItems: 'end',
            textAlign: 'center',
          }}
        >
          <AuthCell label={brand.principalName ? `Head Teacher — ${brand.principalName}` : 'Head Teacher'}>
            {brand.signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.signatureUrl} alt="" style={{ maxWidth: '100%', maxHeight: 48, objectFit: 'contain' }} />
            ) : (
              <div style={{ height: 36, borderBottom: `1px solid ${DOC.hairline}`, width: '80%', margin: '0 auto' }} />
            )}
          </AuthCell>
          <AuthCell label="Verify Document">
            {brand.qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.qrUrl} alt="QR" style={{ width: 72, height: 72, objectFit: 'contain' }} />
            ) : (
              <div
                style={{
                  width: 72,
                  height: 72,
                  margin: '0 auto',
                  border: `1px dashed ${DOC.hairline}`,
                  fontSize: 9,
                  color: DOC.muted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                QR
              </div>
            )}
            <p style={{ margin: '4px 0 0', fontSize: 8, color: DOC.muted }}>BY-{docId}</p>
          </AuthCell>
          <AuthCell label="Official Stamp">
            {brand.stampUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.stampUrl} alt="" style={{ maxWidth: '100%', maxHeight: 56, objectFit: 'contain' }} />
            ) : (
              <div
                style={{
                  width: 56,
                  height: 56,
                  margin: '0 auto',
                  borderRadius: '50%',
                  border: `1px dashed ${DOC.hairline}`,
                }}
              />
            )}
          </AuthCell>
        </div>
        <p
          style={{
            margin: '8px 0 0',
            paddingTop: 6,
            borderTop: `1px solid ${DOC.hairline}`,
            fontSize: 8,
            color: DOC.muted,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          Generated by ShulePlus
          {' · '}
          {brand.schoolName} · BY-{docId} · {new Date().toLocaleDateString()}
        </p>
      </div>
      </div>
    </div>
  );
}

function LogoBox({ src }: { src?: string | null }) {
  return (
    <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" style={{ maxWidth: 60, maxHeight: 60, objectFit: 'contain' }} />
      ) : (
        <div style={{ width: 56, height: 56, border: `1px solid ${DOC.hairline}`, borderRadius: 6, background: '#f8fafc' }} />
      )}
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: DOC.muted, display: 'block', fontSize: 8, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontWeight: 700, color: DOC.navy }}>{value}</span>
    </div>
  );
}

function AuthCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: 90 }}>
      <div style={{ minHeight: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
        {children}
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 8, color: DOC.muted }}>{label}</p>
    </div>
  );
}
