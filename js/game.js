// Ambulance Jam: game loop, screens, input and rendering.
'use strict';
const HOSPITAL = ["ST. BECCA'S", 'GENERAL'];
const SIGN_SHORT = "ST. BECCA'S";

// ---------- canvas: fixed low-res pixel buffer scaled up with CSS ----------
const LW = 195;
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const LH = Math.max(360, Math.min(480, Math.round(LW * innerHeight / innerWidth)));
cv.width = LW; cv.height = LH;
let cssScale = 2, cssX = 0, cssY = 0;
function fit() {
  const W = innerWidth, H = innerHeight; cssScale = Math.min(W / LW, H / LH);
  cssX = (W - LW * cssScale) / 2; cssY = (H - LH * cssScale) / 2;
  Object.assign(cv.style, { width: LW * cssScale + 'px', height: LH * cssScale + 'px', left: cssX + 'px', top: cssY + 'px' });
}
addEventListener('resize', fit); fit();

const K = '#2b2238';
const R = (x, y, w, h, col, c = ctx) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const disc = (cx, cy, r, col, c = ctx) => { c.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y) + 0.3); c.fillRect(cx - w, cy + y, w * 2 + 1, 1); } };
const ellipse = (cx, cy, rx, ry, col, c = ctx) => { c.fillStyle = col; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); c.fillRect(cx - w, cy + y, w * 2 + 1, 1); } };
const blit = (img, cx, cy, c = ctx) => c.drawImage(img, Math.round(cx - img.width / 2), Math.round(cy - img.height / 2));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
let srand = 1; const prand = () => { srand = (srand * 16807) % 2147483647; return srand / 2147483647; };
const pick = a => a[Math.floor(Math.random() * a.length)];

// ---------- layout ----------
const LOOP = { cx: 97, cy: 80, rx: 56, ry: 38 };
const LANES = [-10.5, -3.5, 3.5, 10.5], ROW = 9, LOOP_SPEED = 30;
const BAY_Y = 148, BAY_W = 26, BAY_H = 38, LOT_TOP = 194, SLOTS = 6, OPEN = 4, UNLOCK_COST = 500;
const bayX = i => 10 + i * 30, bayCx = i => bayX(i) + 13, bayCy = () => BAY_Y + 19;
const LOT = { cx: 97, cy: Math.round((LOT_TOP + LH - 4) / 2), rx: 92, ry: Math.round((LH - 4 - LOT_TOP) / 2) - 2 };
const DOOR = { x: LOOP.cx, y: LOOP.cy + LOOP.ry + 8 };
// park decor around the walkway; everything sits in the gaps the paths leave free
const PARK = {
  pond: { x: 22, y: 126, rx: 18, ry: 8 },
  trees: [[8, 107, 0.8, 0], [184, 114, 1, 1.7], [44, 31, 0.65, 3.1], [150, 31, 0.65, 4.4]],
  bench: { x: 146, y: 134 },
};
const SIGN = (() => { const w = Font.smallWidth(SIGN_SHORT) + 14; return { x: Math.round(LOOP.cx - w / 2), y: LOOP.cy - 12, w }; })();
const inPond = (x, y) => ((x - PARK.pond.x) / (PARK.pond.rx + 2)) ** 2 + ((y - PARK.pond.y) / (PARK.pond.ry + 2)) ** 2 <= 1;

function makePath(pts, closed) { const P = pts.slice(); if (closed) P.push(pts[0]);
  const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  return { P, cum, len: cum[cum.length - 1], closed }; }
function at(path, s) {
  s = path.closed ? ((s % path.len) + path.len) % path.len : Math.max(0, Math.min(path.len, s));
  const { P, cum } = path; let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < s) lo = m; else hi = m; }
  const t = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1), dx = P[hi][0] - P[lo][0], dy = P[hi][1] - P[lo][1], l = Math.hypot(dx, dy) || 1;
  return { x: P[lo][0] + dx * t, y: P[lo][1] + dy * t, tx: dx / l, ty: dy / l };
}
const loopPts = []; for (let i = 0; i < 240; i++) { const a = Math.PI / 2 + i / 240 * Math.PI * 2; loopPts.push([LOOP.cx + Math.cos(a) * LOOP.rx, LOOP.cy + Math.sin(a) * LOOP.ry]); }
const loopPath = makePath(loopPts, true);
const S_ENT = 0;                                   // the path starts at the bottom, by the door
const S_LEFT = loopPath.len * 0.25, S_RIGHT = loopPath.len * 0.75;  // clockwise: bottom → left → top → right
const NROWS = Math.floor(loopPath.len / ROW);
const FUNNEL_PATHS = [
  makePath([[-34, 24], [4, 42], [LOOP.cx - LOOP.rx - 14, LOOP.cy]], false),
  makePath([[LW + 34, 24], [LW - 4, 42], [LOOP.cx + LOOP.rx + 14, LOOP.cy]], false),
];
const laneXY = (q, l) => ({ x: q.x - q.ty * LANES[l], y: q.y + q.tx * LANES[l] });

// ---------- words ----------
const BLURBS = [
  'Patient rates their pain 11/10. Patient is eating Doritos.',
  "The call light is on. It's for ice chips. It is always for ice chips.",
  'Never say the Q word. You know which one.',
  'Family member has Googled the symptoms. Brace yourself.',
  "If you didn't chart it, it didn't happen.",
  'Lunch break: scheduled for noon. Taken: theoretically.',
  'Patient is "a little short of breath." Patient is also on the phone.',
  'Patient asks if the gown really opens at the back. It does.',
  'Visiting hours ended an hour ago. Nobody has left.',
  'Full moon tonight. Good luck.',
  "Patient was told they're NPO. Fourteen times. Patient has a sandwich.",
  '"Allergic" to everything except the good stuff.',
  'Twelve-hour shift, fourteen hours long.',
  "The doctor's orders are perfectly clear. Kidding. Nobody can read them.",
  'Bed 6 says they "know their rights." Bed 6 would like a warm blanket.',
];
const WIN_LINES = ["They'll be back.", 'Beds are clean. For eleven minutes.', 'Handover done. Not your problem anymore.', "Everyone's where they belong. Suspicious."];
const LOSE_LINES = ['Somebody page the charge nurse.', "Time for a coffee you won't finish.", 'Code Brown in the parking lot.'];
const INTROS = {
  1: "Tap an ambulance to drive it out. Patients board the ambulance for their department. Full ones leave. Clear the lot! Locked bays open for 500 points each. Tap the sign to see who's who.",
  3: 'New: triage pending. Grey ambulances hide their department until the road ahead is clear.',
  5: 'New: flip-floppers. Ambulances with the yellow arrows turn around every time you send another one off.',
  7: 'New: code blue! The crash cart has to leave before its counter hits zero. Every move counts.',
};

// ---------- staff cameos ----------
// one of Becca's friends drops by once a shift; now and then a doctor pops up too
const NURSES = ['Becca', 'Sarah', 'Jess', 'Carly', 'Katrina', 'Jann', 'Angela'];
const HAIR = { Becca: ['#4f3322', '#38231a'], Sarah: ['#f0c75e', '#c99a32'], Jess: ['#7a4a2a', '#5c3620'], Carly: ['#b5532e', '#843a1f'],
  Katrina: ['#3a2f3a', '#241c26'], Jann: ['#a8743f', '#7d5329'], Angela: ['#d98a4e', '#a8643a'] };
