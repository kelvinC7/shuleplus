export function scene(type, seed) {
  const g = (c1, c2) =>
    `<defs><linearGradient id="g${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="200" height="120" fill="url(#g${seed})"/>`;
  const person = (x, y, s = 1, c = '#E9D7B5') =>
    `<g transform="translate(${x},${y}) scale(${s})" opacity=".9"><circle cx="0" cy="-16" r="4.2" fill="${c}"/><path d="M-6 -10h12l2 16h-16z" fill="#2B3A5C"/><rect x="-5" y="6" width="4" height="10" fill="#1B2438"/><rect x="1" y="6" width="4" height="10" fill="#1B2438"/></g>`;

  const S = {
    gate:
      g('#3B4A5E', '#1E2733') +
      `<rect x="0" y="70" width="200" height="50" fill="#4A4A44"/><rect x="20" y="22" width="10" height="60" fill="#6B7280"/><rect x="170" y="22" width="10" height="60" fill="#6B7280"/>` +
      [...Array(12)].map((_, i) => `<rect x="${34 + i * 11}" y="30" width="3" height="50" fill="#9CA3AF" opacity=".7"/>`).join('') +
      `<rect x="30" y="28" width="140" height="4" fill="#9CA3AF"/>${person(70, 96)}${person(96, 100, 1.1)}${person(140, 92, 0.9)}<rect x="150" y="56" width="22" height="26" fill="#F5A623" opacity=".75"/>`,
    class:
      g('#C9C0A8', '#8C8574') +
      `<rect x="40" y="10" width="120" height="40" fill="#24402F"/><rect x="44" y="14" width="40" height="2" fill="#fff" opacity=".6"/><rect x="44" y="20" width="60" height="2" fill="#fff" opacity=".5"/><rect x="0" y="80" width="200" height="40" fill="#6E6656"/>` +
      [0, 1, 2, 3]
        .map((r) =>
          [0, 1, 2, 3, 4]
            .map(
              (c) =>
                `<rect x="${18 + c * 36}" y="${62 + r * 14}" width="26" height="6" fill="#5B4A32"/><circle cx="${31 + c * 36}" cy="${58 + r * 14}" r="${3 + r * 0.6}" fill="#3A2A1E"/>`
            )
            .join('')
        )
        .join('') +
      person(170, 62, 0.9),
    dorm:
      g('#2D3446', '#161A24') +
      [0, 1, 2]
        .map(
          (i) =>
            `<rect x="${14 + i * 62}" y="60" width="50" height="22" fill="#3D4A63"/><rect x="${14 + i * 62}" y="40" width="6" height="42" fill="#566180"/><rect x="${58 + i * 62}" y="40" width="6" height="42" fill="#566180"/><rect x="${14 + i * 62}" y="40" width="50" height="14" fill="#47546F"/>`
        )
        .join('') +
      `<rect x="0" y="82" width="200" height="38" fill="#232938"/>`,
    canteen:
      g('#B8A890', '#6F6352') +
      `<rect x="0" y="40" width="200" height="22" fill="#8F7E66"/>` +
      [0, 1, 2, 3, 4].map((i) => `<rect x="${10 + i * 38}" y="44" width="28" height="14" fill="#C9B79A"/>`).join('') +
      `<rect x="0" y="62" width="200" height="58" fill="#7A6C58"/>` +
      [0, 1, 2].map((i) => `<rect x="${20 + i * 60}" y="84" width="44" height="10" fill="#5A4A34"/>`).join('') +
      person(40, 80, 0.9) +
      person(62, 82, 0.9) +
      person(110, 80, 0.9) +
      person(150, 84, 0.95),
    field:
      g('#7FA9C9', '#C9DFEF') +
      `<rect x="0" y="54" width="200" height="66" fill="#4E7A3A"/><rect x="0" y="54" width="200" height="66" fill="url(#g${seed})" opacity=".08"/><path d="M20 120 L80 60 L120 60 L180 120" fill="none" stroke="#fff" stroke-width="1.4" opacity=".7"/><circle cx="100" cy="84" r="12" fill="none" stroke="#fff" stroke-width="1.2" opacity=".7"/>` +
      person(60, 96, 0.8) +
      person(120, 90, 0.8) +
      person(140, 104, 0.85) +
      person(88, 108, 0.85),
    bus:
      g('#5E7085', '#2A3545') +
      `<rect x="0" y="80" width="200" height="40" fill="#3B3B38"/><rect x="0" y="98" width="200" height="2" fill="#F5A623" opacity=".6"/><rect x="30" y="44" width="130" height="44" rx="6" fill="#F5A623"/>` +
      [0, 1, 2, 3, 4].map((i) => `<rect x="${38 + i * 22}" y="50" width="16" height="14" fill="#1E2733" opacity=".8"/>`).join('') +
      `<circle cx="58" cy="90" r="8" fill="#111"/><circle cx="132" cy="90" r="8" fill="#111"/><rect x="36" y="70" width="80" height="4" fill="#13213D"/>`,
    corridor:
      g('#BFC4CC', '#6D737D') +
      `<path d="M0 0 L80 40 L80 90 L0 120z" fill="#9AA1AC"/><path d="M200 0 L120 40 L120 90 L200 120z" fill="#8E95A0"/><rect x="80" y="40" width="40" height="50" fill="#D7DBE1"/><path d="M0 120 L80 90 L120 90 L200 120z" fill="#7C828C"/>` +
      person(100, 86, 0.6) +
      person(70, 104, 0.9),
    lab:
      g('#DDE3EA', '#9AA5B3') +
      `<rect x="0" y="70" width="200" height="50" fill="#6A7583"/>` +
      [0, 1].map((r) => `<rect x="10" y="${62 + r * 26}" width="180" height="8" fill="#2B3A5C"/>`).join('') +
      [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${20 + i * 30}" y="52" width="6" height="10" fill="#3E7BFA" opacity=".6"/>`).join('') +
      person(50, 60, 0.8) +
      person(120, 60, 0.8) +
      person(80, 86, 0.85),
  };

  return `<svg class="scene" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">${S[type] || S.gate}<rect width="200" height="120" fill="#0B1220" opacity=".12"/></svg>`;
}
