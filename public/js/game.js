// Spielregeln. Läuft als Ablauf mit "await" und fragt die Oberfläche (env) nach Eingaben.
import { BOARDS } from './boards.js';
import { ri, pick, shuffle, weighted } from './util.js';
import { MG_META } from './minigames/meta.js';
import * as AI from './ai.js';

export const STAR_COST = 20;
export const BAG_MAX = 3;
export const ITEMS = {
  doppel: { name: 'Doppelwürfel', price: 5, desc: 'Zwei Würfel. Bei einem Pasch gibt es 10 Münzen.' },
  dreifach: { name: 'Dreifachwürfel', price: 10, desc: 'Drei Würfel gleichzeitig.' },
  wunsch: { name: 'Wunschwürfel', price: 8, desc: 'Du bestimmst die Zahl von 1 bis 10.' },
  schnecke: { name: 'Schneckenwürfel', price: 5, desc: 'Ein Gegner würfelt nächste Runde nur 1 bis 3.' },
  dieb: { name: 'Taschendieb', price: 7, desc: 'Klaut einem Gegner ein Item.' },
  glocke: { name: 'Geisterglocke', price: 6, desc: 'Ruft den Klau-Geist zu dir.' },
  portal: { name: 'Sternportal', price: 15, desc: 'Bringt dich direkt vor den Sternhändler.' },
  tausch: { name: 'Tauschkiste', price: 10, desc: 'Tauscht den Platz mit einem Zufälligen.' },
};
export const ITEM_IDS = Object.keys(ITEMS);
export const board = (G) => BOARDS[G.boardId];

const BONUS_CATS = [
  { id: 'mg', name: 'Minispiel-Stern', desc: 'Die meisten Minispiele gewonnen', key: (p) => p.stats.mgWins },
  { id: 'coins', name: 'Reichtums-Stern', desc: 'Zeitweise die meisten Münzen besessen', key: (p) => p.stats.maxCoins },
  { id: 'event', name: 'Ereignis-Stern', desc: 'Am häufigsten auf Ereignis-Feldern gelandet', key: (p) => p.stats.events },
  { id: 'walk', name: 'Läufer-Stern', desc: 'Die weiteste Strecke gelaufen', key: (p) => p.stats.steps },
  { id: 'item', name: 'Item-Stern', desc: 'Die meisten Items eingesetzt', key: (p) => p.stats.itemsUsed },
  { id: 'unlucky', name: 'Pechvogel-Stern', desc: 'Am häufigsten auf Pech-Feldern gelandet', key: (p) => p.stats.unlucky },
];
export { BONUS_CATS };

export function createGame(opts) {
  const b = BOARDS[opts.board];
  const players = opts.players.map((o, i) => ({
    i, name: o.name || 'Spieler ' + (i + 1), char: o.char, kind: o.kind, level: o.level || 0, hc: o.hc || 0,
    node: b.start, x: b.nodes[b.start].x, y: b.nodes[b.start].y,
    coins: 10, stars: 0, items: [], slow: false, halfStar: false, color: 'blue', rank: 1,
    stats: { mgWins: 0, maxCoins: 10, events: 0, steps: 0, itemsUsed: 0, unlucky: 0 },
  }));
  const spots = b.starSpots.filter((s) => s !== b.start);
  return {
    boardId: opts.board, nTurns: opts.turns || 10, turn: 1, players, order: [0, 1, 2, 3], cur: -1,
    starSpot: pick(spots), final: false, phase: 'init', mgHistory: [], result: null,
    ui: { cam: { x: b.nodes[b.start].x, y: b.nodes[b.start].y }, banner: null, msg: null, menu: null, dice: null, wheel: null, timing: null, number: null, bonus: null },
  };
}

