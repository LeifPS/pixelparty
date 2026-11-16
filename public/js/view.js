// Zeichnen der Brett-Szene, des HUD und aller Overlays
import { C, W, H, text, textWidth, wrap, rect, panel, circle, drawChar, drawFace, icon, PCOL, CHARS } from './gfx.js';
import { BOARDS } from './boards.js';
import { makeBackground } from './boardart.js';
import { ITEMS, STAR_COST } from './game.js';

const bgCache = {};
const ITEMC = { doppel: ['2', '#3b5dc9'], dreifach: ['3', '#5d275d'], wunsch: ['W', '#ffcd75'], schnecke: ['S', '#38b764'], dieb: ['D', '#b13e53'], glocke: ['G', '#94b0c2'], portal: ['P', '#41a6f6'], tausch: ['T', '#ef7d57'] };
export function itemChip(c, id, x, y, s = 1) {
  const [ch, col] = ITEMC[id] || ['?', C.gry];
  rect(c, x, y, 9 * s, 9 * s, C.ink); rect(c, x + s, y + s, 7 * s, 7 * s, col);
  text(c, ch, x + 2 * s, y + 1 * s + (s > 1 ? 1 : 0), { color: id === 'wunsch' ? C.ink : C.wht, shadow: null, s: s > 1 ? 1 : 1 });
}
const TILE = {
  b: ['#3b5dc9', '#73eff7', '+', C.wht], r: ['#b13e53', '#ef7d57', '-', C.wht], e: ['#38b764', '#a7f070', '?', C.wht],
  l: ['#38b764', '#ffcd75', '★', C.yel], B: ['#5d275d', '#b13e53', 'X', C.yel], i: ['#38b764', '#f4f4f4', 'I', C.wht],
  v: ['#38b764', '#ef7d57', '!', C.wht], n: ['#f4f4f4', '#ffcd75', 'S', C.ink],
};
function tile(c, x, y, t, pulse) {
  const d = TILE[t] || TILE.b;
  circle(c, x, y + 1, 10, 'rgba(0,0,0,.3)');
  circle(c, x, y, 10, C.ink); circle(c, x, y, 9, d[1]); circle(c, x, y, 7, d[0]);
  rect(c, x - 4, y - 6, 6, 1, 'rgba(255,255,255,.4)');
  text(c, d[2], x - 2, y - 3, { color: d[3], shadow: null });
  if (pulse) { c.strokeStyle = C.yel; c.lineWidth = 2; c.beginPath(); c.arc(Math.round(x), Math.round(y), 13 + Math.sin(pulse * 8) * 2, 0, 7); c.stroke(); }
}
function arrow(c, x, y, dx, dy) {
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath();
  c.moveTo(x + dx * 5, y + dy * 5); c.lineTo(x - dx * 3 - dy * 4, y - dy * 3 + dx * 4); c.lineTo(x - dx * 3 + dy * 4, y - dy * 3 - dx * 4); c.fill();
}
function shopIcon(c, x, y) { rect(c, x - 8, y - 12, 16, 12, '#8a4b20'); rect(c, x - 10, y - 16, 20, 5, C.red); rect(c, x - 10, y - 16, 20, 2, C.wht); rect(c, x - 3, y - 8, 6, 8, C.ink); rect(c, x - 7, y - 9, 3, 3, C.yel); }
function thiefIcon(c, x, y, t) {
  const b = Math.round(Math.sin(t * 3) * 2);
  rect(c, x - 6, y - 16 + b, 12, 12, C.wht); rect(c, x - 7, y - 14 + b, 14, 9, C.wht); rect(c, x - 5, y - 17 + b, 10, 2, C.wht);
  rect(c, x - 7, y - 5 + b, 3, 3, C.wht); rect(c, x - 1, y - 5 + b, 3, 3, C.wht); rect(c, x + 4, y - 5 + b, 3, 3, C.wht);
  rect(c, x - 4, y - 12 + b, 2, 3, C.ink); rect(c, x + 2, y - 12 + b, 2, 3, C.ink); rect(c, x - 2, y - 7 + b, 4, 1, C.ink);
}
function sellerIcon(c, x, y, t) {
  const b = Math.round(Math.sin(t * 4) * 2);
  icon(c, 'starO', x - 9, y - 30 + b, 2);
  rect(c, x - 7, y - 12, 14, 5, '#8a4b20'); rect(c, x - 7, y - 12, 14, 2, '#c2874a');
}

