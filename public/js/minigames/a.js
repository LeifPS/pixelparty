import { C, W, H, text, rect, panel, drawChar, PCOL, icon, NOINP, makePlayers, ranking, moveBound, sgn, drawScoreBar, drawTimer, bgFill, tag } from './common.js';
import { rnd, clamp } from '../util.js';

// ---------------- Münzregen (auch Team-Münzjagd) ----------------
function coinrain(teamMode) {
  return {
    init(parts) {
      const team = teamMode;
      const pl = makePlayers(parts, (q, i) => ({ x: 70 + i * 110, y: 230, score: 0, stun: 0, dir: 0, moving: false }));
      return { t: 0, dur: 30, team, pl, items: [], spawn: 0 };
    },
    update(s, inp, dt) {
      s.t += dt; s.spawn += dt;
      while (s.spawn > 0.26) {
        s.spawn -= 0.26;
        const r = Math.random();
        s.items.push({ x: rnd(28, 452), y: 52, vy: rnd(55, 100), k: r < 0.2 ? 'bomb' : r < 0.3 ? 'big' : 'coin' });
      }
      for (const p of s.pl) {
        if (p.stun > 0) { p.stun -= dt; p.moving = false; continue; }
        moveBound(p, inp(p.slot), 82 * p.m, dt, 24, 456, 92, 252);
      }
      for (const it of s.items) {
        it.y += it.vy * dt;
        let hit = null, hd = 1e9;
        for (const p of s.pl) {
          if (Math.abs(it.x - p.x) < 11 && Math.abs(it.y - (p.y - 8)) < 12) {
            const d = Math.hypot(it.x - p.x, it.y - (p.y - 8));
            if (d < hd) { hd = d; hit = p; }
          }
        }
        if (hit) {
          it.dead = true;
          if (it.k === 'bomb') { if (hit.stun <= 0) { hit.stun = 1.1; hit.score = Math.max(0, hit.score - 2); } }
          else hit.score += it.k === 'big' ? 3 : 1;
        }
        if (it.y > 262) it.dead = true;
      }
      s.items = s.items.filter((i) => !i.dead);
    },
    done: (s) => s.t >= s.dur,
    result(s) {
      if (s.team) {
        const sc = [0, 0, 0];
        for (const p of s.pl) sc[p.team] += p.score;
        const r = ranking(s.pl, (p) => sc[p.team] * 100 + p.score);
        return { ...r, winTeam: sc[0] === sc[1] ? (Math.random() < 0.5 ? 0 : 1) : sc[0] > sc[1] ? 0 : 1 };
      }
      return ranking(s.pl, (p) => p.score);
    },
    ai(s, slot, level) {
      const p = s.pl.find((q) => q.slot === slot), out = NOINP();
      let best = null, bs = -1e9;
      const reach = 82 * p.m;
      for (const it of s.items) {
        if (it.k === 'bomb') continue;
        const t = Math.max(0.02, (p.y - 8 - it.y) / it.vy);
        const dx = Math.abs(it.x - p.x);
        if (dx > reach * t + 10) continue;
        const sc = (it.k === 'big' ? 3 : 1) / (t + 0.3) - dx * 0.004;
        if (sc > bs) { bs = sc; best = it; }
      }
      if (best) {
        out.x = sgn(best.x - p.x, 3);
        if (level === 0 && Math.random() < 0.05) out.x = 0;
      } else if (level === 2) {
        const bombs = s.items.filter((it) => it.k === 'bomb' && it.y < p.y);
        if (!bombs.length) out.x = sgn(240 - p.x, 30);
      }
      if (level >= 1) {
        for (const it of s.items) if (it.k === 'bomb' && Math.abs(it.x - p.x) < 15 && it.y < p.y - 8 && it.y > p.y - 60) { out.x = it.x >= p.x ? -1 : 1; }
      }
      return out;
    },
    render(c, s) {
      rect(c, 0, 0, W, H, '#1a1c2c');
      bgFill(c, '#38b764', '#2f9f58', 16, 0, 44, W, H - 44);
      rect(c, 0, 44, W, 3, C.pur);
      const pls = s.pl;
      if (s.team) {
        const sc = [0, 0];
        for (const p of pls) sc[p.team] += p.score;
        panel(c, 8, 4, 100, 20, { bg: C.ink, border: C.sky, shine: false }); text(c, 'TEAM 1: ' + sc[0], 58, 10, { align: 'c' });
        panel(c, W - 108, 4, 100, 20, { bg: C.ink, border: C.red, shine: false }); text(c, 'TEAM 2: ' + sc[1], W - 58, 10, { align: 'c' });
      } else drawScoreBar(c, pls, (p) => p.score);
      drawTimer(c, s.dur - s.t);
      for (const it of s.items) {
        if (it.k === 'bomb') {
          rect(c, it.x - 5, it.y - 5, 10, 10, C.ink); rect(c, it.x - 4, it.y - 6, 8, 12, C.ink); rect(c, it.x + 2, it.y - 8, 2, 3, C.ora);
          rect(c, it.x - 3, it.y - 3, 2, 2, C.gry);
        } else icon(c, 'coin', it.x - 3.5, it.y - 3.5, it.k === 'big' ? 2 : 1);
      }
      for (const p of s.pl) {
        if (p.stun > 0 && Math.floor(p.stun * 10) % 2) continue;
        drawChar(c, p.char, p.x, p.y, { flip: p.dir === 1, frame: p.moving ? Math.floor(s.t * 8) : 0 });
        tag(c, p, p.x, p.y + 2);
      }
    },
  };
}
export const coinrainG = coinrain(false);
export const teamcoinsG = coinrain(true);

