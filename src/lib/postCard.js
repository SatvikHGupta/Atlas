// Atlas Post Card (1080x1080): restrained, data-first dark card. Author: Satvik Hemant Gupta
export const CARD_SIZE = 1080;
const K = {
  bgTop: '#1d1142', bgBot: '#0f0828', panel: '#2b1d5e', text: '#f8f6ff', sub: '#d3cdf0', mute: '#a59bd0',
  hair: 'rgba(196,181,253,0.18)', track: 'rgba(196,181,253,0.16)', violet: '#a78bfa', violetL: '#c4b5fd',
};
const DIFF = { Easy: '#34d399', Medium: '#fbbf24', Hard: '#f87171', Expert: '#a78bfa' };
const PAD = 72;
const TIERS = [[0, 'Just getting started'], [1, 'Off the mark'], [10, 'Warming up'], [25, 'Finding a rhythm'], [50, 'On a roll'], [100, 'Century club'], [250, 'Serious grinder'], [500, 'Algorithm ace'], [1000, 'Atlas legend']];
export const rankFor = (n) => TIERS.filter((t) => n >= t[0]).pop()[1];
const fmt = (n) => Number(n || 0).toLocaleString('en-US');

export function drawPostCard(ctx, d, fam) {
  const W = CARD_SIZE, sans = (w, s) => `${w} ${s}px ${fam.sans}`, mono = (w, s) => `${w} ${s}px ${fam.mono}`;
  const ls = (px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; };
  const label = (t, x, y, color = K.mute, align = 'left', size = 17) => { ctx.font = mono(500, size); ctx.fillStyle = color; ctx.textAlign = align; ls(2.4); ctx.fillText(t.toUpperCase(), x, y); ls(0); ctx.textAlign = 'left'; };
  const line = (x1, y1, x2, y2, c = K.hair, w = 1.5) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const rect = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const total = (d.dsa || 0) + (d.cp || 0);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';

  const bg = ctx.createLinearGradient(0, 0, 0, W); bg.addColorStop(0, K.bgTop); bg.addColorStop(1, K.bgBot); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, W);
  for (let y = PAD; y < W; y += 72) {
    for (let x = PAD; x < W; x += 72) {
      ctx.strokeStyle = 'rgba(196,181,253,0.07)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
    }
  }

  const dx = PAD + 17, dy = 104;
  ctx.fillStyle = K.violetL; ctx.beginPath();
  ctx.moveTo(dx, dy - 17); ctx.lineTo(dx + 17, dy); ctx.lineTo(dx, dy + 17); ctx.lineTo(dx - 17, dy); ctx.closePath();
  ctx.moveTo(dx, dy - 8.5); ctx.lineTo(dx - 8.5, dy); ctx.lineTo(dx, dy + 8.5); ctx.lineTo(dx + 8.5, dy); ctx.closePath(); ctx.fill('evenodd');
  ctx.textBaseline = 'middle'; ctx.fillStyle = K.text; ctx.font = sans(700, 32); ctx.fillText('Atlas', PAD + 46, 106);
  if (d.since) label(`Since ${d.since}`, W - PAD, 106, K.mute, 'right', 17);
  line(PAD, 146, W - PAD, 146);

  rect(PAD, 182, 76, 76, 20); ctx.fillStyle = K.panel; ctx.fill(); ctx.strokeStyle = K.hair; ctx.lineWidth = 1.5; ctx.stroke();
  if (d.avatar) {
    const iw = d.avatar.naturalWidth || d.avatar.width, ih = d.avatar.naturalHeight || d.avatar.height, m = Math.min(iw, ih);
    ctx.save(); rect(PAD, 182, 76, 76, 20); ctx.clip();
    ctx.drawImage(d.avatar, (iw - m) / 2, (ih - m) / 2, m, m, PAD, 182, 76, 76); ctx.restore();
    rect(PAD, 182, 76, 76, 20); ctx.strokeStyle = K.hair; ctx.lineWidth = 1.5; ctx.stroke();
  } else {
    ctx.fillStyle = K.violetL; ctx.font = sans(700, 36); ctx.textAlign = 'center'; ctx.fillText((d.name || '?').trim()[0].toUpperCase(), PAD + 38, 222); ctx.textAlign = 'left';
  }
  const nx = PAD + 102; let ns = 46; ctx.font = sans(700, ns);
  while (ctx.measureText(d.name).width > W - PAD - nx && ns > 28) { ns -= 2; ctx.font = sans(700, ns); }
  ctx.fillStyle = K.text; ctx.textBaseline = 'alphabetic'; ctx.fillText(d.name, nx, 218);
  ctx.fillStyle = K.violet; ctx.beginPath(); ctx.arc(nx + 6, 243, 5, 0, Math.PI * 2); ctx.fill();
  ctx.textBaseline = 'middle'; label(rankFor(total), nx + 22, 243, K.sub, 'left', 17);

  const cx = W - PAD - 132, cy = 448, R = 126, r0 = 98;
  const zoneL = PAD, zoneR = cx - R - 48, zc = (zoneL + zoneR) / 2;
  const numStr = fmt(total); let hs = 300; ctx.font = sans(700, hs); ls(-8);
  while (ctx.measureText(numStr).width > zoneR - zoneL && hs > 110) { hs -= 6; ctx.font = sans(700, hs); }
  const base = cy + hs * 0.36;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center'; ctx.fillStyle = K.text; ctx.fillText(numStr, zc + 4, base); ls(0);
  label('Total problems solved', zc, base - hs * 0.72 - 36, K.mute, 'center', 17);
  ctx.textAlign = 'left';

  const rows = (d.difficulty || []).filter((r) => r.solved > 0), sum = rows.reduce((a, r) => a + r.solved, 0);
  ctx.lineWidth = R - r0; const mid = (R + r0) / 2;
  if (!sum) { ctx.strokeStyle = K.track; ctx.beginPath(); ctx.arc(cx, cy, mid, 0, Math.PI * 2); ctx.stroke(); }
  else {
    const gap = rows.length > 1 ? 0.045 : 0; let a = -Math.PI / 2;
    rows.forEach((r) => { const sw = (r.solved / sum) * Math.PI * 2; ctx.strokeStyle = DIFF[r.name] || K.violet; ctx.beginPath(); ctx.arc(cx, cy, mid, a + gap / 2, a + sw - gap / 2); ctx.stroke(); a += sw; });
  }
  ctx.textAlign = 'center'; ctx.fillStyle = K.text; ctx.font = sans(700, 44); ctx.fillText('DSA', cx, cy + 6);
  label('By level', cx, cy + 36, K.mute, 'center', 15); ctx.textAlign = 'left';
  rows.forEach((r, i) => {
    const cw2 = 128, lx = W - PAD - cw2 * 2 - 22 + (i % 2) * (cw2 + 22), ly = cy + R + 38 + Math.floor(i / 2) * 34;
    ctx.fillStyle = DIFF[r.name]; ctx.beginPath(); ctx.arc(lx + 6, ly, 6, 0, Math.PI * 2); ctx.fill();
    ctx.textBaseline = 'middle'; ctx.font = sans(600, 20); ctx.fillStyle = K.sub; ctx.fillText(r.name, lx + 21, ly + 1);
    ctx.font = mono(600, 20); ctx.fillStyle = K.text; ctx.textAlign = 'right'; ctx.fillText(String(r.solved), lx + cw2, ly + 1); ctx.textAlign = 'left';
  });

  const sy = 684, cw = (W - PAD * 2) / 3; ctx.textBaseline = 'alphabetic';
  line(PAD, sy, W - PAD, sy);
  [['DSA solved', fmt(d.dsa), ''], ['CP solved', fmt(d.cp), ''], ['Day streak', fmt(d.streak), `Best ${fmt(Math.max(d.best || 0, d.streak || 0))}`]].forEach((c, i) => {
    const x = PAD + i * cw + (i ? 32 : 0); if (i) line(PAD + i * cw, sy + 22, PAD + i * cw, sy + 130);
    ctx.textBaseline = 'alphabetic'; label(c[0], x, sy + 46);
    if (c[2]) label(c[2], PAD + (i + 1) * cw, sy + 46, K.violetL, 'right', 15);
    ctx.fillStyle = K.text; let sz = 68; ctx.font = sans(700, sz);
    while (ctx.measureText(c[1]).width > cw - 56 && sz > 40) { sz -= 4; ctx.font = sans(700, sz); }
    ctx.fillText(c[1], x, sy + 116);
  });

  const ty = 846; line(PAD, ty, W - PAD, ty); label('Top topics', PAD, ty + 40);
  const tps = (d.topics || []).slice(0, 4), max = Math.max(1, ...tps.map((t) => t.solved)), colW = (W - PAD * 2 - 56) / 2;
  if (!tps.length) { ctx.font = sans(500, 24); ctx.fillStyle = K.mute; ctx.fillText('Solve a few problems and your strongest topics show up here.', PAD, ty + 94); }
  tps.forEach((t, i) => {
    const x = PAD + (i % 2) * (colW + 56), y = ty + 86 + Math.floor(i / 2) * 62;
    ctx.textBaseline = 'alphabetic'; let nz = 25; ctx.font = sans(600, nz);
    while (ctx.measureText(t.name).width > colW - 70 && nz > 17) { nz -= 1; ctx.font = sans(600, nz); }
    ctx.fillStyle = K.text; ctx.fillText(t.name, x, y);
    ctx.font = mono(600, 22); ctx.fillStyle = K.sub; ctx.textAlign = 'right'; ctx.fillText(String(t.solved), x + colW, y); ctx.textAlign = 'left';
    ctx.fillStyle = K.track; rect(x, y + 14, colW, 6, 3); ctx.fill();
    ctx.fillStyle = K.violetL; rect(x, y + 14, Math.max(10, (t.solved / max) * colW), 6, 3); ctx.fill();
  });
}