export function camUpdate(G, dt) {
  const cam = G.ui.cam;
  const k = 1 - Math.exp(-dt * 5);
  cam.x += ((cam.tx ?? cam.x) - cam.x) * k; cam.y += ((cam.ty ?? cam.y) - cam.y) * k;
}

export function drawBoardScene(c, G, time) {
  const b = BOARDS[G.boardId];
  if (!bgCache[b.id]) bgCache[b.id] = makeBackground(b);
  const cam = G.ui.cam;
  const ox = Math.round(Math.max(0, Math.min(b.w - W, cam.x - W / 2))), oy = Math.round(Math.max(0, Math.min(b.h - H + 30, cam.y - H / 2 + 15)));
  c.drawImage(bgCache[b.id], -ox, -oy);
  c.save(); c.translate(-ox, -oy);
  const menu = G.ui.menu, hl = menu ? menu.options[menu.sel] : null;
  // Pfeile
  for (const n of b.nodes) for (const id of n.next) {
    const m = b.nodes[id];
    arrow(c, (n.x + m.x) / 2, (n.y + m.y) / 2, m.x - n.x, m.y - n.y);
  }
  // Stationen
  for (const n of b.nodes) {
    if (n.shop) shopIcon(c, n.x + 14, n.y - 6);
    if (n.thief) thiefIcon(c, n.x + 14, n.y - 4, time);
    if (n.toll) { rect(c, n.x + 12, n.y - 18, 3, 14, '#5a2f12'); rect(c, n.x + 4, n.y - 22, 20, 9, '#c2874a'); text(c, '5', n.x + 11, n.y - 21, { shadow: null, color: C.ink }); }
  }
  for (const n of b.nodes) tile(c, n.x, n.y, n.t, hl && hl.dir === n.id ? time : 0);
  const sp = b.nodes[G.starSpot];
  sellerIcon(c, sp.x, sp.y - 10, time);
  // Spieler
  const lists = {};
  for (const p of G.players) (lists[p.node] = lists[p.node] || []).push(p);
  const draws = G.players.map((p) => {
    let ox2 = 0;
    const grp = lists[p.node] || [];
    const atNode = Math.hypot(p.x - b.nodes[p.node].x, p.y - b.nodes[p.node].y) < 1;
    if (atNode && grp.length > 1) ox2 = (grp.indexOf(p) - (grp.length - 1) / 2) * 11;
    return { p, x: p.x + ox2, y: p.y - 2 };
  }).sort((a, d) => a.y - d.y);
  for (const d of draws) {
    const p = d.p, moving = G.ui.moving === p.i;
    let alpha = 1, sc = 1;
    if (G.ui.tele && G.ui.tele.pi === p.i) { const k = G.ui.tele.k; alpha = k; sc = 0.4 + 0.6 * k; }
    const jump = moving ? Math.abs(Math.sin(G.ui.moveK * Math.PI)) * 8 : 0;
    drawChar(c, p.char, d.x, d.y - jump, { frame: moving ? Math.floor(time * 10) : 0, alpha, s: 1 });
    if (G.cur === p.i && !moving && G.phase === 'board') { text(c, '▼', d.x, d.y - 28 + Math.round(Math.sin(time * 6) * 2), { align: 'c', color: PCOL[p.i] }); }
  }
  // Würfel
  if (G.ui.dice) {
    const dd = G.ui.dice, p = G.players[dd.pi];
    const n = dd.vals.length, w = 22, x0 = p.x - (n * (w + 2)) / 2 + 1, y0 = p.y - 66;
    dd.vals.forEach((v, k) => {
      const x = x0 + k * (w + 2), yy = y0 + (dd.stopped ? Math.round(Math.sin(time * 14) * 1) : Math.round(Math.sin(time * 30 + k) * 2));
      rect(c, x, yy, w, w, C.ink); rect(c, x + 1, yy + 1, w - 2, w - 2, dd.stopped ? C.yel : C.wht); rect(c, x + 2, yy + 2, w - 4, 2, 'rgba(255,255,255,.7)');
      text(c, v, x + w / 2, yy + 5, { align: 'c', s: 2, color: C.ink, shadow: null });
    });
    if (!dd.stopped && !dd.cpu) text(c, 'A DRÜCKEN!', p.x, y0 - 12, { align: 'c', color: C.yel });
  }
  if (G.ui.steps && G.ui.steps.n >= 0) {
    const p = G.players[G.ui.steps.pi];
    circle(c, p.x + 14, p.y - 34, 9, C.ink); circle(c, p.x + 14, p.y - 34, 8, C.wht);
    text(c, G.ui.steps.n, p.x + 14, p.y - 37, { align: 'c', color: C.ink, shadow: null, s: 1 });
  }
  c.restore();
  // Sternhändler außerhalb des Bildes?
  const sx = sp.x - ox, sy = sp.y - oy;
  if (sx < 6 || sx > W - 6 || sy < 6 || sy > H - 46) {
    const ax = Math.max(10, Math.min(W - 10, sx)), ay = Math.max(30, Math.min(H - 54, sy));
    circle(c, ax, ay, 9, C.ink); circle(c, ax, ay, 8, '#5d275d'); icon(c, 'star', ax - 4.5, ay - 4, 1);
  }
  drawHud(c, G, time);
  drawOverlays(c, G, time);
}

