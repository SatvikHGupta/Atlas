// Pure helpers for the solution viewer. Author: Satvik Hemant Gupta

export const FALLBACK_ORDER = [
  { language: 'javascript', variant: 'algo' },
  { language: 'javascript', variant: 'optimal' },
  { language: 'cpp', variant: 'algo' },
  { language: 'python', variant: 'algo' },
  { language: 'java', variant: 'algo' },
];

// availableMap: { 'javascript:algo': true,
export function pickDefaultSolution(defaultSolution, availableMap = {}) {
  if (defaultSolution && defaultSolution.language && defaultSolution.variant) {
    return { language: defaultSolution.language, variant: defaultSolution.variant };
  }
  for (const c of FALLBACK_ORDER) {
    if (availableMap[`${c.language}:${c.variant}`]) return { ...c };
  }
  return null;
}

const LABELS = {
  pass:           { text: 'Verified on examples',   icon: '\u2713', tone: 'ok' },
  pass_unordered: { text: 'Verified (order differs)', icon: '\u2713', tone: 'ok' },
  partial:        { text: 'Partly verified',        icon: '\u25D0', tone: 'warn' },
  fail:           { text: 'Failed example check, treat with care', icon: '\u2717', tone: 'bad' },
  unrunnable:     { text: 'Could not be run',       icon: '!', tone: 'warn' },
  no_examples:    { text: 'Not example-tested',     icon: '\u25CB', tone: 'neutral' },
  missing:        { text: 'Not available',          icon: '\u2013', tone: 'neutral' },
};
const NOT_VERIFIED = { text: 'Not verified', icon: '\u25CB', tone: 'neutral' };

// status undefined/null (C++ and Java have no check data) -> neutral label
export function verificationLabel(status) {
  return LABELS[status] || NOT_VERIFIED;
}

// A variant tab is disabled when the check says it is missing
export const isVariantMissing = (status) => status === 'missing';