const NURSE_LINES = [
  "Bed 4 wants a sandwich. Bed 4 is nil by mouth. Bed 4 is furious.",
  "Someone googled their symptoms. They're dying of everything.",
  "Three coffees, no lunch, one working pen. Living the dream.",
  "Doctor wrote 'patient fine'. Patient is not fine.",
  "Patient says the pain is 10 out of 10. Patient is eating Doritos.",
  "Whatever you do, don't say the Q word. You know the one.",
  "A visitor asked if I'm a real nurse. No, I'm three raccoons in scrubs.",
  "Hour eleven of not going to the bathroom. Personal best.",
  "Who keeps stealing the good pens? I will find you.",
  "Patient pulled out their IV again. It's a hobby at this point.",
  "'Just one quick question,' says the man holding a list.",
  "My feet stopped speaking to me around hour nine.",
  "Somebody microwaved fish in the break room. Again.",
  "Pharmacy says 'soon'. Pharmacy has said 'soon' since Tuesday.",
  "Room 6 rang the call bell for the TV remote. It was in their hand.",
  "Lunch? I've heard of it. Sounds nice.",
  "Allergic to every painkiller except the strong one. Classic.",
  "Full moon tonight. Everybody brace.",
];
const DOCTOR_LINES = [
  "Has anyone seen my stethoscope? ...Oh. It's on me.",
  "Can someone redo all the vitals? I lost the paper.",
  "Why is this patient on oxygen? Let's try air.",
  "Quick one: is the heart on the left or the right?",
  "I'll be in surgery. By surgery I mean the cafeteria.",
  "Can we discharge everyone? I've got a tee time.",
  "Page me if anything happens. I'll be unreachable.",
  "Let's just order every test. All of them. Twice.",
  "I wrote the orders. In pencil. On a napkin. Somewhere.",
  "My handwriting? It's a font. Look it up.",
  "Bed 2 is in pain? Have we tried asking them to stop?",
  "Could someone call the family? And my mum? She worries.",
];
function nextNurse() {
  // shuffle bag so everyone gets a turn before anyone repeats
  let bag = []; try { bag = JSON.parse(localStorage.getItem('aj.nurses') || '[]').filter(n => NURSES.includes(n)); } catch (e) {}
  if (!bag.length) bag = NURSES.slice().sort(() => Math.random() - 0.5);
  const name = bag.shift(); try { localStorage.setItem('aj.nurses', JSON.stringify(bag)); } catch (e) {}
  return name;
}
function scheduleCameos() {
  const t = 8 + Math.random() * 30, list = [{ kind: 'nurse', at: t }];
  if (Math.random() < 0.3) list.push({ kind: 'doctor', at: Math.random() < 0.5 ? Math.max(5, t - 15 - Math.random() * 10) : t + 15 + Math.random() * 15 });
  return list;
}
function startCameo(c) {
  const nurse = c.kind === 'nurse', name = nurse ? nextNurse() : 'Doctor';
  G.cameo = { kind: c.kind, name, hair: nurse ? HAIR[name] : ['#4f3322', '#38231a'], text: pick(nurse ? NURSE_LINES : DOCTOR_LINES), t: 0, phase: 'in', typed: 0, blip: 0 };
  if (!nurse) Sound.sfx.boing();
}
const CAMEO_IN = 1.1;
function updateCameo(dt) {
  G.playT += dt;
  if (!G.cameo && !G.over) { const i = G.cameos.findIndex(c => G.playT >= c.at); if (i >= 0) startCameo(G.cameos.splice(i, 1)[0]); }
  const c = G.cameo; if (!c) return;
  c.t += dt;
  if (c.phase === 'in' && c.t >= (c.kind === 'nurse' ? CAMEO_IN : 0.35)) { c.phase = 'talk'; c.t = 0; }
  else if (c.phase === 'talk') {
    const before = Math.floor(c.typed); c.typed = Math.min(c.text.length, c.typed + dt * 32);
    if (Math.floor(c.typed) > before && Math.floor(c.typed) % 3 === 0 && c.typed < c.text.length) Sound.sfx.blip((c.kind === 'nurse' ? 700 : 330) + Math.random() * 120);
    if (c.t > 2.6 + c.text.length / 32 + 1.6) cameoLeave();
  } else if (c.phase === 'out' && c.t >= (c.kind === 'nurse' ? CAMEO_IN : 0.35)) G.cameo = null;
}
function cameoLeave() { const c = G.cameo; if (c && c.phase !== 'out') { c.phase = 'out'; c.t = 0; } }
// where the cameo stands, and the speech bubble beside them
function cameoLayout() {
  const c = G.cameo, nurse = c.kind === 'nurse', S = 2, w = 14 * S, h = (nurse ? 20 : 21) * S, feet = LH - 14;
  let x = nurse ? 6 : LW - 6 - w, y = feet - h, flip = !nurse, frame = 0;
  if (nurse) {
    const walking = c.phase !== 'talk', u = Math.min(1, c.t / CAMEO_IN);
    if (c.phase === 'in') x = Math.round(lerp(-w - 4, 6, ease(u)));
    if (c.phase === 'out') { x = Math.round(lerp(6, -w - 4, ease(u))); flip = true; }
    if (walking) frame = Math.floor(T * 8) % 4;
  } else {
    const u = Math.min(1, c.t / 0.35), c1 = 1.70158, back = 1 + (c1 + 1) * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
    if (c.phase === 'in') y = Math.round(feet - h * back);
    if (c.phase === 'out') y = Math.round(lerp(feet - h, LH + 2, u * u));
  }
  const lines = Font.wrap(c.text, 104), bw = 112, bh = lines.length * 7 + 6;
  const bx = nurse ? x + w + 6 : x - bw - 6, by = Math.min(feet - h - 2, feet - 20 - bh);
  return { x, y, w, h, flip, frame, S, feet, lines, bx, by, bw, bh };
}
function drawCameo() {
  const c = G.cameo; if (!c) return;
  const L = cameoLayout(), img = Sprites.staff(c.kind, c.hair, L.frame, L.flip);
  ellipse(L.x + L.w / 2, L.feet + 1, 11, 2, 'rgba(20,24,36,.3)');
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, LW, L.feet + 3); ctx.clip();
  ctx.imageSmoothingEnabled = false; ctx.drawImage(img, L.x, L.y + (c.phase === 'talk' && Math.floor(T * 3) % 2 ? 1 : 0), L.w, L.h); ctx.restore();
  // name tag: an ID badge under their feet
  const label = c.kind === 'nurse' ? c.name + ' RN' : 'DOCTOR', tw = Font.smallWidth(label) + 9, tx = Math.round(L.x + L.w / 2 - tw / 2), ty = L.feet + 4;
  if (c.phase !== 'in' || c.kind === 'nurse') {
    R(tx - 1, ty - 1, tw + 2, 9, K); R(tx, ty, tw, 7, '#fff'); R(tx, ty, 3, 7, c.kind === 'nurse' ? '#3fae7a' : '#3d7bff');
    Font.small(ctx, label, tx + 5, ty + 1, K);
  }
  if (c.phase !== 'talk') return;
  // speech bubble with a typewriter reveal
  const { bx, by, bw, bh, lines } = L, pop = Math.min(1, c.t / 0.12);
  if (pop < 1) { const cx = bx + bw / 2, cy = by + bh / 2; R(Math.round(cx - bw * pop / 2), Math.round(cy - bh * pop / 2), Math.round(bw * pop), Math.round(bh * pop), '#fff'); return; }
  R(bx + 1, by - 1, bw - 2, bh + 2, K); R(bx - 1, by + 1, bw + 2, bh - 2, K); R(bx, by, bw, bh, '#fff');
  R(bx + 1, by + bh, bw - 2, 1, 'rgba(20,24,36,.25)');
  const tailY = by + bh - 6, tx0 = c.kind === 'nurse' ? bx - 1 : bx + bw + 1, d = c.kind === 'nurse' ? -1 : 1;
  for (let k = 0; k < 4; k++) { R(tx0 + d * k, tailY + k, 1, 4 - k, '#fff'); R(tx0 + d * (k + 1), tailY + k, 1, 1, K); }
  R(tx0 + d * 4, tailY + 4, 1, 1, K);
  let left = Math.floor(c.typed);
  lines.forEach((ln, i) => { if (left <= 0) return; Font.small(ctx, ln.slice(0, left), bx + 4, by + 4 + i * 7, '#334155'); left -= ln.length + 1; });
}
function cameoTap(p) {
  const c = G && G.cameo; if (!c) return false;
  const L = cameoLayout(), inBubble = c.phase === 'talk' && p.x >= L.bx - 4 && p.x <= L.bx + L.bw + 4 && p.y >= L.by - 2 && p.y <= L.by + L.bh + 2;
  const onThem = p.x >= L.x && p.x <= L.x + L.w && p.y >= L.y && p.y <= L.feet + 12;
  if (!inBubble && !onThem) return false;
  if (c.typed < c.text.length) c.typed = c.text.length; else cameoLeave();
  Sound.sfx.click(); return true;
}

// ---------- state ----------
let screen = 'splash', G = null, T = 0, toast = null, buttons = [], overlayT = 0;
let level = 1;
try { level = parseInt(new URLSearchParams(location.search).get('level')) || parseInt(localStorage.getItem('aj.level')) || 1; } catch (e) {}

function startLevel(n) {
  level = n; try { localStorage.setItem('aj.level', n); } catch (e) {}
  const gen = generateLevel(n, LOT);
  G = { n, cfg: gen.cfg, vehicles: gen.vehicles, offset: 0, rows: [], funnels: [], bays: [], open: OPEN, score: 0, shown: 0, floats: [], bonus: 0,
        flyers: [], pops: [], over: null, moves: 0, blurb: pick(BLURBS), endLine: '', playT: 0, cameos: scheduleCameos(), cameo: null };
  for (const v of G.vehicles) { v.state = 'lot'; v.px = v.x; v.py = v.y; v.revealed = !v.mystery; v.bumpT = 0; v.shake = 0; v.flipAnim = 0; }
  for (let i = 0; i < SLOTS; i++) G.bays.push({ state: 'empty', t: 0 });
  // fill loop rows in the order they will reach the door, the rest wait in the funnels
  const seq = gen.rows.slice();
  for (let i = 0; i < NROWS; i++) G.rows.push({ dept: null, lanes: [false, false, false, false], enter: null });
  const byArrival = [...Array(NROWS).keys()].sort((a, b) => ((S_ENT - a * ROW) % loopPath.len + loopPath.len) % loopPath.len - ((S_ENT - b * ROW) % loopPath.len + loopPath.len) % loopPath.len);
  const fillCount = Math.min(seq.length, Math.round(NROWS * 0.85));
  for (let k = 0; k < fillCount; k++) setRow(G.rows[byArrival[k]], seq.shift());
  G.funnels = FUNNEL_PATHS.map((path, i) => ({ path, sJoin: i ? S_RIGHT : S_LEFT, q: [] }));
  seq.forEach((row, i) => G.funnels[i % 2].q.push({ ...row, s: -ROW * 2 }));
  for (const f of G.funnels) f.q.forEach((p, i) => p.s = f.path.len - i * ROW);
  revealCheck();
}
function setRow(row, src) { row.dept = src.dept; row.lanes = [0, 1, 2, 3].map(l => l < src.n); if (src.n === 2) row.lanes = [false, true, true, false]; }
const onLot = () => G.vehicles.filter(v => v.state === 'lot');
function revealCheck() { const lot = onLot(); for (const v of lot) if (!v.revealed && pathClear(v, v.dir, lot)) v.revealed = true; }
const rowS = i => ((i * ROW + G.offset) % loopPath.len + loopPath.len) % loopPath.len;
const crossed = (a, b, mark) => a <= b ? (mark > a && mark <= b) : (mark > a || mark <= b);
const rowEmpty = row => !row.lanes.some(Boolean);

// ---------- actions ----------
function tapVehicle(v) {
  const lot = onLot();
  if (!pathClear(v, v.dir, lot)) {
    const a = v.dir * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); let d = 0, hit = null;
    for (; d < 300 && !hit; d += 1) { const box = vBox(v, -0.1, c * d, s * d); for (const o of lot) if (o !== v && sat(box, vBox(o, -0.1))) { hit = o; break; } }
    v.bumpDist = Math.max(0, d - 2); v.bumpT = 0.001; if (hit) hit.shake = 0.3;
    Sound.sfx.honk(); buzz(25); shakeScreen(0.12, 1); return;
  }
  if (v.kind === 'cart') { v.state = 'exit'; v.away = true; v.dist = 0; Sound.sfx.siren(); rearPuff(v, 5); afterMove(v); return; }
  let slot = -1; for (let i = 0; i < G.open; i++) if (G.bays[i].state === 'empty') { slot = i; break; }
  if (slot < 0) { v.shake = 0.3; flash('NO FREE BAYS!'); Sound.sfx.nope(); buzz(40); shakeScreen(0.2, 1); return; }
  G.bays[slot] = { state: 'reserved', v, seats: 0, filled: 0, t: 0 };
  v.bay = slot; v.state = 'exit'; v.dist = 0; v.revealed = true; Sound.sfx.tap(); rearPuff(v, 5);
  afterMove(v);
}
function rearPuff(v, n) { const a = v.dir * Math.PI / 4; puff((v.px ?? v.x) - Math.cos(a) * v.len / 2, (v.py ?? v.y) - Math.sin(a) * v.len / 2 + 2, n); }
function afterMove(moved) {
  G.moves++;
  for (const v of onLot()) {
    if (v.flip) { v.dir = (v.dir + 4) % 8; v.flipAnim = 1; }
    if (v.kind === 'cart' && v !== moved) { v.timer--; if (v.timer <= 2 && v.timer > 0) Sound.sfx.beep(); if (v.timer <= 0) { lose('code'); return; } }
  }
  revealCheck();
}
let career = 0; try { career = parseInt(localStorage.getItem('aj.total')) || 0; } catch (e) {}
const fmt = n => (n < 0 ? '-' : '') + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function addScore(pts, x, y, big) { G.score += pts; if (big) G.floats.push({ text: (pts > 0 ? '+' : '') + fmt(pts), x, y, t: 0, col: pts < 0 ? '#ff4d4d' : '#ffe066' }); }
function unlockBay() {
  if (G.open >= SLOTS) return;
  G.open++; addScore(-UNLOCK_COST, bayCx(G.open - 1), BAY_Y + 10, true);
  flash('BAY OPENED  -' + UNLOCK_COST); Sound.sfx.bonus(); sparkle(bayCx(G.open - 1), bayCy(), 24, ['#4ade80', '#ffe066', '#ffffff']);
}
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
function flash(msg) { toast = { msg, t: 1.6 }; }
// ---------- particles + screen effects ----------
let fx = [], confetti = [], taps = [], shakeT = 0, shakeAmp = 0;
function shakeScreen(t, amp) { shakeT = Math.max(shakeT, t); shakeAmp = amp; }
function puff(x, y, n, col = '#f1f3f6') { for (let i = 0; i < n; i++) fx.push({ kind: 'dust', x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 3, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 8, t: 0, life: 0.35 + Math.random() * 0.25, col }); }
function sparkle(x, y, n, col) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 30;
  fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 15, t: 0, life: 0.5 + Math.random() * 0.3, col: Array.isArray(col) ? pick(col) : col }); } }