export function drawHud(c, G, time) {
  // oben Mitte: Runde
  panel(c, W / 2 - 56, 3, 112, 14, { bg: C.ink, border: C.lgy, shine: false });
  text(c, 'RUNDE ' + Math.min(G.turn, G.nTurns) + ' VON ' + G.nTurns, W / 2, 7, { align: 'c' });
  if (G.final) text(c, 'FINALE', W / 2, 19, { align: 'c', color: C.ora });
  // unten: Spielerleisten
  G.players.forEach((p, i) => {
    const x = 4 + i * 119, y = 234, w = 117, h = 33;
    const cur = G.cur === p.i;
    panel(c, x, y, w, h, { bg: cur ? '#2a2f5a' : '#1a1c2c', border: cur ? C.yel : PCOL[i], shine: false });
    rect(c, x + 3, y + 3, 3, h - 6, PCOL[i]);
    drawFace(c, p.char, x + 9, y + 3, 1);
    text(c, p.name.slice(0, 9), x + 26, y + 4, { color: cur ? C.yel : C.wht });
    icon(c, 'star', x + 26, y + 15, 1); text(c, p.stars, x + 38, y + 16, {});
    icon(c, 'coin', x + 58, y + 15, 1); text(c, p.coins, x + 68, y + 16, {});
    text(c, p.rank + '.', x + w - 7, y + 4, { align: 'r', color: C.lgy, shadow: null });
    for (let k = 0; k < 3; k++) {
      const ix = x + 26 + k * 11, iy = y + 24;
      if (p.items[k]) itemChip(c, p.items[k], ix, iy - 1, 1);
      else { rect(c, ix, iy - 1, 9, 8, '#333c57'); }
    }
    if (p.slow) text(c, 'S', x + w - 8, y + 24, { color: C.grn });
    if (p.kind === 'cpu') text(c, 'CPU', x + w - 7, y + 24, { align: 'r', color: C.gry, shadow: null });
  });
}

