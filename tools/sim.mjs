// Headless-Test: 4 Computer spielen komplette Partien ohne Oberfläche
import { createGame, runGame } from '../public/js/game.js';
import { BOARD_IDS } from '../public/js/boards.js';
import { MG_META } from '../public/js/minigames/meta.js';

function makeEnv(G, stats) {
  return {
    sleep: async () => {}, sfx() {}, music() {}, focus() {},
    say: async () => {}, banner: async () => {},
    menu: async (pi, title, options, ai) => {
      stats.menus[title] = (stats.menus[title] || 0) + 1;
      const v = ai();
      if (!options.some((o) => o.value === v && !o.disabled)) throw new Error('KI-Wahl ungültig in ' + title + ': ' + JSON.stringify(v) + ' von ' + JSON.stringify(options));
      return v;
    },
    number: async (pi, t, a, b, ai) => { const v = ai(); if (v < a || v > b) throw new Error('Zahl ' + v); return v; },
    dice: async (pi, n, sides) => Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sides)),
    move: async (p) => { const n = G.boardNodes[p.node]; p.x = n.x; p.y = n.y; },
    teleport: async (p, id) => { p.node = id; },
    wheel: async () => {}, timing: async () => Math.random(),
    showColors: async () => {},
    minigame: async (spec) => {
      stats.mg[spec.id] = (stats.mg[spec.id] || 0) + 1;
      const slots = spec.parts.map((q) => q.slot).sort(() => Math.random() - 0.5);
      const rank = [0, 0, 0, 0]; slots.forEach((s, k) => { rank[s] = k + 1; });
      return { order: slots, rank, winTeam: Math.random() < 0.5 ? 0 : 1 };
    },
    minigameResult: async () => {},
  };
}
const stats = { menus: {}, mg: {}, games: 0, winners: [0, 0, 0, 0], stars: 0 };
const N = Number(process.argv[2] || 200);
for (let g = 0; g < N; g++) {
  const board = BOARD_IDS[g % BOARD_IDS.length];
  const G = createGame({ board, turns: [5, 10, 15][g % 3], players: [0, 1, 2, 3].map((i) => ({ name: 'P' + i, char: i, kind: 'cpu', level: i % 3 })) });
  const { BOARDS } = await import('../public/js/boards.js');
  G.boardNodes = BOARDS[board].nodes;
  await runGame(G, makeEnv(G, stats));
  if (!G.result) throw new Error('kein Ergebnis');
  for (const p of G.players) {
    if (p.coins < 0 || !Number.isFinite(p.coins) || p.items.length > 3) throw new Error('ungültiger Zustand ' + JSON.stringify(p));
  }
  stats.games++; stats.winners[G.result.winner]++; stats.stars += G.players.reduce((s, p) => s + p.stars, 0);
}
console.log(JSON.stringify(stats, null, 1));
console.log('Minispiele ohne Meta-Eintrag:', Object.keys(stats.mg).filter((k) => !MG_META.some((m) => m.id === k)));