const CONFETTI = ['#ff4d4d', '#ffe066', '#4ade80', '#3a86ff', '#ff7eb6', '#c9a2f5', '#ffffff'];
function dropConfetti(n, top) { for (let i = 0; i < n; i++) confetti.push({ x: Math.random() * LW, y: top ? -Math.random() * 60 : -4, vy: 26 + Math.random() * 26, ph: Math.random() * 6, col: pick(CONFETTI), t: 0 }); }
function updateFx(dt) {
  if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
  for (const f of fx) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.kind === 'spark') f.vy += 60 * dt; else { f.vx *= 0.9; f.vy *= 0.9; } }
  fx = fx.filter(f => f.t < f.life);
  for (const c of confetti) { c.t += dt; c.y += c.vy * dt; c.x += Math.sin(c.t * 4 + c.ph) * 14 * dt; }
  confetti = confetti.filter(c => c.y < LH + 4);
  if (screen === 'win' && overlayT < 3.5 && Math.random() < dt * 25) dropConfetti(1);
  for (const r of taps) r.t += dt; taps = taps.filter(r => r.t < 0.3);
}
function drawFx() {
  for (const f of fx) { const u = f.t / f.life;
    if (f.kind === 'dust') { ctx.globalAlpha = 0.75 * (1 - u); disc(Math.round(f.x), Math.round(f.y), Math.round(1 + u * 2.5), f.col); }
    else { ctx.globalAlpha = 1 - u * u; R(Math.round(f.x), Math.round(f.y), 1, 1, f.col); if (u < 0.4) { R(Math.round(f.x) - 1, Math.round(f.y), 3, 1, f.col); R(Math.round(f.x), Math.round(f.y) - 1, 1, 3, f.col); } } }
  ctx.globalAlpha = 1;
  for (const r of taps) { const rad = 2 + r.t * 30; ctx.globalAlpha = 1 - r.t / 0.3;
    for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; R(Math.round(r.x + Math.cos(a) * rad), Math.round(r.y + Math.sin(a) * rad), 1, 1, '#ffffff'); } }
  ctx.globalAlpha = 1;
}
function drawConfetti() { for (const c of confetti) { const flat = Math.floor(c.t * 8 + c.ph) % 2; R(Math.round(c.x), Math.round(c.y), flat ? 2 : 1, flat ? 1 : 2, c.col); } }
function win() {
  const locked = SLOTS - G.open; G.bonus = locked * UNLOCK_COST; G.score += 1000 + G.bonus;
  career += G.score; try { localStorage.setItem('aj.total', career); } catch (e) {}
  G.over = 'win'; G.endLine = pick(WIN_LINES); overlayT = 0; Sound.sfx.win(); dropConfetti(90, true); setTimeout(() => { if (screen === 'play') screen = 'win'; }, 500); }
function lose(why) { G.over = why; G.endLine = why === 'code' ? 'The crash cart got boxed in.' : pick(LOSE_LINES); overlayT = 0;
  shakeScreen(0.35, 2); if (why === 'code') Sound.sfx.flatline(); else Sound.sfx.lose(); setTimeout(() => { if (screen === 'play') screen = 'lose'; }, 400); }

// ---------- update ----------
const insideLot = (x, y) => G.cfg.shape((x - LOT.cx) / LOT.rx, (y - LOT.cy) / LOT.ry);
function update(dt) {
  T += dt; if (toast) toast.t -= dt; overlayT += dt;
  if (G) { G.shown += (G.score - G.shown) * Math.min(1, dt * 6); if (Math.abs(G.score - G.shown) < 1) G.shown = G.score;
    G.floats.forEach(f => { f.t += dt; f.y -= 14 * dt; }); G.floats = G.floats.filter(f => f.t < 1.4); }
  updateFx(dt);
  if (!G || screen !== 'play') return;
  updateCameo(dt);
  for (const v of G.vehicles) {
    if ((v.state === 'exit' || v.state === 'route') && (v.puffT = (v.puffT || 0) - dt) <= 0) { v.puffT = 0.05; rearPuff(v, 1); }
    if (v.shake > 0) v.shake = Math.max(0, v.shake - dt);
    if (v.flipAnim > 0) v.flipAnim = Math.max(0, v.flipAnim - dt * 4);
    if (v.state === 'lot' && v.bumpT > 0) { v.bumpT += dt / 0.3; if (v.bumpT >= 1) v.bumpT = 0; }
    else if (v.state === 'exit') {
      v.dist += 170 * dt; const a = v.dir * Math.PI / 4; v.px = v.x + Math.cos(a) * v.dist; v.py = v.y + Math.sin(a) * v.dist;
      if (v.away) { if (v.px < -40 || v.px > LW + 40 || v.py < -40 || v.py > LH + 40) v.state = 'gone'; }
      else if (v.py < LOT_TOP + 2 || (!insideLot(v.px, v.py) && Math.hypot(v.px - v.x, v.py - v.y) > v.len / 2 + 6)) {
        v.state = 'route'; v.route = [];
        if (v.py > LOT_TOP + 8) v.route.push({ x: bayCx(v.bay), y: LOT_TOP + 8 });
        v.route.push({ x: bayCx(v.bay), y: bayCy() });
      }
    } else if (v.state === 'route') {
      const wp = v.route[0], dx = wp.x - v.px, dy = wp.y - v.py, d = Math.hypot(dx, dy), step = 260 * dt;
      if (d > 0.5) v.dir = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
      if (d <= step) { v.px = wp.x; v.py = wp.y; v.route.shift();
        if (!v.route.length) { v.state = 'parked'; v.dir = 6; const b = G.bays[v.bay]; b.state = 'parked'; b.seats = v.cap; b.filled = 0; b.t = 0; b.parkedAt = T; b.land = T; Sound.sfx.park(); puff(v.px, v.py + v.len / 2, 6); } }
      else { v.px += dx / d * step; v.py += dy / d * step; }
    }
  }
  // the crowd moves round the loop
  const prev = G.rows.map((_, i) => rowS(i));
  G.offset += LOOP_SPEED * dt;
  G.rows.forEach((row, i) => {
    const a = prev[i], b = rowS(i);
    if (crossed(a, b, S_ENT) && !row.enter && row.dept) {
      const q = at(loopPath, b);
      row.lanes.forEach((on, l) => {
        if (!on) return;
        // fill one ambulance at a time: the one that has been waiting longest
        let bi = -1;
        G.bays.forEach((bb, k) => { if (k < G.open && bb.state === 'parked' && bb.v.dept === row.dept && bb.seats > 0 && (bi < 0 || bb.parkedAt < G.bays[bi].parkedAt)) bi = k; });
        if (bi < 0) return;
        G.bays[bi].seats--; row.lanes[l] = false;
        const p = laneXY(q, l);
        G.flyers.push({ dept: row.dept, x: p.x, y: p.y, bay: bi, t: -l * 0.07 });
      });
    }
    for (const f of G.funnels) if (crossed(a, b, f.sJoin) && rowEmpty(row) && f.q.length && !row.enter) {
      const head = f.q.shift(), hp = at(f.path, head.s);
      setRow(row, head); row.enter = { x: hp.x, y: hp.y, t: 0 };
    }
  });
  G.rows.forEach(row => { if (row.enter) { row.enter.t += dt / 0.45; if (row.enter.t >= 1) row.enter = null; } });
  for (const f of G.funnels) f.q.forEach((p, i) => { const tgt = f.path.len - i * ROW; p.moving = p.s < tgt - 0.3; p.s = Math.min(tgt, p.s + 40 * dt); });
  // boarding walkers
  for (const fl of G.flyers) {
    fl.t += dt / 0.7;
    if (fl.t >= 1 && !fl.done) {
      fl.done = true; const bb = G.bays[fl.bay]; bb.filled++; addScore(10);
      Sound.sfx.board(Math.floor(bb.filled / bb.v.cap * 9)); G.pops.push({ dept: fl.dept, x: bayCx(fl.bay) + (Math.random() - 0.5) * 8, y: BAY_Y + 6, t: 0, vx: (Math.random() - 0.5) * 16 });
      if (bb.filled >= bb.v.cap) { bb.state = 'full'; bb.t = 0; bb.stamp = T; sparkle(bayCx(fl.bay), BAY_Y + 14, 18, [bb.v.dept.T, bb.v.dept.L, '#ffffff']); }
    }
  }
  G.flyers = G.flyers.filter(f => !f.done);
  G.pops.forEach(p => { p.t += dt; p.x += p.vx * dt; p.y -= 24 * dt; }); G.pops = G.pops.filter(p => p.t < 0.9);
  G.bays.forEach(bb => {
    bb.t += dt;
    if (bb.state === 'full' && bb.t > 0.35) { bb.state = 'leaving'; bb.t = 0; Sound.sfx.siren(); addScore(bb.v.cap * 5, bayCx(G.bays.indexOf(bb)), BAY_Y + 6, true); }
    else if (bb.state === 'leaving' && bb.t > 0.6 && !bb.zoom) { bb.zoom = true; const k = G.bays.indexOf(bb); puff(bayCx(k) - 8, bayCy() + 32, 8); }
    else if (bb.state === 'leaving' && bb.t > 1.6) { bb.v.state = 'gone'; Object.assign(bb, { state: 'empty', v: null, t: 0, zoom: false }); }
  });
  if (G.over) return;
  // win / lose
  const busy = G.flyers.length || G.vehicles.some(v => v.state === 'exit' || v.state === 'route' || v.bumpT > 0) || G.bays.some(b => b.state === 'full' || b.state === 'leaving' || b.state === 'reserved') || G.rows.some(r => r.enter);
  if (busy) return;
  const loopHas = G.rows.some(r => !rowEmpty(r)), queued = G.funnels.some(f => f.q.length);
  if (!loopHas && !queued && G.vehicles.every(v => v.state === 'gone') && G.bays.every(b => b.state === 'empty')) { win(); return; }
  let allFull = true; for (let i = 0; i < G.open; i++) if (G.bays[i].state !== 'parked') allFull = false;
  if (allFull) {
    const wanted = new Set(G.bays.filter(b => b.state === 'parked' && b.seats > 0).map(b => b.v.dept));
    const match = G.rows.some(r => !rowEmpty(r) && wanted.has(r.dept));
    const canRefill = queued && G.rows.some(rowEmpty);
    if (!match && !canRefill) lose('jam');
  }
}

