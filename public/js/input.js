// Eingabe: Tastatur (4 Belegungen), Gamepads, Touch (virtueller Stick) und Zeiger
const SCHEMES = [
  { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], a: ['KeyQ', 'Space'], b: ['KeyE'] },
  { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], a: ['Enter'], b: ['ShiftRight', 'Backspace'] },
  { up: ['KeyI'], down: ['KeyK'], left: ['KeyJ'], right: ['KeyL'], a: ['KeyU'], b: ['KeyO'] },
  { up: ['Numpad8', 'KeyT'], down: ['Numpad5', 'KeyG'], left: ['Numpad4', 'KeyF'], right: ['Numpad6', 'KeyH'], a: ['Numpad0', 'KeyR'], b: ['NumpadEnter', 'KeyZ'] },
];
export const SCHEME_HINT = [
  'WASD + Q',
  'Pfeile + Enter',
  'IJKL + U',
  'Ziffernblock 8456 + 0 oder TFGH + R',
];
const keys = new Set();
const pending = new Set(); // Tasten, die zwischen zwei Bildern gedrückt und losgelassen wurden
const empty = () => ({ up: false, down: false, left: false, right: false, a: false, b: false });
const held = [empty(), empty(), empty(), empty()];
const prev = [empty(), empty(), empty(), empty()];
export const touch = { x: 0, y: 0, a: false, b: false, active: false };
let touchSlot = 0;
export function setTouchSlot(i) { touchSlot = i; }
const pointer = { x: -1, y: -1, down: false, tapped: false, tx: 0, ty: 0 };
export { pointer };

export function initInput(canvas) {
  addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code.startsWith('Numpad')) e.preventDefault();
    keys.add(e.code); pending.add(e.code);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  // Zeiger auf Spielfläche
  const toLogical = (e) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * canvas.width, ((e.clientY - r.top) / r.height) * canvas.height];
  };
  canvas.addEventListener('pointerdown', (e) => {
    const [x, y] = toLogical(e);
    pointer.x = x; pointer.y = y; pointer.down = true; pointer.tapped = true; pointer.tx = x; pointer.ty = y;
  });
  canvas.addEventListener('pointermove', (e) => { const [x, y] = toLogical(e); pointer.x = x; pointer.y = y; });
  addEventListener('pointerup', () => { pointer.down = false; });
  // Touch-Overlay nur auf Touch-Geräten
  const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
  const ov = document.getElementById('touch');
  if (isTouch && ov) {
    touch.active = true;
    ov.classList.add('on');
    const stick = document.getElementById('stick'), knob = document.getElementById('knob');
    let sid = null;
    const setStick = (e) => {
      const r = stick.getBoundingClientRect();
      let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      touch.x = Math.abs(dx) < 0.18 ? 0 : dx; touch.y = Math.abs(dy) < 0.18 ? 0 : dy;
      knob.style.transform = `translate(${dx * r.width * 0.3}px,${dy * r.height * 0.3}px)`;
    };
    stick.addEventListener('pointerdown', (e) => { sid = e.pointerId; stick.setPointerCapture(sid); setStick(e); e.preventDefault(); });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId === sid) setStick(e); });
    const endStick = (e) => { if (e.pointerId === sid) { sid = null; touch.x = 0; touch.y = 0; knob.style.transform = ''; } };
    stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
    for (const [id, k] of [['bA', 'a'], ['bB', 'b']]) {
      const el = document.getElementById(id);
      el.addEventListener('pointerdown', (e) => { touch[k] = true; e.preventDefault(); });
      const up = () => { touch[k] = false; };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    }
  }
}
function padState(i) {
  const s = empty();
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const p = pads && pads[i];
  if (!p) return s;
  const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
  s.left = ax < -0.45 || !!(p.buttons[14] && p.buttons[14].pressed);
  s.right = ax > 0.45 || !!(p.buttons[15] && p.buttons[15].pressed);
  s.up = ay < -0.45 || !!(p.buttons[12] && p.buttons[12].pressed);
  s.down = ay > 0.45 || !!(p.buttons[13] && p.buttons[13].pressed);
  s.a = !!(p.buttons[0] && p.buttons[0].pressed);
  s.b = !!(p.buttons[1] && p.buttons[1].pressed);
  return s;
}
/** einmal pro Bild aufrufen */
export function updateInput() {
  for (let i = 0; i < 4; i++) {
    Object.assign(prev[i], held[i]);
    const sc = SCHEMES[i], pad = padState(i), h = held[i];
    for (const k of ['up', 'down', 'left', 'right', 'a', 'b']) {
      h[k] = sc[k].some((c) => keys.has(c) || pending.has(c)) || pad[k];
    }
    if (i === touchSlot && touch.active) {
      if (touch.x < -0.4) h.left = true; if (touch.x > 0.4) h.right = true;
      if (touch.y < -0.4) h.up = true; if (touch.y > 0.4) h.down = true;
      if (touch.a) h.a = true; if (touch.b) h.b = true;
    }
  }
  pending.clear();
}
/** Eingabe eines Platzes */
export function slotInput(i) {
  const h = held[i], p = prev[i];
  let x = (h.right ? 1 : 0) - (h.left ? 1 : 0), y = (h.down ? 1 : 0) - (h.up ? 1 : 0);
  if (i === touchSlot && touch.active && (touch.x || touch.y)) { x = touch.x; y = touch.y; }
  return {
    x, y, a: h.a, b: h.b,
    aP: h.a && !p.a, bP: h.b && !p.b,
    uP: h.up && !p.up, dP: h.down && !p.down, lP: h.left && !p.left, rP: h.right && !p.right,
  };
}
/** alle Plätze zusammen (Menüs) */
export function anyInput() {
  const r = { x: 0, y: 0, a: false, b: false, aP: false, bP: false, uP: false, dP: false, lP: false, rP: false };
  for (let i = 0; i < 4; i++) {
    const s = slotInput(i);
    for (const k of Object.keys(r)) r[k] = typeof r[k] === 'number' ? r[k] || s[k] : r[k] || s[k];
  }
  return r;
}
/** Tipp auf Spielfläche einmal abholen */
export function takeTap() {
  if (!pointer.tapped) return null;
  pointer.tapped = false;
  return { x: pointer.tx, y: pointer.ty };
}
export function clearTap() { pointer.tapped = false; }