// ---------- Hilfen ----------
const mult = (G) => (G.final ? 2 : 1);
function addCoins(G, p, d) {
  const before = p.coins;
  p.coins = Math.max(0, p.coins + d);
  if (p.coins > p.stats.maxCoins) p.stats.maxCoins = p.coins;
  return p.coins - before;
}
export function computeRanks(G) {
  const sorted = G.players.slice().sort((a, b) => b.stars - a.stars || b.coins - a.coins || a.i - b.i);
  sorted.forEach((p, i) => { p.rank = i + 1; });
  return sorted;
}
export const others = (G, pi) => G.players.filter((p) => p.i !== pi);
export function starPrice(p) { return p.halfStar ? STAR_COST / 2 : STAR_COST; }
function predecessor(b, id) {
  for (const n of b.nodes) if (n.next.includes(id)) return n.id;
  return id;
}
function nodePos(b, id) { return b.nodes[id]; }
function giveItem(G, p, id) {
  if (p.items.length >= BAG_MAX) return false;
  p.items.push(id);
  return true;
}
function randomItem(rare) {
  const common = ['doppel', 'schnecke', 'dieb', 'glocke', 'wunsch', 'tausch'];
  const rarePool = ['dreifach', 'portal', 'wunsch', 'doppel'];
  return pick(rare ? rarePool : common);
}
const money = (n) => n + (Math.abs(n) === 1 ? ' Münze' : ' Münzen');

// ---------- Hauptablauf ----------
export async function runGame(G, env) {
  const b = board(G);
  G.phase = 'order';
  await env.banner('Pixel Party', b.name, 1.6);
  // Zugreihenfolge auswürfeln
  const rolls = [];
  for (const p of G.players) {
    env.focus(p.node);
    await env.say(p.name + ' würfelt für die Reihenfolge', 0.3);
    const r = await env.dice(p.i, 1, 10);
    rolls.push({ i: p.i, v: r[0] + Math.random() * 0.5 });
  }
  rolls.sort((a, c) => c.v - a.v);
  G.order = rolls.map((r) => r.i);
  await env.say('Reihenfolge: ' + G.order.map((i) => G.players[i].name).join(', '), 1.6);
  G.phase = 'board';

  for (G.turn = 1; G.turn <= G.nTurns; G.turn++) {
    if (!G.final && G.nTurns - G.turn + 1 <= 5) await finalIntro(G, env);
    await env.banner('Runde ' + G.turn + ' von ' + G.nTurns, '', 1.0);
    for (const pi of G.order) {
      G.cur = pi;
      await playerTurn(G, env, pi);
    }
    G.cur = -1;
    await minigamePhase(G, env);
    computeRanks(G);
  }
  await endGame(G, env);
}

async function finalIntro(G, env) {
  G.final = true;
  env.music && env.music('final');
  await env.banner('Die letzten 5 Runden!', 'Doppelte Münzen. Duelle auf gleichen Feldern.', 2.4);
  const sorted = computeRanks(G);
  const last = sorted[sorted.length - 1];
  if (last.stars < sorted[0].stars || last.coins < sorted[0].coins) {
    env.focus(last.node);
    const gift = ri(10, 20);
    await env.say(last.name + ' liegt hinten und bekommt ein Geschenk: ' + money(gift), 2.2);
    addCoins(G, last, gift); env.sfx('coin');
  }
}

// ---------- Ein Zug ----------
async function playerTurn(G, env, pi) {
  const p = G.players[pi], b = board(G);
  env.focus(p.node);
  await env.say(p.name + ' ist dran!', 0.7);
  // Item (optional)
  const mode = await itemPhase(G, env, pi);
  // Würfeln
  let steps = 0;
  if (mode.wish) steps = mode.wish;
  else {
    const sides = p.slow ? 3 : 10;
    p.slow = false;
    const r = await env.dice(pi, mode.dice, sides);
    steps = r.reduce((s, v) => s + v, 0);
    if (mode.dice === 2 && r[0] === r[1]) {
      await env.say('Pasch! +10 Münzen', 1.0);
      addCoins(G, p, 10); env.sfx('coin');
    }
  }
  await moveSteps(G, env, pi, steps);
  await landing(G, env, pi);
  // Duell in den letzten Runden
  if (G.final) {
    const mate = G.players.find((o) => o.i !== pi && o.node === p.node && p.node !== b.start);
    if (mate) await duel(G, env, p, mate);
  }
  // Farbe für das Minispiel
  const t = b.nodes[p.node].t;
  p.color = t === 'b' || t === 'n' ? 'blue' : t === 'r' ? 'red' : Math.random() < 0.5 ? 'blue' : 'red';
}

