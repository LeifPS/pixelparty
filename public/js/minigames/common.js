// Gemeinsame Helfer für Minispiele
import { C, W, H, text, rect, panel, drawChar, drawFace, PCOL, icon } from '../gfx.js';

export const NOINP = () => ({ x: 0, y: 0, a: false, b: false, aP: false, bP: false });
export const mulOf = (q) => 1 + 0.1 * (q.hc || 0);
export function makePlayers(parts, extra) {
  return parts.map((q, i) => ({ slot: q.slot, team: q.team, char: q.char, name: q.name, m: mulOf(q), idx: i, ...extra(q, i) }));
}
/** Rangliste: key(p) größer = besser; Gleichstand teilt den Rang */
export function ranking(pls, key) {
  const arr = pls.map((p) => ({ p, k: key(p), r: Math.random() })).sort((a, b) => b.k - a.k || a.r - b.r);
  const rank = [0, 0, 0, 0]; let cur = 0;
  arr.forEach((e, i) => { if (i === 0 || e.k !== arr[i - 1].k) cur = i + 1; rank[e.p.slot] = cur; });
  return { order: arr.map((e) => e.p.slot), rank };
}
export function moveBound(p, inp, speed, dt, x0, x1, y0, y1) {
  let dx = inp.x, dy = inp.y;
  const l = Math.hypot(dx, dy);
  if (l > 1) { dx /= l; dy /= l; }
  p.x = Math.max(x0, Math.min(x1, p.x + dx * speed * dt));
  p.y = Math.max(y0, Math.min(y1, p.y + dy * speed * dt));
  if (Math.abs(dx) > 0.2) p.dir = dx < 0 ? 1 : 0;
  p.moving = l > 0.2;
}
export const sgn = (v, dead = 4) => (v > dead ? 1 : v < -dead ? -1 : 0);
/** Köpfe mit Punkten oben */
export function drawScoreBar(c, pls, valFn, y = 4) {
  const n = pls.length, w = Math.min(112, Math.floor((W - 8) / n) - 4);
  pls.forEach((p, i) => {
    const x = Math.round((W - n * (w + 4) + 4) / 2) + i * (w + 4);
    panel(c, x, y, w, 20, { bg: '#1a1c2c', border: PCOL[p.slot], shine: false });
    drawFace(c, p.char, x + 3, y + 4, 1);
    text(c, valFn(p), x + w - 5, y + 7, { align: 'r', s: 1 });
  });
}
export function drawTimer(c, secLeft) {
  panel(c, W / 2 - 22, 26, 44, 14, { bg: '#1a1c2c', border: C.lgy, shine: false });
  text(c, Math.max(0, Math.ceil(secLeft)) + 's', W / 2, 30, { align: 'c', color: secLeft < 5 ? C.ora : C.wht });
}
export function tag(c, p, x, y) {
  rect(c, x - 3, y, 6, 2, PCOL[p.slot]);
}
export function bgFill(c, a, b, size = 16, x0 = 0, y0 = 0, w = W, h = H) {
  for (let y = y0; y < y0 + h; y += size) for (let x = x0; x < x0 + w; x += size) {
    rect(c, x, y, size, size, ((x / size + y / size) & 1) ? a : b);
  }
}
export { C, W, H, text, rect, panel, drawChar, drawFace, PCOL, icon };
