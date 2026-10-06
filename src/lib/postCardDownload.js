// Browser side of the post card: draw on a canvas, save it as "Atlas Post Card.png". Author: Satvik Hemant Gupta
import { drawPostCard, CARD_SIZE } from './postCard.js';

export const POST_CARD_FILE = 'Atlas Post Card.png';

// Google profile photo as an image the canvas may read. Resolves null on any problem (blocked, slow, no CORS),
// and the card then shows the first letter of the name instead.
function loadAvatar(url) {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // without this the canvas would be tainted and the PNG could not be saved
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    setTimeout(() => resolve(null), 4000);
    img.src = url.replace(/=s\d+-c$/, '=s256-c'); // ask Google for a sharper copy than the default 96px
  });
}

export async function downloadPostCard(data) {
  // the card uses the site's two fonts: Plus Jakarta Sans for text and JetBrains Mono for small labels and counts
  const root = getComputedStyle(document.documentElement);
  const fam = {
    sans: getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif',
    mono: root.getPropertyValue('--font-mono-loaded').trim() || 'ui-monospace, monospace',
  };
  try {
    // make sure both fonts are ready before drawing, otherwise canvas silently falls back to a system font
    if (document.fonts) {
      await Promise.all(['700', '600'].map((w) => document.fonts.load(`${w} 40px ${fam.sans}`)));
      await Promise.all(['500', '600'].map((w) => document.fonts.load(`${w} 20px ${fam.mono}`)));
      await document.fonts.ready;
    }
  } catch { /* draw with whatever font is available */ }

  const draw = (avatar) => {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_SIZE; canvas.height = CARD_SIZE;
    drawPostCard(canvas.getContext('2d'), { ...data, avatar }, fam);
    return new Promise((resolve, reject) => {
      try { canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('empty'))), 'image/png'); } catch (e) { reject(e); }
    });
  };

  const avatar = await loadAvatar(data.photo);
  let blob;
  try { blob = await draw(avatar); } catch { blob = await draw(null); } // a tainted canvas throws, so retry with the letter
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = POST_CARD_FILE;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