async function itemPhase(G, env, pi) {
  const p = G.players[pi];
  const mode = { dice: 1, wish: 0 };
  if (!p.items.length) return mode;
  const b = board(G);
  const opps = others(G, pi);
  const usable = (id) => {
    if (id === 'dieb') return opps.some((o) => o.items.length);
    if (id === 'portal') return p.node !== predecessor(b, G.starSpot);
    return true;
  };
  const options = p.items.map((id, idx) => ({ label: ITEMS[id].name, desc: ITEMS[id].desc, value: idx, disabled: !usable(id) }));
  options.push({ label: 'Nur würfeln', desc: 'Kein Item benutzen', value: -1 });
  const choice = await env.menu(pi, 'Item benutzen?', options, () => AI.chooseItem(G, p, usable));
  if (choice < 0) return mode;
  const id = p.items[choice];
  p.items.splice(choice, 1);
  p.stats.itemsUsed++;
  env.sfx('select');
  switch (id) {
    case 'doppel': mode.dice = 2; await env.say(p.name + ' nutzt den Doppelwürfel', 0.7); break;
    case 'dreifach': mode.dice = 3; await env.say(p.name + ' nutzt den Dreifachwürfel', 0.7); break;
    case 'wunsch':
      mode.wish = await env.number(pi, 'Wunschzahl wählen', 1, 10, () => AI.wishNumber(G, p));
      await env.say(p.name + ' wünscht sich eine ' + mode.wish, 0.8);
      break;
    case 'schnecke': {
      const t = await pickTarget(G, env, pi, 'Wen verlangsamen?', opps, () => AI.slowTarget(G, p));
      G.players[t].slow = true;
      await env.say(G.players[t].name + ' würfelt nächste Runde nur 1 bis 3', 1.3);
      break;
    }
    case 'dieb': {
      const cands = opps.filter((o) => o.items.length);
      const t = await pickTarget(G, env, pi, 'Von wem klauen?', cands, () => AI.stealTarget(G, p, cands));
      const victim = G.players[t];
      const it = victim.items.splice(ri(0, victim.items.length - 1), 1)[0];
      if (!giveItem(G, p, it)) { await env.say('Dein Beutel ist voll, das Item ist weg!', 1.2); }
      else await env.say(p.name + ' klaut: ' + ITEMS[it].name, 1.3);
      break;
    }
    case 'glocke':
      await env.say('Die Geisterglocke läutet…', 0.8);
      await ghost(G, env, pi);
      break;
    case 'portal': {
      const to = predecessor(b, G.starSpot);
      await env.teleport(p, to);
      await env.say('Sternportal! Du stehst vor dem Sternhändler', 1.0);
      break;
    }
    case 'tausch': {
      const o = pick(opps);
      const a = p.node, c = o.node;
      await env.teleport(p, c); await env.teleport(o, a);
      await env.say(p.name + ' tauscht den Platz mit ' + o.name, 1.2);
      break;
    }
    default: break;
  }
  return mode;
}

async function pickTarget(G, env, pi, title, cands, aiFn) {
  if (cands.length === 1) return cands[0].i;
  const options = cands.map((o) => ({ label: o.name, value: o.i, char: o.char }));
  return env.menu(pi, title, options, aiFn);
}

async function moveSteps(G, env, pi, steps) {
  const p = G.players[pi], b = board(G);
  while (steps > 0) {
    const node = b.nodes[p.node];
    let nextId = node.next[0];
    if (node.next.length > 1) nextId = await chooseFork(G, env, pi, node);
    steps--; p.stats.steps++;
    p.node = nextId;
    await env.move(p, nextId, steps);
    await arrive(G, env, pi, steps);
  }
}

