// Computergegner auf dem Spielbrett (3 Stufen: 0 leicht, 1 mittel, 2 schwer)
import { BOARDS, pathDist } from './boards.js';
import { pick } from './util.js';

const STAR_COST = 20;
const brd = (G) => BOARDS[G.boardId];
const tileScore = (t) => ({ b: 4, l: 8, i: 6, v: 2, e: 1, r: -3, B: -6, n: 0 }[t] ?? 0);

export function chooseFork(G, p, node, options) {
  const ok = options.filter((o) => !o.disabled);
  if (!ok.length) return options[0].value;
  if (p.level === 0 && Math.random() < 0.5) return pick(ok).value;
  if (p.level === 1 && Math.random() < 0.2) return pick(ok).value;
  const b = brd(G);
  let best = ok[0], bd = 1e9;
  for (const o of ok) {
    let d = pathDist(b, o.value, G.starSpot);
    if (p.coins < STAR_COST && p.level === 2) d += 0; // schwer: trotzdem Richtung Stern
    if (d < bd) { bd = d; best = o; }
  }
  return best.value;
}

/** wohin kommt man nach n Schritten (Gabeln: Richtung Stern) */
function simulate(G, p, n) {
  const b = brd(G);
  let id = p.node;
  for (let k = 0; k < n; k++) {
    const nx = b.nodes[id].next;
    if (nx.length === 1) id = nx[0];
    else {
      let best = nx[0], bd = 1e9;
      nx.forEach((c, i) => { if (i === 1 && b.nodes[id].toll && p.coins < b.nodes[id].toll) return; const d = pathDist(b, c, G.starSpot); if (d < bd) { bd = d; best = c; } });
      id = best;
    }
  }
  return id;
}
function landScore(G, p, id) {
  const b = brd(G);
  if (id === G.starSpot && p.coins >= (p.halfStar ? 10 : STAR_COST)) return 100;
  return tileScore(b.nodes[id].t) + (b.nodes[id].shop ? 1 : 0);
}
export function wishNumber(G, p) {
  let best = 1, bs = -1e9;
  for (let n = 1; n <= 10; n++) {
    const s = landScore(G, p, simulate(G, p, n)) + (p.level === 2 ? 0 : Math.random() * 3);
    if (s > bs) { bs = s; best = n; }
  }
  return best;
}
export function chooseItem(G, p, usable) {
  const b = brd(G);
  const opps = G.players.filter((o) => o.i !== p.i);
  const myD = pathDist(b, p.node, G.starSpot);
  let bestIdx = -1, bs = 0;
  p.items.forEach((id, idx) => {
    if (!usable(id)) return;
    let s = 0;
    switch (id) {
      case 'wunsch': s = landScore(G, p, simulate(G, p, wishNumber(G, p))) >= 100 ? 9 : 3; break;
      case 'dreifach': s = p.coins >= STAR_COST && myD > 10 ? 7 : 3; break;
      case 'doppel': s = p.coins >= STAR_COST && myD > 6 && myD <= 20 ? 7 : 4; break;
      case 'portal': s = p.coins >= STAR_COST ? 9 : -1; break;
      case 'schnecke': s = opps.some((o) => pathDist(b, o.node, G.starSpot) < 8 && o.coins >= STAR_COST) ? 7 : 2; break;
      case 'dieb': s = opps.some((o) => o.items.length) && p.items.length < 3 ? 4 : 0; break;
      case 'glocke': s = (opps.some((o) => o.coins >= 12) ? 5 : 1) + (p.coins >= 50 && opps.some((o) => o.stars > 0) ? 4 : 0); break;
      case 'tausch': s = p.coins >= STAR_COST && opps.some((o) => pathDist(b, o.node, G.starSpot) < myD - 4) ? 6 : 1; break;
      default: s = 1;
    }
    if (s > bs) { bs = s; bestIdx = idx; }
  });
  const thr = p.level === 0 ? 4 : 3;
  if (bs < thr) return -1;
  if (p.level === 0 && Math.random() < 0.4) return -1;
  return bestIdx;
}
export function slowTarget(G, p) {
  const opps = G.players.filter((o) => o.i !== p.i).sort((a, b) => b.stars - a.stars || b.coins - a.coins);
  return opps[0].i;
}
export function stealTarget(G, p, cands) { return cands.slice().sort((a, b) => b.items.length - a.items.length)[0].i; }
export function coinVictim(G, p, cands) { return cands.slice().sort((a, b) => b.coins - a.coins)[0].i; }
export function starVictim(G, p, cands) { return cands.slice().sort((a, b) => b.stars - a.stars)[0].i; }
export function ghostChoice(G, p, canStar) {
  if (canStar && (p.level > 0 || Math.random() < 0.5)) return 'star';
  return Math.random() < 0.92 ? 'coins' : 'no';
}
export function shopChoice(G, p, stock) {
  const price = { doppel: 5, dreifach: 10, wunsch: 8, schnecke: 5, dieb: 7, glocke: 6, portal: 15, tausch: 10 };
  const prio = ['portal', 'wunsch', 'doppel', 'dreifach', 'tausch', 'schnecke', 'dieb', 'glocke'];
  const buyable = prio.filter((id) => stock.includes(id) && price[id] <= p.coins && (p.coins - price[id] >= STAR_COST || p.coins >= 40));
  if (!buyable.length) return null;
  if (p.level === 0 && Math.random() < 0.5) return null;
  return buyable[0];
}
