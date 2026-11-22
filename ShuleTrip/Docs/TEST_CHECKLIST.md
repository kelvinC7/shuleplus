# ShuleTrip test checklist

## Access

- [ ] School user without `shule-trip` module sees license error
- [ ] School user with module but no tenant sees provisioning message
- [ ] Government user without official role blocked from `/government/*`
- [ ] Cross-school: school A cannot read school B trip IDs

## School workflows

- [ ] Welcome → School → IAM handoff → dashboard
- [ ] Register trip wizard: validation per step, save draft, submit blocked when incomplete
- [ ] My Trips: search, filters, detail tabs load
- [ ] Edit draft; cannot silently edit approved critical fields without re-review

## Government workflows

- [ ] Review queue respects jurisdiction filter
- [ ] Approve / reject / request corrections require reason where policy says so
- [ ] Authorization PDF only when backend status is fully approved

## Safety & documents

- [ ] Readiness indicator lists blockers vs warnings with explanations
- [ ] Expired document flagged; human verification required

## Trip day

- [ ] QR verify shows valid/revoked without student PII
- [ ] Offline events queue and sync with timestamps

## UX

- [ ] Responsive sidebar + tables on tablet/mobile
- [ ] Empty, loading, error states on all primary lists
- [ ] EN / RW labels where implemented