async function chooseFork(G, env, pi, node) {
  const p = G.players[pi];
  const options = node.next.map((id, k) => {
    let label = node.forkLabels ? node.forkLabels[k] : k === 0 ? 'Hauptweg' : (node.tollLabel || 'Abkürzung') + ' (' + node.toll + ' Münzen)';
    const costs = node.toll && k === 1 ? node.toll : 0;
    return { label, value: id, disabled: costs > p.coins, dir: id };
  });
  const id = await env.menu(pi, 'Welchen Weg?', options, () => AI.chooseFork(G, p, node, options));
  if (node.toll && id === node.next[1]) {
    addCoins(G, p, -node.toll); env.sfx('loss');
    await env.say('Wegzoll: -' + money(node.toll), 0.9);
  }
  return id;
}

async function arrive(G, env, pi, stepsLeft) {
  const p = G.players[pi], b = board(G), n = b.nodes[p.node];
  if (p.node === G.starSpot && p.coins >= starPrice(p)) {
    env.focus(p.node);
    const price = starPrice(p);
    const yes = await env.menu(pi, 'Stern kaufen? (' + price + ' Münzen)', [
      { label: 'Ja, kaufen!', value: true }, { label: 'Nein', value: false },
    ], () => true);
    if (yes) {
      addCoins(G, p, -price); p.stars++; p.halfStar = false;
      env.sfx('star');
      await env.say(p.name + ' kauft einen Stern!', 1.6);
      const spots = b.starSpots.filter((s) => s !== G.starSpot);
      G.starSpot = pick(spots);
      await env.say('Der Sternhändler zieht weiter…', 1.0);
      computeRanks(G);
    }
  }
  if (n.shop && p.items.length < BAG_MAX) await shop(G, env, pi);
  if (n.thief) await ghost(G, env, pi);
}

async function shop(G, env, pi) {
  const p = G.players[pi];
  const stock = shuffle(ITEM_IDS).slice(0, 3);
  if (!stock.some((id) => ITEMS[id].price <= p.coins)) return;
  const options = stock.map((id) => ({ label: ITEMS[id].name + ' ' + ITEMS[id].price, desc: ITEMS[id].desc, value: id, disabled: ITEMS[id].price > p.coins }));
  options.push({ label: 'Nichts kaufen', value: null });
  const id = await env.menu(pi, 'Item-Laden', options, () => AI.shopChoice(G, p, stock));
  if (id) {
    addCoins(G, p, -ITEMS[id].price); giveItem(G, p, id); env.sfx('coin');
    await env.say(p.name + ' kauft: ' + ITEMS[id].name, 1.0);
  }
}

/** Klau-Geist: Münzen stehlen oder (50 Münzen) einen Stern */
async function ghost(G, env, pi) {
  const p = G.players[pi];
  const opps = others(G, pi);
  const canStar = p.coins >= 50 && opps.some((o) => o.stars > 0);
  const canCoins = opps.some((o) => o.coins > 0);
  if (!canCoins && !canStar) return;
  const options = [
    { label: 'Münzen klauen', desc: 'Gratis ein paar Münzen von einem Gegner', value: 'coins', disabled: !canCoins },
    { label: 'Stern klauen (50)', desc: 'Kostet 50 Münzen, klaut einen Stern', value: 'star', disabled: !canStar },
    { label: 'Nein danke', value: 'no' },
  ];
  const act = await env.menu(pi, 'Klau-Geist: Was soll ich tun?', options, () => AI.ghostChoice(G, p, canStar));
  if (act === 'no') return;
  if (act === 'coins') {
    const cands = opps.filter((o) => o.coins > 0);
    const t = await pickTarget(G, env, pi, 'Bei wem klauen?', cands, () => AI.coinVictim(G, p, cands));
    const v = G.players[t];
    const n = Math.min(v.coins, ri(5, 10));
    addCoins(G, v, -n); addCoins(G, p, n); env.sfx('coin');
    await env.say(p.name + ' klaut ' + v.name + ' ' + money(n) + '!', 1.4);
  } else {
    const cands = opps.filter((o) => o.stars > 0);
    const t = await pickTarget(G, env, pi, 'Wem den Stern klauen?', cands, () => AI.starVictim(G, p, cands));
    const v = G.players[t];
    addCoins(G, p, -50); v.stars--; p.stars++; env.sfx('star');
    await env.say(p.name + ' klaut ' + v.name + ' einen Stern!', 1.8);
    computeRanks(G);
  }
}