// ---------------- Hürdenlauf ----------------
const HURDLES = [140, 240, 330, 430, 520, 620, 700, 790, 870];
const LEN = 960;
export const hurdlesG = {
  init(parts) {
    return { t: 0, pl: makePlayers(parts, () => ({ pos: 0, jt: 0, stumble: 0, fin: false, time: 0 })) };
  },
  update(s, inp, dt) {
    s.t += dt;
    for (const p of s.pl) {
      if (p.fin) continue;
      const i = inp(p.slot);
      if (i.aP && p.jt <= 0 && p.stumble <= 0) { p.jt = 0.0001; }
      if (p.jt > 0) { p.jt += dt; if (p.jt >= 0.6) p.jt = 0; }
      if (p.stumble > 0) p.stumble -= dt;
      const sp = (p.stumble > 0 ? 22 : 88) * p.m;
      const prev = p.pos;
      p.pos += sp * dt;
      const air = p.jt > 0.05 && p.jt < 0.55;
      for (const h of HURDLES) if (prev < h && p.pos >= h && !air) { p.stumble = 0.7; }
      if (p.pos >= LEN) { p.fin = true; p.time = s.t; p.pos = LEN; }
    }
  },
  done: (s) => s.pl.every((p) => p.fin) || s.t > 30,
  result: (s) => ranking(s.pl, (p) => (p.fin ? 10000 - p.time : p.pos)),
  ai(s, slot, level) {
    const p = s.pl.find((q) => q.slot === slot), out = NOINP();
    const nxt = HURDLES.find((h) => h > p.pos);
    if (nxt !== undefined && p.jt <= 0 && p.stumble <= 0) {
      const d = nxt - p.pos;
      const noise = level === 0 ? 14 : level === 1 ? 6 : 2;
      s.aiN = s.aiN || {};
      if (s.aiN[slot + '_' + nxt] === undefined) s.aiN[slot + '_' + nxt] = (Math.random() * 2 - 1) * noise;
      if (d < 24 + s.aiN[slot + '_' + nxt]) out.aP = true;
    }
    return out;
  },
  render(c, s) {
    rect(c, 0, 0, W, H, '#257179');
    const n = s.pl.length, ly = 52, lh = Math.floor(190 / n);
    s.pl.forEach((p, i) => {
      const y = ly + i * lh;
      rect(c, 0, y, W, lh - 2, i % 2 ? '#ef7d57' : '#e9915f');
      rect(c, 0, y + lh - 3, W, 1, '#ffffff55');
      rect(c, 436, y, 6, lh - 2, C.wht); rect(c, 436, y, 6, 6, C.ink); // Ziel
      for (const h of HURDLES) { const hx = 30 + h * 0.42; rect(c, hx, y + lh - 16, 3, 12, C.wht); rect(c, hx - 2, y + lh - 17, 7, 3, C.red); }
      const jy = p.jt > 0 ? Math.sin((p.jt / 0.6) * Math.PI) * 18 : 0;
      const px = 30 + p.pos * 0.42;
      drawChar(c, p.char, px, y + lh - 6 - jy, { frame: Math.floor(s.t * 10), shadow: false });
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(Math.round(px - 5), y + lh - 7, 10, 2);
      rect(c, 4, y + 2, 4, 4, PCOL[p.slot]);
      if (p.stumble > 0) text(c, 'AUA!', px, y + 4, { align: 'c', color: C.yel });
    });
    text(c, 'HÜRDENLAUF', W / 2, 8, { align: 'c', s: 2 });
  },
};

