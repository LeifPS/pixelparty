import { C, W, H, text, rect, panel, drawChar, PCOL, NOINP, makePlayers, ranking, moveBound, sgn, drawTimer, bgFill, tag } from './common.js';
import { rnd, clamp } from '../util.js';

// ---------------- Kanonier (1 gegen 3) ----------------
export const cannonG = {
  init(parts) {
    let k = 0;
    const pl = makePlayers(parts, (q) => (q.team === 0 ? { x: 240, y: 64, cd: 0, shots: 0, solo: true, dir: 0 } : { x: 120 + 120 * k++, y: 220, alive: true, out: 0, dir: 0, moving: false, solo: false }));
    return { t: 0, dur: 26, pl, shots: [], over: 0 };
  },
  update(s, inp, dt) {
    s.t += dt;
    for (const p of s.pl) {
      const i = inp(p.slot);
      if (p.solo) {
        p.x = clamp(p.x + i.x * 135 * p.m * dt, 24, W - 24); p.cd -= dt; p.dir = i.x < 0 ? 1 : 0;
        if ((i.aP || (i.a && p.cd <= 0)) && p.cd <= 0) { s.shots.push({ x: p.x, y: p.y + 8, vy: 225 }); p.cd = 0.33; p.shots++; }
      } else if (p.alive) moveBound(p, i, 80 * p.m, dt, 16, W - 16, 112, 254);
    }
    for (const sh of s.shots) {
      sh.y += sh.vy * dt;
      for (const p of s.pl) if (!p.solo && p.alive && Math.abs(sh.x - p.x) < 14 && Math.abs(sh.y - (p.y - 7)) < 12) { p.alive = false; p.out = s.t; sh.dead = true; }
      if (sh.y > 262) sh.dead = true;
    }
    s.shots = s.shots.filter((x) => !x.dead);
    if (s.pl.every((p) => p.solo || !p.alive)) s.over += dt;
  },
  done: (s) => s.over > 0.7 || s.t >= s.dur,
  result(s) {
    const win = s.pl.every((p) => p.solo || !p.alive) ? 0 : 1;
    return { ...ranking(s.pl, (p) => (p.solo ? (win === 0 ? 10 : 0) : win === 1 ? 10 + (p.alive ? 1 : 0) : 0)), winTeam: win };
  },
  ai(s, slot, level) {
    const p = s.pl.find((q) => q.slot === slot), out = NOINP();
    if (p.solo) {
      const alive = s.pl.filter((q) => !q.solo && q.alive);
      if (!alive.length) return out;
      s.aiTgt = s.aiTgt || {};
      let t = alive.reduce((a, b) => (Math.abs(a.x - p.x) < Math.abs(b.x - p.x) ? a : b));
      const lead = [0, 0.25, 0.4][level];
      const tx = t.x + (t.moving ? (t.dir === 1 ? -1 : 1) * 80 * lead : 0);
      out.x = Math.abs(tx - p.x) < 6 ? 0 : sgn(tx - p.x, 6);
      if (Math.abs(tx - p.x) < [14, 9, 6][level] && p.cd <= 0) out.aP = true;
      return out;
    }
    if (!p.alive) return out;
    let ax = 0;
    for (const sh of s.shots) if (sh.y < p.y && p.y - sh.y < [60, 95, 130][level] && Math.abs(sh.x - p.x) < 20) ax += sh.x >= p.x ? -1 : 1;
    if (ax) { out.x = ax > 0 ? 1 : -1; if (p.x < 40) out.x = 1; if (p.x > W - 40) out.x = -1; }
    else if (Math.random() < 0.02) out.x = Math.random() < 0.5 ? 1 : -1;
    else { s.aiDrift = s.aiDrift || {}; out.x = s.aiDrift[slot] || 0; if (Math.random() < 0.03) s.aiDrift[slot] = Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? 1 : -1); }
    return out;
  },
  render(c, s) {
    bgFill(c, '#3b5dc9', '#3556b8', 16, 0, 0, W, H);
    rect(c, 0, 90, W, 4, C.navy); rect(c, 0, 94, W, H, '#c2a35a');
    bgFill(c, '#ffcd75', '#f2c26a', 16, 0, 96, W, H - 96);
    text(c, 'KANONIER', W / 2, 8, { align: 'c', s: 2 });
    drawTimer(c, s.dur - s.t);
    for (const p of s.pl) {
      if (p.solo) {
        drawChar(c, p.char, p.x, p.y + 4, { flip: p.dir === 1 });
        rect(c, p.x - 9, p.y + 2, 18, 12, '#333c57'); rect(c, p.x - 4, p.y + 10, 8, 8, C.ink); rect(c, p.x - 3, p.y + 16, 6, 4, C.ora);
        rect(c, p.x - 9, p.y + 12, 18, 2, PCOL[p.slot]);
      } else if (p.alive) { drawChar(c, p.char, p.x, p.y, { flip: p.dir === 1, frame: p.moving ? Math.floor(s.t * 8) : 0 }); tag(c, p, p.x, p.y + 2); }
      else drawChar(c, p.char, p.x, p.y + 4, { alpha: 0.4, flip: true });
    }
    for (const sh of s.shots) { c.fillStyle = C.ink; c.beginPath(); c.arc(Math.round(sh.x), Math.round(sh.y), 5, 0, 7); c.fill(); rect(c, sh.x - 1, sh.y - 3, 2, 2, C.gry); }
  },
};