function drawOverlays(c, G, time) {
  const ui = G.ui;
  if (ui.msg) {
    const lines = wrap(ui.msg, 58);
    const h = 8 + lines.length * 10;
    panel(c, 40, 226 - h, 400, h, { bg: '#1a1c2c', border: C.lgy });
    lines.forEach((l, k) => text(c, l, W / 2, 226 - h + 5 + k * 10, { align: 'c' }));
  }
  if (ui.menu) drawMenu(c, G, ui.menu, time);
  if (ui.number) {
    const n = ui.number, p = G.players[n.pi];
    panel(c, 150, 70, 180, 66, { bg: '#1a1c2c', border: PCOL[n.pi] });
    text(c, n.title, W / 2, 78, { align: 'c', color: C.yel });
    text(c, '◄ ' + n.val + ' ►', W / 2, 98, { align: 'c', s: 3 });
    text(c, 'LINKS/RECHTS, A = OK', W / 2, 124, { align: 'c', color: C.lgy });
  }
  if (ui.timing) {
    const t = ui.timing;
    panel(c, 110, 78, 260, 70, { bg: '#1a1c2c', border: C.yel });
    text(c, 'DRÜCKE A IN DER MITTE!', W / 2, 86, { align: 'c', color: C.yel });
    rect(c, 130, 108, 220, 14, C.ink);
    rect(c, 130 + 220 * 0.35, 108, 220 * 0.3, 14, '#2f9f58'); rect(c, 130 + 220 * 0.43, 108, 220 * 0.14, 14, C.lim);
    const mx = 130 + 220 * t.pos;
    rect(c, mx - 2, 104, 4, 22, t.stopped ? C.yel : C.wht);
    if (t.stopped) text(c, t.q > 0.7 ? 'PERFEKT!' : t.q > 0.4 ? 'GUT!' : 'KNAPP DANEBEN', W / 2, 130, { align: 'c', color: t.q > 0.7 ? C.lim : C.ora });
  }
  if (ui.wheel) drawWheel(c, ui.wheel, time);
  if (ui.colors) drawColors(c, G, ui.colors);
  if (ui.bonus) drawBonus(c, G, ui.bonus, time);
  if (ui.banner) {
    const b = ui.banner;
    const k = Math.min(1, b.t / 0.2, (b.dur - b.t) / 0.2);
    const h = Math.max(2, Math.round(70 * Math.max(0, k)));
    rect(c, 0, 100 - h / 2 + 20, W, h, 'rgba(26,28,44,.92)');
    rect(c, 0, 100 - h / 2 + 20, W, 2, C.yel); rect(c, 0, 100 + h / 2 + 18, W, 2, C.yel);
    if (k > 0.8) {
      text(c, b.title, W / 2, 106, { align: 'c', s: textWidth(b.title, 3) > 440 ? 2 : 3, color: C.yel });
      if (b.sub) text(c, b.sub, W / 2, 136, { align: 'c', color: C.wht });
    }
  }
  if (ui.mgres) drawMgResult(c, G, ui.mgres);
}

export function menuGeom(m) {
  const rows = m.options.length, rh = 13, w = 196, h = 20 + rows * rh + 8;
  return { rows, rh, w, h, x: W - w - 6, y: Math.max(22, 118 - Math.floor(h / 2)) };
}
function drawMenu(c, G, m, time) {
  const { rows, rh, w, h, x, y } = menuGeom(m);
  panel(c, x, y, w, h + (m.options[m.sel] && m.options[m.sel].desc ? 30 : 0), { bg: '#1a1c2c', border: PCOL[m.pi] });
  drawFace(c, G.players[m.pi].char, x + 5, y + 4, 1);
  text(c, m.title, x + 24, y + 7, { color: C.yel });
  m.options.forEach((o, k) => {
    const yy = y + 20 + k * rh, sel = k === m.sel;
    if (sel) rect(c, x + 4, yy - 2, w - 8, rh - 1, '#3b5dc9');
    const col = o.disabled ? C.gry : sel ? C.wht : C.lgy;
    if (o.char !== undefined) drawFace(c, o.char, x + 7, yy - 3, 1);
    text(c, o.label, x + (o.char !== undefined ? 24 : 9), yy + 1, { color: col, shadow: o.disabled ? null : C.ink });
    if (sel) text(c, '►', x + 3, yy + 1, { color: C.yel, shadow: null });
  });
  const so = m.options[m.sel];
  if (so && so.desc) wrap(so.desc, 31).slice(0, 3).forEach((l, k) => text(c, l, x + 8, y + 24 + rows * rh + k * 9, { color: C.lgy, shadow: null }));
}