// ---------------- Knopf-Hämmern ----------------
export const mashG = {
  init(parts) { return { t: 0, dur: 10, pl: makePlayers(parts, () => ({ n: 0, bump: 0 })) }; },
  update(s, inp, dt) {
    s.t += dt;
    for (const p of s.pl) { if (inp(p.slot).aP) { p.n += p.m; p.bump = 0.12; } p.bump = Math.max(0, p.bump - dt); }
  },
  done: (s) => s.t >= s.dur,
  result: (s) => ranking(s.pl, (p) => Math.round(p.n * 10)),
  ai(s, slot, level) {
    const out = NOINP();
    const rate = [6.5, 8, 9.5][level];
    if (Math.random() < rate * (1 / 60) * (0.6 + Math.random() * 0.8)) out.aP = true;
    return out;
  },
  render(c, s) {
    rect(c, 0, 0, W, H, '#5d275d');
    drawTimer(c, s.dur - s.t);
    text(c, 'DRÜCKE A!', W / 2, 8, { align: 'c', s: 2, color: C.yel });
    const n = s.pl.length, cw = 90, gap = (W - n * cw) / (n + 1);
    s.pl.forEach((p, i) => {
      const x = gap + i * (cw + gap);
      const h = Math.min(150, p.n * 2.2);
      rect(c, x + 28, 218 - 150, 34, 150, '#1a1c2c');
      rect(c, x + 30, 218 - h, 30, h, PCOL[p.slot]);
      drawChar(c, p.char, x + 45, 250 - (p.bump > 0 ? 5 : 0), { s: 2 });
      text(c, Math.floor(p.n), x + 45, 224, { align: 'c', s: 1 });
    });
  },
};

// ---------------- Stoppuhr ----------------
export const stopwatchG = {
  init(parts) { return { t: 0, show: 1.5, target: 5, pl: makePlayers(parts, () => ({ stop: null })) }; },
  update(s, inp, dt) {
    s.t += dt;
    for (const p of s.pl) if (p.stop === null && inp(p.slot).aP) p.stop = s.t;
    if (s.t >= 9) for (const p of s.pl) if (p.stop === null) p.stop = 9;
  },
  done: (s) => s.pl.every((p) => p.stop !== null),
  result: (s) => ranking(s.pl, (p) => -Math.round(Math.abs(p.stop - s.target) * 1000)),
  ai(s, slot, level) {
    const p = s.pl.find((q) => q.slot === slot), out = NOINP();
    s.aiT = s.aiT || {};
    if (s.aiT[slot] === undefined) s.aiT[slot] = s.target + (Math.random() * 2 - 1) * [0.7, 0.3, 0.12][level];
    if (p.stop === null && s.t >= s.aiT[slot]) out.aP = true;
    return out;
  },
  render(c, s) {
    rect(c, 0, 0, W, H, '#29366f');
    text(c, 'STOPPE BEI 5,00 SEKUNDEN', W / 2, 20, { align: 'c', s: 2, color: C.yel });
    const done = s.pl.every((p) => p.stop !== null);
    const vis = s.t < s.show;
    text(c, vis ? s.t.toFixed(2) : '?.??', W / 2, 60, { align: 'c', s: 5, color: vis ? C.wht : C.lgy });
    const n = s.pl.length, cw = 100, gap = (W - n * cw) / (n + 1);
    s.pl.forEach((p, i) => {
      const x = gap + i * (cw + gap);
      panel(c, x, 130, cw, 90, { bg: '#1a1c2c', border: PCOL[p.slot] });
      drawChar(c, p.char, x + cw / 2, 175, { s: 2 });
      const t = p.stop === null ? 'LÄUFT' : done ? p.stop.toFixed(2) : 'STOPP!';
      text(c, t, x + cw / 2, 190, { align: 'c', color: p.stop === null ? C.lgy : C.lim });
      if (done) text(c, (p.stop - s.target >= 0 ? '+' : '') + (p.stop - s.target).toFixed(2), x + cw / 2, 204, { align: 'c', color: C.yel });
    });
  },
};