// ---------------- Monsterjagd (1 gegen 3) ----------------
const CX0 = 24, CX1 = 456, CY0 = 92, CY1 = 252;
export const chaseG = {
  init(parts) {
    let k = 0;
    const pl = makePlayers(parts, (q) => (q.team === 0 ? { x: 240, y: 172, solo: true, dash: 0, dcd: 0, dir: 0, moving: false }
      : (() => { const sp = [[50, 108], [430, 108], [240, 248]][k++ % 3]; return { x: sp[0], y: sp[1], solo: false, caught: false, at: 0, dir: 0, moving: false }; })()));
    return { t: 0, dur: 24, pl, over: 0 };
  },
  update(s, inp, dt) {
    s.t += dt;
    const mon = s.pl.find((p) => p.solo);
    for (const p of s.pl) {
      const i = inp(p.slot);
      if (p.solo) {
        if (s.t < 1.2) continue;
        p.dcd = Math.max(0, p.dcd - dt); p.dash = Math.max(0, p.dash - dt);
        if (i.aP && p.dcd <= 0) { p.dash = 0.28; p.dcd = 3.8; }
        moveBound(p, i, (p.dash > 0 ? 110 : 45) * p.m, dt, CX0, CX1, CY0, CY1);
      } else if (!p.caught) {
        moveBound(p, i, 66 * p.m, dt, CX0, CX1, CY0, CY1);
        if (Math.hypot(p.x - mon.x, p.y - mon.y) < 11) { p.caught = true; p.at = s.t; }
      }
    }
    if (s.pl.every((p) => p.solo || p.caught)) s.over += dt;
  },
  done: (s) => s.over > 0.7 || s.t >= s.dur,
  result(s) {
    const win = s.pl.every((p) => p.solo || p.caught) ? 0 : 1;
    return { ...ranking(s.pl, (p) => (p.solo ? (win === 0 ? 10 : 0) : win === 1 ? 10 + (p.caught ? 0 : 1) : 0)), winTeam: win };
  },
  ai(s, slot, level, dt = 1 / 60) {
    const p = s.pl.find((q) => q.slot === slot), out = NOINP();
    const mon = s.pl.find((q) => q.solo);
    if (p.solo) {
      const free = s.pl.filter((q) => !q.solo && !q.caught);
      if (!free.length) return out;
      const t = free.reduce((a, b) => (Math.hypot(a.x - p.x, a.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? a : b));
      out.x = sgn(t.x - p.x, 3) * [0.8, 1, 1][level]; out.y = sgn(t.y - p.y, 3) * [0.8, 1, 1][level];
      if (Math.hypot(t.x - p.x, t.y - p.y) < [40, 55, 70][level] && p.dcd <= 0) out.aP = true;
      return out;
    }
    if (p.caught) return out;
    const d0 = Math.hypot(p.x - mon.x, p.y - mon.y);
    const near = [90, 165, 190][level];
    if (d0 > near) { if (Math.random() < 0.02) out.x = Math.random() < 0.5 ? 1 : -1; return out; }
    p.aiT = (p.aiT || 0) - dt;
    if (p.aiT > 0 && p.aiDir) { out.x = p.aiDir[0]; out.y = p.aiDir[1]; return out; }
    p.aiT = [0.5, 0.32, 0.18][level] * (0.6 + Math.random() * 0.8);
    let best = [0, 0], bs = -1e9;
    for (let a = 0; a < 8; a++) {
      const ang = (a * Math.PI) / 4, dx = Math.cos(ang), dy = Math.sin(ang);
      const nx = clamp(p.x + dx * 66 * 0.6, CX0, CX1), ny = clamp(p.y + dy * 66 * 0.6, CY0, CY1);
      let sc = Math.hypot(nx - mon.x, ny - mon.y);
      sc -= Math.max(0, 40 - Math.min(nx - CX0, CX1 - nx, ny - CY0, CY1 - ny)) * [0.4, 1.1, 1.4][level];
      sc -= Math.hypot(nx - (CX0 + CX1) / 2, ny - (CY0 + CY1) / 2) * [0, 0.25, 0.4][level];
      if (sc > bs) { bs = sc; best = [Math.round(dx), Math.round(dy)]; }
    }
    p.aiDir = best; out.x = best[0]; out.y = best[1];
    return out;
  },
  render(c, s) {
    bgFill(c, '#5d275d', '#552156', 16, 0, 44, W, H - 44);
    rect(c, CX0 - 6, CY0 - 14, CX1 - CX0 + 12, 4, C.gry); rect(c, CX0 - 6, CY1 + 4, CX1 - CX0 + 12, 4, C.gry);
    text(c, 'MONSTERJAGD', W / 2, 8, { align: 'c', s: 2 });
    drawTimer(c, s.dur - s.t);
    const list = s.pl.slice().sort((a, b) => a.y - b.y);
    for (const p of list) {
      if (p.solo) {
        drawChar(c, p.char, p.x, p.y, { s: 2, flip: p.dir === 1, frame: p.moving ? Math.floor(s.t * 10) : 0 });
        if (p.dash > 0) text(c, '!!', p.x, p.y - 44, { align: 'c', color: C.yel });
        rect(c, p.x - 12, p.y + 2, 24, 3, PCOL[p.slot]);
      } else if (!p.caught) { drawChar(c, p.char, p.x, p.y, { flip: p.dir === 1, frame: p.moving ? Math.floor(s.t * 8) : 0 }); tag(c, p, p.x, p.y + 2); }
      else drawChar(c, p.char, p.x, p.y + 3, { alpha: 0.35, flip: true });
    }
    const mon = s.pl.find((p) => p.solo);
    text(c, mon && mon.dcd <= 0 ? 'A = SPRINT BEREIT' : 'SPRINT LÄDT…', 12, 258, { color: mon && mon.dcd <= 0 ? C.lim : C.lgy });
  },
};
