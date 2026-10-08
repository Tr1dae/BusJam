// Emergency Rush: a three-lane corridor dash between shifts. A porter pushes a bed down
// pseudo-3D hospital hallways (classic arcade-racer projection, drawn as pixel rows/columns).
// Uses the shared helpers from game.js (R, disc, ellipse, Font, LW, LH, T, K, buttons...).
const Rush = (() => {
  const DRAW = 56;                 // segments drawn ahead (1 segment = 1 lane width)
  const PZ = 3;                    // player sits this far in front of the camera
  const LANE_PX = 60;              // lane width in pixels at the player's depth
  const K3 = LANE_PX * PZ;         // focal length * pixels per unit
  const WALL = 1.75;               // corridor half width (lanes are at -1, 0, 1)
  const hor = () => Math.round(LH * 0.36), floorY = () => LH - 46;
  const camH = () => (floorY() - hor()) / LANE_PX, ceil = () => camH() + 1.4;
  const BEND = 0.0016;             // the world curves away over the horizon

  // ---------- art: everything drawn at 32 px per lane ----------
  const cache = new Map();
  const art = (key, w, h, draw) => { let c = cache.get(key); if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); cache.set(key, c); } return c; };
  const OBJ = {
    wet:     { w: 0.6, h: 0.75, low: true,  name: 'wet floor sign' },
    bucket:  { w: 0.7, h: 0.65, low: true,  name: 'mop bucket' },
    spill:   { w: 3.0, h: 0.2,  low: true,  name: 'ice chip spill' },
    cart:    { w: 0.8, h: 1.3,  low: false, name: 'crash cart' },
    bed:     { w: 0.95, h: 1.0, low: false, name: 'parked bed' },
    vending: { w: 0.9, h: 1.7,  low: false, name: 'vending machine' },
    stroll:  { w: 1.9, h: 1.0,  low: false, name: 'patients on a stroll' },
    walker:  { w: 0.7, h: 1.0,  low: false, name: 'patient with a walker', mover: true },
    doctor:  { w: 0.6, h: 1.0,  low: false, name: 'doctor on his phone', mover: true },
    coffee:  { w: 0.4, h: 0.45, pickup: 'coffee' },
    icon:    { w: 0.35, h: 0.35, pickup: 'icon' },
    siren:   { w: 0.5, h: 0.45, pickup: 'siren' },
  };
  function sprite(o) {
    const g = (k, w, h, f) => art(k, w, h, f);
    switch (o.type) {
      case 'wet': return g('wet', 20, 24, c => { R(3, 0, 14, 22, K, c); R(4, 1, 12, 20, '#ffd23f', c); R(4, 1, 12, 2, '#fff1b0', c);
        R(9, 4, 2, 2, K, c); R(8, 7, 4, 1, K, c); R(9, 8, 2, 4, K, c); R(7, 12, 2, 1, K, c); R(11, 12, 3, 1, K, c); R(5, 16, 10, 1, '#d9a400', c);
        R(2, 22, 3, 2, K, c); R(15, 22, 3, 2, K, c); });
      case 'bucket': return g('bucket', 24, 22, c => { R(14, 0, 2, 10, '#a0673a', c); R(11, 6, 9, 4, '#e9e2d2', c);
        R(2, 8, 20, 13, K, c); R(3, 9, 18, 11, '#ffd23f', c); R(3, 9, 18, 2, '#7cc0ee', c); R(4, 13, 16, 1, '#d9a400', c); R(2, 20, 4, 2, K, c); R(18, 20, 4, 2, K, c); });
      case 'spill': return g('spill', 96, 8, c => { ellipse(48, 4, 46, 3, '#9fd6f5', c); ellipse(48, 4, 40, 2, '#c7ecfb', c);
        for (let i = 0; i < 14; i++) R(6 + i * 6 + (i % 3), 1 + (i % 3), 3, 3, i % 2 ? '#ffffff' : '#e3f6ff', c); });
      case 'cart': return g('cart', 26, 42, c => { R(1, 4, 24, 34, K, c); R(2, 5, 22, 32, '#e8424f', c);
        for (let i = 0; i < 4; i++) { R(2, 9 + i * 7, 22, 1, '#b52a3a', c); R(11, 11 + i * 7, 4, 1, '#ffd6dc', c); }
        R(4, 0, 18, 5, K, c); R(5, 1, 16, 3, '#9aa3b2', c); R(8, 1, 3, 2, '#ffd23f', c); R(15, 1, 4, 2, '#3ddc84', c);
        R(2, 38, 4, 4, K, c); R(20, 38, 4, 4, K, c); });
      case 'bed': return g('bed', 32, 32, c => { R(2, 6, 28, 8, K, c); R(3, 7, 26, 6, '#fff', c); R(5, 8, 22, 4, '#e9edf2', c);
        R(1, 12, 30, 12, K, c); R(2, 13, 28, 10, '#3a86ff', c); R(2, 13, 28, 2, '#8ab8ff', c); R(1, 22, 30, 3, '#9aa3b2', c);
        R(3, 25, 2, 4, '#6c7484', c); R(27, 25, 2, 4, '#6c7484', c); R(2, 29, 4, 3, K, c); R(26, 29, 4, 3, K, c); R(0, 0, 2, 25, '#9aa3b2', c); R(30, 0, 2, 25, '#9aa3b2', c); });
      case 'vending': return g('vending', 30, 56, c => { R(0, 0, 30, 56, K, c); R(1, 1, 28, 54, '#3a86ff', c); R(1, 1, 28, 2, '#8ab8ff', c);
        R(3, 5, 17, 34, '#cfe9f7', c); for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) R(5 + q * 5, 7 + r * 6, 3, 4, ['#ffd23f', '#e8424f', '#4ade80', '#ff7eb6'][(r + q) % 4], c);
        R(22, 6, 5, 4, '#14202e', c); for (let r = 0; r < 4; r++) R(23, 13 + r * 4, 3, 2, '#e9edf2', c); R(4, 44, 16, 6, '#1c3e80', c); R(1, 52, 28, 3, '#1c3e80', c); });
      case 'stroll': return g('stroll|' + o.depts.map(d => d.name).join(), 62, 32, c => { o.depts.forEach((d, i) => c.drawImage(Sprites.patient(d, (i * 2) % 4, 0, false), 2 + i * 20, 32 - 21)); });
      case 'walker': return g('walker|' + o.dept.name, 24, 32, c => { c.drawImage(Sprites.patient(o.dept, 0, 0, false), 2, 10);
        R(12, 18, 1, 13, '#9aa3b2', c); R(21, 18, 1, 13, '#9aa3b2', c); R(12, 18, 10, 1, '#9aa3b2', c); R(11, 30, 3, 2, '#e8e8e8', c); R(20, 30, 3, 2, '#e8e8e8', c); });
      case 'doctor': return g('doctor', 20, 32, c => { c.drawImage(Sprites.staff('doctor', ['#4f3322', '#38231a'], 0, false), 3, 0); R(14, 11, 3, 4, K, c); R(15, 12, 1, 2, '#7fb2e5', c); });
      case 'coffee': return g('coffee', 14, 16, c => { R(2, 3, 10, 13, K, c); R(3, 4, 8, 11, '#fff', c); R(3, 8, 8, 4, '#b5835a', c); R(1, 1, 12, 3, K, c); R(2, 2, 10, 1, '#e8424f', c); });
      case 'icon': return Sprites.icon(o.dept);
      case 'siren': return g('siren', 16, 14, c => { R(2, 2, 12, 10, K, c); R(3, 3, 5, 8, '#ff4d4d', c); R(8, 3, 5, 8, '#3d7bff', c); R(4, 4, 2, 2, '#ffb3b3', c); R(9, 4, 2, 2, '#b3cbff', c); R(1, 12, 14, 2, '#6c7484', c); });
    }
  }
  // porter seen from behind, both hands up on the bed's head rail
  const PORTER_BACK = [
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...khhhhhhhhk...',
    '...khhhhhhhhk...',
    '...kHhhhhhhHk...',
    '..ksHHHHHHHHsk..',
    '...kksssssskk...',
    'kk..kTTTTTTk..kk',
    'ksk.kTTTTTTk.ksk',
    'kTk.kTTTTTTk.kTk',
    'kTkkTTTTTTTTkkTk',
    'kTTTTTLLTTTTTTTk',
    '.kTTTTLTTTTTTTk.',
    '..kTTTLTTTTTTk..',
    '..kTTTTTTTTTtk..',
    '..kTTTTTTTTttk..',
    '...kkkkkkkkkk...',
  ];
  const BACK_LEGS = [
    ['....kt...tk.....', '....kt...tk.....', '....ko...ok.....'],
    ['....kt....tk....', '...kt.....tk....', '...ko......ok...'],
    ['....kt...tk.....', '....kt...tk.....', '....ko...ok.....'],
    ['...kt....tk.....', '...kt.....tk....', '..ko......ok....'],
  ];
  const porterBack = f => art('pb' + f, 16, 20, c => { const rows = PORTER_BACK.concat(BACK_LEGS[f]), pal = { k: K, h: '#3a2f3a', H: '#241c26', s: '#f4c7a1', T: '#4a7fd4', t: '#2f5a9e', L: '#8ab4ee', o: '#3a3f4b' };
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') R(x, y, 1, 1, pal[ch], c); })); });

  // ---------- state ----------
  let S = null;
  const rnd = (a, b) => a + Math.random() * (b - a), pickOne = a => a[Math.floor(Math.random() * a.length)];
  function build(shift) {
    const speed = Math.min(11 + shift * 0.35, 18), len = Math.round(speed * 40);
    const track = [];
    for (let i = 0; i < len + DRAW + 10; i++) track.push({ curve: 0, hill: 0, door: 0, poster: null, light: i % 4 === 0 });
    // gentle bends and rises
    for (let z = 30; z < len - 30;) { const n = Math.round(rnd(18, 40)), c = pickOne([-1, 1]) * rnd(0.0006, 0.0014), h = Math.random() < 0.4 ? pickOne([-1, 1]) * rnd(0.0004, 0.0009) : 0;
      for (let k = 0; k < n && z + k < len; k++) { const e = Math.sin(k / n * Math.PI); track[z + k].curve = c * e; track[z + k].hill = h * Math.cos(k / n * Math.PI * 2); }
      z += n + Math.round(rnd(10, 30)); }
    // doors and posters along the walls
    const POSTERS = [['WASH HANDS', '#fff3c4', '#7a4b00'], ['NO RUNNING', '#ffd6dc', '#b52a3a'], ['QUIET!', '#d6ecff', '#1f4e9c'], ['FLU SHOTS', '#dcf5e6', '#2e8a5f'], ['NO Q WORD', '#ffd6dc', '#b52a3a'], ['ICU →', '#fff', '#334155']];
    for (let z = 8; z < len; z += Math.round(rnd(5, 9))) { const side = pickOne([-1, 1]);
      if (Math.random() < 0.6) { track[z].door = side; track[z + 1].door = side; } else track[z].poster = { side, p: pickOne(POSTERS) }; }
    // sharp turns
    const turns = [], nTurns = shift < 4 ? 1 : shift < 10 ? 2 : 3;
    for (let k = 1; k <= nTurns; k++) turns.push({ z: Math.round(len * k / (nTurns + 1) + rnd(-20, 20)), dir: pickOne([-1, 1]), done: false });
    for (const t of turns) for (let z = t.z - 14; z <= t.z + 4; z++) if (track[z]) { track[z].curve = 0; track[z].hill = 0; track[z].door = 0; track[z].poster = null; }
    // obstacles in rows, always leaving a way through
    const objs = [], gap = Math.max(5, 10 - shift * 0.3), depts = DEPTS.slice(0, Math.min(6, 3 + Math.floor(shift / 2)));
    let sirenPlaced = false;
    const nearTurn = z => turns.some(t => z > t.z - 16 && z < t.z + 10);
    for (let z = 25; z < len - 20; z += Math.round(rnd(gap, gap + 5))) {
      if (nearTurn(z)) continue;
      const lanes = [-1, 0, 1].sort(() => Math.random() - 0.5), roll = Math.random();
      let free = [];
      if (roll < 0.28) { objs.push({ type: pickOne(['cart', 'bed', 'vending']), lane: lanes[0], z }); free = [lanes[1], lanes[2]]; }
      else if (roll < 0.5) { objs.push({ type: pickOne(['cart', 'bed', 'vending']), lane: lanes[0], z }, { type: pickOne(['cart', 'bed']), lane: lanes[1], z }); free = [lanes[2]]; }
      else if (roll < 0.62) { objs.push({ type: pickOne(['wet', 'bucket']), lane: lanes[0], z }, { type: 'cart', lane: lanes[1], z }); free = [lanes[2]]; }
      else if (roll < 0.72) { objs.push({ type: 'spill', lane: 0, z }); free = [-1, 0, 1]; }
      else if (roll < 0.8) { const side = pickOne([-1, 1]); objs.push({ type: 'stroll', lane: side * 0.5, z, depts: [pickOne(depts), pickOne(depts), pickOne(depts)] }); free = [-side]; }
      else if (roll < 0.9) { const from = pickOne([-1, 1]); objs.push({ type: 'walker', lane: from, z: z + 6, drift: -from * 0.25, dept: pickOne(depts) }); free = [-from, 0]; }
      else { objs.push({ type: 'doctor', lane: lanes[0], z: z + 10, walk: 2.2 }); free = [lanes[1], lanes[2]]; }
      // a line of coffee down a free lane, sometimes a department icon or the siren
      if (Math.random() < 0.55 && free.length) { const l = pickOne(free); for (let k = 1; k <= 4; k++) objs.push({ type: 'coffee', lane: l, z: z + 1.5 + k * 1.3 }); }
      else if (Math.random() < 0.35 && free.length) objs.push({ type: 'icon', lane: pickOne(free), z: z + 3, dept: Math.random() < 0.4 ? DEPTS[0] : pickOne(depts) });
      if (!sirenPlaced && z > len * 0.4 && free.length && Math.random() < 0.3) { objs.push({ type: 'siren', lane: pickOne(free), z: z + 4 }); sirenPlaced = true; }
    }
    return { track, objs, turns, len, speed, dest: pickOne(['OR', 'WARD']) };
  }

  function begin(shift) {
    const t = build(shift);
    S = { ...t, shift, z: 0, v: 0, lane: 0, laneX: 0, jump: -1, lives: 3, score: 0, coffees: 0, bumps: 0, combo: 0, boost: 0, hurt: 0,
          pan: null, crash: 0, done: null, doorT: 0, say: null, patient: pickOne(DEPTS.slice(0, Math.min(6, 3 + Math.floor(shift / 2)))), pops: [], endT: 0 };
    screen = 'rushIntro'; overlayT = 0;
  }
  const say = (text, col = '#fff') => { S.say = { text, t: 0, col }; };
  const nextTurn = () => S.turns.find(t => !t.done);

  // ---------- update ----------
  function update(dt) {
    if (!S || screen !== 'rush') return;
    const s = S;
    if (s.done) { s.endT += dt; if (s.done === 'win') { s.doorT += dt; s.z += s.v * dt * Math.max(0, 1 - s.endT); }
      if (s.endT > 1.4 && screen === 'rush') { screen = 'rushEnd'; overlayT = 0; } return; }
    const target = s.speed * (s.boost > 0 ? 1.45 : 1);
    if (s.crash > 0) { s.crash -= dt; s.v = Math.max(0, s.v - 40 * dt); } else s.v += (target - s.v) * Math.min(1, dt * 1.5);
    s.z += s.v * dt;
    s.laneX += Math.sign(s.lane - s.laneX) * Math.min(Math.abs(s.lane - s.laneX), dt * 7);
    if (s.jump >= 0) { s.jump += dt / 0.62; if (s.jump >= 1) { s.jump = -1; puff(LW / 2 + s.laneX * LANE_PX, floorY() + 2, 4); } }
    if (s.boost > 0) s.boost -= dt; if (s.hurt > 0) s.hurt -= dt;
    if (s.say) { s.say.t += dt; if (s.say.t > 1.3) s.say = null; }
    s.pops.forEach(p => p.t += dt); s.pops = s.pops.filter(p => p.t < 0.8);
    s.score += s.v * dt * 2;
    // turns: the button shows as a junction approaches; reaching the wall without turning is a crash
    const tn = nextTurn();
    if (s.pan) { s.pan.t += dt / 0.45; if (s.pan.t >= 0.5 && !s.pan.flipped) { s.pan.flipped = true; s.pan.turn.done = true; } if (s.pan.t >= 1) s.pan = null; }
    else if (tn && s.z + PZ >= tn.z - 1.2) { tn.crashed = true; bump(true); startPan(tn); }
    // movers
    for (const o of s.objs) { if (o.walk) o.z -= o.walk * dt; if (o.drift) { o.lane += o.drift * dt; if (Math.abs(o.lane) > 1.1) o.drift = -o.drift; } }
    // collisions at the player's depth
    const pz = s.z + PZ, jumpH = s.jump >= 0 ? Math.sin(s.jump * Math.PI) : 0;
    for (const o of s.objs) {
      if (o.gone || o.z > pz + 0.35 || o.z < pz - 0.6) continue;
      const def = OBJ[o.type], reach = def.w / 2 + (def.pickup ? 0.4 : 0.32);
      if (Math.abs(o.lane - s.laneX) > reach) continue;
      if (def.pickup) { o.gone = true; collect(o); continue; }
      if (def.low && jumpH > 0.3) { o.cleared = true; if (!o.scored) { o.scored = true; s.score += 15; } continue; }
      if (o.cleared) continue;
      o.gone = true;
      if (s.boost > 0) { s.score += 25; sparkle(LW / 2 + (o.lane - s.laneX) * LANE_PX, floorY() - 20, 10, ['#ffe066', '#fff']); Sound.sfx.pop(); say('BEEP BEEP!'); continue; }
      bump(false);
    }
    s.objs = s.objs.filter(o => o.z > s.z - 2);
    if (s.z + PZ >= s.len) { s.done = 'win'; s.endT = 0; s.score += 500; Sound.sfx.win(); dropConfetti(40, true); say(pickOne(['WHEEE!', 'MADE IT!', "I'M FINE!"])); }
  }
  function bump(wall) {
    const s = S; if (s.hurt > 0 && !wall) return;
    s.lives--; s.bumps++; s.hurt = 1; s.combo = 0; s.crash = wall ? 0.6 : 0.35; s.v *= wall ? 0.2 : 0.55;
    Sound.sfx.honk(); buzz(60); shakeScreen(0.3, 2); say(pickOne(["I'M FINE!", 'OOF!', 'MY HIP!', 'WATCH IT!', 'OW!']), '#ffd6dc');
    if (s.lives <= 0) { s.done = 'lose'; s.endT = 0; Sound.sfx.lose(); }
  }
  function collect(o) {
    const s = S, x = LW / 2 + (o.lane - s.laneX) * LANE_PX, y = floorY() - 30;
    if (o.type === 'coffee') { s.coffees++; s.combo++; s.score += 10 * Math.min(s.combo, 5); Sound.sfx.board(Math.min(s.combo, 9)); s.pops.push({ text: '+' + 10 * Math.min(s.combo, 5), x, y, t: 0 }); }
    if (o.type === 'icon') { s.score += 50; Sound.sfx.bonus(); sparkle(x, y, 12, [o.dept.T, o.dept.L]); s.pops.push({ text: '+50', x, y, t: 0 });
      if (o.dept === DEPTS[0] && s.lives < 3) { s.lives++; say('+1 HEART!', '#ffd6dc'); } }
    if (o.type === 'siren') { s.boost = 4.5; Sound.sfx.siren(); say('NEE NAW!'); }
  }
  function startPan(turn) { S.pan = { t: 0, dir: turn.dir, turn, flipped: false }; Sound.sfx.whirr(); }

  // ---------- input ----------
  function tap(p) {
    const s = S; if (!s || s.done || screen !== 'rush') return;
    const tn = nextTurn();
    if (tn && !s.pan && tn.z - (s.z + PZ) < 16 && p.y < 70) {
      startPan(tn); const d = tn.z - (s.z + PZ); s.score += d < 6 ? 100 : 50; say(d < 6 ? 'PERFECT TURN!' : 'NICE TURN!', '#c9ffd9'); return; }
    const l = p.x < LW / 3 ? -1 : p.x > LW * 2 / 3 ? 1 : 0;
    if (l === s.lane) { if (s.jump < 0) { s.jump = 0; Sound.sfx.boing(); if (Math.random() < 0.4) say('WHEEE!'); } }
    else { s.lane = l; Sound.sfx.tap(); }
  }

  // ---------- rendering ----------
  // distance haze: colours fade towards the far end of the corridor (cached in 8 steps)
  const fogCache = new Map(), FOG = [226, 234, 238];
  function fog(hex, t) { const q = Math.min(7, Math.floor(t * 8)), key = hex + q; let c = fogCache.get(key);
    if (!c) { const n = parseInt(hex.slice(1), 16), f = q / 7 * 0.85, ch = [n >> 16, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (FOG[i] - v) * f));
      c = '#' + ch.map(v => v.toString(16).padStart(2, '0')).join(''); fogCache.set(key, c); } return c; }
  // filled trapezoid between two horizontal spans (far row y2, near row y1)
  function rows(y1, xa1, xb1, y2, xa2, xb2, col) {
    if (y1 === y2) return; ctx.fillStyle = col;
    const top = Math.max(0, Math.ceil(Math.min(y1, y2))), bot = Math.min(LH, Math.floor(Math.max(y1, y2)));
    for (let y = top; y <= bot; y++) { const t = (y - y2) / (y1 - y2), a = xa2 + (xa1 - xa2) * t, b = xb2 + (xb1 - xb2) * t;
      ctx.fillRect(Math.round(Math.min(a, b)), y, Math.round(Math.abs(b - a)) + 1, 1); }
  }
  // wall strip between two vertical spans, with horizontal bands (Y in world units)
  function wallCols(x1, f1, c1, x2, f2, c2, bands) {
    const lo = Math.max(0, Math.ceil(Math.min(x1, x2))), hi = Math.min(LW - 1, Math.floor(Math.max(x1, x2)));
    for (let x = lo; x <= hi; x++) { const t = x2 === x1 ? 0 : (x - x2) / (x1 - x2), fy = f2 + (f1 - f2) * t, cy = c2 + (c1 - c2) * t, H = ceil();
      for (const [ya, yb, col] of bands) { const pa = fy + (cy - fy) * (ya / H), pb = fy + (cy - fy) * (yb / H); ctx.fillStyle = col; ctx.fillRect(x, Math.round(pb), 1, Math.max(1, Math.round(pa - pb))); } }
  }
  function draw() {
    const s = S, H = ceil(), CH = camH(), hz = hor();
    ctx.fillStyle = '#e2eaee'; ctx.fillRect(0, 0, LW, LH);
    const pan = s.pan, ox = pan ? Math.round((pan.t < 0.5 ? -pan.dir * Math.pow(pan.t / 0.5, 2) : pan.dir * Math.pow(1 - (pan.t - 0.5) / 0.5, 2)) * LW) : 0;
    ctx.save(); ctx.translate(ox, 0);
    const camZ = s.z, base = Math.floor(camZ), frac = camZ - base, camX = s.laneX * 0.55;
    // accumulate bends from the camera forward
    const xs = [], ys = []; let x = 0, dx = 0, y = 0, dy = 0;
    for (let n = 0; n <= DRAW + 1; n++) { const seg = s.track[base + n] || s.track[s.track.length - 1]; xs.push(x - dx * frac); ys.push(y); x += dx; dx += seg.curve; y += dy; dy += seg.hill; }
    const P = (X, Y, n, off = 0) => { const dz = Math.max(0.25, n - frac + off), sc = K3 / dz, bend = -BEND * dz * dz;
      return { x: LW / 2 + (X + xs[n] - camX) * sc, y: hz + (CH - Y - ys[n] - bend) * sc, s: sc }; };
    const tn = s.pan && s.pan.flipped ? null : nextTurn(), endN = Math.min(DRAW, s.len - base + 1), turnN = tn ? tn.z - base : 1e9, lastN = Math.min(endN, turnN);
    // segments, far to near
    for (let n = lastN - 1; n >= 0; n--) {
      const zi = base + n, seg = s.track[zi] || {}, a = P(0, 0, n), b = P(0, 0, n + 1);
      if (b.y < -40) continue;
      const fl1 = P(-WALL, 0, n), fr1 = P(WALL, 0, n), fl2 = P(-WALL, 0, n + 1), fr2 = P(WALL, 0, n + 1);
      const cl1 = P(-WALL, H, n), cr1 = P(WALL, H, n), cl2 = P(-WALL, H, n + 1), cr2 = P(WALL, H, n + 1);
      const ft = n / DRAW, F = c => fog(c, ft);
      // ceiling with light panels
      rows(cl1.y, cl1.x, cr1.x, cl2.y, cl2.x, cr2.x, F(zi % 2 ? '#f4f2ea' : '#ebe8de'));
      if (seg.light) { const l1 = P(-0.55, H, n, 0.15), r1 = P(0.55, H, n, 0.15), l2 = P(-0.55, H, n, 0.75), r2 = P(0.55, H, n, 0.75); rows(l1.y, l1.x, r1.x, l2.y, l2.x, r2.x, '#fffbe0'); }
      // floor tiles, dashed lane lines, and red and blue wayfinding stripes
      rows(fl1.y, fl1.x, fr1.x, fl2.y, fl2.x, fr2.x, F(zi % 2 ? '#d6e2e9' : '#c3d2dc'));
      const stripe = (lx, w, col) => { const p1 = P(lx - w, 0, n), q1 = P(lx + w, 0, n), p2 = P(lx - w, 0, n + 1), q2 = P(lx + w, 0, n + 1); rows(p1.y, p1.x, q1.x, p2.y, p2.x, q2.x, F(col)); };
      if (zi % 2 === 0) for (const lx of [-0.5, 0.5]) stripe(lx, 0.03, '#a9bccb');
      stripe(-1.5, 0.07, '#e8424f'); stripe(1.5, 0.07, '#3a86ff');
      // walls
      const openSide = tn && n >= turnN - 3 ? tn.dir : 0;
      for (const side of [-1, 1]) {
        const f1 = side < 0 ? fl1 : fr1, f2 = side < 0 ? fl2 : fr2, c1 = side < 0 ? cl1 : cr1, c2 = side < 0 ? cl2 : cr2;
        if (openSide === side) { wallCols(f1.x, f1.y, c1.y, f2.x, f2.y, c2.y, [[0, 2.6, F('#7f95a6')], [2.6, H, F('#f2efe6')], [0, 0.12, F('#c3d2dc')]]); continue; }
        // cream upper wall, mint wainscot with a handrail, dark skirting
        const bands = [[0, H, F(zi % 2 ? '#f3efe4' : '#ece7da')], [0, 1.1, F(zi % 2 ? '#a9d8c6' : '#9ccfbc')], [0, 0.2, F('#5f8f80')], [1.1, 1.2, F('#7d8ca1')], [1.2, 1.25, F('#c8d3db')]];
        if (seg.door === side) bands.push([0, 2.35, F('#7a5236')], [0, 2.25, F(zi % 2 ? '#c99460' : '#b9844f')], [1.45, 2.0, F('#9ed0f7')]);
        if (seg.poster && seg.poster.side === side) bands.push([1.45, 2.35, F('#334155')], [1.5, 2.3, F(seg.poster.p[1])]);
        wallCols(f1.x, f1.y, c1.y, f2.x, f2.y, c2.y, bands);
        if (seg.poster && seg.poster.side === side && a.s > 30) { const m = P(side * WALL, 1.9, n, 0.5); Font.smallCentered(ctx, seg.poster.p[0].replace('→', '>'), Math.round(m.x - side * 6), Math.round(m.y - 2), seg.poster.p[2]); }
      }
      // objects standing on this segment, far ones first
      const here = s.objs.filter(o => !o.gone && o.z >= zi && o.z < zi + 1 && o.z > s.z + PZ - 0.6).sort((p, q) => q.z - p.z);
      for (const o of here) drawObj(o, P(o.lane, 0, n, o.z - zi));
    }
    // end of this corridor: a wall at the junction, or the double doors at the finish
    if (lastN < DRAW) {
      const n = lastN, l = P(-WALL, 0, n), r = P(WALL, 0, n), tl = P(-WALL, H, n);
      R(Math.round(l.x), Math.round(tl.y), Math.round(r.x - l.x), Math.round(l.y - tl.y), fog('#ece7da', n / DRAW)); R(Math.round(l.x), Math.round(l.y - (l.y - tl.y) * 1.1 / H), Math.round(r.x - l.x), Math.round((l.y - tl.y) * 1.1 / H), fog('#9ccfbc', n / DRAW));
      R(Math.round(l.x), Math.round(l.y - (l.y - tl.y) * 0.25 / H), Math.round(r.x - l.x), Math.max(1, Math.round((l.y - tl.y) * 0.25 / H)), '#9fb3bb');
      const sc = l.s;
      if (tn && turnN <= endN) {
        const m = P(0, 1.9, n), w = Math.round(1.6 * sc), h = Math.round(0.7 * sc);
        if (w > 8) { R(Math.round(m.x - w / 2), Math.round(m.y - h / 2), w, h, '#22a35a'); arrow(Math.round(m.x), Math.round(m.y), Math.max(1, Math.round(sc / 16)), tn.dir, '#fff'); }
      } else {
        // double doors with porthole windows and the destination sign; they swing open as we arrive
        const open = s.done === 'win' ? Math.min(1, s.doorT / 0.5) : 0, d0 = P(-1.2, 0, n), d1 = P(1.2, 0, n), dt = P(0, 2.6, n), wd = (d1.x - d0.x) / 2;
        for (const side of [-1, 1]) { const w = Math.round(wd * (1 - open)), xL = side < 0 ? Math.round(d0.x) : Math.round(d1.x - w);
          R(Math.round(side < 0 ? d0.x : d1.x - wd), Math.round(dt.y), Math.round(wd), Math.round(d0.y - dt.y), '#2b3446');
          if (w > 0) { R(xL, Math.round(dt.y), w, Math.round(d0.y - dt.y), '#3a86ff'); R(xL, Math.round(dt.y), w, 1, '#8ab8ff');
            if (w > 4) disc(Math.round(xL + w / 2), Math.round(dt.y + (d0.y - dt.y) * 0.3), Math.max(1, Math.round(w / 5)), '#cfe9f7'); } }
        const sg = P(0, 3.1, n), txt = s.dest, scale = Math.max(1, Math.round(sc / 40));
        const tw = Font.bigWidth(txt, scale) + 8 * scale; R(Math.round(sg.x - tw / 2), Math.round(sg.y - 5 * scale), tw, 11 * scale, '#e8424f'); Font.bigCentered(ctx, txt, Math.round(sg.x), Math.round(sg.y - 3 * scale), '#fff', scale);
      }
    }
    ctx.restore();
    if (pan) { ctx.globalAlpha = 0.35; for (let i = 0; i < 14; i++) R(0, Math.floor((i * 37 + T * 400) % LH), LW, 1, '#fff'); ctx.globalAlpha = 1; }
    drawPlayer();
    // speed lines while boosted
    if (s.boost > 0) { ctx.globalAlpha = 0.5; for (let i = 0; i < 10; i++) { const a = i * 0.63 + T * 3, r = (T * 300 + i * 40) % 140 + 30; R(Math.round(LW / 2 + Math.cos(a) * r), Math.round(hz + Math.sin(a) * r * 0.7), 2, 2, i % 2 ? '#ff4d4d' : '#3d7bff'); } ctx.globalAlpha = 1; }
    drawFx();
    drawHud();
  }
  function arrow(cx, cy, k, dir, col) { // chunky arrow pointing left (-1) or right (1); k = pixel size
    for (let i = 0; i < 5; i++) R(cx + dir * (2 - i) * k, cy - i * k, k, (2 * i + 1) * k, col);
    R(dir > 0 ? cx - 7 * k : cx + 3 * k, cy - k, 5 * k, 3 * k, col);
  }
  function drawObj(o, p) {
    const def = OBJ[o.type], img = sprite(o), k = p.s / 32;
    let w = img.width * k, h = img.height * k;
    if (o.type === 'icon') { w = 0.5 * p.s; h = 0.5 * p.s; } else if (def.pickup) { w *= 1.25; h *= 1.25; }
    const bob = def.pickup ? Math.sin(T * 5 + o.z) * 0.08 * p.s + 0.25 * p.s : 0;
    if (w < 1 || h < 1) return;
    // pickups glow and twinkle so they read as treats, not obstacles
    if (def.pickup && w > 3) { const cy = Math.round(p.y - h / 2 - bob), r = Math.round(w * (0.75 + Math.sin(T * 6 + o.z) * 0.08));
      ctx.globalAlpha = 0.35; ellipse(Math.round(p.x), cy, r, r, '#fff7b0'); ctx.globalAlpha = 1;
      if (w > 8 && Math.floor(T * 4 + o.z) % 3 === 0) { const tx = Math.round(p.x + w * 0.55), ty = cy - Math.round(h * 0.5); R(tx - 1, ty, 3, 1, '#fff'); R(tx, ty - 1, 1, 3, '#fff'); } }
    ctx.globalAlpha = 0.2; ellipse(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(p.s * 0.06)), '#1d2b3a'); ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(p.x - w / 2), Math.round(p.y - h - bob), Math.round(w), Math.round(h));
    if (o.type === 'siren' && Math.floor(T * 8) % 2) { ctx.globalAlpha = 0.3; ellipse(Math.round(p.x), Math.round(p.y - h / 2 - bob), Math.round(w), Math.round(w * 0.8), '#ff4d4d'); ctx.globalAlpha = 1; }
  }
  function drawPlayer() {
    const Z = 1.2, u = v => Math.round(v * Z);  // the bed and porter are drawn a size up for readability
    const s = S, x = Math.round(LW / 2 + (s.laneX - s.laneX * 0.55) * LANE_PX), fy = floorY(), jumpH = s.jump >= 0 ? Math.sin(s.jump * Math.PI) : 0, lift = Math.round(jumpH * 40);
    const blink = s.hurt > 0 && Math.floor(T * 14) % 2, tilt = Math.round((s.lane - s.laneX) * 4);
    ctx.globalAlpha = 0.25; ellipse(x, fy + 4, Math.round(u(26) - jumpH * 10), 5, '#1d2b3a'); ctx.globalAlpha = 1;
    if (blink) ctx.globalAlpha = 0.45;
    const y = fy - lift, d = s.patient;
    // far wheels, frame, blanket, near rail
    for (const wx of [-16, 16]) { R(x + u(wx) - 1 + tilt, y - u(28), 1, u(6), '#6c7484'); R(x + u(wx) - 2 + tilt, y - u(23), 5, 4, K); }
    for (const wx of [-20, 20]) { R(x + u(wx), y - u(10), 2, u(8), '#6c7484'); R(x + u(wx) - 2, y - 4, 6, 5, K); R(x + u(wx) - 1, y - 3, 3, 1, '#9aa3b2'); }
    rows(y - u(9), x - u(23), x + u(23), y - u(33), x - u(17) + tilt, x + u(17) + tilt, K);
    rows(y - u(10), x - u(22), x + u(22), y - u(32), x - u(16) + tilt, x + u(16) + tilt, d.T);
    rows(y - u(10), x - u(22), x + u(22), y - u(14), x - u(21), x + u(21), '#ffffff');
    rows(y - u(22), x - u(19) + tilt, x + u(19) + tilt, y - u(25), x - u(18) + tilt, x + u(18) + tilt, d.L);
    R(x - u(23), y - u(9), u(46) + 1, 4, '#9aa3b2'); R(x - u(23), y - u(9), u(46) + 1, 1, '#c8ced8');
    R(x - u(17) + tilt, y - u(36), u(34) + 1, 4, '#9aa3b2'); R(x - 4 + tilt, y - u(39) - 1, 4, 4, Math.floor(T * 8) % 2 ? '#ff4d4d' : '#3d7bff'); R(x + 1 + tilt, y - u(39) - 1, 4, 4, Math.floor(T * 8) % 2 ? '#3d7bff' : '#ff4d4d');
    // the patient sitting up for the ride
    const img = Sprites.patient(d, jumpH > 0.2 ? 1 : 2, Math.floor(T * 6) % 2, s.laneX > s.lane + 0.05), pw = Math.round(img.width * 1.8), ph = Math.round(img.height * 1.8);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, LW, y - u(20)); ctx.clip(); ctx.drawImage(img, x - Math.round(pw / 2) + tilt, y - u(20) - ph + u(12) - (jumpH > 0.3 ? 4 : 0), pw, ph); ctx.restore();
    // porter behind, hands on the rail, running
    const pb = porterBack(s.v > 1 ? Math.floor(T * 12) % 4 : 0), py = fy + u(22) - Math.round(lift * 0.85);
    ctx.drawImage(pb, x - u(16), py - u(40), u(32), u(40));
    ctx.globalAlpha = 1;
    if (s.boost > 0) { ctx.globalAlpha = 0.18; ellipse(x, y - u(20), u(34), u(26), Math.floor(T * 8) % 2 ? '#ff4d4d' : '#3d7bff'); ctx.globalAlpha = 1; }
    if (s.say) { const t = s.say, w = Font.smallWidth(t.text) + 8, bx = Math.max(2, Math.min(LW - w - 2, x - w / 2)), by = y - u(66) - Math.round(t.t * 6);
      badge(Math.round(bx), by, w, 9, '#fff'); R(Math.round(x - 1), by + 9, 3, 2, '#fff'); Font.small(ctx, t.text, Math.round(bx) + 4, by + 2, '#334155'); }
    for (const p of s.pops) { ctx.globalAlpha = 1 - p.t / 0.8; Font.bigCentered(ctx, p.text, Math.round(p.x), Math.round(p.y - p.t * 20), '#ffe066', 1, K); } ctx.globalAlpha = 1;
  }
  function drawHud() {
    const s = S;
    R(0, 0, LW, 13, 'rgba(20,24,36,.55)');
    for (let i = 0; i < 3; i++) { const on = i < s.lives, hx = 4 + i * 10; R(hx + 1, 3, 2, 1, on ? '#ff4d6d' : '#55606e'); R(hx + 4, 3, 2, 1, on ? '#ff4d6d' : '#55606e'); R(hx, 4, 7, 2, on ? '#ff4d6d' : '#55606e'); R(hx + 1, 6, 5, 1, on ? '#ff4d6d' : '#55606e'); R(hx + 2, 7, 3, 1, on ? '#ff4d6d' : '#55606e'); R(hx + 3, 8, 1, 1, on ? '#ff4d6d' : '#55606e'); }
    Font.bigCentered(ctx, fmt(s.score), 97, 3, '#fff', 1, K);
    Font.small(ctx, s.dest, LW - 4 - Font.smallWidth(s.dest), 4, '#ffe066');
    // progress to the doors
    const pw = LW - 16, pr = Math.min(1, (s.z + PZ) / s.len); R(8, 15, pw, 3, 'rgba(20,24,36,.4)'); R(8, 15, Math.round(pw * pr), 3, '#4ade80');
    for (const t of s.turns) R(8 + Math.round(pw * t.z / s.len), 14, 1, 5, t.done ? '#94a3b8' : '#ffd23f');
    // the turn prompt
    const tn = nextTurn(), d = tn && !s.pan ? tn.z - (s.z + PZ) : 1e9;
    if (d < 16 && !s.done) { const urgent = d < 6, pulse = Math.floor(T * (urgent ? 10 : 5)) % 2, w = 120, bx = Math.round(97 - w / 2), by = 24;
      R(bx - 1, by - 1, w + 2, 38, K); R(bx, by, w, 36, pulse ? '#ffd23f' : '#ffb020'); R(bx, by + 30, w, 6, 'rgba(0,0,0,.15)');
      Font.bigCentered(ctx, 'TURN', 97 - tn.dir * 14, by + 11, K, 2); arrow(tn.dir > 0 ? bx + w - 22 : bx + 22, by + 18, 3, tn.dir, K); }
  }

  // ---------- intro and results ----------
  function drawIntro() {
    draw(); dim();
    const w = 176, x = Math.round(97 - w / 2), h = 118, y = Math.round(LH / 2 - h / 2) + slideIn();
    panel(x, y, w, h, '#e8424f');
    Font.bigCentered(ctx, 'EMERGENCY RUSH!', 97, y + 5, '#fff', 1);
    const lines = Font.wrap('Get the ' + S.patient.name.toLowerCase() + ' patient to the ' + (S.dest === 'OR' ? 'OR' : 'ward') + ', fast. Tap a lane to switch. Tap your own lane to hop over low stuff. Tap TURN when it flashes. Three bumps and you\'re out.', w - 16);
    lines.forEach((l, i) => Font.smallCentered(ctx, l, 97, y + 24 + i * 7, '#475569'));
    Font.smallCentered(ctx, 'NO BUMPS = A FREE BAY NEXT SHIFT', 97, y + h - 52, '#2e8a5f');
    button('NEXT', 97, y + h - 42, 100, '#22a35a', () => { Sound.sfx.click(); screen = 'rushHow'; overlayT = 0; });
    button('SKIP', 97, y + h - 22, 100, '#64748b', () => { Sound.sfx.click(); finish(false); });
  }
  // second page: the actual sprites, so nobody swerves around the coffee
  function drawHow() {
    draw(); dim();
    const w = 184, x = Math.round(97 - w / 2), h = 224, y = Math.max(4, Math.round(LH / 2 - h / 2)) + slideIn();
    panel(x, y, w, h, '#e8424f');
    Font.bigCentered(ctx, "WHAT'S WHAT", 97, y + 5, '#fff', 1);
    ctx.imageSmoothingEnabled = false;
    const put = (img, cx, by, k, bob) => { const iw = Math.round(img.width * k), ih = Math.round(img.height * k); ctx.drawImage(img, Math.round(cx - iw / 2), by - ih - (bob ? Math.round(Math.sin(T * 5 + cx) * 1.5) : 0), iw, ih); };
    const glow = (cx, cy) => { ctx.globalAlpha = 0.5; ellipse(cx, cy, 10, 9, '#fff2a8'); ctx.globalAlpha = 1; };
    const head = (text, yy, bg) => { R(x + 6, yy, w - 12, 10, bg); Font.smallCentered(ctx, text, 97, yy + 2, '#fff'); };
    const line = (a, b, yy, col) => { Font.small(ctx, a, x + 40, yy, col); if (b) Font.small(ctx, b, x + 40, yy + 7, '#64748b'); };
    let yy = y + 21;
    head('GRAB THESE! THEY ARE GOOD!', yy, '#22a35a'); yy += 14;
    const cardiac = DEPTS[0], others = DEPTS.slice(1, 3);
    const grab = [
      [() => put(sprite({ type: 'coffee' }), x + 20, yy + 18, 1, true), 'COFFEE', '+10. CHAIN THEM FOR MORE'],
      [() => put(Sprites.icon(cardiac), x + 20, yy + 16, 2, true), 'HEART', '+50 AND A LIFE BACK'],
      [() => { put(Sprites.icon(others[0]), x + 14, yy + 15, 1.5, true); put(Sprites.icon(others[1]), x + 26, yy + 17, 1.5, true); }, 'PATIENT ICONS', '+50 EACH'],
      [() => put(sprite({ type: 'siren' }), x + 20, yy + 17, 1, true), 'SIREN', 'ZOOM AND SMASH THROUGH'],
    ];
    for (const [art_, a, b] of grab) { glow(x + 20, yy + 9); art_(); line(a, b, yy + 3, '#2e8a5f'); yy += 21; }
    yy += 2; head('HOP OVER: TAP YOUR OWN LANE', yy, '#d99a00'); yy += 13;
    put(sprite({ type: 'wet' }), x + 13, yy + 20, 0.8); put(sprite({ type: 'bucket' }), x + 29, yy + 20, 0.7);
    line('WET FLOOR, BUCKETS,', 'ICE CHIPS', yy + 5, '#7a4b00'); yy += 24;
    head('DODGE: TAP ANOTHER LANE', yy, '#c0392b'); yy += 13;
    put(sprite({ type: 'cart' }), x + 12, yy + 22, 0.5); put(sprite({ type: 'bed' }), x + 28, yy + 22, 0.62);
    line('CARTS, BEDS, PEOPLE,', 'VENDING MACHINES', yy + 5, '#b52a3a'); yy += 26;
    button('GO GO GO!', 97, y + h - 21, 110, '#22a35a', () => { Sound.sfx.start(); Sound.play('rush'); screen = 'rush'; overlayT = 0; });
  }
  function drawEnd() {
    draw(); dim();
    const s = S, won = s.done === 'win', clean = won && s.bumps === 0;
    const w = 170, x = Math.round(97 - w / 2), h = 96, y = Math.round(LH / 2 - h / 2) + slideIn();
    panel(x, y, w, h, won ? '#22a35a' : '#c0392b');
    Font.bigCentered(ctx, won ? 'DELIVERED!' : 'PATIENT TOOK THE STAIRS', 97, y + 5, '#fff', 1);
    Font.bigCentered(ctx, fmt(s.score), 97, y + 24, won ? '#22a35a' : '#c0392b', 2, K);
    Font.smallCentered(ctx, 'COFFEES ' + s.coffees + '   BUMPS ' + s.bumps, 97, y + 45, '#475569');
    Font.smallCentered(ctx, clean ? 'CLEAN RUN! FREE BAY NEXT SHIFT' : won ? 'NO FREE BAY. MIND THE CARTS.' : 'SOMEONE CALL FACILITIES.', 97, y + 55, clean ? '#2e8a5f' : '#94a3b8');
    button('NEXT SHIFT', 97, y + h - 24, 110, '#22a35a', () => { Sound.sfx.click(); finish(true); });
    drawConfetti();
  }
  function finish(played) {
    const s = S; if (played) { const pts = Math.round(s.score); career += pts; try { localStorage.setItem('aj.total', career); } catch (e) {} if (s.done === 'win' && s.bumps === 0) freeBay = 1; }
    S = null; Sound.play('title'); startLevel(level + 1); screen = 'card'; overlayT = 0;
  }

  return {
    begin, tap, update,
    frame() { if (!S) return; if (screen === 'rushIntro') drawIntro(); else if (screen === 'rushHow') drawHow(); else if (screen === 'rushEnd') drawEnd(); else draw(); },
    get state() { return S; },
  };
})();