// ---------- Feld-Wirkung ----------
async function landing(G, env, pi) {
  const p = G.players[pi], b = board(G), t = b.nodes[p.node].t, m = mult(G);
  env.focus(p.node);
  switch (t) {
    case 'b': addCoins(G, p, 3 * m); env.sfx('coin'); await env.say(p.name + ' bekommt ' + money(3 * m), 0.9); break;
    case 'r': { const d = addCoins(G, p, -3 * m); env.sfx('loss'); await env.say(p.name + ' verliert ' + money(-d), 0.9); break; }
    case 'e': p.stats.events++; await eventField(G, env, pi); break;
    case 'l': await luckyField(G, env, pi); break;
    case 'B': p.stats.unlucky++; await bossField(G, env, pi); break;
    case 'i': await itemField(G, env, pi); break;
    case 'v': await vsField(G, env, pi); break;
    default: break;
  }
}

async function eventField(G, env, pi) {
  const p = G.players[pi], b = board(G);
  const ev = b.events[weighted(b.events)];
  await env.banner('Ereignis!', '', 0.8);
  await env.say(ev.text, 1.6);
  switch (ev.id) {
    case 'cannon': {
      const far = b.nodes.filter((n) => n.id !== p.node && Math.hypot(n.x - p.x, n.y - p.y) > 380);
      const to = pick(far.length ? far : b.nodes);
      await env.teleport(p, to.id);
      break;
    }
    case 'trapdoor': await env.teleport(p, b.start); break;
    case 'treasure': addCoins(G, p, 10); env.sfx('coin'); break;
    case 'shark': addCoins(G, p, -6); env.sfx('loss'); break;
    case 'swap': {
      const o = pick(others(G, pi));
      const a = p.node, c = o.node;
      await env.teleport(p, c); await env.teleport(o, a);
      break;
    }
    case 'gift': {
      const it = randomItem(false);
      if (giveItem(G, p, it)) await env.say(p.name + ' erhält: ' + ITEMS[it].name, 1.2);
      else { addCoins(G, p, 5); await env.say('Beutel voll: stattdessen +5 Münzen', 1.2); }
      break;
    }
    default: break;
  }
}

async function luckyField(G, env, pi) {
  const p = G.players[pi];
  const entries = [
    { label: '+10 Münzen', w: 3 }, { label: '+20 Münzen', w: 1 }, { label: 'Zufalls-Item', w: 2 },
    { label: 'Stern halber Preis', w: 2 }, { label: '+5 Münzen', w: 3 },
  ];
  const idx = weighted(entries);
  await env.banner('Glücksfeld!', '', 0.8);
  await env.wheel('Glücksrad', entries, idx);
  switch (idx) {
    case 0: addCoins(G, p, 10); env.sfx('coin'); break;
    case 1: addCoins(G, p, 20); env.sfx('coin'); break;
    case 2: {
      const it = randomItem(false);
      if (!giveItem(G, p, it)) addCoins(G, p, 5);
      await env.say('Du bekommst: ' + ITEMS[it].name, 1.0);
      break;
    }
    case 3: p.halfStar = true; await env.say('Dein nächster Stern kostet nur ' + STAR_COST / 2 + '!', 1.2); break;
    default: addCoins(G, p, 5); env.sfx('coin'); break;
  }
}