// ---------- backgrounds ----------
function makeLayer() { const c = document.createElement('canvas'); c.width = LW; c.height = LH; return c; }
const playBg = makeLayer();
function buildPlayBg() {
  const b = playBg.getContext('2d'); srand = 11;
  // mown grass with diagonal stripes, tufts and the odd daisy
  R(0, 0, LW, LOT_TOP, '#8fca76', b);
  for (let y = 0; y < LOT_TOP; y++) for (let x0 = -LOT_TOP; x0 < LW; x0 += 24) R(x0 + Math.floor(y / 2), y, 12, 1, '#97d07e', b);
  for (let i = 0; i < 260; i++) R(Math.floor(prand() * LW), 13 + Math.floor(prand() * (LOT_TOP - 13)), 1, 2, prand() < 0.6 ? '#7dba64' : '#a8dc90', b);
  for (let i = 0; i < 40; i++) R(Math.floor(prand() * LW), 13 + Math.floor(prand() * (BAY_Y - 20)), 1, 1, ['#ffffff', '#ffe066', '#ff9fb0'][i % 3], b);
  // stone paths
  const band = (path, w, col) => { b.strokeStyle = col; b.lineWidth = w; b.lineJoin = 'round'; b.lineCap = 'round'; b.beginPath();
    path.P.forEach((p, i) => i ? b.lineTo(p[0], p[1]) : b.moveTo(p[0], p[1])); if (path.closed) b.closePath(); b.stroke(); };
  const PATH = '#e8dcc0', EDGE = '#b9a37e';
  for (const p of FUNNEL_PATHS) band(p, 34, EDGE); band(loopPath, 34, EDGE);
  R(LOOP.cx - 9, LOOP.cy + LOOP.ry, 18, BAY_Y - LOOP.cy - LOOP.ry - 2, EDGE, b);
  for (const p of FUNNEL_PATHS) band(p, 30, PATH); band(loopPath, 30, PATH);
  R(LOOP.cx - 7, LOOP.cy + LOOP.ry, 14, BAY_Y - LOOP.cy - LOOP.ry - 2, PATH, b);
  { // speckle the paving (only where the path is)
    const img = b.getImageData(0, 0, LW, LOT_TOP), d = img.data;
    for (let i = 0; i < 900; i++) { const x = Math.floor(prand() * LW), y = 13 + Math.floor(prand() * (LOT_TOP - 13)), k = (y * LW + x) * 4;
      if (d[k] === 0xe8 && d[k + 1] === 0xdc && d[k + 2] === 0xc0) R(x, y, prand() < 0.5 ? 2 : 1, 1, prand() < 0.7 ? '#dccdab' : '#f3ead6', b); }
  }
  // lawn island + flower bed + signpost
  ellipse(LOOP.cx, LOOP.cy, LOOP.rx - 17, LOOP.ry - 17, '#9fd18b', b);
  for (let i = 0; i < 30; i++) { const a = prand() * 6.28, rr = Math.sqrt(prand()); R(Math.round(LOOP.cx + Math.cos(a) * (LOOP.rx - 20) * rr), Math.round(LOOP.cy + Math.sin(a) * (LOOP.ry - 20) * rr), 1, 2, '#7fb86c', b); }
  const bush = (x, y, r) => { ellipse(x, y + r - 1, r + 1, 2, 'rgba(40,80,40,.3)', b); disc(x, y, r, '#3f8f43', b); disc(x - 1, y - 1, r - 2, '#5bb35a', b);
    R(x + 1, y - 2, 1, 1, '#ff9fb0', b); R(x - 2, y + 1, 1, 1, '#ffe066', b); };
  bush(68, 86, 4); bush(126, 86, 4);
  ellipse(LOOP.cx, 91, 13, 3, '#8a5a3a', b); ellipse(LOOP.cx, 90, 12, 2, '#9b6a45', b);
  for (let i = 0; i < 16; i++) R(LOOP.cx - 11 + Math.floor(prand() * 22), 89 + Math.floor(prand() * 3), 1, 1, ['#ff4d4d', '#ffe066', '#ff9fb0', '#c9a2f5'][i % 4], b);
  const w = Font.smallWidth(SIGN_SHORT) + 14, sx = Math.round(LOOP.cx - w / 2), sy = LOOP.cy - 12;
  R(LOOP.cx - 1, sy + 10, 3, 13, '#6e4321', b); R(LOOP.cx + 1, sy + 10, 1, 13, '#4a2f22', b);
  R(sx - 1, sy - 1, w + 2, 13, K, b); R(sx, sy, w, 11, '#1f4e9c', b); R(sx, sy, w, 1, '#2f66c4', b);
  R(sx + 2, sy + 2, 7, 7, '#fff', b); R(sx + 5, sy + 3, 1, 5, '#e8424f', b); R(sx + 3, sy + 5, 5, 1, '#e8424f', b);
  Font.small(b, SIGN_SHORT, sx + 11, sy + 3, '#fff');
  // hedge along the top wall
  R(54, 15, 86, 6, '#3f8f43', b); for (let x = 56; x < 140; x += 7) { disc(x, 15, 3, '#3f8f43', b); disc(x - 1, 14, 1, '#5bb35a', b); }
  for (let x = 58; x < 138; x += 11) R(x, 17, 1, 1, '#ff9fb0', b);
  R(54, 21, 86, 1, '#2f6e34', b);
  // tree trunks and shadows (the canopies sway, so they're drawn live)
  for (const [tx, ty, s] of PARK.trees) { ellipse(tx + 1, ty + Math.round(10 * s) - 1, Math.round(9 * s), 2, 'rgba(40,80,40,.35)', b);
    R(tx - 2, ty - 2, 4, Math.round(12 * s), '#7a4a2a', b); R(tx, ty - 2, 2, Math.round(12 * s), '#5c3620', b); }
  // duck pond
  const P = PARK.pond;
  ellipse(P.x, P.y + 1, P.rx + 2, P.ry + 2, '#9a958b', b); ellipse(P.x, P.y, P.rx + 2, P.ry + 2, '#c9c4b8', b);
  ellipse(P.x, P.y, P.rx + 1, P.ry + 1, '#4d93cc', b); ellipse(P.x, P.y + 1, P.rx, P.ry, '#7cc0ee', b); ellipse(P.x + 1, P.y + 2, P.rx - 6, P.ry - 4, '#6ab4e6', b);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; R(Math.round(P.x + Math.cos(a) * (P.rx + 2)) - 1, Math.round(P.y + Math.sin(a) * (P.ry + 2)), 2, 1, i % 3 ? '#b3ad9f' : '#dcd7cb', b); }
  const pad = (x, y) => { ellipse(x, y, 3, 1, '#3f9d4a', b); R(x - 1, y - 1, 3, 1, '#5bb35a', b); R(x + 2, y, 1, 1, '#6ab4e6', b); };
  pad(P.x - 11, P.y + 2); pad(P.x + 10, P.y + 4); R(P.x + 9, P.y + 2, 2, 1, '#ff9fb0', b); R(P.x + 9, P.y + 1, 1, 1, '#ffc4cf', b);
  for (const [x, h] of [[P.x - P.rx + 1, 9], [P.x - P.rx + 3, 7], [P.x - P.rx + 5, 10]]) { R(x, P.y - 4 - h, 1, h, '#4f8f3a', b); R(x, P.y - 4 - h, 1, 3, '#7a4a2a', b); }
  // plastic flamingo, bench, lamp, flower beds
  { const fx0 = 46, fy = 135; R(fx0, fy - 7, 1, 7, '#c2577a', b); R(fx0 + 2, fy - 7, 1, 7, '#c2577a', b); ellipse(fx0 + 1, fy - 9, 3, 2, '#ff8fb1', b); R(fx0 - 2, fy - 10, 2, 1, '#ff6f9a', b);
    R(fx0 + 3, fy - 15, 1, 6, '#ff8fb1', b); R(fx0 + 3, fy - 16, 2, 2, '#ff8fb1', b); R(fx0 + 5, fy - 15, 1, 2, K, b); R(fx0 + 4, fy - 16, 1, 1, K, b); }
  const bed = (x, y, w) => { R(x, y, w, 4, '#8a5a3a', b); R(x, y, w, 1, '#9b6a45', b); for (let i = 1; i < w - 1; i += 2) R(x + i, y - (i % 4 ? 1 : 0), 1, 2, ['#ff4d4d', '#ffe066', '#ff9fb0', '#c9a2f5', '#ffffff'][i % 5], b); };
  bed(54, 137, 30); bed(110, 138, 26);
  const { x: BX, y: BY } = PARK.bench;
  R(BX, BY, 18, 3, '#a0673a', b); R(BX, BY - 4, 18, 2, '#c0874a', b); R(BX + 1, BY + 3, 2, 4, K, b); R(BX + 15, BY + 3, 2, 4, K, b); R(BX, BY + 3, 18, 1, '#6e4321', b);
  R(171, 118, 2, 18, '#4a5160', b); R(168, 116, 8, 3, '#4a5160', b); R(169, 119, 6, 1, '#ffe27a', b); ellipse(172, 136, 4, 1, 'rgba(40,80,40,.35)', b);
  // top wall for the HUD
  R(0, 0, LW, 12, '#b8c4d0', b); R(0, 12, LW, 1, '#8e9cab', b);
  // bay strip
  R(4, BAY_Y - 4, LW - 8, BAY_H + 8, '#4f5866', b); R(4, BAY_Y + BAY_H + 4, LW - 8, 2, '#3f4753', b);
  // lot
  R(0, LOT_TOP - 4, LW, LH - LOT_TOP + 4, '#8a94a3', b);
  for (let i = 0; i < 700; i++) R(Math.floor(prand() * LW), LOT_TOP + Math.floor(prand() * (LH - LOT_TOP)), 1, 1, prand() < 0.5 ? '#828c9b' : '#929cab', b);
}
// cloud shadow stamp, drawn translucent over the park
const cloudShadow = (() => { const c = document.createElement('canvas'); c.width = 60; c.height = 22; const g = c.getContext('2d');
  ellipse(18, 12, 16, 8, '#1d3b26', g); ellipse(34, 9, 16, 8, '#1d3b26', g); ellipse(44, 13, 13, 7, '#1d3b26', g); return c; })();