// ---------------- Blitzreaktion ----------------
export const reactionG = {
  init(parts) {
    return { t: 0, round: 1, rounds: 5, phase: 'wait', pt: rnd(1.2, 3.2), goT: 0, winner: -1,
      pl: makePlayers(parts, () => ({ score: 0, locked: false, flash: 0 })) };
  },
  update(s, inp, dt) {
    s.t += dt; s.pt -= dt;
    for (const p of s.pl) p.flash = Math.max(0, p.flash - dt);
    if (s.phase === 'wait') {
      for (const p of s.pl) if (!p.locked && inp(p.slot).aP) { p.locked = true; p.score -= 1; p.flash = 0.6; }
      if (s.pt <= 0) { s.phase = 'go'; s.goT = 0; s.pt = 1.6; }
    } else if (s.phase === 'go') {
      s.goT += dt;
      const hits = s.pl.filter((p) => !p.locked && inp(p.slot).aP);
      if (hits.length) { const w = hits[Math.floor(Math.random() * hits.length)]; w.score += 1; s.winner = w.slot; s.phase = 'pause'; s.pt = 1.2; }
      else if (s.pt <= 0) { s.phase = 'pause'; s.pt = 0.9; s.winner = -1; }
    } else if (s.phase === 'pause') {
      if (s.pt <= 0) {
        if (s.round >= s.rounds) { s.phase = 'end'; return; }
        s.round++; s.phase = 'wait'; s.pt = rnd(1.2, 3.4); s.winner = -1; s.aiR = null;
        for (const p of s.pl) p.locked = false;
      }
    }
  },
  done: (s) => s.phase === 'end',
  result: (s) => ranking(s.pl, (p) => p.score),
  ai(s, slot, level) {
    const out = NOINP();
    s.aiR = s.aiR || {};
    if (s.aiR[slot] === undefined) s.aiR[slot] = [0.45, 0.35, 0.27][level] + Math.random() * [0.5, 0.3, 0.18][level];
    if (s.phase === 'wait' && Math.random() < [0.004, 0.002, 0.0008][level]) out.aP = true;
    if (s.phase === 'go' && s.goT >= s.aiR[slot]) out.aP = true;
    return out;
  },
  render(c, s) {
    const go = s.phase === 'go';
    rect(c, 0, 0, W, H, go ? '#38b764' : s.phase === 'pause' ? '#29366f' : '#b13e53');
    text(c, 'RUNDE ' + s.round + ' VON ' + s.rounds, W / 2, 10, { align: 'c' });
    text(c, go ? 'GO!' : s.phase === 'pause' ? (s.winner >= 0 ? 'SCHNELL!' : 'ZU LANGSAM') : 'WARTEN…', W / 2, 60, { align: 'c', s: 6, color: C.wht });
    const n = s.pl.length, cw = 100, gap = (W - n * cw) / (n + 1);
    s.pl.forEach((p, i) => {
      const x = gap + i * (cw + gap);
      panel(c, x, 150, cw, 90, { bg: p.flash > 0 ? C.red : '#1a1c2c', border: PCOL[p.slot] });
      drawChar(c, p.char, x + cw / 2, 205, { s: 2 });
      text(c, p.score, x + cw / 2, 218, { align: 'c', s: 2 });
      if (s.winner === p.slot) text(c, '+1', x + cw / 2, 135, { align: 'c', s: 2, color: C.yel });
      if (p.locked && s.phase !== 'pause') text(c, 'ZU FRÜH!', x + cw / 2, 135, { align: 'c', color: C.yel });
    });
  },
};