async function bossField(G, env, pi) {
  const p = G.players[pi];
  const entries = [
    { label: 'Alle verlieren die Hälfte', w: 2 }, { label: 'Münzen neu verteilt', w: 1 },
    { label: 'Du gibst 20 Münzen ab', w: 3 }, { label: 'Gemeines Minispiel', w: 2 }, { label: 'Du gibst 10 Münzen ab', w: 2 },
  ];
  const idx = weighted(entries);
  env.sfx('bad');
  await env.banner('Pech-Feld!', 'Der Dunkelkönig erscheint', 1.2);
  await env.wheel('Pech-Rad', entries, idx);
  switch (idx) {
    case 0: for (const q of G.players) addCoins(G, q, -Math.floor(q.coins / 2)); env.sfx('loss'); break;
    case 1: {
      const total = G.players.reduce((s, q) => s + q.coins, 0);
      const w = G.players.map(() => Math.random() + 0.2), ws = w.reduce((s, v) => s + v, 0);
      let left = total;
      G.players.forEach((q, k) => {
        const v = k === 3 ? left : Math.min(left, Math.floor((total * w[k]) / ws));
        left -= v; q.coins = v; if (v > q.stats.maxCoins) q.stats.maxCoins = v;
      });
      break;
    }
    case 2: addCoins(G, p, -20); env.sfx('loss'); break;
    case 4: addCoins(G, p, -10); env.sfx('loss'); break;
    case 3: {
      const res = await runMinigame(G, env, pickMinigame(G, '4p'), G.players.map((q) => ({ slot: q.i, team: null })));
      const last = G.players.filter((q) => res.rank[q.i] === Math.max(...G.players.map((z) => res.rank[z.i])));
      for (const q of last) { addCoins(G, q, -15); }
      await env.say(last.map((q) => q.name).join(' & ') + ' verlier' + (last.length > 1 ? 'en' : 't') + ' 15 Münzen!', 1.6);
      break;
    }
    default: break;
  }
}

async function itemField(G, env, pi) {
  const p = G.players[pi];
  await env.banner('Item-Feld!', 'Triff den richtigen Moment', 0.9);
  const q = await env.timing(pi);
  const it = randomItem(q > 0.7);
  if (giveItem(G, p, it)) { env.sfx('ok'); await env.say(p.name + ' gewinnt: ' + ITEMS[it].name + (q > 0.7 ? ' (selten!)' : ''), 1.4); }
  else { addCoins(G, p, 5); await env.say('Beutel voll: stattdessen +5 Münzen', 1.2); }
}

async function vsField(G, env, pi) {
  const stake = pick([5, 10, 10, 15]);
  await env.banner('VS-Feld!', 'Alle zahlen ' + stake + ' Münzen in den Topf', 1.4);
  let pot = 0;
  for (const q of G.players) { const pay = Math.min(q.coins, stake); addCoins(G, q, -pay); pot += pay; }
  env.sfx('loss');
  const res = await runMinigame(G, env, pickMinigame(G, '4p'), G.players.map((q) => ({ slot: q.i, team: null })));
  const winner = res.order[0], second = res.order[1];
  const w1 = Math.round(pot * 0.7), w2 = pot - w1;
  addCoins(G, G.players[winner], w1); addCoins(G, G.players[second], w2);
  env.sfx('coin');
  await env.say(G.players[winner].name + ' gewinnt ' + money(w1) + ', ' + G.players[second].name + ' ' + money(w2), 2.0);
}

async function duel(G, env, a, b2) {
  env.sfx('bad');
  await env.banner('Duell!', a.name + ' gegen ' + b2.name, 1.6);
  const entries = [{ label: '10 Münzen', w: 4 }, { label: 'Halbe Münzen', w: 2 }, { label: '1 Stern', w: 1 }];
  const idx = weighted(entries);
  await env.wheel('Duell-Einsatz', entries, idx);
  const duelIds = MG_META.filter((m) => m.duel).map((m) => m.id);
  const id = pick(duelIds);
  const res = await runMinigame(G, env, id, [{ slot: a.i, team: null }, { slot: b2.i, team: null }]);
  const win = res.order[0] === b2.i ? b2 : a;
  const lose = win === a ? b2 : a;
  win.stats.mgWins++;
  if (idx === 0) { const n = Math.min(10, lose.coins); addCoins(G, lose, -n); addCoins(G, win, n); }
  else if (idx === 1) { const n = Math.floor(lose.coins / 2); addCoins(G, lose, -n); addCoins(G, win, n); }
  else if (lose.stars > 0) { lose.stars--; win.stars++; }
  else { const n = Math.min(10, lose.coins); addCoins(G, lose, -n); addCoins(G, win, n); }
  computeRanks(G);
  await env.say(win.name + ' gewinnt das Duell!', 1.6);
}