// live park: pond shimmer, ducks, swaying trees, bench sitter
let duckHop = -9;
function drawDuck(x, y, f, baby, dabble) {
  const M = (dx, dy, w, h, col) => R(f > 0 ? x + dx : x - dx - w + 1, y + dy, w, h, col);
  if (baby) { M(0, 0, 3, 2, '#ffe066'); M(2, -2, 2, 2, '#ffe066'); M(4, -1, 1, 1, '#ff9a1f'); M(3, -2, 1, 1, K); M(-1, 2, 5, 1, '#b9e1fb'); return; }
  if (dabble) { M(1, 1, 5, 2, '#fff'); M(2, -1, 2, 2, '#fff'); M(2, -2, 1, 1, '#e3e9ef'); M(1, 3, 6, 1, '#b9e1fb'); return; }
  M(0, 0, 6, 3, '#fff'); M(1, 1, 3, 1, '#e3e9ef'); M(-1, -1, 1, 1, '#fff'); M(4, -3, 3, 3, '#fff'); M(5, -2, 1, 1, K); M(7, -2, 2, 1, '#ff9a1f'); M(-1, 3, 8, 1, '#b9e1fb');
}
function drawPark() {
  const P = PARK.pond;
  for (let i = 0; i < 5; i++) { if ((Math.floor(T * 1.5) + i) % 4 === 0) continue;
    const x = Math.round(P.x - 13 + ((i * 7 + T * 2.5) % 24)), y = P.y - 3 + (i * 3) % 8; R(x, y, 2 + (i % 2), 1, '#b9e1fb'); }
  // mum and ducklings paddle round the pond
  const hop = Math.max(0, 1 - (T - duckHop) / 0.35);
  [0, 0.55, 0.95].forEach((lag, i) => {
    const a = T * 0.35 - lag, x = Math.round(P.x + Math.cos(a) * 10), f = -Math.sin(a) > 0 ? 1 : -1;
    const y = Math.round(P.y + 1 + Math.sin(a) * 3.5) + (Math.floor(T * 2 + i) % 2) - (i === 0 ? Math.round(Math.sin(hop * Math.PI) * 4) : 0);
    if (i === 0) { const u = (T * 0.7) % 1.6; if (u < 1) { ctx.globalAlpha = 1 - u;
      for (let k = 0; k < 16; k++) { const b2 = k / 16 * Math.PI * 2; R(Math.round(x + 2 + Math.cos(b2) * (4 + u * 5)), Math.round(y + 2 + Math.sin(b2) * (1 + u * 2)), 1, 1, '#d6efff'); } ctx.globalAlpha = 1; } }
    drawDuck(x, y, f, i > 0, i === 0 && T % 9 < 1.4 && hop === 0);
  });
  // tree canopies sway a pixel in the breeze
  for (const [tx, ty, s, ph] of PARK.trees) { const sw = Math.round(Math.sin(T * 1.3 + ph) * 0.8);
    disc(tx, Math.round(ty - 12 * s), Math.round(10 * s), '#2f7a3a');
    disc(Math.round(tx - 4 * s) + sw, Math.round(ty - 15 * s), Math.round(7 * s), '#3f9d4a'); disc(Math.round(tx + 5 * s) + sw, Math.round(ty - 10 * s), Math.round(6 * s), '#3f9d4a');
    disc(Math.round(tx - 5 * s) + sw, Math.round(ty - 17 * s), Math.round(3 * s), '#6cc56f'); R(Math.round(tx + 3 * s) + sw, Math.round(ty - 13 * s), 1, 1, '#ff6b6b'); }
  // someone on the bench, seeing stars
  const { x: BX, y: BY } = PARK.bench, img = Sprites.patient(deptByName('Neuro'), 2, Math.floor(T * 6) % 2, false);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, LW, BY + 2); ctx.clip(); ctx.drawImage(img, BX + 2, BY - img.height + 5); ctx.restore();
}
function drawParkOverlay() {
  // cloud shadows drift over everything in the park, then butterflies
  ctx.save(); ctx.beginPath(); ctx.rect(0, 13, LW, BAY_Y - 17); ctx.clip(); ctx.globalAlpha = 0.09;
  [[0, 34, 5], [110, 104, 3.5]].forEach(([x0, y, sp]) => ctx.drawImage(cloudShadow, Math.round(((x0 + T * sp) % (LW + 70)) - 65), y));
  ctx.restore(); ctx.globalAlpha = 1;
  ['#ff9fb0', '#ffe066', '#c9a2f5'].forEach((col, i) => {
    const x = Math.round(97 + Math.sin(T * 0.23 + i * 2.1) * 88 + Math.sin(T * 1.7 + i) * 4), y = Math.round(78 + Math.sin(T * 0.31 + i * 3.7) * 56 + Math.sin(T * 2.3 + i) * 3);
    R(x, y, 1, 2, K); if (Math.floor(T * 10 + i * 3) % 2) { R(x - 2, y - 1, 2, 2, col); R(x + 1, y - 1, 2, 2, col); } else { R(x - 1, y - 1, 1, 2, col); R(x + 1, y - 1, 1, 2, col); }
  });
}
function paintLotOutline(shape) {
  // faint painted boundary of this level's lot shape
  const c = playBg.getContext('2d');
  for (let a = 0; a < Math.PI * 2; a += 0.01) {
    let lo = 0, hi = 1.6;
    for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (shape(Math.cos(a) * m, Math.sin(a) * m)) lo = m; else hi = m; }
    const x = Math.round(LOT.cx + Math.cos(a) * lo * (LOT.rx + 4)), y = Math.round(LOT.cy + Math.sin(a) * lo * (LOT.ry + 4));
    if ((Math.floor(a * 30)) % 2) R(x, y, 1, 1, '#a3acb9', c);
  }
}