function drawWheel(c, w, time) {
  panel(c, 120, 18, 240, 200, { bg: '#1a1c2c', border: C.yel });
  text(c, w.title, W / 2, 26, { align: 'c', color: C.yel });
  const cx = W / 2, cy = 118, r = 62;
  const tot = w.entries.reduce((s, e) => s + e.w, 0);
  const cols = ['#b13e53', '#3b5dc9', '#38b764', '#ef7d57', '#5d275d', '#257179', '#ffcd75'];
  let a0 = w.ang;
  w.entries.forEach((e, i) => {
    const a1 = a0 + (e.w / tot) * Math.PI * 2;
    c.fillStyle = cols[i % cols.length]; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, a0, a1); c.closePath(); c.fill();
    c.strokeStyle = C.ink; c.lineWidth = 1; c.stroke();
    a0 = a1;
  });
  circle(c, cx, cy, 6, C.ink);
  c.fillStyle = C.wht; c.beginPath(); c.moveTo(cx - 6, cy - r - 10); c.lineTo(cx + 6, cy - r - 10); c.lineTo(cx, cy - r + 2); c.fill();
  // aktuelles Segment
  const ang = ((-Math.PI / 2 - w.ang) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  let acc = 0, cur = 0;
  for (let i = 0; i < w.entries.length; i++) { acc += (w.entries[i].w / tot) * Math.PI * 2; if (ang < acc) { cur = i; break; } }
  const lab = w.entries[w.done ? w.idx : cur].label;
  text(c, lab, W / 2, 190, { align: 'c', color: w.done ? C.lim : C.wht, s: 1 });
  if (w.done) text(c, 'TREFFER!', W / 2, 202, { align: 'c', color: C.yel });
}

function drawColors(c, G, col) {
  panel(c, 70, 50, 340, 130, { bg: '#1a1c2c', border: C.yel });
  text(c, 'DIE FELDFARBEN ENTSCHEIDEN!', W / 2, 58, { align: 'c', color: C.yel });
  G.players.forEach((p, i) => {
    const x = 82 + i * 82, y = 80;
    const blue = p.color === 'blue';
    panel(c, x, y, 74, 84, { bg: blue ? '#29366f' : '#6b2236', border: blue ? C.sky : C.red, shine: false });
    drawChar(c, p.char, x + 37, y + 46, { s: 2 });
    text(c, p.name.slice(0, 9), x + 37, y + 56, { align: 'c' });
    text(c, blue ? 'BLAU' : 'ROT', x + 37, y + 68, { align: 'c', color: blue ? C.cyan : C.ora });
  });
}

function drawBonus(c, G, b, time) {
  panel(c, 60, 30, 360, 190, { bg: '#1a1c2c', border: C.yel });
  text(c, 'BONUS-STERN', W / 2, 38, { align: 'c', color: C.yel });
  text(c, b.cat, W / 2, 54, { align: 'c', s: 2 });
  text(c, b.desc, W / 2, 76, { align: 'c', color: C.lgy });
  G.players.forEach((p, i) => {
    const x = 78 + i * 86, y = 100, win = b.winners.includes(i);
    panel(c, x, y, 78, 100, { bg: win ? '#3a3a1a' : '#262a40', border: win ? C.yel : PCOL[i], shine: false });
    drawChar(c, p.char, x + 39, y + 55 - (win ? Math.abs(Math.sin(time * 6)) * 6 : 0), { s: 2 });
    text(c, b.vals[i], x + 39, y + 66, { align: 'c' });
    if (win) icon(c, 'star', x + 30, y + 78, 2);
  });
}

function drawMgResult(c, G, r) {
  panel(c, 60, 24, 360, 200, { bg: '#1a1c2c', border: C.yel });
  text(c, r.title, W / 2, 32, { align: 'c', color: C.yel, s: 2 });
  r.rows.forEach((row, k) => {
    const y = 58 + k * 40;
    panel(c, 80, y, 320, 34, { bg: row.win ? '#3a3a1a' : '#262a40', border: PCOL[row.slot], shine: false });
    text(c, row.place, 90, y + 11, { s: 2, color: row.win ? C.yel : C.lgy });
    drawChar(c, G.players[row.slot].char, 140, y + 30, { s: 1 });
    text(c, G.players[row.slot].name, 158, y + 8, {});
    text(c, row.note || '', 158, y + 20, { color: C.lgy, shadow: null });
    if (row.coins) { icon(c, 'coin', 350, y + 11, 1); text(c, '+' + row.coins, 360, y + 12, { color: C.yel }); }
  });
}