// ---------- Minispiele ----------
function pickMinigame(G, type) {
  const pool = MG_META.filter((m) => m.type === type && !G.mgHistory.slice(-3).includes(m.id));
  const m = pick(pool.length ? pool : MG_META.filter((x) => x.type === type));
  G.mgHistory.push(m.id);
  return m.id;
}
async function runMinigame(G, env, id, parts) {
  G.phase = 'minigame';
  const res = await env.minigame({ id, parts, final: G.final });
  G.phase = 'board';
  // Ordnung und Ränge normalisieren
  if (!res.order) res.order = parts.map((q) => q.slot);
  if (!res.rank) { res.rank = [0, 0, 0, 0]; res.order.forEach((sl, k) => { res.rank[sl] = k + 1; }); }
  return res;
}
async function minigamePhase(G, env) {
  const blue = G.players.filter((p) => p.color === 'blue'), red = G.players.filter((p) => p.color === 'red');
  await env.showColors(G.players);
  let type, parts, solo = null;
  if (blue.length === 4 || red.length === 4) { type = '4p'; parts = G.players.map((p) => ({ slot: p.i, team: null })); }
  else if (blue.length === 2) { type = '2v2'; parts = G.players.map((p) => ({ slot: p.i, team: p.color === 'blue' ? 0 : 1 })); }
  else {
    type = '1v3';
    solo = blue.length === 1 ? blue[0] : red[0];
    parts = G.players.map((p) => ({ slot: p.i, team: p === solo ? 0 : 1 }));
  }
  const id = pickMinigame(G, type);
  const res = await runMinigame(G, env, id, parts);
  const reward = { 1: 10, 2: 3, 3: 2, 4: 0 };
  if (type === '4p') {
    for (const p of G.players) {
      const r = res.rank[p.i];
      addCoins(G, p, reward[r] ?? 0);
      if (r === 1) p.stats.mgWins++;
    }
  } else {
    const winners = G.players.filter((p) => parts[p.i].team === res.winTeam);
    for (const p of winners) { addCoins(G, p, 10); p.stats.mgWins++; }
  }
  env.sfx('coin');
  await env.minigameResult(G, parts, res, type);
  G.phase = 'board';
}

// ---------- Ende ----------
async function endGame(G, env) {
  G.phase = 'bonus';
  env.music && env.music('mini');
  await env.banner('Das Spiel ist aus!', 'Jetzt kommen die Bonus-Sterne', 2.2);
  const cats = shuffle(BONUS_CATS).slice(0, 3);
  for (const c of cats) {
    const vals = G.players.map((p) => c.key(p));
    const best = Math.max(...vals);
    const winners = best > 0 ? G.players.filter((p, k) => vals[k] === best) : [];
    for (const w of winners) w.stars++;
    G.ui.bonus = { cat: c.name, desc: c.desc, winners: winners.map((w) => w.i), vals };
    if (winners.length) env.sfx('star');
    await env.sleep(3.2);
    G.ui.bonus = null;
  }
  const sorted = G.players.slice().sort((a, b) => b.stars - a.stars || b.coins - a.coins || Math.random() - 0.5);
  sorted.forEach((p, i) => { p.rank = i + 1; });
  G.result = { order: sorted.map((p) => p.i), winner: sorted[0].i };
  G.phase = 'end';
  env.music && env.music('win');
  await env.banner(sorted[0].name + ' ist der Superstar!', '', 3.0);
}