// ---------- splash scene ----------
const splashBg = makeLayer();
const SB = { bx: 12, by: 146, bw: 120, bh: 132, d: 40, dy: 20 };
const SPLASH_WINDOWS = [['Cardiac', 'blinds', 'Maternity', 'Neuro'], ['dark', 'Burns', 'curtain:Ortho', 'Peds'], ['Maternity', 'plant', 'Cardiac', 'dark']];
const deptByName = n => DEPTS.find(d => d.name === n);
function buildSplashBg() {
  const c = splashBg.getContext('2d'); srand = 5;
  const { bx, by, bw, bh, d, dy } = SB;
  ['#7cc8ff', '#88cdff', '#95d3ff', '#a3d9ff', '#b2e0ff', '#c1e6ff', '#d0edff', '#ddf2ff'].forEach((col, i) => R(0, i * 38, LW, 38, col, c));
  disc(182, 128, 9, '#ffe27a', c); disc(182, 128, 6, '#fff1b0', c);
  [[0, 232, 14, 40], [14, 222, 12, 50], [150, 226, 16, 46], [166, 214, 14, 58], [180, 230, 15, 42]].forEach(([X, Y, W, H]) => {
    R(X, Y, W, H, '#a9c4dc', c); for (let yy = Y + 4; yy < Y + H - 4; yy += 6) for (let xx = X + 2; xx < X + W - 2; xx += 4) R(xx, yy, 2, 3, '#c7dbec', c); });
  const SIDE = '#cfc0a6', SIDE2 = '#c2b296', ROOF = '#a9a49c', WALL = '#f3ead9', WALL2 = '#e7dbc4';
  for (let i = 0; i <= d; i++) R(bx + bw + i, by - Math.round(i * dy / d), 1, bh, i === d ? K : SIDE, c);
  for (let k = 0; k <= dy; k++) R(bx + Math.round(k * d / dy), by - k, bw + 1, 1, k === dy ? K : ROOF, c);
  R(bx, by, bw + 1, 1, K, c);
  for (let i = 0; i <= d; i++) R(bx + bw + i, by - Math.round(i * dy / d), 1, 1, K, c);
  for (let k = 0; k <= dy; k++) R(bx + Math.round(k * d / dy), by - k, 1, 1, K, c);
  // helipad + AC units
  ellipse(bx + 78, by - 10, 15, 6, '#5f5a54', c); ellipse(bx + 78, by - 10, 13, 5, '#ffd23f', c); ellipse(bx + 78, by - 10, 11, 4, '#5f5a54', c);
  R(bx + 74, by - 13, 2, 7, '#fff', c); R(bx + 81, by - 13, 2, 7, '#fff', c); R(bx + 76, by - 11, 5, 2, '#fff', c);
  const ac = (X, Y) => { R(X, Y, 10, 6, '#d4d7dc', c); R(X, Y - 3, 10, 3, '#eceef1', c); R(X + 10, Y - 3, 3, 9, '#b3b7bf', c); R(X, Y + 6, 13, 1, K, c); disc(X + 5, Y + 3, 2, '#8a8f98', c); };
  ac(bx + 20, by - 6); ac(bx + 36, by - 14);
  // rooftop sign
  const sw = Math.max(Font.smallWidth(HOSPITAL[0], 2), Font.smallWidth(HOSPITAL[1], 2)) + 34, sh = 32, sx = Math.round(bx + bw / 2 + d / 2 - sw / 2) - 6, sy = by - 62;
  SB.sign = { sx, sy, sw };
  R(sx + 14, sy + sh, 3, 20, '#6c7484', c); R(sx + sw - 17, sy + sh, 3, 20, '#6c7484', c);
  R(sx + sw + 1, sy + 2, 3, sh, '#173a75', c);
  R(sx - 1, sy - 1, sw + 2, sh + 2, K, c); R(sx, sy, sw, sh, '#1f4e9c', c); R(sx, sy, sw, 2, '#2f66c4', c); R(sx, sy + sh - 2, sw, 2, '#173a75', c);
  R(sx + 4, sy + 6, 20, 20, '#fff', c); R(sx + 11, sy + 9, 6, 14, '#e8424f', c); R(sx + 7, sy + 13, 14, 6, '#e8424f', c);
  Font.small(c, HOSPITAL[0], sx + 28, sy + 5, '#fff', 2); Font.small(c, HOSPITAL[1], sx + 28, sy + 18, '#ffd23f', 2);
  // front wall
  R(bx, by + 1, bw, bh - 1, WALL, c);
  for (let f = 0; f < 4; f++) R(bx, by + 1 + f * 32 + 30, bw, 2, WALL2, c);
  R(bx, by + bh - 4, bw, 4, '#cdbfa6', c);
  R(bx - 1, by, 1, bh + 1, K, c); R(bx + bw, by, 1, bh + 1, K, c); R(bx, by + bh, bw + d + 1, 1, K, c);
  for (let f = 0; f < 4; f++) for (let i = 0; i < d; i++) R(bx + bw + i, by + 1 + f * 32 + 30 - Math.round(i * dy / d), 1, 2, SIDE2, c);
  for (let f = 0; f < 3; f++) for (const [i0, i1] of [[6, 16], [22, 32]]) for (let i = i0; i <= i1; i++) {
    const X = bx + bw + i, top = by + 8 + f * 32 - Math.round(i * dy / d);
    R(X, top, 1, 16, (i === i0 || i === i1) ? K : '#5f8fc4', c); R(X, top, 1, 1, K, c); R(X, top + 16, 1, 1, K, c); if (i < i0 + 3 && i > i0) R(X, top + 1, 1, 6, '#89b4e3', c); }
  // window frames (contents are drawn live)
  SB.windows = [];
  const cols = [bx + 8, bx + 36, bx + 68, bx + 96];
  for (let f = 0; f < 3; f++) cols.forEach((wx, k) => {
    const wy = by + 7 + f * 32, what = SPLASH_WINDOWS[f][k];
    R(wx - 2, wy + 18, 20, 2, '#bfb19a', c); R(wx - 2, wy + 20, 20, 1, K, c); R(wx - 1, wy - 1, 18, 20, K, c);
    SB.windows.push({ wx, wy, what, k, f });
  });
  // ER entrance + canopy
  const ex = bx + bw / 2 - 22, ey = by + bh - 30;
  R(ex + 6, ey + 4, 32, 26, K, c); R(ex + 7, ey + 5, 14, 25, '#9ed0f7', c); R(ex + 23, ey + 5, 14, 25, '#9ed0f7', c); R(ex + 7, ey + 5, 3, 25, '#c8e6fb', c); R(ex + 23, ey + 5, 3, 25, '#c8e6fb', c);
  R(ex + 19, ey + 14, 1, 6, K, c); R(ex + 24, ey + 14, 1, 6, K, c);
  for (let k = 0; k < 6; k++) R(ex - 2 + k, ey - 6 - k, 48, 1, k === 5 ? K : '#ff6b6b', c);
  R(ex - 2, ey - 6, 48, 8, '#e8424f', c); R(ex - 2, ey + 2, 48, 1, K, c); R(ex - 3, ey - 11, 1, 14, K, c); R(ex + 46, ey - 6, 1, 9, K, c);
  for (let k = 0; k < 6; k++) R(ex + 46 + k, ey - 6 - k, 1, 9, '#b52a3a', c);
  Font.small(c, 'EMERGENCY', ex + 4, ey - 4, '#fff');
  R(ex - 1, ey + 3, 2, 27, '#9aa3b2', c); R(ex + 43, ey + 3, 2, 27, '#9aa3b2', c);
  [bx + 6, bx + bw - 24].forEach(wx => { R(wx - 1, ey + 3, 20, 16, K, c); R(wx, ey + 4, 18, 14, '#9ed0f7', c); R(wx, ey + 4, 18, 3, '#c8e6fb', c); R(wx + 9, ey + 4, 1, 14, '#d6cbb4', c); });
  // ground, road, pavement
  const gy = by + bh + 1; SB.gy = gy;
  R(0, gy, LW, LH - gy, '#8fca76', c);
  for (let i = 0; i < 300; i++) R(Math.floor(prand() * LW), gy + Math.floor(prand() * (LH - gy)), 1, 2, prand() < 0.5 ? '#7dba64' : '#a3d98a', c);
  R(0, gy + 14, LW, 30, '#8a94a3', c); R(0, gy + 14, LW, 1, K, c); R(0, gy + 43, LW, 1, '#6c7484', c);
  for (let i = 0; i < 10; i++) R(4 + i * 22, gy + 28, 11, 2, '#f0f0e8', c);
  R(0, gy + 44, LW, 7, '#d5d8de', c); for (let i = 0; i < LW; i += 8) R(i, gy + 44, 1, 7, '#bfc4cc', c); R(0, gy + 51, LW, 1, '#a9aeb7', c);
  R(ex + 8, gy, 28, 14, '#a7aeb9', c);
  for (let i = 0; i < bw; i += 9) { if (i > bw / 2 - 30 && i < bw / 2 + 26) continue; disc(bx + 5 + i, gy - 1, 5, '#3f8f43', c); disc(bx + 4 + i, gy - 2, 3, '#5bb35a', c); R(bx + 3 + i, gy - 4, 1, 1, '#ff9fb0', c); }
  const tree = (tx, ty, s) => { R(tx - 2, ty - 2, 4, 12, '#7a4a2a', c); R(tx, ty - 2, 2, 12, '#5c3620', c); disc(tx, Math.round(ty - 12 * s), Math.round(10 * s), '#2f7a3a', c);
    disc(Math.round(tx - 4 * s), Math.round(ty - 15 * s), Math.round(7 * s), '#3f9d4a', c); disc(Math.round(tx + 5 * s), Math.round(ty - 10 * s), Math.round(6 * s), '#3f9d4a', c);
    disc(Math.round(tx - 5 * s), Math.round(ty - 17 * s), Math.round(3 * s), '#6cc56f', c); ellipse(tx, ty + 9, 8, 2, 'rgba(40,80,40,.35)', c); };
  tree(8, gy + 4, 1.1); tree(186, gy + 2, 1.2); tree(170, gy + 70, 1); tree(16, gy + 78, 1);
  R(150, gy + 2, 2, 12, '#4a5160', c); R(147, gy - 1, 8, 3, '#4a5160', c); R(148, gy + 2, 6, 1, '#ffe27a', c);
  const BX = 118, BY = gy + 96; SB.bench = { BX, BY };
  R(BX, BY, 24, 3, '#a0673a', c); R(BX, BY - 4, 24, 2, '#c0874a', c); R(BX + 2, BY + 3, 2, 4, K, c); R(BX + 20, BY + 3, 2, 4, K, c);
  ellipse(56, gy + 104, 24, 8, '#5aa0d8', c); ellipse(56, gy + 104, 22, 7, '#7cc0ee', c); R(44, gy + 101, 8, 1, '#b9e1fb', c); R(60, gy + 106, 6, 1, '#b9e1fb', c);
  ellipse(92, gy + 72, 20, 5, '#7a4a2a', c);
  for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; R(92 + Math.round(Math.cos(a) * 16 * prand()), gy + 71 + Math.round(Math.sin(a) * 3 * prand()), 2, 2, ['#ff4d4d', '#ff9fb0', '#ffe27a'][i % 3], c); }
  for (let i = 0; i < 40; i++) { const fx = Math.floor(prand() * LW), fy = gy + 56 + Math.floor(prand() * 60);
    if ((fx > 28 && fx < 84 && fy > gy + 94 && fy < gy + 114) || (fx > 116 && fx < 144 && fy > gy + 88 && fy < gy + 104) || (fx > 70 && fx < 114 && fy > gy + 66 && fy < gy + 78)) continue;
    R(fx, fy, 1, 1, ['#ff9fb0', '#ffe27a', '#ffffff', '#c9a2f5'][i % 4], c); }
}
function sideAmbulance(X, Y, dept, flash) {
  R(X, Y + 3, 21, 12, K); R(X + 1, Y + 4, 19, 10, '#f8f8f4');
  R(X + 20, Y + 6, 10, 9, K); R(X + 20, Y + 7, 9, 7, '#f8f8f4');
  R(X + 22, Y + 7, 6, 3, '#2c4a6e'); R(X + 22, Y + 7, 2, 1, '#7fb2e5');
  R(X + 1, Y + 10, 28, 2, dept.T); R(X + 1, Y + 12, 28, 1, dept.t);
  R(X + 9, Y + 4, 3, 6, dept.T); R(X + 7, Y + 6, 7, 2, dept.T);
  R(X + 13, Y + 1, 3, 2, flash ? '#3d7bff' : '#ff4d4d'); R(X + 16, Y + 1, 3, 2, flash ? '#ff4d4d' : '#3d7bff'); R(X + 12, Y + 3, 8, 1, K);
  if (flash !== undefined) { ctx.fillStyle = flash ? 'rgba(61,123,255,.3)' : 'rgba(255,77,77,.3)'; ctx.fillRect(X + 10, Y - 3, 12, 5); }
  R(X + 29, Y + 12, 2, 2, '#ffd23f');
  disc(X + 6, Y + 15, 3, K); disc(X + 6, Y + 15, 1, '#9aa3b2'); disc(X + 24, Y + 15, 3, K); disc(X + 24, Y + 15, 1, '#9aa3b2');
}
function drawSplash() {
  ctx.drawImage(splashBg, 0, 0);
  const { gy } = SB;
  // drifting clouds and flapping birds
  const cloud = (cx, cy) => { disc(cx, cy, 4, '#fff'); disc(cx + 5, cy - 2, 5, '#fff'); disc(cx + 11, cy, 4, '#fff'); R(cx - 4, cy, 19, 4, '#fff'); R(cx - 3, cy + 3, 17, 1, '#d9ecfb'); };
  [[12, 104, 3], [166, 150, 2], [70, 128, 4]].forEach(([x0, y, sp]) => cloud(Math.round(((x0 + T * sp) % (LW + 40)) - 20), y));
  const flap = Math.floor(T * 4) % 2;
  [[40, 92], [47, 88], [150, 64]].forEach(([x0, y], i) => { const x = Math.round((x0 + T * 6 + i * 3) % (LW + 20)) - 10;
    R(x, y, 1, 1, K); R(x + 2, y, 1, 1, K); if (flap) { R(x - 1, y - 1, 1, 1, K); R(x + 3, y - 1, 1, 1, K); } else { R(x - 1, y + 1, 1, 1, K); R(x + 3, y + 1, 1, 1, K); } R(x + 1, y + 1, 1, 1, K); });
  // title
  Font.bigCentered(ctx, 'AMBULANCE', 97, 10, '#fff', 3, K);
  Font.bigCentered(ctx, 'JAM', 97, 36 + Math.round(Math.sin(T * 3) * 1.5), '#ff4d4d', 5, K);
  // sign bulbs chase
  const s = SB.sign; for (let i = 4, k = 0; i < s.sw - 2; i += 6, k++) R(s.sx + i, s.sy - 3, 2, 2, (k + Math.floor(T * 5)) % 3 ? '#ffe27a' : '#8a7a3a');
  // windows with patients
  for (const w of SB.windows) {
    const lit = w.what !== 'dark';
    R(w.wx, w.wy, 16, 18, lit ? '#ffeab0' : '#2f4a6b'); R(w.wx, w.wy, 16, 4, lit ? '#fff3cc' : '#3b5b80');
    ctx.save(); ctx.beginPath(); ctx.rect(w.wx, w.wy, 16, 18); ctx.clip();
    const name = w.what.startsWith('curtain:') ? w.what.slice(8) : w.what, dept = deptByName(name);
    if (dept) { const bob = Math.floor(T * 1.5 + w.k + w.f) % 4 === 0 ? 1 : 0;
      const img = Sprites.patient(dept, 0, Math.floor(T * 6) % 2, (w.f + w.k) % 2); ctx.drawImage(img, w.wx + 1, w.wy + 18 - 15 - (img.height - 20) + bob); }
    if (w.what === 'blinds') { for (let yy = 0; yy < 11; yy += 2) R(w.wx, w.wy + yy, 16, 1, '#e9e2d2'); R(w.wx + 12, w.wy, 1, 12, '#8a8f98'); }
    if (w.what === 'plant') { R(w.wx + 5, w.wy + 13, 6, 5, '#c0673a'); disc(w.wx + 8, w.wy + 9, 4, '#3f9d4a'); disc(w.wx + 7, w.wy + 8, 2, '#5fc06a'); }
    if (w.what.startsWith('curtain:')) { R(w.wx, w.wy, 3, 18, '#ff9fb0'); R(w.wx + 13, w.wy, 3, 18, '#ff9fb0'); R(w.wx + 1, w.wy, 1, 18, '#ffc4cf'); }
    ctx.restore();
    R(w.wx + 8, w.wy, 1, 18, '#d6cbb4'); R(w.wx, w.wy + 1, 1, 16, 'rgba(255,255,255,.5)');
  }
  // traffic: one ambulance racing past with lights going, one parked
  const flash = Math.floor(T * 8) % 2 === 0;
  sideAmbulance(140, gy + 20, deptByName('Neuro'));
  sideAmbulance(Math.round(((T * 50) % (LW + 80)) - 40), gy + 17, deptByName('Cardiac'), flash);
  // patients shuffling along the pavement towards the ER
  ['Burns', 'Peds', 'Maternity', 'Ortho', 'Cardiac', 'Neuro'].forEach((n, i) => {
    const x = Math.round(LW + 20 - ((T * 12 + i * 34) % (LW + 60)));
    const img = Sprites.patient(deptByName(n), Math.floor(T * 6 + i) % 4, Math.floor(T * 6) % 2, true);
    ctx.drawImage(img, x - 7, gy + 52 - img.height + 2);
  });
  // bench sitter seeing stars, bobbing ducks
  { const img = Sprites.patient(deptByName('Neuro'), 2, 0, false); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, LW, SB.bench.BY + 2); ctx.clip();
    ctx.drawImage(img, SB.bench.BX + 4, SB.bench.BY - img.height + 5); ctx.restore(); }
  [[62, 99, 0], [40, 101, 1]].forEach(([dx, dyy, i]) => { const bob = Math.floor(T * 2 + i) % 2, x = dx + Math.round(Math.sin(T * 0.7 + i * 2) * 4), y = gy + dyy + bob;
    R(x, y, 6, 3, '#fff'); R(x + 4, y - 2, 3, 3, '#fff'); R(x + 7, y - 1, 2, 1, '#ffb02e'); R(x + 5, y - 1, 1, 1, K); });
  if (Math.floor(T * 2) % 2 === 0 || overlayT < 0.5) Font.bigCentered(ctx, 'TAP TO START', 97, LH - 28, '#fff', 2, K);
  if (level > 1) Font.smallCentered(ctx, 'CONTINUE: SHIFT ' + level + (career ? '   CAREER ' + fmt(career) : ''), 97, LH - 10, '#fff', 1, K);
}

