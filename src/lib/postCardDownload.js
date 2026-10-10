// Draws the post card and saves or shares "Atlas Post Card.png". Author: Satvik Hemant Gupta
import { drawPostCard, CARD_SIZE } from './postCard.js';

export const POST_CARD_FILE = 'Atlas Post Card.png';

// Google profile photo as an image the canvas may read
function loadAvatar(url) {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    setTimeout(() => resolve(null), 4000);
    img.src = url.replace(/=s\d+-c$/, '=s256-c');
  });
}

export async function downloadPostCard(data, options = {}) {
  const root = getComputedStyle(document.documentElement);
  const fam = {
    sans: getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif',
    mono: root.getPropertyValue('--font-mono-loaded').trim() || 'ui-monospace, monospace',
  };
  try {
    if (document.fonts) {
      await Promise.all(['700', '600'].map((w) => document.fonts.load(`${w} 40px ${fam.sans}`)));
      await Promise.all(['500', '600'].map((w) => document.fonts.load(`${w} 20px ${fam.mono}`)));
      await document.fonts.ready;
    }
  } catch { }

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

  if (options.share && await shareFile(blob)) return;
  saveBlob(blob);
}

// Phones: share the PNG through the system sheet; true when shared or cancelled
async function shareFile(blob) {
  try {
    const file = new File([blob], POST_CARD_FILE, { type: 'image/png' });
    if (!navigator.canShare || !navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file], title: 'My Atlas progress' });
    return true;
  } catch (err) {
    return err?.name === 'AbortError'; // cancelled is fine; any other error falls back to a download
  }
}

function saveBlob(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = POST_CARD_FILE;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
