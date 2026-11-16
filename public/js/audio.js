// Chiptune-Musik und Soundeffekte, komplett im Browser erzeugt
let ac = null, master = null, muted = false, vol = 0.5;
let musicTimer = null, curTrack = null, nextTime = 0, step = 0;
const mem = (() => { try { return window.localStorage; } catch (e) { return null; } })();
try { if (mem && mem.getItem('pp_muted') === '1') muted = true; if (mem && mem.getItem('pp_vol')) vol = parseFloat(mem.getItem('pp_vol')); } catch (e) { /* egal */ }

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = muted ? 0 : vol;
    master.connect(ac.destination);
  } catch (e) { ac = null; }
}
export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = muted ? 0 : vol;
  try { mem && mem.setItem('pp_muted', m ? '1' : '0'); } catch (e) { /* egal */ }
}
export function setVolume(v) {
  vol = Math.max(0, Math.min(1, v));
  if (master && !muted) master.gain.value = vol;
  try { mem && mem.setItem('pp_vol', String(vol)); } catch (e) { /* egal */ }
}
export function getVolume() { return vol; }

function tone(freq, t0, dur, type = 'square', v = 0.15, slide = 0) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(v, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(t0, dur, v = 0.12) {
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ac.createBufferSource(), g = ac.createGain();
  s.buffer = buf; g.gain.value = v; s.connect(g); g.connect(master); s.start(t0);
}
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
const SFX = {
  coin: [[988, 0.05], [1319, 0.14]],
  loss: [[330, 0.1, 'square', -80], [220, 0.2, 'square', -60]],
  step: [[420, 0.04, 'triangle']],
  tick: [[900, 0.03, 'square', 0, 0.07]],
  select: [[660, 0.05], [880, 0.07]],
  back: [[440, 0.05], [330, 0.07]],
  ok: [[523, 0.07], [659, 0.07], [784, 0.12]],
  bad: [[200, 0.25, 'sawtooth', -90]],
  dice: [[700, 0.04, 'square', 0, 0.08]],
  hit: [[180, 0.1, 'square', -100, 0.2]],
  star: [[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.3]],
  jump: [[330, 0.12, 'square', 300]],
  go: [[880, 0.35, 'square']],
  count: [[440, 0.15]],
  win: [[523, 0.12], [523, 0.12], [523, 0.12], [659, 0.12], [784, 0.4]],
  boom: [[120, 0.3, 'sawtooth', -100, 0.25]],
  whoosh: [[300, 0.2, 'sawtooth', 600, 0.08]],
};
export function sfx(name) {
  if (!ac || muted) return;
  const seq = SFX[name];
  if (!seq) return;
  let t = ac.currentTime + 0.005;
  for (const [f, d, type, slide, v] of seq) {
    tone(f, t, d, type || 'square', v || 0.14, slide || 0);
    t += d * 0.9;
  }
  if (name === 'boom' || name === 'hit') noise(ac.currentTime, 0.2, 0.15);
}

// ---- Musik ----
const P = (s) => s.split(' ').map((n) => {
  if (n === '-') return 0;
  const m = n.match(/^([A-G])(#?)(\d)$/);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  return 12 * (parseInt(m[3], 10) + 1) + base + (m[2] ? 1 : 0);
});
const TRACKS = {
  title: { bpm: 132, lead: P('C5 E5 G5 E5 C5 E5 G5 C6 B4 D5 G5 D5 B4 D5 G5 B5 A4 C5 E5 C5 A4 C5 E5 A5 G4 B4 D5 B4 G4 B4 D5 G5'),
    bass: P('C3 - G3 - C3 - G3 - G2 - D3 - G2 - D3 - A2 - E3 - A2 - E3 - G2 - D3 - G2 - D3 -') },
  pirate: { bpm: 118, lead: P('A4 - C5 E5 D5 - C5 A4 G4 - B4 D5 C5 - B4 G4 A4 - C5 E5 A5 - G5 E5 D5 - F5 D5 B4 - A4 -'),
    bass: P('A2 - E3 - A2 - E3 - G2 - D3 - G2 - D3 - A2 - E3 - A2 - E3 - D3 - A3 - E3 - B2 -') },
  castle: { bpm: 100, lead: P('E5 - - D#5 E5 - B4 - C5 - - B4 A4 - - - E5 - - D#5 E5 - G5 - F#5 - - E5 D#5 - - -'),
    bass: P('E2 - - - B2 - - - C3 - - - A2 - - - E2 - - - B2 - - - A2 - - - B2 - - -') },
  mini: { bpm: 156, lead: P('D5 F5 A5 F5 D5 F5 A5 D6 C5 E5 G5 E5 C5 E5 G5 C6 B4 D5 F5 D5 B4 D5 F5 B5 A4 C5 E5 A5 G5 E5 C5 A4'),
    bass: P('D3 D3 A3 D3 D3 D3 A3 D3 C3 C3 G3 C3 C3 C3 G3 C3 B2 B2 F3 B2 B2 B2 F3 B2 A2 A2 E3 A2 G2 G2 E3 C3') },
  win: { bpm: 140, lead: P('C5 E5 G5 C6 - G5 C6 - E6 - D6 C6 G5 - E5 C5 D5 F5 A5 D6 - C6 - A5 - G5 - - - - -'),
    bass: P('C3 - G3 - C3 - G3 - A2 - E3 - F3 - C3 - G2 - D3 - G2 - C3 - - - - - - - -') },
};
function schedule() {
  if (!ac || !curTrack) return;
  const tr = TRACKS[curTrack];
  const dur = 60 / tr.bpm / 2;
  while (nextTime < ac.currentTime + 0.25) {
    const n = tr.lead[step % tr.lead.length], b = tr.bass[step % tr.bass.length];
    if (n) tone(N(n), nextTime, dur * 0.9, 'square', 0.055);
    if (b) tone(N(b), nextTime, dur * 1.8, 'triangle', 0.12);
    if (step % 2 === 0) noise(nextTime, 0.03, 0.025);
    nextTime += dur; step++;
  }
}
export function music(name) {
  if (name === curTrack) return;
  curTrack = name; step = 0;
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  if (!name || !ac) return;
  nextTime = ac.currentTime + 0.05;
  musicTimer = setInterval(schedule, 40);
}
export function musicRestart() { const t = curTrack; curTrack = null; music(t); }
