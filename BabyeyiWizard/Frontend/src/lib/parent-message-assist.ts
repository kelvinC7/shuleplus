export type WordingIssue = {
  id: string;
  from: string;
  to: string;
  reason: string;
  index: number;
};

/** Common circular / school English misspellings & phrasing. */
const WORD_FIXES: Array<{ pattern: RegExp; to: string; reason: string }> = [
  { pattern: /\brecieve\b/gi, to: 'receive', reason: 'Spelling' },
  { pattern: /\brecieved\b/gi, to: 'received', reason: 'Spelling' },
  { pattern: /\bbegining\b/gi, to: 'beginning', reason: 'Spelling' },
  { pattern: /\bseperate\b/gi, to: 'separate', reason: 'Spelling' },
  { pattern: /\bgoverment\b/gi, to: 'government', reason: 'Spelling' },
  { pattern: /\bschol\b/gi, to: 'school', reason: 'Spelling' },
  { pattern: /\bscholls\b/gi, to: 'schools', reason: 'Spelling' },
  { pattern: /\brequirment\b/gi, to: 'requirement', reason: 'Spelling' },
  { pattern: /\brequirments\b/gi, to: 'requirements', reason: 'Spelling' },
  { pattern: /\bneccessary\b/gi, to: 'necessary', reason: 'Spelling' },
  { pattern: /\bacomodation\b/gi, to: 'accommodation', reason: 'Spelling' },
  { pattern: /\baccomodation\b/gi, to: 'accommodation', reason: 'Spelling' },
  { pattern: /\battendence\b/gi, to: 'attendance', reason: 'Spelling' },
  { pattern: /\bhell+o+\b/gi, to: 'Hello', reason: 'Spelling' },
  { pattern: /\bfee's\b/gi, to: 'fees', reason: 'Wording' },
  { pattern: /\bparent's\b/gi, to: "parents'", reason: 'Wording' },
  { pattern: /\bkindly be inform\b/gi, to: 'kindly be informed', reason: 'Grammar' },
  { pattern: /\bwe inform you that\b/gi, to: 'we would like to inform you that', reason: 'Tone' },
  { pattern: /\bplease to note\b/gi, to: 'please note', reason: 'Grammar' },
  { pattern: /\bdear parent\b/gi, to: 'Dear Parents', reason: 'Greeting' },
  { pattern: /\bdear parents\b/g, to: 'Dear Parents', reason: 'Capitalization' },
  { pattern: /\byours faithfully\b/gi, to: 'Yours faithfully', reason: 'Capitalization' },
];

const COMMON_WORDS = new Set(
  [
    'a', 'an', 'the', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'as',
    'is', 'are', 'was', 'be', 'been', 'please', 'find', 'below', 'school', 'fees', 'fee', 'student',
    'students', 'requirements', 'requirement', 'term', 'year', 'academic', 'parents', 'parent',
    'dear', 'kindly', 'complete', 'payment', 'payments', 'prepare', 'listed', 'items', 'before',
    'start', 'thank', 'you', 'your', 'our', 'continued', 'partnership', 'child', 'children',
    'class', 'circular', 'message', 'we', 'would', 'like', 'inform', 'that', 'this', 'note',
    'yours', 'faithfully', 'sincerely', 'regards', 'hello', 'hi', 'good', 'morning', 'afternoon',
    'mu', 'ku', 'na', 'ya', 'ba', 'ababyeyi', 'abanyeshuri', 'amafaranga', 'ibikenewe', 'murakoze',
    'chers', 'parents', 'élèves', 'frais', 'année', 'scolaire', 'merci', 'vous', 'les', 'des',
  ].map((w) => w.toLowerCase())
);

function looksGibberish(word: string): boolean {
  const w = word.replace(/^[^a-zA-ZÀ-ÿ']+|[^a-zA-ZÀ-ÿ']+$/g, '');
  if (w.length < 4) return false;
  if (COMMON_WORDS.has(w.toLowerCase())) return false;
  // repeated letters: Hellll..., aaa
  if (/(.)\1{2,}/i.test(w)) return true;
  // no vowels (latin)
  if (w.length >= 5 && !/[aeiouyàáâãäåèéêëìíîïòóôõöùúûüÿ]/i.test(w)) return true;
  // long consonant cluster
  if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(w)) return true;
  // random ending like jhhb
  if (/[bcdfghjklmnpqrstvwxz]{3,}$/i.test(w) && w.length >= 8) return true;
  // mixed case chaos mid-word without being acronym
  if (w.length >= 6 && /[a-z][A-Z][a-z][A-Z]/.test(w)) return true;
  return false;
}

export function detectWordingIssues(text: string): WordingIssue[] {
  if (!text.trim()) return [];
  const issues: WordingIssue[] = [];
  let n = 0;

  for (const fix of WORD_FIXES) {
    const re = new RegExp(
      fix.pattern.source,
      fix.pattern.flags.includes('g') ? fix.pattern.flags : `${fix.pattern.flags}g`
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const matched = m[0];
      let replacement = fix.to;
      if (matched[0] === matched[0].toUpperCase() && matched[0] !== matched[0].toLowerCase()) {
        replacement = fix.to.charAt(0).toUpperCase() + fix.to.slice(1);
      }
      if (matched === replacement) continue;
      issues.push({
        id: `w-${n++}`,
        from: matched,
        to: replacement,
        reason: fix.reason,
        index: m.index,
      });
    }
  }

  const wordRe = /[A-Za-zÀ-ÿ']+/g;
  let wm: RegExpExecArray | null;
  while ((wm = wordRe.exec(text)) !== null) {
    const word = wm[0];
    if (!looksGibberish(word)) continue;
    // skip if already covered by a WORD_FIX match at same span
    if (issues.some((i) => i.index === wm!.index && i.from.toLowerCase() === word.toLowerCase())) {
      continue;
    }
    issues.push({
      id: `w-${n++}`,
      from: word,
      to: '…',
      reason: 'Unclear wording',
      index: wm.index,
    });
  }

  if (/  +/.test(text)) {
    issues.push({
      id: `w-${n++}`,
      from: '  ',
      to: ' ',
      reason: 'Extra spaces',
      index: text.search(/  +/),
    });
  }

  const trimmed = text.replace(/\s+$/, '');
  if (trimmed.length > 12 && !/[.!?…]["')\]]*$/.test(trimmed)) {
    issues.push({
      id: `w-${n++}`,
      from: trimmed.slice(-24),
      to: `${trimmed}.`,
      reason: 'Missing end punctuation',
      index: Math.max(0, trimmed.length - 24),
    });
  }

  return issues;
}

export function applyWordingCorrections(text: string): string {
  let next = text;
  for (const fix of WORD_FIXES) {
    next = next.replace(fix.pattern, (matched) => {
      if (matched === matched.toUpperCase()) return fix.to.toUpperCase();
      if (matched[0] === matched[0].toUpperCase()) {
        return fix.to.charAt(0).toUpperCase() + fix.to.slice(1);
      }
      return fix.to;
    });
  }
  next = next.replace(/  +/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
  if (next.length > 12 && !/[.!?…]["')\]]*$/.test(next)) {
    next = `${next}.`;
  }
  return next;
}

export function buildParentMessageTemplate(opts: {
  schoolName?: string | null;
  classes: string[];
  className: string;
  term: string;
  academicYear: string;
  language?: string;
}): string {
  const classLabel =
    (opts.classes.length ? opts.classes : [opts.className]).filter(Boolean).join(', ') || 'your child';
  const school = opts.schoolName?.trim() || 'our school';
  const lang = (opts.language || 'en').toLowerCase();

  if (lang === 'rw') {
    return `Bashykiriwe ababyeyi b'abanyeshuri ba ${classLabel},

Tubasaba kuzanira abana amafaranga n'ibikenewe byanditswe kuri iyi nkuru. Iyi nkuru ireba ${opts.term} yu mwaka w'amashuri ${opts.academicYear} muri ${school}.

Murakoze ku Bufatanye.`;
  }

  if (lang === 'fr') {
    return `Chers parents des élèves de ${classLabel},

Nous vous prions de bien vouloir régler les frais et préparer les fournitures indiqués dans cette circulaire pour ${opts.term} de l'année scolaire ${opts.academicYear} à ${school}.

Avec nos remerciements.`;
  }

  return `Dear Parents of ${classLabel},

Please find below the school fees and student requirements for ${opts.term} of the ${opts.academicYear} academic year at ${school}. Kindly complete payment and prepare the listed items before the start of term.

Thank you for your continued partnership.`;
}