// ---------- play rendering ----------
const flipIcon = [ '..k....', '.kk....', 'kkkkkk.', '.kk..k.', '..k..kk', '.kkkkkk', '.....kk', '.....k.' ];
function badge(x, y, w, h, bg) { R(x - 1, y - 1, w + 2, h + 2, K); R(x, y, w, h, bg); }
function drawVehicle(v, px, py, opts = {}) {
  const sh = v.shake > 0 ? Math.round(Math.sin(v.shake * 60) * 1.5) : 0;
  const x = Math.round(px) + sh, y = Math.round(py);
  if (!opts.noShadow) blit(Sprites.shadow(v.kind, v.len, v.dir), x + 1, y + 2);
  const img = v.kind === 'cart' ? Sprites.cart(v.dir) : Sprites.ambulance(v.revealed ? v.dept : TRIAGE, v.len, v.dir, opts.siren);
  blit(img, x, y);
  if (opts.siren !== undefined) { const col = opts.siren ? '#3d7bff' : '#ff4d4d'; ctx.globalAlpha = 0.16; ellipse(x, y, 15, 13, col); ctx.globalAlpha = 0.22; ellipse(x, y, 9, 8, col); ctx.globalAlpha = 1; }
  if (v.state !== 'lot') return;
  if (!v.revealed) { badge(x - 3, y - 3, 7, 7, K); Font.small(ctx, '?', x - 1, y - 2, '#fff'); }
  if (v.flip) { const a = v.dir * Math.PI / 4, bx = Math.round(x - Math.cos(a) * v.len * 0.3) - 3, by = Math.round(y - Math.sin(a) * v.len * 0.3) - 4;
    badge(bx, by, 7, 8, '#ffd23f'); flipIcon.forEach((row, yy) => [...row].forEach((ch, xx) => { if (ch === 'k') R(bx + xx, by + yy, 1, 1, K); })); }
  if (v.kind === 'cart') { const red = v.timer <= 2, s = String(v.timer), w = Font.smallWidth(s) + 4; badge(x - Math.floor(w / 2), y - 15, w, 7, red ? '#ff4d4d' : '#ffd23f');
    Font.small(ctx, s, x - Math.floor(w / 2) + 2, y - 14, red ? '#fff' : K); }
}
function drawPeople(list) {
  list.sort((a, b) => a.y - b.y);
  for (const p of list) { const img = Sprites.patient(p.dept, p.f, Math.floor(T * 6 + p.x) % 2, p.left); ctx.drawImage(img, Math.round(p.x - 7), Math.round(p.y - img.height + 2)); }
}
function drawPlay() {
  ctx.drawImage(playBg, 0, 0);
  drawPark();
  // the centre sign glints now and then to hint it can be tapped
  { const g = (T % 5) / 0.6; if (g < 1) { const x = Math.round(SIGN.x + g * (SIGN.w + 8)) - 4; for (let k = 0; k < 4; k++) if (x + k >= SIGN.x && x + k < SIGN.x + SIGN.w) R(x + k, SIGN.y + 3 - k + 4, 1, 4, 'rgba(255,255,255,.35)'); } }
  // bays
  for (let i = 0; i < SLOTS; i++) {
    const bx = bayX(i), locked = i >= G.open, bb = G.bays[i];
    R(bx, BAY_Y, BAY_W, BAY_H, locked ? '#3d4450' : '#5d6776');
    if (locked) { for (let k = 0; k < BAY_H; k += 4) { R(bx, BAY_Y + k, 1, 2, '#6b7584'); R(bx + BAY_W - 1, BAY_Y + k, 1, 2, '#6b7584'); }
      const pulse = i === G.open && Math.floor(T * 3) % 2; R(bx + 11, BAY_Y + 10, 4, 10, pulse ? '#4ade80' : '#22c55e'); R(bx + 8, BAY_Y + 13, 10, 4, pulse ? '#4ade80' : '#22c55e');
      Font.smallCentered(ctx, '-' + UNLOCK_COST, bayCx(i), BAY_Y + 26, '#ff8a8f');
      continue; }
    for (let k = 0; k < BAY_H; k++) { R(bx, BAY_Y + k, 1, 1, '#e6e9ee'); R(bx + BAY_W - 1, BAY_Y + k, 1, 1, '#e6e9ee'); }
    if (bb.state === 'parked' || bb.state === 'full') {
      const jig = bb.state === 'full' ? Math.round(Math.sin(bb.t * 70)) : 0, land = T - (bb.land ?? -9) < 0.3 ? Math.round(Math.sin((T - bb.land) / 0.3 * Math.PI) * 2) : 0;
      drawVehicle(bb.v, bayCx(i) + jig, bayCy() - land, { noShadow: true });
      if (bb.state === 'parked') { const s = String(bb.v.cap - bb.filled), w = Font.smallWidth(s) + 6;
        R(bayCx(i) - w / 2, BAY_Y + BAY_H - 8, w, 7, bb.v.dept.t); Font.small(ctx, s, bayCx(i) - w / 2 + 3, BAY_Y + BAY_H - 7, '#fff'); }
    }
  }
  // FULL! stamp drops onto a bay as it fills
  G.bays.forEach((bb, i) => { const age = T - (bb.stamp ?? -9); if (age > 1.1 || i >= G.open) return;
    ctx.globalAlpha = age < 0.9 ? 1 : (1.1 - age) / 0.2; Font.bigCentered(ctx, 'FULL!', bayCx(i), bayCy() - 4 - Math.round(Math.max(0, 1 - age * 8) * 10), '#ffe066', 1, K); ctx.globalAlpha = 1; });
  // lot
  const lot = G.vehicles.filter(v => v.state === 'lot').sort((a, b) => a.y - b.y);
  for (const v of lot) { let off = 0; if (v.bumpT > 0) off = v.bumpDist * Math.sin(Math.PI * v.bumpT);
    const a = v.dir * Math.PI / 4; drawVehicle(v, v.x + Math.cos(a) * off, v.y + Math.sin(a) * off); }
  // crowd
  const people = [];
  G.rows.forEach((row, i) => { if (!row.dept) return; const s = rowS(i), q = at(loopPath, s);
    row.lanes.forEach((on, l) => { if (!on) return; let p = laneXY(q, l);
      if (row.enter) { const t = ease(row.enter.t); p = { x: lerp(row.enter.x - q.ty * LANES[l], p.x, t), y: lerp(row.enter.y + q.tx * LANES[l], p.y, t) }; }
      people.push({ x: p.x, y: p.y, dept: row.dept, left: q.tx < -0.05, f: Math.floor((s + l * 3) / 4) % 4 }); }); });
  for (const f of G.funnels) f.q.forEach(p => { if (p.s < -ROW) return; const q = at(f.path, p.s);
    for (let l = 0; l < p.n; l++) { const ln = p.n === 2 ? l + 1 : l, pt = laneXY(q, ln); people.push({ x: pt.x, y: pt.y, dept: p.dept, left: q.tx < 0, f: p.moving ? Math.floor(T * 8 + ln) % 4 : 0 }); } });
  drawPeople(people);
  // funnel counters
  G.funnels.forEach((f, i) => { const hidden = f.q.filter(p => p.s < -ROW).reduce((a, p) => a + p.n, 0); if (!hidden) return;
    const s = '+' + hidden, w = Font.smallWidth(s) + 4, x = i ? LW - w - 3 : 3; badge(x, 16, w, 7, '#334155'); Font.small(ctx, s, x + 2, 17, '#fff'); });
  // walkers heading to the bays
  const walkers = [];
  for (const fl of G.flyers) { if (fl.t < 0) continue; const t = fl.t, bx = bayCx(fl.bay), by = BAY_Y + 8;
    let x, y; if (t < 0.45) { const u = t / 0.45; x = lerp(fl.x, DOOR.x, u); y = lerp(fl.y, DOOR.y, u); } else { const u = (t - 0.45) / 0.55; x = lerp(DOOR.x, bx, u); y = lerp(DOOR.y, by, u) - Math.sin(u * Math.PI) * 6; }
    walkers.push({ x, y, dept: fl.dept, left: false, f: Math.floor(T * 10) % 4 }); }
  drawPeople(walkers);
  drawParkOverlay();
  // moving vehicles on top
  for (const v of G.vehicles) if (v.state === 'exit' || v.state === 'route') drawVehicle(v, v.px, v.py, v.away ? { siren: Math.floor(T * 10) % 2 === 0 } : {});
  G.bays.forEach((bb, i) => { if (bb.state !== 'leaving') return; const t = bb.t, v = bb.v, flash = Math.floor(t * 10) % 2 === 0, ax = bayCx(i), ay = bayCy();
    let dir = 6, px = ax, py = ay;
    if (t < 0.45) py = ay + ease(t / 0.45) * 30;
    else if (t < 0.6) { dir = 7; py = ay + 30; px = ax + 2; }
    else { dir = 0; const u = t - 0.6; py = ay + 32; px = ax + 4 + u * u * 260; }
    v.dir = dir; drawVehicle(v, px, py, { siren: flash, noShadow: true });
    if (dir === 0 && t > 0.7) for (let k = 1; k < 4; k++) R(Math.round(px - v.len / 2 - k * 5 - (t * 40) % 4), Math.round(py) - 3 + k * 2, 3, 1, 'rgba(255,255,255,.7)'); });
  drawFx();
  for (const p of G.pops) { ctx.globalAlpha = p.t < 0.7 ? 1 : Math.max(0, 1 - (p.t - 0.7) / 0.2); blit(Sprites.icon(p.dept), p.x, p.y); ctx.globalAlpha = 1; }
  for (const f of G.floats) { ctx.globalAlpha = f.t < 1 ? 1 : Math.max(0, 1 - (f.t - 1) / 0.4); Font.bigCentered(ctx, f.text, Math.round(f.x), Math.round(f.y), f.col, 1, K); ctx.globalAlpha = 1; }
  drawCameo();
  drawHud();
  if (toast && toast.t > 0) { const w = Font.smallWidth(toast.msg) + 10; badge(Math.round(97 - w / 2), BAY_Y + BAY_H + 10, w, 11, '#334155'); Font.small(ctx, toast.msg, Math.round(97 - w / 2) + 5, BAY_Y + BAY_H + 13, '#fff'); }
}

