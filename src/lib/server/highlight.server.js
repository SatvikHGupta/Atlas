import { createHighlighter } from 'shiki';
import { SHIKI_THEMES } from '../../theme/shiki-themes.js';

let highlighterPromise = null;
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: Object.values(SHIKI_THEMES),
      langs: ['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'bash', 'json'],
    });
  }
  return highlighterPromise;
}

const LANG_ALIASES = { js: 'javascript', ts: 'typescript', py: 'python', 'c++': 'cpp', sh: 'bash', shell: 'bash' };

export async function highlightCode(code, lang = 'javascript') {
  if (!code) return '';
  const highlighter = await getHighlighter();
  const key = String(lang || 'text').toLowerCase();
  try {
    return highlighter.codeToHtml(code, { lang: LANG_ALIASES[key] || key, themes: SHIKI_THEMES, defaultColor: false });
  } catch {
    return highlighter.codeToHtml(code, { lang: 'text', themes: SHIKI_THEMES, defaultColor: false });
  }
}