// ---------- HUD + UI ----------
function iconMusic(x, y, on) { R(x + 5, y + 1, 1, 6, K); R(x + 6, y + 1, 2, 1, K); R(x + 7, y + 2, 1, 1, K); R(x + 2, y + 6, 4, 2, K); R(x + 3, y + 5, 2, 1, K); if (!on) slash(x, y); }
function iconSpeaker(x, y, on) { R(x + 1, y + 3, 2, 3, K); R(x + 3, y + 2, 1, 5, K); R(x + 4, y + 1, 1, 7, K); if (on) { R(x + 6, y + 3, 1, 3, K); R(x + 7, y + 1, 1, 1, K); R(x + 8, y + 2, 1, 5, K); R(x + 7, y + 7, 1, 1, K); } else slash(x, y); }
function iconRestart(x, y) { R(x + 2, y + 1, 4, 1, K); R(x + 1, y + 2, 1, 5, K); R(x + 2, y + 7, 4, 1, K); R(x + 6, y + 5, 1, 2, K); R(x + 6, y + 1, 1, 2, K); R(x + 7, y + 0, 1, 4, K); R(x + 5, y + 3, 3, 1, K); }
function slash(x, y) { for (let i = 0; i < 9; i++) R(x + i, y + i, 1, 1, '#e8424f'); }
function addButton(x, y, w, h, fn) { buttons.push({ x, y, w, h, fn }); }
function drawHud() {
  Font.small(ctx, 'SHIFT ' + G.n, 4, 4, '#334155');
  Font.bigCentered(ctx, fmt(G.shown), 97, 3, G.shown < 0 ? '#ff8a8f' : (G.score - G.shown > 0.5 ? '#ffe066' : '#fff'), 1, K);
  addButton(SIGN.x - 2, SIGN.y - 2, SIGN.w + 4, 28, () => { Sound.sfx.click(); screen = 'legend'; });
  const x0 = LW - 36;
  iconMusic(x0, 2, Sound.music); addButton(x0 - 3, 0, 13, 16, () => { Sound.toggleMusic(); if (Sound.music) Sound.play('play'); });
  iconSpeaker(x0 + 12, 2, Sound.effects); addButton(x0 + 9, 0, 13, 16, () => Sound.toggleSfx());
  iconRestart(x0 + 24, 2); addButton(x0 + 21, 0, 15, 16, () => { Sound.sfx.click(); startLevel(level); screen = 'card'; overlayT = 0; });
  for (let i = G.open; i < SLOTS; i++) addButton(bayX(i), BAY_Y, BAY_W, BAY_H, unlockBay);
}
function panel(x, y, w, h, head) {
  R(x + 2, y + 3, w, h, 'rgba(20,24,36,.35)');
  R(x - 1, y - 1, w + 2, h + 2, K); R(x, y, w, h, '#fbf7ef'); R(x, y, w, 16, head); R(x, y + 16, w, 1, K);
}
function button(label, cx, y, w, col, fn) {
  const x = Math.round(cx - w / 2), pressed = false;
  R(x - 1, y - 1, w + 2, 17, K); R(x, y, w, 15, col); R(x, y + 12, w, 3, 'rgba(0,0,0,.18)'); R(x, y, w, 1, 'rgba(255,255,255,.35)');
  Font.bigCentered(ctx, label, cx, y + 4, '#fff', 1);
  addButton(x, y, w, 15, fn);
}
function dim() { ctx.fillStyle = 'rgba(20,24,36,' + (0.45 * Math.min(1, overlayT / 0.2)).toFixed(3) + ')'; ctx.fillRect(0, 0, LW, LH); }
// panels spring up from below when they appear
const slideIn = () => { const t = Math.min(1, overlayT / 0.4), c1 = 1.70158; return Math.round((1 - (1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2))) * 90); };
function drawCard() {
  drawPlay(); buttons = buttons.filter(b => b.y < 16 && false); dim();
  const w = 170, x = Math.round(97 - w / 2), intro = INTROS[G.n];
  const lines = Font.wrap(G.blurb, w - 16), introLines = intro ? Font.wrap(intro, w - 16) : [];
  const h = 24 + lines.length * 7 + (introLines.length ? introLines.length * 7 + 8 : 0) + 30, y = Math.round(LH / 2 - h / 2) - 20 + slideIn();
  panel(x, y, w, h, '#1f4e9c');
  Font.bigCentered(ctx, 'SHIFT ' + G.n, 97, y + 5, '#fff', 1);
  let yy = y + 24;
  lines.forEach(l => { Font.smallCentered(ctx, l, 97, yy, '#475569'); yy += 7; });
  if (introLines.length) { yy += 4; R(x + 8, yy - 2, w - 16, introLines.length * 7 + 3, '#fff3c4'); introLines.forEach(l => { Font.smallCentered(ctx, l, 97, yy, '#7a4b00'); yy += 7; }); yy += 4; }
  button('CLOCK IN', 97, y + h - 24, 80, '#22a35a', () => { Sound.sfx.start(); Sound.play('play'); screen = 'play'; });
  addButton(0, 0, LW, LH, () => { Sound.sfx.start(); Sound.play('play'); screen = 'play'; });
  buttons.unshift(buttons.pop()); // the specific button wins over the full-screen one
}
function ecg(x, y, w, t) {
  // scrolling heartbeat trace
  const beat = u => { const p = u % 40; if (p < 2) return 0; if (p < 4) return -2; if (p < 6) return 0; if (p < 8) return 3; if (p < 10) return -12; if (p < 12) return 6; if (p < 14) return 0; if (p < 20) return -2; return 0; };
  const head = Math.floor(t * 60) % w;
  for (let i = 0; i < w; i++) { const age = (head - i + w) % w; if (age > w * 0.75) continue;
    const a = 1 - age / (w * 0.75); ctx.globalAlpha = a; R(x + i, y + beat(i + 400), 1, 1, '#3ddc84');
    const nxt = beat(i + 401); const cur = beat(i + 400); if (Math.abs(nxt - cur) > 1) R(x + i, y + Math.min(cur, nxt), 1, Math.abs(nxt - cur), '#3ddc84'); }
  ctx.globalAlpha = 1; R(x + head, y + beat(head + 400) - 1, 2, 2, '#c9ffd9');
}
function drawEnd(won) {
  drawPlay(); buttons = []; dim();
  const canOpen = G.over === 'jam' && G.open < SLOTS;
  const w = 170, x = Math.round(97 - w / 2), h = won ? 142 : (canOpen ? 112 : 92), y = Math.round(LH / 2 - h / 2) - 20 + slideIn();
  panel(x, y, w, h, won ? '#22a35a' : '#c0392b');
  Font.bigCentered(ctx, won ? 'DISCHARGED!' : (G.over === 'code' ? 'CODE BLUE!' : 'GRIDLOCK!'), 97, y + 5, '#fff', 1);
  R(x + 8, y + 22, w - 16, 26, '#14202e');
  if (won) ecg(x + 8, y + 38, w - 16, overlayT); else { R(x + 8, y + 35, w - 16, 1, '#3ddc84'); }
  Font.smallCentered(ctx, won ? '(' + G.endLine + ')' : G.endLine, 97, y + 54, '#475569');
  if (won) {
    Font.bigCentered(ctx, fmt(G.shown), 97, y + 64, '#22a35a', 2, K);
    Font.smallCentered(ctx, 'SHIFT CLEAR +1,000' + (G.bonus ? '   LOCKED BAYS +' + fmt(G.bonus) : ''), 97, y + 83, '#475569');
    Font.smallCentered(ctx, 'CAREER TOTAL ' + fmt(career), 97, y + 91, '#94a3b8');
    button('NEXT SHIFT', 97, y + h - 40, 96, '#22a35a', () => { Sound.sfx.click(); startLevel(level + 1); screen = 'card'; overlayT = 0; Sound.play('title'); });
    button('REPLAY', 97, y + h - 20, 96, '#64748b', () => { Sound.sfx.click(); startLevel(level); screen = 'card'; overlayT = 0; }); }
  else { let by = y + h - (canOpen ? 40 : 20);
    if (canOpen) { button('OPEN A BAY -' + UNLOCK_COST, 97, by, 130, '#22a35a', () => { G.over = null; unlockBay(); screen = 'play'; }); by += 20; }
    button('TRY AGAIN', 97, by, 130, '#c0392b', () => { Sound.sfx.click(); startLevel(level); screen = 'card'; overlayT = 0; }); }
  drawConfetti();
}

// ---------- patient legend (tap the centre sign) ----------
const LEGEND = { Cardiac: "Heart's fine. Diet isn't.", Neuro: 'Seeing stars. Literally.', Ortho: 'Trampoline. Age 47.',
  Peds: 'Swallowed a Lego. Again.', Maternity: 'Due yesterday. Not amused.', Burns: 'Checked if the grill was on.' };
function drawLegend() {
  drawPlay(); buttons = []; dim();
  const w = 180, x = Math.round(97 - w / 2), RH = 26, h = 22 + DEPTS.length * RH + 18 + 24, y = Math.max(4, Math.round(LH / 2 - h / 2) - 10) + slideIn();
  panel(x, y, w, h, '#1f4e9c');
  Font.bigCentered(ctx, "WHO'S WHO", 97, y + 5, '#fff', 1);
  DEPTS.forEach((d, i) => {
    const ry = y + 20 + i * RH, today = !G || DEPTS.indexOf(d) < G.cfg.depts;
    if (i) R(x + 6, ry, w - 12, 1, '#eadfca');
    ctx.globalAlpha = today ? 1 : 0.4;
    const img = Sprites.patient(d, Math.floor(T * 6 + i) % 4, Math.floor(T * 6 + i) % 2, false), px = x + 16, foot = ry + RH - 2;
    ellipse(px, foot, 5, 1, 'rgba(0,0,0,.15)');
    ctx.drawImage(img, px - 7, foot - img.height + 2);
    Font.big(ctx, d.name, x + 34, ry + 5, d.t, 1);
    Font.small(ctx, LEGEND[d.name], x + 34, ry + 15, '#64748b');
    // their icon drifts up off them
    for (let k = 0; k < 3; k++) { const u = (T * 0.7 + k / 3 + i * 0.17) % 1;
      ctx.globalAlpha = (today ? 1 : 0.4) * (u < 0.7 ? 1 : (1 - u) / 0.3);
      blit(Sprites.icon(d), Math.round(px + 7 + Math.sin(u * 6 + k * 2) * 3), Math.round(foot - img.height + 2 - u * 12)); }
    ctx.globalAlpha = 1;
  });
  const fy = y + 22 + DEPTS.length * RH;
  Font.smallCentered(ctx, "GREY ? AMBULANCES ARE TRIAGE.", 97, fy, '#94a3b8'); Font.smallCentered(ctx, "FREE THEIR ROAD TO SEE WHO THEY'RE FOR.", 97, fy + 7, '#94a3b8');
  const back = () => { Sound.sfx.click(); screen = 'play'; };
  button('BACK TO WORK', 97, y + h - 20, 100, '#22a35a', back);
  addButton(0, 0, LW, LH, back); buttons.unshift(buttons.pop());
}

// ---------- input ----------
function toArt(e) { return { x: (e.clientX - cssX) / cssScale, y: (e.clientY - cssY) / cssScale }; }
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  const p = toArt(e);
  if (screen === 'splash') { Sound.init(); Sound.play('title'); Sound.sfx.start(); startLevel(level); screen = 'card'; overlayT = 0; return; }
  Sound.init();
  for (const b of buttons) if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { b.fn(); return; }
  if (screen !== 'play' || G.over) return;
  if (cameoTap(p)) return;
  if (p.y < LOT_TOP - 4) taps.push({ x: p.x, y: p.y, t: 0 });
  if (inPond(p.x, p.y)) { duckHop = T; Sound.sfx.quack(); G.floats.push({ text: 'QUACK!', x: PARK.pond.x + 6, y: PARK.pond.y - 18, t: 0.3, col: '#fff' }); return; }
  let best = null, bd = Infinity;
  for (const v of onLot()) {
    const a = -v.dir * Math.PI / 4, c = Math.cos(a), s = Math.sin(a), lx = (p.x - v.x) * c - (p.y - v.y) * s, ly = (p.x - v.x) * s + (p.y - v.y) * c;
    if (Math.abs(lx) <= v.len / 2 + 2 && Math.abs(ly) <= halfW(v) + 2) { const d = Math.hypot(p.x - v.x, p.y - v.y); if (d < bd) { bd = d; best = v; } }
  }
  if (best) tapVehicle(best);
});

// ---------- main loop ----------
buildPlayBg(); buildSplashBg();
let lastShape = null, lastScreen = null;
let last = performance.now();
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  update(dt);
  if (G && G.cfg.shape !== lastShape) { buildPlayBg(); paintLotOutline(G.cfg.shape); lastShape = G.cfg.shape; }
  buttons = [];
  if (screen !== lastScreen) { lastScreen = screen; overlayT = 0; }
  const sh = shakeT > 0 ? shakeAmp : 0;
  ctx.save(); if (sh) { R(0, 0, LW, LH, K); ctx.translate(Math.round((Math.random() - 0.5) * 2 * sh), Math.round((Math.random() - 0.5) * 2 * sh)); }
  if (screen === 'splash') drawSplash();
  else if (screen === 'card') drawCard();
  else if (screen === 'play') drawPlay();
  else if (screen === 'win') drawEnd(true);
  else if (screen === 'lose') drawEnd(false);
  else if (screen === 'legend') drawLegend();
  ctx.restore();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.AJ = { get G() { return G; }, get screen() { return screen; }, set screen(s) { screen = s; }, startLevel, tapVehicle, update, onLot, lose };
// iOS only unlocks audio on certain gestures; make sure a touchend also tries
addEventListener('touchend', () => Sound.init(), { passive: true });
