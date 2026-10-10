// Minigames. Three rotate with Emergency Rush between shifts (Call Light Frenzy, Code Blue,
// Med Pass Catch); two are short surprise breaks in the middle of a shift (Coffee Pour,
// Break Room Defense). Uses the shared helpers from game.js (R, disc, ellipse, Font, LW, LH, T, K...).
const Minis = (() => {
  let M = null;
  const rnd = (a, b) => a + Math.random() * (b - a), one = a => a[Math.floor(Math.random() * a.length)];
  const cache = new Map();
  const art = (key, w, h, draw) => { let c = cache.get(key); if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); cache.set(key, c); } return c; };
  const fromGrid = (key, rows, pal) => art(key, rows[0].length, rows.length, c => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') R(x, y, 1, 1, pal[ch], c); })));
  const put = (img, x, y, k = 1) => { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(img.width * k), Math.round(img.height * k)); };
  const putC = (img, cx, by, k = 1) => put(img, cx - img.width * k / 2, by - img.height * k, k);  // centred, standing on by
  const pop = (text, x, y, col = '#ffe066') => M.pops.push({ text, x, y, t: 0, col });
  function heart(x, y, on) { const c = on ? '#ff4d6d' : '#55606e'; R(x + 1, y, 2, 1, c); R(x + 4, y, 2, 1, c); R(x, y + 1, 7, 2, c); R(x + 1, y + 3, 5, 1, c); R(x + 2, y + 4, 3, 1, c); R(x + 3, y + 5, 1, 1, c); }
  // top bar: lives, score, and a timer bar
  function hud(m, left) {
    R(0, 0, LW, 13, 'rgba(20,24,36,.6)');
    if (m.lives != null) for (let i = 0; i < (m.maxLives || 3); i++) heart(4 + i * 10, 3, i < m.lives);
    Font.bigCentered(ctx, fmt(m.score), 97, 3, '#fff', 1, K);
    if (left != null) { const w = LW - 16; R(8, 15, w, 3, 'rgba(20,24,36,.45)'); R(8, 15, Math.round(w * Math.max(0, left)), 3, left < 0.2 ? '#ff4d4d' : '#4ade80'); }
  }
  function drawPops() {
    for (const p of M.pops) { const hw = Font.bigWidth(p.text) / 2 + 3; ctx.globalAlpha = Math.max(0, 1 - p.t / 0.9); Font.bigCentered(ctx, p.text, Math.round(Math.max(hw, Math.min(LW - hw, p.x))), Math.round(p.y - p.t * 18), p.col, 1, K); }
    ctx.globalAlpha = 1;
  }
  // a speech bubble with a little tail pointing down at (cx, by + h)
  function bubble(text, cx, by, bg, fg, minX = 2, maxX = LW - 2) {
    const w = Font.smallWidth(text) + 6, bx = Math.round(Math.max(minX, Math.min(maxX - w, cx - w / 2)));
    R(bx - 1, by - 1, w + 2, 11, K); R(bx, by, w, 9, bg); R(Math.round(cx) - 1, by + 9, 3, 1, bg); R(Math.round(cx), by + 10, 1, 1, bg);
    Font.small(ctx, text, bx + 3, by + 2, fg); return { bx, w };
  }

  // static scenery is painted once per screen height into its own canvas
  const bgCache = new Map();
  function bgLayer(key, draw) { const k = key + '|' + LH; let c = bgCache.get(k); if (!c) { c = document.createElement('canvas'); c.width = LW; c.height = LH; draw(c.getContext('2d')); bgCache.set(k, c); } ctx.drawImage(c, 0, 0); }
  // minigames are lit a little more gently than the jam so everything stays readable
  const night = () => { const h = new Date().getHours(); return h >= 19 || h < 7; };
  const amb = (day, nite) => night() ? nite : day;
  const boxed = (x, y, w, h, col, g = ctx) => { R(x - 1, y - 1, w + 2, h + 2, K, g); R(x, y, w, h, col, g); };

  // ======================= CALL LIGHT FRENZY =======================
  const CALL_REAL = ['PAIN!', 'FELL!', 'IV BEEP!', 'TOILET!', 'CHEST!', 'HELP!', 'BLEEDING!'];
  const CALL_FAKE = ['BLANKET?', 'REMOTE?', 'JELLO?', 'WIFI?', 'DINNER?', 'ICE?', 'PILLOW?'];
  const FETCH = { 'BLANKET?': 'FETCHING A WARM BLANKET...', 'REMOTE?': 'THE REMOTE WAS IN THE BED.', 'JELLO?': 'ONLY GREEN JELLO LEFT. SORRY.', 'WIFI?': 'EXPLAINING THE WIFI. AGAIN.',
    'DINNER?': 'DINNER IS AT FIVE. IT IS 4:58.', 'ICE?': 'ICE CHIPS. NOT CUBES. CHIPS.', 'PILLOW?': 'THERE ARE NO MORE PILLOWS.' };
  const DR_FAVOURS = ['CAN YOU PUT IN AN ORDER FOR ME?', 'WHERE DO WE KEEP THE GLOVES?', "WHAT'S THIS PATIENT'S NAME?", 'CAN YOU CALL THE FAMILY? THANKS.', 'IS THERE ANY CAKE LEFT?'];
  const calls = {
    title: 'CALL LIGHT FRENZY', head: '#e8424f', song: 'rush',
    blurb: 'Every call light on the unit just went off. Tap a room to answer it before the patient gives up and complains.',
    rows: [
      [(x, y) => bubble('PAIN!', x, y - 5, '#e8424f', '#fff'), 'RED = REAL. TAP IT FAST!', 'PAIN, FALLS, IV BEEPING', '#c0392b'],
      [(x, y) => bubble('JELLO?', x, y - 5, '#fff', '#3d6fb6'), 'WHITE = NOT URGENT', 'TAP IT AND YOU LOSE TIME', '#3d6fb6'],
      [(x, y) => putC(Sprites.staff('doctor', ['#4f3322', '#38231a'], 0, false), x, y + 9, 0.9), 'DOCTOR = DO NOT ENGAGE', 'HE JUST WANTS A FAVOUR', '#64748b'],
    ],
    goal: 'NO MISSED CALLS = +1,000 BONUS',
    init(m) {
      m.dur = 30; m.lives = 3; m.spawnT = 0.8; m.busy = 0; m.busyMax = 1; m.busyText = ''; m.answered = 0; m.missed = 0; m.combo = 0;
      const nums = [101, 102, 103, 104, 105, 106, 107, 108, 109].sort(() => Math.random() - 0.5);
      m.rooms = nums.map(n => ({ num: n, state: 'idle', t: 0, life: 0, kind: null, text: '', dept: one(DEPTS), open: 0 }));
    },
    paintBg(g) {
      R(0, 0, LW, LH, '#f3efe4', g);
      for (let row = 0; row < 3; row++) {
        const c0 = calls.cell(row * 3), top = c0.y, fl = c0.y + c0.h - 7;
        for (let x = 2; x < LW; x += 8) R(x, top, 3, fl - top, '#eee6d6', g);
        R(0, top, LW, 4, '#d9d2c3', g); R(0, top + 4, LW, 1, '#c4bba8', g);
        for (let x = 10; x < LW; x += 65) { R(x, top, 44, 2, '#fffbe0', g); g.globalAlpha = 0.25; R(x - 4, top + 4, 52, 4, '#fffbe0', g); g.globalAlpha = 1; }
        R(0, fl - 22, LW, 22, '#a9d8c6', g); R(0, fl - 22, LW, 1, '#c6e8db', g); for (let x = 6; x < LW; x += 16) R(x, fl - 20, 1, 18, '#9ccfbc', g);
        R(0, fl - 26, LW, 3, '#9aa3b2', g); R(0, fl - 26, LW, 1, '#e3e7ec', g); R(0, fl - 23, LW, 1, 'rgba(0,0,0,.12)', g); for (let x = 4; x < LW; x += 32) R(x, fl - 23, 2, 3, '#6c7484', g);
        R(0, fl - 2, LW, 2, '#5f8f80', g); R(0, fl, LW, 7, '#c9d6df', g); R(0, fl + 1, LW, 1, '#dde6ec', g); for (let x = 0; x < LW; x += 13) R(x, fl, 1, 7, '#b2c3cf', g);
        for (let i = 0; i < 3; i++) {
          const c = calls.cell(row * 3 + i), dw = 34, dh = Math.min(74, c.h - 44), dx = c.x + 11, dy = fl - dh;
          R(dx - 4, dy - 3, dw + 8, dh + 3, '#5e3b20', g); R(dx - 3, dy - 2, dw + 6, dh + 2, '#8a5a33', g); R(dx - 3, dy - 2, dw + 6, 1, '#a8743f', g); R(dx - 3, dy - 2, 1, dh + 2, '#a8743f', g);
          // hand gel by every door, and something on the wall
          R(dx + dw + 7, dy + 22, 7, 11, K, g); R(dx + dw + 8, dy + 23, 5, 9, '#e9edf2', g); R(dx + dw + 9, dy + 26, 3, 3, '#7cc0ee', g); R(dx + dw + 10, dy + 33, 1, 2, '#9aa3b2', g);
          const k = (row * 3 + i) % 4;
          if (k === 1) { boxed(c.x + 1, dy + 6, 8, 10, '#fff', g); R(c.x + 2, dy + 12, 6, 3, '#9ccfbc', g); disc(c.x + 5, dy + 10, 2, '#ff7eb6', g); }
          if (k === 3) { R(c.x + 2, fl - 16, 5, 12, K, g); R(c.x + 3, fl - 15, 3, 10, '#e8424f', g); R(c.x + 3, fl - 18, 3, 3, '#2b3446', g); }
        }
      }
    },
    cell(i) { const top = 24, ch = Math.floor((LH - 6 - top) / 3); return { x: (i % 3) * 65, y: top + Math.floor(i / 3) * ch, w: 65, h: ch }; },
    update(m, dt) {
      if (m.busy > 0) m.busy -= dt;
      const active = m.rooms.filter(r => r.state === 'call').length, cap = Math.min(5, 2 + Math.floor(m.t / 8));
      m.spawnT -= dt;
      if (m.spawnT <= 0 && active < cap) {
        const idle = m.rooms.filter(r => r.state === 'idle' && r.t > 0.5);
        if (idle.length) { const r = one(idle), roll = Math.random();
          r.kind = roll < 0.09 ? 'doctor' : roll < 0.38 ? 'fake' : 'real'; r.state = 'call'; r.t = 0; r.dept = one(DEPTS);
          r.text = r.kind === 'real' ? one(CALL_REAL) : r.kind === 'fake' ? one(CALL_FAKE) : 'GOT A SEC?';
          r.life = r.kind === 'real' ? Math.max(2.1, 3.6 - m.t * 0.04 - m.shift * 0.03) : 2.6;
          if (r.kind !== 'doctor') Sound.sfx.callbell(); }
        m.spawnT = Math.max(0.42, 1.15 - m.t * 0.022 - m.shift * 0.01);
      }
      for (const r of m.rooms) {
        r.t += dt; r.open += ((r.state === 'call' ? 1 : 0) - r.open) * Math.min(1, dt * 14);
        if (r.state === 'call' && r.t > r.life) {
          r.state = 'idle'; r.t = 0;
          if (r.kind === 'real') { const c = calls.cell(m.rooms.indexOf(r)); m.missed++; m.lives--; m.combo = 0; pop('COMPLAINT!', c.x + 32, c.y + 30, '#ff8a8f');
            Sound.sfx.nope(); buzz(50); shakeScreen(0.2, 1.5); if (m.lives <= 0) end(m, 'lose'); }
        }
      }
      if (m.t >= m.dur && !m.done) { m.score += 200; end(m, 'win'); }
    },
    down(m, p) {
      if (m.busy > 0) { Sound.sfx.nope(); return; }
      const i = m.rooms.findIndex((r, k) => { const c = calls.cell(k); return p.x >= c.x && p.x < c.x + c.w && p.y >= c.y && p.y < c.y + c.h; });
      const r = m.rooms[i]; if (!r || r.state !== 'call') return;
      const c = calls.cell(i), fresh = 1 - r.t / r.life; r.state = 'idle'; r.t = 0;
      if (r.kind === 'real') { m.answered++; m.combo++; const pts = 40 + Math.round(60 * fresh) + Math.min(m.combo, 10) * 5;
        m.score += pts; pop('+' + pts, c.x + 32, c.y + 26); Sound.sfx.board(Math.min(m.combo, 9)); sparkle(c.x + 32, c.y + c.h - 30, 8, ['#ffe066', '#fff']); }
      else if (r.kind === 'fake') { m.combo = 0; m.busy = m.busyMax = 1.5; m.busyText = FETCH[r.text]; Sound.sfx.nope(); }
      else { m.combo = 0; m.busy = m.busyMax = 2.2; m.busyText = 'DOCTOR: ' + one(DR_FAVOURS); Sound.sfx.boing(); }
    },
    light(m) {
      Light.begin(amb('#c4c9dc', '#9ea5c6'), 0.35);
      for (let i = 0; i < 9; i++) {
        const c = calls.cell(i), r = m.rooms[i], fl = c.y + c.h - 7, dw = 34, dh = Math.min(74, c.h - 44), dx = c.x + 11, dy = fl - dh;
        // ceiling lights down the corridor, a buzzing one in the middle
        Light.add(c.x + 32, c.y + c.h * 0.55, 42, c.h * 0.5, '#fff1d6', 0.3 * (i === 4 ? Light.flicker(2, 8) : 1), 0, 1.1);
        if (r.state === 'call' && r.kind !== 'doctor') { const on = Math.floor(T * 6 + i) % 2 === 0; Light.add(dx + dw / 2, dy - 4, 24, 20, '#ff4d4d', on ? 0.75 : 0.35, on ? 0.18 : 0); }
        if (r.open > 0.05) { Light.add(dx + 25, dy + 14, 12, 12, '#ffe9a8', 0.6 * r.open, 0.15); Light.add(dx + dw / 2, fl, 20, 6, '#ffe9a8', 0.4 * r.open); }
      }
      Light.end();
    },
    draw(m) {
      bgLayer('calls', g => calls.paintBg(g));
      const later = [];
      for (let i = 0; i < 9; i++) {
        const c = calls.cell(i), r = m.rooms[i], fl = c.y + c.h - 7, dw = 34, dh = Math.min(74, c.h - 44), dx = c.x + 11, dy = fl - dh;
        const on = r.state === 'call' && r.kind !== 'doctor' && Math.floor(T * 6 + i) % 2 === 0;
        // red glow on the wall and floor while a light is going
        if (on) { ctx.globalAlpha = 0.18; ellipse(dx + dw / 2, dy - 6, 16, 9, '#ff4d4d'); ellipse(dx + dw / 2, fl + 3, 18, 3, '#ff4d4d'); ctx.globalAlpha = 1; }
        if (r.open > 0.05) {
          // the room behind: night window, bed, a lamp
          R(dx, dy, dw, dh, '#2f3646'); R(dx + 4, dy + 6, 14, 11, '#1c2438'); R(dx + 5, dy + 7, 12, 9, '#34416a'); R(dx + 7, dy + 8, 1, 1, '#fff'); R(dx + 13, dy + 10, 1, 1, '#ffe066');
          R(dx + 22, dy + 8, 6, 2, '#ffe9a8'); ctx.globalAlpha = 0.25; ellipse(dx + 25, dy + 14, 6, 5, '#ffe9a8'); ctx.globalAlpha = 1;
          R(dx + 2, dy + dh - 16, dw - 4, 5, '#46506a'); R(dx + 2, dy + dh - 11, 2, 11, '#3b4252'); R(dx + dw - 4, dy + dh - 11, 2, 11, '#3b4252'); R(dx, dy + dh - 3, dw, 3, '#262c3a');
          const img = r.kind === 'doctor' ? Sprites.staff('doctor', ['#4f3322', '#38231a'], 0, false) : Sprites.patient(r.dept, 0, Math.floor(T * 3 + i) % 2, false);
          const k = Math.min(3, (dh - 4) / img.height, (dw - 2) / img.width);
          ctx.save(); ctx.beginPath(); ctx.rect(dx, dy, dw, dh); ctx.clip(); ctx.globalAlpha = 0.3; ellipse(dx + dw / 2, fl - 1, 10, 2, '#000'); ctx.globalAlpha = 1;
          putC(img, dx + dw / 2, fl + Math.round((1 - r.open) * 30), k); ctx.restore();
          const pw = Math.max(3, Math.round(dw * (1 - r.open))); R(dx, dy, pw, dh, '#b9844f'); R(dx + pw - 1, dy, 1, dh, '#8a5a33');
        } else {
          R(dx, dy, dw, dh, '#c99460'); R(dx, dy, dw, 1, '#d9a876'); R(dx, dy, 1, dh, '#d9a876'); R(dx + dw - 1, dy, 1, dh, '#a8743f');
          R(dx + 6, dy + 7, 12, 18, '#7a5236'); R(dx + 7, dy + 8, 10, 16, '#9ed0f7'); for (let k = 0; k < 8; k++) R(dx + 7, dy + 8 + k * 2, 10, 1, '#cfe9f7'); R(dx + 7, dy + 8, 2, 16, 'rgba(255,255,255,.4)');
          R(dx + 21, dy + 9, 9, 12, K); R(dx + 22, dy + 10, 7, 10, '#3a86ff'); R(dx + 23, dy + 12, 5, 7, '#fff'); R(dx + 24, dy + 13, 3, 1, '#9aa3b2'); R(dx + 24, dy + 15, 3, 1, '#9aa3b2'); R(dx + 24, dy + 17, 2, 1, '#9aa3b2');
          R(dx + 4, dy + 30, dw - 8, dh - 42, '#bd8a55'); R(dx + 4, dy + 30, dw - 8, 1, '#a8743f'); R(dx + 4, dy + dh - 13, dw - 8, 1, '#d9a876');
          R(dx + dw - 8, dy + Math.round(dh / 2) - 1, 2, 4, '#6c7484'); R(dx + dw - 8, dy + Math.round(dh / 2), 6, 2, '#d8dde4');
          R(dx, dy + dh - 6, dw, 6, '#c8ced8'); R(dx, dy + dh - 6, dw, 1, '#e9edf2'); R(dx, dy + dh - 1, dw, 1, '#9aa3b2');
        }
        R(dx + dw + 4, dy + 3, 15, 9, K); R(dx + dw + 5, dy + 4, 13, 7, '#fff'); Font.small(ctx, String(r.num), dx + dw + 6, dy + 5, '#334155');
        // call light dome over the door
        R(dx + dw / 2 - 5, dy - 8, 10, 5, K); R(dx + dw / 2 - 4, dy - 7, 8, 4, on ? '#ff4d4d' : '#d8dde4'); R(dx + dw / 2 - 3, dy - 7, 3, 1, on ? '#ffd6dc' : '#f4f6f9');
        if (r.state === 'call') later.push(() => {
          const real = r.kind === 'real', bg = real ? '#e8424f' : r.kind === 'fake' ? '#fff' : '#e9edf2', fg = real ? '#fff' : r.kind === 'fake' ? '#3d6fb6' : '#475569';
          const b = bubble(r.text, c.x + 32, dy - 22 + (real ? Math.round(Math.sin(T * 12 + i)) : 0), bg, fg, c.x + 1, c.x + c.w - 1);
          if (real) { const left = Math.max(0, 1 - r.t / r.life); R(b.bx, dy - 11, b.w, 2, K); R(b.bx, dy - 11, Math.round(b.w * left), 2, left < 0.35 ? '#ff4d4d' : '#ffd23f'); }
        });
      }
      calls.light(m);
      later.forEach(f => f());
      hud(m, 1 - m.t / m.dur);
      if (m.busy > 0) {
        ctx.fillStyle = 'rgba(20,24,36,.5)'; ctx.fillRect(0, 13, LW, LH - 13);
        const lines = Font.wrap(m.busyText, 150), h = lines.length * 7 + 16, y = Math.round(LH / 2 - h / 2);
        R(19, y - 1, 157, h + 2, K); R(20, y, 155, h, '#fff7d6'); lines.forEach((l, k) => Font.smallCentered(ctx, l, 97, y + 4 + k * 7, '#7a4b00'));
        R(28, y + h - 6, 139, 3, '#e9dcb0'); R(28, y + h - 6, Math.round(139 * m.busy / m.busyMax), 3, '#d99a00');
      }
    },
    stats: m => ['ANSWERED ' + m.answered + '   MISSED ' + m.missed, m.done === 'win' && m.missed === 0],
    endTitle: m => m.done === 'win' ? 'SHIFT SURVIVED!' : 'COMPLAINTS FILED',
  };

  // ======================= CODE BLUE (rhythm) =======================
  const BOLT = ['...kkk', '..kyyk', '.kyyk.', 'kyyyyk', 'kkyyk.', '.kyk..', '.kk...', 'kk....'];
  const bolt = () => fromGrid('bolt', BOLT, { k: K, y: '#ffd23f' });
  const scene = document.createElement('canvas'); scene.width = 96; scene.height = 64;
  const cpr = {
    title: 'CODE BLUE!', head: '#3d7bff',
    blurb: 'Bed 7 is coding. Tap anywhere on the beat to do compressions. Shock when the bolt comes round. Stay on the beat.',
    rows: [
      [(x, y) => putC(Sprites.icon(DEPTS[0]), x, y + 7, 2), 'TAP AS THE HEART HITS THE RING', 'ANYWHERE ON THE SCREEN', '#c0392b'],
      [(x, y) => putC(bolt(), x, y + 8, 2), 'BOLT = SHOCK', 'TAP IT ON THE BEAT TOO', '#b07a00'],
    ],
    goal: '90% ON THE BEAT = +1,000 BONUS',
    init(m) {
      m.bpm = Math.min(120, Math.round(100 + m.shift * 1.5)); m.spb = 60 / m.bpm; m.notes = []; m.perfects = 0; m.goods = 0; m.misses = 0; m.combo = 0; m.best = 0;
      m.press = 0; m.zap = 0; m.trace = new Array(150).fill(0); m.traceT = 0; m.pressSpike = 0; m.rosc = false; m.charged = false;
      for (let k = 0; k < 20; k++) m.notes.push({ beat: 4 + k, kind: 'c' });
      m.notes.push({ beat: 27, kind: 'shock' });
      for (let k = 0; k < 20; k++) m.notes.push({ beat: 29 + k, kind: 'c' });
      m.endBeat = 50;
    },
    start(m) { Sound.play('cpr', m.bpm); const c = Sound.clock(); m.audio = c != null; m.t0 = m.audio ? Sound.songStart : 0; },
    now(m) { return m.audio ? Sound.clock() - m.t0 : m.t - 0.05; },
    update(m, dt) {
      const st = cpr.now(m), beat = st / m.spb;
      m.press = Math.max(0, m.press - dt * 6); m.zap = Math.max(0, m.zap - dt * 3);
      // monitor trace: fibrillation squiggle until the shock, sinus rhythm after
      m.traceT += dt * 60;
      while (m.traceT >= 1) { m.traceT--; m.trace.shift(); const u = m.trace.length;
        m.trace.push(m.rosc ? [0, 0, 1, 0, -2, 9, -4, 0, 0, 1, 1, 0][Math.floor(T * 60) % 36] || 0 : m.pressSpike > 0 ? (m.pressSpike--, 7 - m.pressSpike * 2) : Math.round(Math.sin(T * 23) * 2 + Math.sin(T * 37) * 1.5)); }
      if (beat >= 24 && !m.charged) { m.charged = true; Sound.sfx.charge(); }
      for (const n of m.notes) if (!n.judged && st - n.beat * m.spb > 0.17) { n.judged = 'miss'; m.misses++; m.combo = 0; pop('MISS', 97, LH - 84, '#94a3b8'); }
      if (beat >= m.endBeat && !m.done) { m.rosc = true; const acc = cpr.acc(m); m.score += Math.round(acc * 300); Sound.sfx.win(); dropConfetti(30, true); end(m, 'win'); }
    },
    acc: m => (m.perfects + m.goods) / m.notes.length,
    sy: () => Math.max(84, Math.round((LH - 142) / 2)),
    down(m) {
      const st = cpr.now(m); let best = null, bd = 1e9;
      for (const n of m.notes) if (!n.judged) { const d = Math.abs(st - n.beat * m.spb); if (d < bd) { bd = d; best = n; } }
      m.press = 1; m.pressSpike = 3; Sound.sfx.thump();
      if (!best || bd > 0.2) { m.combo = 0; pop('OFF BEAT', 97, LH - 84, '#94a3b8'); return; }
      const perfect = bd < 0.075, good = bd < 0.15;
      if (!good) { best.judged = 'miss'; m.misses++; m.combo = 0; pop('MISS', 97, LH - 84, '#94a3b8'); return; }
      best.judged = perfect ? 'perfect' : 'good'; if (perfect) m.perfects++; else m.goods++; m.combo++; m.best = Math.max(m.best, m.combo);
      const pts = (best.kind === 'shock' ? 100 : perfect ? 20 : 10) + Math.min(m.combo, 10) * 2; m.score += pts;
      pop(best.kind === 'shock' ? 'CLEAR!' : perfect ? 'PERFECT' : 'GOOD', 97, LH - 84, perfect ? '#ffe066' : '#c9ffd9');
      if (best.kind === 'shock') { m.zap = 1; Sound.sfx.zap(); shakeScreen(0.25, 2); sparkle(60, cpr.sy() + 64, 16, ['#ffe066', '#fff']); }
    },
    light(m, beat) {
      const sy = cpr.sy(), wy = Math.max(92, sy - 26), wh = sy + 24 - wy;
      Light.begin(amb('#c3c9dc', '#9aa1c4'), 0.3);
      Light.add(97, 49, 92, 42, m.rosc ? '#5dff9d' : '#ffd23f', 0.22, 0.05);
      Light.add(56, wy + wh / 2, 40, 34, '#a9c2ff', 0.4, 0, 1.1);
      Light.add(100, sy + 70, 90, 56, '#fff1d6', 0.42, 0, 1.1);
      Light.add(11, sy + 93, 14, 12, '#ffd23f', 0.35 + (beat >= 24 && beat < 27.5 ? 0.3 * Math.abs(Math.sin(T * 12)) : 0), 0.1);
      Light.add(97, LH - 41, 110, 26, '#8fb2ff', 0.25);
      Light.end();
    },
    paintBg(g) {
      const sy = cpr.sy(), floor = sy + 120;
      R(0, 0, LW, LH, '#dfe9ef', g);
      for (let x = 23; x < LW; x += 48) R(x, 0, 1, floor, '#d2dee6', g);
      R(0, floor - 34, LW, 34, '#d3e0e8', g); R(0, floor - 36, LW, 2, '#b9cad5', g); R(0, floor - 36, LW, 1, '#eef3f6', g);
      R(0, 0, LW, 12, '#eef3f6', g); R(0, 12, LW, 1, '#c3d2dc', g); R(0, 14, LW, 2, '#9aa3b2', g);
      // privacy curtain bunched up on its track
      for (let x = LW - 16; x < LW; x += 4) { R(x, 16, 4, floor - 22, '#7fc8c0', g); R(x, 16, 1, floor - 22, '#a7dcd5', g); R(x + 3, 16, 1, floor - 22, '#5fa9a1', g); }
      for (let x = LW - 15; x < LW; x += 4) R(x, 15, 2, 2, '#6c7484', g);
      // night window with the city still awake
      const wx = 30, wy = Math.max(92, sy - 26), ww = 52, wh = sy + 24 - wy;
      R(wx - 2, wy - 2, ww + 4, wh + 4, K, g); R(wx - 1, wy - 1, ww + 2, wh + 2, '#e9edf2', g); R(wx, wy, ww, wh, '#1b2340', g);
      for (let i = 0; i < 9; i++) R(wx + 3 + (i * 17) % (ww - 6), wy + 3 + (i * 11) % Math.max(4, wh - 24), 1, 1, '#c9d6ff', g);
      disc(wx + ww - 11, wy + 9, 4, '#fff3c4', g); disc(wx + ww - 9, wy + 8, 3, '#1b2340', g);
      for (let x = wx, k = 0; x < wx + ww; k++) { const bw = Math.min(6 + (k * 5) % 7, wx + ww - x), bh = 10 + (k * 13) % 16; R(x, wy + wh - bh, bw, bh, '#2b3352', g);
        for (let yy = wy + wh - bh + 2; yy < wy + wh - 2; yy += 4) for (let xx = x + 1; xx < x + bw - 1; xx += 3) if ((xx * 3 + yy) % 5 === 0) R(xx, yy, 1, 2, '#ffe066', g); x += bw + 1; }
      R(wx + ww / 2 - 1, wy, 2, wh, '#e9edf2', g); R(wx, wy + Math.round(wh / 2) - 1, ww, 2, '#e9edf2', g); R(wx - 3, wy + wh + 2, ww + 6, 2, '#c3d2dc', g);
      // wall clock stuck at the worst hour
      const kx = LW - 44, ky = wy + 13;
      disc(kx, ky, 11, K, g); disc(kx, ky, 10, '#fff', g); disc(kx, ky, 8, '#f4f6f9', g);
      for (let a = 0; a < 12; a++) R(Math.round(kx + Math.cos(a * Math.PI / 6) * 8), Math.round(ky + Math.sin(a * Math.PI / 6) * 8), 1, 1, '#64748b', g);
      R(kx, ky, 5, 1, K, g); R(kx, ky - 7, 1, 7, K, g); disc(kx, ky, 1, '#e8424f', g); Font.smallCentered(g, '3 AM', kx, ky + 15, '#64748b');
      // headwall: oxygen, suction, outlets
      const hy = sy + 38;
      R(4, hy, 132, 12, K, g); R(5, hy + 1, 130, 10, '#c8d3db', g); R(5, hy + 1, 130, 1, '#e3eaef', g);
      R(30, hy - 12, 6, 14, K, g); R(31, hy - 11, 4, 12, '#e9f6ff', g); disc(33, hy - 4, 1, '#2fbf71', g); R(30, hy + 3, 6, 5, '#2fbf71', g);
      R(44, hy - 13, 12, 16, K, g); R(45, hy - 12, 10, 14, '#e9f6ff', g); R(45, hy - 5, 10, 7, '#e8a0a8', g); R(44, hy - 15, 12, 3, '#6c7484', g);
      R(62, hy + 3, 6, 5, '#ffd23f', g); R(72, hy + 3, 6, 5, '#e9edf2', g); R(82, hy + 3, 6, 5, '#e9edf2', g); R(102, hy + 3, 8, 5, '#e8424f', g);
      for (const x of [64, 74, 84]) R(x, hy + 5, 2, 1, K, g);
      // IV pole
      R(12, sy + 4, 2, floor - sy - 8, '#9aa3b2', g); R(7, sy + 4, 12, 2, '#9aa3b2', g); R(4, floor - 5, 18, 2, '#6c7484', g); R(4, floor - 3, 3, 3, K, g); R(19, floor - 3, 3, 3, K, g);
      R(7, sy + 6, 11, 17, K, g); R(8, sy + 7, 9, 15, '#e9f6ff', g); R(8, sy + 13, 9, 9, '#cfe8ff', g); R(9, sy + 9, 7, 3, '#fff', g); R(12, sy + 23, 1, 26, '#b8d4ea', g);
      // floor tiles and skirting
      for (let y = floor + 1, r = 0; y < LH; y += 10, r++) for (let x = 0, c = 0; x < LW; x += 16, c++) R(x, y, 16, 10, (r + c) % 2 ? '#bfcdd8' : '#c6d4de', g);
      R(0, floor - 3, LW, 3, '#9fb3bb', g); R(0, floor, LW, 1, '#8aa0aa', g);
      // monitor on its arm
      const mx = 22, my = 22, mw = 150, mh = 54;
      R(mx + mw / 2 - 3, 12, 6, 8, '#6c7484', g);
      R(mx - 5, my - 5, mw + 10, mh + 16, K, g); R(mx - 4, my - 4, mw + 8, mh + 14, '#4b5563', g); R(mx - 4, my - 4, mw + 8, 1, '#6b7585', g);
      R(mx, my, mw, mh, '#0f1a24', g); for (let x = mx + 5; x < mx + mw; x += 10) for (let y = my + 5; y < my + mh; y += 10) R(x, y, 1, 1, '#1d2e40', g);
      [['#e8424f', 8], ['#ffd23f', 14], ['#9aa3b2', 20], ['#9aa3b2', 26]].forEach(([c, x]) => R(mx + x, my + mh + 3, 4, 3, c, g));
      Font.small(g, 'SPO2 --', mx + 4, my + mh - 8, '#7fdcff'); Font.small(g, 'NIBP --', mx + mw - 4 - Font.smallWidth('NIBP --'), my + mh - 8, '#f4f6f9');
      R(mx + mw - 16, my + mh + 3, 10, 3, '#3ddc84', g);
    },
    draw(m) {
      const st = cpr.now(m), beat = st / m.spb, sy = cpr.sy(), floor = sy + 120;
      bgLayer('cpr', g => cpr.paintBg(g));
      const mx = 22, my = 22, mw = 150, mh = 54;
      const col = m.rosc ? '#3ddc84' : '#ffd23f';
      for (let i = 1; i < m.trace.length; i++) { const a = my + 30 - m.trace[i - 1] * 2, b = my + 30 - m.trace[i] * 2; R(mx + i - 1 + 0, Math.min(a, b), 1, Math.abs(a - b) + 1, col); }
      Font.small(ctx, m.rosc ? 'HR 82' : 'VF', mx + 4, my + 4, m.rosc ? '#3ddc84' : '#ff4d4d');
      Font.small(ctx, 'RATE ' + m.bpm, mx + mw - 4 - Font.smallWidth('RATE ' + m.bpm), my + 4, '#7fb2e5');
      // bed, patient and nurse, drawn small then doubled so the pixels match the rest of the game
      const c = scene.getContext('2d'); c.clearRect(0, 0, 96, 64);
      const bx = 12, bw = 78, by = 38, jump = m.zap > 0.6 ? 3 : 0, sq = Math.round(m.press * 2), d = DEPTS[0], skin = '#f4c7a1', up = m.done && m.rosc && M.endT > 0.3;
      R(bx, by + 5, bw, 3, '#9aa3b2', c); R(bx + 4, by + 8, 2, 11, '#6c7484', c); R(bx + bw - 6, by + 8, 2, 11, '#6c7484', c);
      R(bx + 3, by + 19, 4, 3, K, c); R(bx + bw - 7, by + 19, 4, 3, K, c); R(bx - 2, by - 8, 2, 16, '#9aa3b2', c);
      R(bx, by, bw, 5, '#fff', c); R(bx, by + 4, bw, 1, '#e9edf2', c);
      const nurse = Sprites.staff('nurse', (typeof HAIR !== 'undefined' && HAIR.Becca) || ['#4f3322', '#38231a'], 0, false);
      c.save(); c.beginPath(); c.rect(0, 0, 96, by); c.clip(); c.drawImage(nurse, up ? bx + 58 : bx + 23, by - nurse.height + (up ? 9 : 3 + sq)); c.restore();
      if (up) {
        // sitting up, very much alive
        R(bx + 2, by - 4, 14, 4, '#fff', c); R(bx + 17, by - 15, 12, 15, '#9fd0ff', c); disc(bx + 23, by - 20, 5, skin, c); R(bx + 19, by - 26, 9, 3, '#6b4a2a', c);
        R(bx + 21, by - 21, 1, 1, K, c); R(bx + 25, by - 21, 1, 1, K, c); R(bx + 22, by - 18, 3, 1, K, c);
        R(bx + 29, by - 3, bw - 31, 4, d.T, c); R(bx + 29, by - 3, bw - 31, 1, d.L, c);
      } else {
        R(bx + 2, by - 4 - jump, 14, 4, '#fff', c); disc(bx + 10, by - 5 - jump, 5, skin, c); R(bx + 5, by - 10 - jump, 9, 3, '#6b4a2a', c);
        R(bx + 7, by - 6 - jump, 2, 1, K, c); R(bx + 11, by - 6 - jump, 2, 1, K, c);
        R(bx + 16, by - 6 + sq - jump, 26, 6 - sq, '#9fd0ff', c); R(bx + 16, by - 6 + sq - jump, 26, 1, '#cfe8ff', c);
        R(bx + 19, by - 6 + sq - jump, 4, 2, '#e9edf2', c); R(bx + 35, by - 6 + sq - jump, 4, 2, '#e9edf2', c);
        R(bx + 42, by - 4 - jump, bw - 44, 4, d.T, c); R(bx + 42, by - 4 - jump, bw - 44, 1, d.L, c);
        R(bx + 24, by - 8 + sq, 10, 2, skin, c); R(bx + 24, by - 9 + sq, 10, 1, K, c);
      }
      // AED at the head of the bed, charging up before the shock
      R(0, by + 4, 10, 9, K, c); R(1, by + 5, 8, 7, '#ffd23f', c); R(2, by + 6, 6, 3, '#14202e', c); R(2, by + 6, Math.round(6 * Math.min(1, Math.max(0, (beat - 24) / 3))), 3, '#3ddc84', c);
      put(scene, 1, sy, 2);
      if (up && M.endT > 0.6) bubble('CAN I GET A SANDWICH?', 1 + (bx + 23) * 2, sy + (by - 27) * 2 - 12, '#fff', '#334155');
      if (m.zap > 0) { ctx.globalAlpha = m.zap * 0.6; R(0, 0, LW, LH, '#fff'); ctx.globalAlpha = 1; }
      // prompt line
      const msg = beat < 4 ? ['3', '2', '1', 'GO!'][Math.max(0, Math.floor(beat))] : beat < 24 ? 'PUSH HARD, PUSH FAST' : beat < 27.5 ? 'CHARGING... STAND CLEAR!' : beat < 29 ? 'SHOCK!' : m.done ? 'ROSC! WELCOME BACK.' : 'KEEP GOING!';
      if (beat < 4) Font.bigCentered(ctx, msg, 97, floor + 8, '#334155', 3, '#fff'); else Font.bigCentered(ctx, msg, 97, floor + 12, m.done ? '#22a35a' : '#334155', 1, '#fff');
      // rhythm lane
      const ly = LH - 58, lh = 34, hx = 34, pps = 120;
      R(0, ly - 2, LW, lh + 4, K); R(0, ly, LW, lh, '#14202e'); R(0, ly, LW, 1, '#3b4252'); R(0, ly + lh - 1, LW, 1, '#3b4252');
      R(0, ly + lh / 2, LW, 1, '#1d2e40'); disc(hx, ly + lh / 2, 16, '#1d3352');
      for (let b = Math.ceil(beat); b < beat + 3; b++) R(Math.round(hx + (b - beat) * m.spb * pps), ly + 2, 1, lh - 4, '#24324a');
      const pulse = Math.max(0, 1 - (beat - Math.floor(beat)) * 4);
      disc(hx, ly + lh / 2, 13 + Math.round(pulse * 2), '#ffffff'); disc(hx, ly + lh / 2, 11 + Math.round(pulse * 2), '#14202e');
      for (const n of m.notes) {
        if (n.judged) continue; const x = hx + (n.beat * m.spb - st) * pps; if (x > LW + 16 || x < -16) continue;
        if (n.kind === 'shock') putC(bolt(), x, ly + lh / 2 + 8, 2); else putC(Sprites.icon(DEPTS[0]), x, ly + lh / 2 + 7, 2);
      }
      Font.small(ctx, 'COMPRESSIONS', 6, ly + lh + 5, '#475569');
      Font.small(ctx, 'COMBO ' + m.combo, LW - 6 - Font.smallWidth('COMBO ' + m.combo), ly + lh + 5, '#475569');
      cpr.light(m, beat);
      hud(m, 1 - Math.min(1, beat / m.endBeat));
    },
    stats: m => ['ON BEAT ' + Math.round(cpr.acc(m) * 100) + '%   BEST COMBO ' + m.best, cpr.acc(m) >= 0.9],
    endTitle: m => cpr.acc(m) >= 0.5 ? 'ROSC! WELCOME BACK!' : 'CHART SAYS FINE',
  };

  // ======================= MED PASS CATCH =======================
  const round = (key, c, h) => fromGrid('pill' + key, ['..kkkk..', '.kcccck.', 'kchcccck', 'kcccccck', '.kcccck.', '..kkkk..'], { k: K, c, h });
  const capsule = (key, a, b) => fromGrid('pill' + key, ['.kkkkkkkkk.', 'kaaaakbbbbk', 'kAaaakbbbbk', 'kaaaakbbbbk', '.kkkkkkkkk.'], { k: K, a, A: '#ffffff', b });
  const PILLS = {
    tylenol: { name: 'TYLENOL', img: () => round('t', '#f4f4f4', '#ffffff') },
    k:       { name: 'POTASSIUM', img: () => fromGrid('pillk', ['.kkkkkkkkkk.', 'kcdccdcccchk', 'kcdcdcccccck', 'kcddccccccck', 'kcdcdcccccck', 'kcdccdccccck', '.kkkkkkkkkk.'], { k: K, c: '#ff9f43', h: '#ffd29a', d: '#a85a10' }) },
    red:     { name: 'RED ONE', img: () => capsule('r', '#e8424f', '#fff') },
    blue:    { name: 'BLUE ONE', img: () => round('b', '#3a86ff', '#b3cbff') },
    green:   { name: 'GREEN ONE', img: () => capsule('g', '#2fbf71', '#d9f7e6') },
    purple:  { name: 'PURPLE ONE', img: () => round('p', '#9b6bd6', '#d9c6f5') },
    yellow:  { name: 'YELLOW ONE', img: () => capsule('y', '#ffd23f', '#e8424f') },
  };
  const ORDERABLE = ['red', 'blue', 'green', 'purple', 'yellow', 'k'];
  const meds = {
    title: 'MED PASS', head: '#9b6bd6', song: 'play',
    blurb: 'Drag the med cup left and right. Catch only the pills on the order card, which changes with every patient.',
    rows: [
      [(x, y) => { putC(PILLS.red.img(), x - 7, y + 6, 1.5); putC(PILLS.blue.img(), x + 9, y + 6, 1.5); }, 'CATCH WHAT IS ORDERED', 'CHECK THE CARD UP TOP', '#2e8a5f'],
      [(x, y) => putC(PILLS.tylenol.img(), x, y + 7, 2), 'TYLENOL IS ALWAYS FINE', 'A FEW POINTS, NO HARM', '#64748b'],
      [(x, y) => putC(PILLS.k.img(), x, y + 7, 1.5), 'ANYTHING ELSE = WRONG MED', 'THREE AND IT IS AN INCIDENT REPORT', '#c0392b'],
    ],
    goal: 'NO WRONG MEDS = +1,000 BONUS',
    init(m) { m.dur = 30; m.lives = 3; m.cx = 97; m.tx = 97; m.pills = []; m.spawnT = 0.6; m.combo = 0; m.caught = 0; m.wrong = 0; m.bed = 0; m.orderT = 0; meds.newOrder(m); },
    newOrder(m) { const o = ORDERABLE.slice().sort(() => Math.random() - 0.5); m.order = o.slice(0, 2); m.bed = 1 + Math.floor(Math.random() * 12); m.orderT = 0; m.flashOrder = 1; },
    cupY: () => LH - 48,
    update(m, dt) {
      m.cx += (m.tx - m.cx) * Math.min(1, dt * 18); m.orderT += dt; m.flashOrder = Math.max(0, m.flashOrder - dt);
      if (m.orderT > 8) { meds.newOrder(m); Sound.sfx.ding(); pop('NEXT PATIENT!', 97, 70, '#fff'); }
      m.spawnT -= dt;
      if (m.spawnT <= 0) {
        const roll = Math.random(), kind = roll < 0.5 ? one(m.order) : roll < 0.65 ? 'tylenol' : one(ORDERABLE.filter(k => !m.order.includes(k)));
        m.pills.push({ kind, x: rnd(20, LW - 20), y: 58, vy: 42 + m.t * 1.6 + m.shift * 2, sway: rnd(0, 6) });
        m.spawnT = Math.max(0.32, 0.8 - m.t * 0.012 - m.shift * 0.01);
      }
      const cy = meds.cupY();
      for (const p of m.pills) {
        const was = p.y; p.y += p.vy * dt;
        if (was < cy && p.y >= cy && Math.abs(p.x + Math.sin(T * 2 + p.sway) * 3 - m.cx) < 24) { p.gone = true; meds.catch(m, p); }
        if (p.y > LH + 10) { p.gone = true; if (m.order.includes(p.kind)) m.combo = 0; }
      }
      m.pills = m.pills.filter(p => !p.gone);
      if (m.t >= m.dur && !m.done) { m.score += 200; end(m, 'win'); }
    },
    catch(m, p) {
      const y = meds.cupY() - 20;
      if (m.order.includes(p.kind)) { m.caught++; m.combo++; const pts = 20 * Math.min(m.combo, 5); m.score += pts; pop('+' + pts, m.cx, y); Sound.sfx.pill(Math.min(m.combo, 9)); sparkle(m.cx, y + 10, 6, ['#ffe066', '#fff']); }
      else if (p.kind === 'tylenol') { m.score += 5; pop('TYLENOL. FINE.', m.cx, y, '#e2e8f0'); Sound.sfx.pop(); }
      else { m.wrong++; m.lives--; m.combo = 0; pop(p.kind === 'k' ? 'POTASSIUM?!' : 'WRONG MED!', m.cx, y, '#ff8a8f');
        if (p.kind === 'k') Sound.sfx.flatline(); else Sound.sfx.nope(); buzz(60); shakeScreen(0.25, 2); if (m.lives <= 0) end(m, 'lose'); }
    },
    down(m, p) { m.tx = Math.max(22, Math.min(LW - 22, p.x)); },
    move(m, p) { m.tx = Math.max(22, Math.min(LW - 22, p.x)); },
    paintBg(g) {
      const top = 54, cart = LH - 18, px = 146;
      R(0, 0, LW, LH, '#e7eef2', g); for (let x = 31; x < LW; x += 40) R(x, 0, 1, cart, '#dde6ec', g);
      // shelves of stock, the 5 rights poster and the sharps bin
      const BOT = ['#a8643a', '#c98a3c', '#e9edf2', '#7fb2e5', '#2e8a5f'], BOX = ['#7fb2e5', '#f4b942', '#ff9fb2', '#9ccfbc', '#c9b6ec', '#fff'];
      R(6, top + 8, 50, 30, K, g); R(7, top + 9, 48, 28, '#fff', g); R(7, top + 9, 48, 7, '#2e8a5f', g); Font.small(g, '5 RIGHTS', 10, top + 10, '#fff');
      ['PATIENT', 'DRUG', 'DOSE', 'ROUTE'].forEach((t, i) => { R(10, top + 19 + i * 4, 2, 2, '#2e8a5f', g); R(14, top + 19 + i * 4, 8 + t.length * 3, 1, '#94a3b8', g); });
      for (let y = top + 38, row = 0; y < cart - 40; y += 42, row++) {
        R(2, y, px - 6, 3, '#b9c4ce', g); R(2, y + 3, px - 6, 1, '#9aa3b2', g); R(4, y + 4, 2, 4, '#9aa3b2', g); R(px - 8, y + 4, 2, 4, '#9aa3b2', g);
        for (let x = row ? 6 : 62, k = row * 3; x < px - 18; k++) {
          const t = Math.floor(Math.random() * 5);
          if (t === 4) { x += 4 + Math.floor(Math.random() * 8); continue; }
          if (t === 0) { const c = one(BOT); R(x, y - 12, 7, 12, K, g); R(x + 1, y - 11, 5, 11, c, g); R(x + 1, y - 7, 5, 4, '#fff', g); R(x + 1, y - 13, 5, 2, '#fff', g); R(x, y - 14, 7, 1, K, g); x += 9; }
          else if (t === 1) { const c = one(BOX); R(x, y - 10, 14, 10, K, g); R(x + 1, y - 9, 12, 9, c, g); R(x + 1, y - 6, 12, 2, '#fff', g); x += 16; }
          else if (t === 2) { R(x, y - 8, 10, 8, K, g); R(x + 1, y - 7, 8, 7, '#f4f6f9', g); R(x, y - 10, 10, 3, one(BOX), g); x += 12; }
          else { R(x, y - 16, 9, 16, K, g); R(x + 1, y - 15, 7, 15, '#e9f6ff', g); R(x + 1, y - 10, 7, 9, '#cfe8ff', g); R(x + 3, y - 18, 3, 3, '#9aa3b2', g); x += 11; }
        }
        if (row === 0) { R(px - 22, y - 16, 14, 16, K, g); R(px - 21, y - 15, 12, 15, '#e8424f', g); R(px - 22, y - 18, 14, 3, '#ffd23f', g); R(px - 19, y - 9, 8, 3, '#fff', g); }
      }
      // the Pyxis, which will lock you out at the worst moment
      R(px, top + 6, LW - px - 3, cart - top - 6, K, g); R(px + 1, top + 7, LW - px - 5, cart - top - 8, '#c3cdd6', g);
      R(px + 5, top + 11, LW - px - 13, 14, K, g); R(px + 6, top + 12, LW - px - 15, 12, '#14202e', g); Font.small(g, 'PYXIS', px + 9, top + 15, '#3ddc84');
      for (let y = top + 30; y < cart - 10; y += 12) { R(px + 4, y, LW - px - 11, 10, '#9aa3b2', g); R(px + 5, y + 1, LW - px - 13, 8, '#dfe5ec', g); R(px + 16, y + 4, 12, 2, '#6c7484', g); R(px + 38, y + 3, 2, 2, (y / 12) % 3 < 1 ? '#3ddc84' : '#e8424f', g); }
      // push it all back so the pills pop
      g.globalAlpha = 0.5; R(0, top, LW, cart - top, '#e7eef2', g); g.globalAlpha = 1;
      // med cart drawers
      R(0, cart - 1, LW, 19, K, g); R(0, cart, LW, 3, '#dfe5ec', g); R(0, cart + 3, LW, 1, '#9aa3b2', g);
      ['#5b8def', '#f4b942', '#2fbf71', '#e8424f'].forEach((c, i) => { const x = 1 + i * 49; R(x, cart + 5, 46, 10, c, g); R(x, cart + 5, 46, 1, '#ffffff66', g); R(x + 17, cart + 8, 12, 2, '#ffffffaa', g); R(x + 1, cart + 13, 44, 1, '#00000033', g); });
    },
    draw(m) {
      bgLayer('meds', g => meds.paintBg(g));
      // order card
      const flash = m.flashOrder > 0 && Math.floor(T * 10) % 2;
      R(9, 21, 177, 30, K); R(10, 22, 175, 28, flash ? '#fff3c4' : '#fff'); R(10, 22, 175, 8, '#9b6bd6'); R(10, 51, 177, 1, '#00000022');
      Font.small(ctx, 'BED ' + m.bed + ' ORDERS:', 14, 24, '#fff'); Font.small(ctx, '+ TYLENOL OK', 181 - Font.smallWidth('+ TYLENOL OK'), 24, '#efe4ff');
      m.order.forEach((k, i) => { putC(PILLS[k].img(), 40 + i * 80, 46, 2); Font.small(ctx, PILLS[k].name, 52 + i * 80 + (PILLS[k].img().width > 9 ? 4 : 0), 37, '#475569'); });
      R(10, 49, Math.round(175 * Math.max(0, 1 - m.orderT / 8)), 1, '#9b6bd6');
      for (const p of m.pills) putC(PILLS[p.kind].img(), p.x + Math.sin(T * 2 + p.sway) * 3, p.y + 9, 3);
      // the med cup, pleated
      const cx = Math.round(m.cx), cy = meds.cupY();
      R(cx - 23, cy - 2, 46, 3, K); R(cx - 22, cy, 44, 30, K); R(cx - 21, cy, 42, 29, '#ffffff');
      for (let i = 0; i < 8; i++) R(cx - 18 + i * 5, cy + 2, 1, 26, '#dfe5ec'); R(cx - 20, cy + 29, 40, 2, K); R(cx - 22, cy - 1, 44, 1, '#fff');
      Font.big(ctx, 'MEDS', cx - 11, cy + 12, '#9b6bd6');
      Light.begin(amb('#d3d7e4', '#b2b7d0'), 0.25);
      Light.add(70, 110, 80, 70, '#fff6e0', 0.3, 0, 1.1); Light.add(70, LH - 120, 80, 70, '#fff6e0', 0.3, 0, 1.1);
      Light.add(168, 72, 22, 12, '#5dff9d', 0.5, 0.12); Light.add(cx, cy + 14, 30, 26, '#ffffff', 0.25);
      Light.end();
      hud(m, 1 - m.t / m.dur);
    },
    stats: m => ['CAUGHT ' + m.caught + '   WRONG MEDS ' + m.wrong, m.done === 'win' && m.wrong === 0],
    endTitle: m => m.done === 'win' ? 'MEDS PASSED!' : 'INCIDENT REPORT',
  };

  // ======================= COFFEE POUR (mid-shift break) =======================
  const MUGS = [["WORLD'S", 'OKAYEST', 'NURSE', '#fff', '#e8424f'], ['NIGHT', 'SHIFT', 'SURVIVOR', '#2b3446', '#ffd23f'], ['NOT', 'TODAY', '', '#ffd6dc', '#b52a3a'], ['I PUT', 'THE IV', 'IN IVY', '#d6ecff', '#1f4e9c'],
    ['COFFEE', 'BEFORE', 'CHARTING', '#fff3c4', '#7a4b00'], ['RUNS ON', 'CAFFEINE', '& SPITE', '#2b3446', '#ff8a8f'], ['DO NOT', 'DISTURB', '(PLEASE)', '#dcf5e6', '#2e8a5f'],
    ['I SURVIVED', 'THE FULL', 'MOON', '#1f2a44', '#ffe066'], ['HYDRATE', 'OR', 'DIEDRATE', '#cfe9f7', '#1f4e9c'], ['TRUST ME', "I'M A", 'NURSE', '#fff', '#3fae7a'],
    ['THIS IS', 'MY BREAK', '(5 MIN)', '#ffe1c4', '#a8643a'], ['DECAF?', 'IN THIS', 'ECONOMY?', '#efe4ff', '#6b4ea0'], ['MY BLOOD', 'TYPE IS', 'COFFEE', '#e8424f', '#fff'],
    ["DON'T", 'TALK TO ME', 'YET', '#3b4252', '#e9edf2'], ['SHIFT', 'HAPPENS', '', '#ffd23f', '#2b3446'], ['BEST NURSE', 'ACCORDING', 'TO MY CAT', '#ffd6e8', '#b5427e'],
    ['PROPERTY OF', 'CVICU', 'HANDS OFF', '#cfe9f7', '#c0392b'], ['SORRY FOR', 'WHAT I SAID', 'AT 4 AM', '#efe4ff', '#6b4ea0'], ['ZERO', 'FLUIDS', 'GIVEN', '#2b3446', '#3ddc84'],
    ['Q2 TURNS', 'Q2 COFFEE', '', '#dcf5e6', '#2e8a5f'], ['NPO', '(EXCEPT', 'COFFEE)', '#fff', '#1f4e9c'], ['THIS MUG', 'HAS BEEN', 'CHARTED', '#fff3c4', '#7a4b00'],
    ['WILL WORK', 'FOR PIZZA', '', '#ffe1c4', '#c0392b'], ['STAT', 'COFFEE', 'NOW', '#1f2a44', '#ff8a8f'], ['DAY SHIFT', 'TOOK MY', 'PENS', '#d6ecff', '#1f4e9c'],
    ['BEEP BEEP', 'BEEP BEEP', 'BEEP', '#3b4252', '#3ddc84'], ["IT'S NOT", 'A BAD SHIFT', 'YET', '#ffd6dc', '#b52a3a'], ['12 HOURS', 'IS A', 'LIFESTYLE', '#cfe9f7', '#2b3446'],
    ['CAFFEINE', 'IS A', 'VITAL SIGN', '#5a3520', '#ffe066'], ['MY OTHER', 'MUG IS IN', 'THE SINK', '#e9edf2', '#64748b'], ['ASK ME', 'ABOUT MY', 'BACK PAIN', '#ffd23f', '#2b3446'],
    ['SHH.', 'THE Q WORD', 'IS BANNED', '#2b3446', '#ffd23f']];
  // ---- coffee for the unit: fill orders of sugar, milk and coffee before the break ends ----
  const NUM = ['NO', 'ONE', 'TWO', 'THREE', 'FOUR'];
  const COFFEE_EXTRA = ['THE USUAL.', 'PLEASE. I BEG.', 'SURVIVAL MODE.', 'BEFORE ROUNDS, PLEASE.', 'DO NOT JUDGE ME.', 'HURRY. CODE SOON.', 'I HAVE BEEN AWAKE SINCE TUESDAY.',
    'DOCTOR TOOK MY LAST ONE.', 'FOR MORALE.', 'MEDICINAL PURPOSES.', 'IT IS ONLY 3 AM.', 'STRONG ENOUGH TO CHART.',
    'IN MY MUG. NOT THE STYROFOAM.', 'BEFORE THE FAMILY MEETING.', 'I HAVE FOUR ADMITS.', 'CHARTING IS NOT CHARTING ITSELF.', 'MAKE IT A DOUBLE. LIKE MY SHIFT.',
    'BED 4 PRESSED THE CALL BELL AGAIN.', 'DO NOT TELL CHARGE NURSE.', 'I HAVE NOT PEED SINCE 7.', 'HANDOVER IN TEN.', 'PHARMACY IS IGNORING ME.',
    'IT IS A FULL MOON, OKAY.', 'I LOVE YOU. PLEASE HURRY.'];
  const COFFEE_YES = ['BLESS YOU.', 'YOU MAY LIVE.', 'NOW I CAN FEEL MY FACE.', 'FINALLY. A COMPETENT ADULT.', 'BEST THING ALL SHIFT.', 'I WOULD DIE FOR YOU. NOT TODAY.',
    'CHARTING THIS AS A MIRACLE.', 'YOU CAN HAVE MY NEXT ADMIT. KIDDING.', 'PERFECT. NOW DO MY CHARTING.', 'ADDING YOU TO MY WILL.', 'THIS IS WHY YOU ARE MY FAVOURITE.', 'MY HEART RATE IS NORMAL AGAIN.'];
  const COFFEE_NO = ['THIS IS NOT MY ORDER.', 'DID THE DOCTOR MAKE THIS?', 'I SAID WHAT I SAID.', 'INCIDENT REPORT.', 'THIS TASTES LIKE NIGHT SHIFT.', 'WRONG. LIKE MY LIFE CHOICES.',
    'I AM WRITING THIS UP.', 'WHO TAUGHT YOU COFFEE?', 'THIS IS BEING ESCALATED.', 'I ASKED FOR COFFEE, NOT SOUP.', 'GIVE THIS TO DAY SHIFT.', 'NOPE. TRY AGAIN, STUDENT.'];
  const coffeeOrder = () => {
    const milk = one([0, 0, 1, 1, 2, 2, 3]), sugar = one([0, 0, 1, 2, 2, 3]), cof = 4 - milk;
    const sug = sugar === 0 ? 'NO SUGAR' : NUM[sugar] + ' SUGAR' + (sugar > 1 ? 'S' : '');
    const text = milk === 0 ? (sugar === 0 ? 'BLACK. ALL COFFEE.' : sug + ', ALL COFFEE.') : sug + ', ' + NUM[milk] + ' MILK, ' + NUM[cof] + ' COFFEE.';
    return { sugar, milk, cof, text, who: one(NURSES), extra: one(COFFEE_EXTRA), mug: one(MUGS) };
  };
  const COFFEE_W = 50, COFFEE_H = 76, POUR_T = 0.35;
  const coffeeCup = () => { const ct = Math.round(LH * 0.66); return { ct, cy: ct - 8 - COFFEE_H, ph: Math.floor((COFFEE_H - 4) / 4) }; };
  const coffeeBtns = () => { const y = LH - 40, w = 58; return [{ id: 'cof', x: 6, y, w, h: 32, label: 'COFFEE', col: '#7a4a2c', hi: '#a8714a' }, { id: 'milk', x: 69, y, w, h: 32, label: 'MILK', col: '#5b8def', hi: '#8ab0ff' }, { id: 'serve', x: 132, y, w, h: 32, label: 'SERVE', col: '#22a35a', hi: '#4fd38a' }]; };
  const coffee = {
    title: 'COFFEE RUN!', head: '#8a5a33', song: 'break', isBreak: true,
    blurb: 'The unit wants coffee, and they are specific. Tap the sugar bowl for cubes, pour coffee and milk with the buttons, then serve. Four parts fill a mug.',
    rows: [
      [(x, y) => { R(x - 8, y - 2, 16, 8, K); R(x - 7, y - 1, 14, 6, '#fff'); R(x - 7, y - 1, 14, 2, '#5b8def'); for (const dx of [-5, -1, 3]) { R(x + dx, y - 6, 4, 4, K); R(x + dx + 1, y - 5, 2, 2, '#fff'); } }, 'TAP THE BOWL FOR SUGAR', 'ONE CUBE PER TAP', '#8a5a33'],
      [(x, y) => { R(x - 6, y - 7, 12, 15, K); R(x - 5, y - 6, 10, 13, '#dceff5'); R(x - 5, y + 1, 10, 6, '#5a3520'); R(x - 5, y - 3, 10, 4, '#f4ead8'); }, 'COFFEE + MILK = FOUR PARTS', 'POUR WITH THE BUTTONS BELOW', '#6b3f22'],
      [(x, y) => { R(x - 8, y - 5, 16, 11, K); R(x - 7, y - 4, 14, 9, '#22a35a'); R(x - 4, y, 2, 2, '#fff'); R(x - 2, y + 2, 2, 1, '#fff'); R(x, y - 1, 2, 3, '#fff'); R(x + 2, y - 3, 2, 2, '#fff'); }, 'SERVE IT WHEN IT MATCHES', 'AS MANY AS YOU CAN IN 60S', '#2e8a5f'],
    ],
    breakLine: m => 'ORDERS SERVED ' + m.served + (m.wrong ? '   WRONG ' + m.wrong : ''),
    init(m) { m.dur = 60; m.served = 0; m.wrong = 0; m.combo = 0; m.done_ = []; m.bowl = 0; m.say = null; coffee.next(m); },
    next(m) { m.order = coffeeOrder(); m.parts = []; m.sugar = 0; m.pour = null; m.state = 'in'; m.st = 0; m.cubes = []; m.press = null; m.spill = 0; m.full = 0; },
    update(m, dt) {
      m.st += dt; m.bowl = Math.max(0, m.bowl - dt * 5); m.spill = Math.max(0, m.spill - dt); if (m.say) { m.say.t += dt; if (m.say.t > 1.4) m.say = null; }
      if (m.state === 'in' && m.st > 0.3) { m.state = 'ready'; m.st = 0; }
      if (m.pour) { m.pour.t += dt; if (m.pour.t >= POUR_T) { m.parts.push(m.pour.kind); m.pour = null;
        if (m.parts.length === 4) { m.full = 1; Sound.sfx.ding(); }
        if (m.parts.length > 4) { m.say = { text: 'CODE BROWN!', ok: false, t: 0 }; Sound.sfx.slip(); shakeScreen(0.2, 1.5); buzz(50); m.wrong++; m.combo = 0; m.state = 'out'; m.st = 0; m.spill = 1; } } }
      m.cubes.forEach(c => c.t += dt);
      if (m.press) { m.press.t += dt; if (m.press.t > 0.15) m.press = null; }
      if (m.state === 'out' && m.st > 0.45) coffee.next(m);
      if (m.t >= m.dur && !m.done) end(m, 'win');
    },
    serve(m) {
      const o = m.order, c = m.parts.filter(k => k === 'cof').length, mk = m.parts.filter(k => k === 'milk').length, { cy } = coffeeCup();
      if (c === o.cof && mk === o.milk && m.sugar === o.sugar) {
        m.combo++; const pts = 60 + Math.min(m.combo - 1, 5) * 10; m.score += pts; m.served++; m.done_.push(o.mug);
        pop('+' + pts + (m.combo > 1 ? '  X' + m.combo : ''), 97, cy - 12, '#ffe066'); m.say = { text: one(COFFEE_YES), ok: true, t: 0 };
        Sound.sfx.bonus(); sparkle(97, cy + 20, 12, ['#ffe066', '#fff']);
      } else { m.wrong++; m.combo = 0; m.say = { text: m.parts.length < 4 ? 'HALF A CUP? REALLY?' : one(COFFEE_NO), ok: false, t: 0 }; Sound.sfx.nope(); buzz(40); shakeScreen(0.12, 1); }
      m.state = 'out'; m.st = 0;
    },
    down(m, p) {
      if (m.state !== 'ready' || m.pour) return;
      const { ct } = coffeeCup();
      if (p.x < 46 && p.y > ct - 44 && p.y < ct + 8) { if (m.sugar >= 6) return; m.sugar++; m.bowl = 1; m.cubes.push({ t: 0, x: 28 + (m.sugar % 3) * 5 }); Sound.sfx.blip(900 + m.sugar * 80); return; }
      for (const b of coffeeBtns()) if (p.x >= b.x - 2 && p.x < b.x + b.w + 2 && p.y >= b.y - 6 && p.y < b.y + b.h + 4) {
        m.press = { id: b.id, t: 0 };
        if (b.id === 'serve') coffee.serve(m); else { m.pour = { kind: b.id, t: 0 }; Sound.sfx.pour(); }
        return; }
    },
    paintBg(g) {
      const ct = Math.round(LH * 0.66), mx = 44, mw = 108, my = ct - 172, cb = Math.max(46, Math.min(my - 8, 70));
      // subway tile backsplash
      R(0, 0, LW, ct, '#e3d8c2', g);
      for (let y = 0, r = 0; y < ct; y += 7, r++) for (let x = r % 2 ? -8 : 0; x < LW; x += 16) { R(x + 1, y + 1, 15, 6, '#f4eee0', g); R(x + 1, y + 1, 15, 1, '#fbf8f0', g); }
      // upper cabinets, with the note everyone ignores
      R(0, 0, LW, cb + 3, K, g); R(0, 0, LW, cb + 2, '#a8743f', g);
      for (let i = 0; i < 4; i++) { const x = 2 + i * 48; R(x, 12, 45, cb - 14, '#7a4e2b', g); R(x + 1, 13, 43, cb - 16, '#b98552', g); R(x + 5, 17, 35, cb - 24, '#a8743f', g); R(x + 5, 17, 35, 1, '#c99460', g);
        R(i % 2 ? x + 4 : x + 38, cb - 12, 3, 5, '#e9edf2', g); }
      R(0, 9, LW, 2, '#7a4e2b', g); R(0, cb + 2, LW, 1, '#fff6cf', g);
      R(105, 20, 34, 26, '#e3c84a', g); R(104, 19, 34, 26, '#ffe98a', g); R(117, 17, 9, 4, '#cfe8ff', g);
      Font.small(g, 'LABEL', 108, 22, '#b5427e'); Font.small(g, 'YOUR', 108, 29, '#b5427e'); Font.small(g, 'FOOD!!', 108, 36, '#b5427e');
      // microwave on a shelf, and a sign about yogurt
      const wy = ct - 66;
      R(1, wy, 40, 22, K, g); R(2, wy + 1, 38, 20, '#e9edf2', g); R(4, wy + 3, 24, 16, '#2b3446', g); R(5, wy + 4, 8, 3, '#3b4766', g); R(30, wy + 3, 8, 4, '#14202e', g); R(31, wy + 4, 2, 2, '#3ddc84', g); R(34, wy + 4, 2, 2, '#3ddc84', g);
      for (let k = 0; k < 6; k++) R(31 + (k % 2) * 4, wy + 9 + Math.floor(k / 2) * 3, 2, 2, '#9aa3b2', g); R(0, wy + 22, 44, 2, '#7a4e2b', g); R(4, wy + 24, 2, 4, '#7a4e2b', g); R(36, wy + 24, 2, 4, '#7a4e2b', g);
      R(156, ct - 70, 36, 30, '#d9d2c3', g); R(155, ct - 71, 36, 30, '#fff', g); R(171, ct - 73, 6, 4, '#cfe8ff', g);
      Font.small(g, 'WHO ATE', 158, ct - 66, '#c0392b'); Font.small(g, 'MY', 158, ct - 59, '#c0392b'); Font.small(g, 'YOGURT?', 158, ct - 52, '#c0392b');
      // counter and lower cabinets
      R(0, ct, LW, 5, '#d9d2c3', g); for (let i = 0; i < 40; i++) R((i * 37) % LW, ct + 1 + (i % 4), 1, 1, i % 2 ? '#b9b0a0' : '#efe9dc', g);
      R(0, ct, LW, 1, '#efe9dc', g); R(0, ct + 5, LW, 2, '#a39b8b', g); R(0, ct + 7, LW, 1, K, g);
      R(0, ct + 8, LW, LH - ct - 8, '#8a5a33', g); const dt = ct + 32;
      for (let i = 0; i < 4; i++) { const x = 2 + i * 48;
        R(x, ct + 10, 45, 19, '#6e4527', g); R(x + 1, ct + 11, 43, 17, '#8a5a33', g); R(x + 1, ct + 11, 43, 1, '#9c6a3e', g); R(x + 16, ct + 23, 13, 2, '#e9edf2', g);
        R(x, dt, 45, LH - dt - 8, '#6e4527', g); R(x + 1, dt + 1, 43, LH - dt - 10, '#8a5a33', g); R(x + 5, dt + 5, 35, LH - dt - 18, '#7a4e2b', g); R(x + 5, dt + 5, 35, 1, '#9c6a3e', g);
        R(i % 2 ? x + 4 : x + 38, dt + 4, 3, 6, '#e9edf2', g); }
      R(0, LH - 6, LW, 6, '#3e2614', g);
      // a steel tray for the mugs already served
      R(2, LH - 47, LW - 4, 4, K, g); R(3, LH - 47, LW - 6, 2, '#dfe5ec', g); R(3, LH - 45, LW - 6, 1, '#9aa3b2', g); R(5, LH - 43, 3, 2, K, g); R(LW - 8, LH - 43, 3, 2, K, g);
      // the machine
      R(mx - 1, my - 1, mw + 2, 174, K, g); R(mx, my, mw, 172, '#3b4252', g); R(mx, my, 6, 172, '#2b3446', g); R(mx + mw - 6, my, 6, 172, '#2b3446', g);
      R(mx, my, mw, 4, '#9aa3b2', g); R(mx, my, mw, 1, '#dfe5ec', g); R(mx + 6, my + 6, mw - 12, 26, '#55607a', g); R(mx + 6, my + 8, mw - 12, 22, '#14202e', g);
      R(mx + 6, my + 36, mw - 12, 4, '#2b3446', g); R(mx + 40, my + 40, 28, 10, '#2b3446', g); R(mx + 45, my + 50, 5, 4, '#9aa3b2', g); R(mx + 58, my + 50, 5, 4, '#9aa3b2', g); R(mx + 46, my + 44, 3, 3, '#8a5a33', g); R(mx + 59, my + 44, 3, 3, '#f4ead8', g);
      Font.smallCentered(g, 'BREW-O-MATIC 3000', 97, my + 58, '#9aa3b2');
      [['#e8424f', 76], ['#3ddc84', 90], ['#9aa3b2', 104]].forEach(([c, y]) => { disc(mx + 11, my + y, 4, K, g); disc(mx + 11, my + y, 3, c, g); disc(mx + mw - 12, my + y, 4, K, g); disc(mx + mw - 12, my + y, 3, '#9aa3b2', g); });
      R(mx + 4, ct - 8, mw - 8, 8, '#2b3446', g); for (let x = mx + 8; x < mx + mw - 8; x += 4) R(x, ct - 7, 2, 1, '#55607a', g);
      // sugar jar and a box of very old donuts
      R(160, ct - 12, 30, 12, K, g); R(161, ct - 11, 28, 10, '#ff7eb6', g); R(158, ct - 22, 34, 11, K, g); R(159, ct - 21, 32, 9, '#ffb3d1', g); R(165, ct - 18, 20, 3, '#fff', g);
      disc(168, ct - 6, 3, '#d9a05b', g); disc(181, ct - 6, 3, '#d9a05b', g); R(168, ct - 6, 1, 1, '#ff7eb6', g); R(181, ct - 6, 1, 1, '#ff7eb6', g);
       Font.small(g, '2019', 167, ct - 30, '#8a5a33');
    },
    draw(m) {
      const mx = 44, mw = 108, o = m.order, { ct, cy, ph } = coffeeCup(), my = ct - 172, cw = COFFEE_W, chh = COFFEE_H;
      bgLayer('coffee', g => coffee.paintBg(g));
      Font.small(ctx, m.pour ? (m.pour.kind === 'cof' ? 'BREWING...' : 'FROTHING...') : m.parts.length >= 4 ? 'MUG FULL' : 'READY', mx + 12, my + 16, m.parts.length >= 4 && !m.pour ? '#ffd23f' : '#3ddc84');
      R(mx + mw - 16, my + 15, 5, 5, m.pour ? (Math.floor(T * 8) % 2 ? '#ffd23f' : '#7a5a00') : Math.floor(T * 3) % 2 ? '#3ddc84' : '#1f6b3d');
      // the sugar bowl, heaped with cubes; it hops when you take one
      { const hop = Math.round(m.bowl * 2), bx = 5, by = ct - 13 - hop;
        Font.small(ctx, 'SUGAR', 10, ct - 36, '#8a5a33');
        for (const [dx, dy] of [[4, -6], [10, -8], [16, -6], [22, -7], [7, -11], [14, -12], [20, -11], [11, -15]]) { R(bx + dx, by + dy, 6, 6, K); R(bx + dx + 1, by + dy + 1, 4, 4, '#fff'); R(bx + dx + 1, by + dy + 4, 4, 1, '#dfe5ec'); }
        R(bx, by - 1, 34, 14, K); R(bx + 1, by, 32, 12, '#fff'); R(bx + 1, by, 32, 3, '#5b8def'); R(bx + 4, by + 5, 26, 1, '#dfe5ec'); R(bx + 3, by + 9, 28, 2, '#dfe5ec'); R(bx + 6, by + 13, 22, 1, K);
        if (m.state === 'ready' && m.sugar < o.sugar && Math.floor(T * 3) % 2) { R(bx + 13, by - 26, 8, 6, '#ffe066'); R(bx + 15, by - 20, 4, 3, '#ffe066'); R(bx + 16, by - 17, 2, 1, '#ffe066'); } }
      // the glass mug slides in, fills up layer by layer, then slides out
      const slide = m.state === 'in' ? (1 - Math.min(1, m.st / 0.3)) * 140 : m.state === 'out' ? -Math.min(1, m.st / 0.45) * 140 : 0, g = o.mug;
      const cx = Math.round(97 - cw / 2 + slide);
      // what's in the mug so far, the part being poured still rising
      const layers = m.parts.slice(0, 4).map(k => [k, 1]); if (m.pour && m.parts.length < 4) layers.push([m.pour.kind, m.pour.t / POUR_T]);
      // streams from the two spouts, into the mouth of the mug
      if (m.pour) { const top = cy + 2, sx = m.pour.kind === 'cof' ? mx + 46 : mx + 59;
        R(sx, my + 54, 3, Math.max(0, top - my - 54), m.pour.kind === 'cof' ? '#5a3520' : '#f4ead8'); R(sx + 1, my + 54, 1, Math.max(0, top - my - 54), m.pour.kind === 'cof' ? '#8a5a33' : '#ffffff');
        if (Math.floor(T * 14) % 2) { R(sx - 2, top - 2, 1, 1, '#fff'); R(sx + 4, top - 3, 1, 1, '#fff'); } }
      // saucer, then the handle and the body of tonight's branded mug
      R(cx - 6, ct - 9, cw + 12, 3, K); R(cx - 5, ct - 9, cw + 10, 2, '#f4f6f9');
      R(cx + cw, cy + 14, 13, 36, K); R(cx + cw, cy + 15, 12, 34, g[3]); R(cx + cw, cy + 20, 7, 24, K); R(cx + cw, cy + 21, 6, 22, '#2b3446');
      R(cx - 1, cy - 1, cw + 2, chh + 2, K); R(cx, cy, cw, chh, g[3]); R(cx, cy + chh - 2, 2, 2, K); R(cx + cw - 2, cy + chh - 2, 2, 2, K);
      ctx.globalAlpha = 0.35; R(cx + 2, cy + 6, 2, chh - 14, '#fff'); R(cx + 5, cy + 6, 1, chh - 34, '#fff'); ctx.globalAlpha = 0.14; R(cx + cw - 5, cy, 5, chh, '#000'); R(cx, cy + chh - 3, cw, 3, '#000'); ctx.globalAlpha = 1;
      // the slogan, printed big on the front
      { const ln = g.slice(0, 3).filter(Boolean), y0 = cy + 38 - Math.round(ln.length * 9 / 2);
        ln.forEach((t, i) => Font.smallCentered(ctx, t, cx + cw / 2 - 2, y0 + i * 9, g[4])); }
      // looking into the mouth: dark when empty, then the brew, paler with every part of milk
      { const n = layers.reduce((a, [, f]) => a + f, 0), mk = layers.reduce((a, [k, f]) => a + (k === 'milk' ? f : 0), 0), w = n ? mk / n : 0;
        const C = [0x5a, 0x35, 0x20], M = [0xf4, 0xea, 0xd8], col = 'rgb(' + C.map((c, i) => Math.round(c + (M[i] - c) * w)).join(',') + ')';
        R(cx, cy - 2, cw, 6, K); R(cx + 2, cy - 1, cw - 4, 4, '#3b2a22');
        if (n > 0) { R(cx + 2, cy + 1 - Math.min(2, Math.floor(n * 0.75)), cw - 4, 2 + Math.min(2, Math.floor(n * 0.75)), col);
          if (mk && !m.pour) for (let x = cx + 6; x < cx + cw - 6; x += 7) R(x, cy, 3, 1, '#fffaf0'); }
        R(cx - 1, cy - 3, cw + 2, 1, K); R(cx, cy - 2, cw, 1, g[3]); R(cx, cy + 4, cw, 1, K); }
      // a fill gauge on the machine beside the mug: four parts, layered as poured
      { const gx = Math.round(97 - cw / 2) - 9, gb = cy + chh - 2;
        R(gx - 1, gb - ph * 4 - 2, 7, ph * 4 + 4, K); R(gx, gb - ph * 4 - 1, 5, ph * 4 + 2, '#14202e');
        let y = gb; layers.forEach(([k, f], i) => { const h = Math.max(1, Math.round(ph * f)); y -= h; R(gx, y, 5, h, k === 'cof' ? '#5a3520' : '#f4ead8'); R(gx, y, 1, h, k === 'cof' ? '#8a5a33' : '#fff');
          if (i && layers[i - 1][0] !== k) R(gx, y + h - 1, 5, 1, '#a87a55'); });
        for (let i = 1; i <= 4; i++) R(gx - 3, gb - ph * i, 3, 1, i === 4 ? '#e8424f' : '#94a3b8'); }
      // sugar cubes arc over and plop in
      for (const c of m.cubes) { if (c.t < 0.35) { const u = c.t / 0.35, x = Math.round(lerp(22, cx + 12 + (c.x % 20), u)), yy = Math.round(lerp(ct - 30, cy - 2, u) - Math.sin(u * Math.PI) * 26); R(x, yy, 5, 5, K); R(x + 1, yy + 1, 3, 3, '#fff'); }
        else if (c.t < 0.6) { const u = (c.t - 0.35) / 0.25, x = cx + 14 + (c.x % 20); ctx.globalAlpha = 1 - u; R(x - 3, cy - 2 - u * 5, 1, 1, '#fff'); R(x + 5, cy - 3 - u * 4, 1, 1, '#fff'); R(x + 1, cy - 4 - u * 7, 1, 1, '#fff'); ctx.globalAlpha = 1; } }
      if (m.parts.length >= 4 && m.state === 'ready') for (let i = 0; i < 3; i++) { const u = ((T * 0.9 + i * 0.33) % 1), yy = cy - 6 - u * 20; ctx.globalAlpha = 0.55 * (1 - u);
        for (let k = 0; k < 4; k++) R(cx + 14 + i * 10 + Math.round(Math.sin(T * 3 + i * 2 + k * 0.9) * 2), Math.round(yy - k * 2), 1, 2, '#fff'); ctx.globalAlpha = 1; }
      if (m.spill > 0) for (let i = 0; i < 12; i++) R(cx - 12 + i * 6, ct - 3 + (i % 3), 5, 2, '#5a3520');
      // the mugs already served, lined up on the tray
      m.done_.forEach((mg, i) => { if (i >= 52) return; const x = 6 + (i % 26) * 7, yy = LH - 54 - Math.floor(i / 26) * 8; R(x, yy, 6, 7, K); R(x + 1, yy + 1, 4, 5, mg[3]); R(x + 1, yy + 1, 4, 1, '#5a3520'); R(x + 5, yy + 2, 2, 3, K); });
      { const cb = Math.max(46, Math.min(my - 8, 70));
        Light.begin(amb('#c6c3cf', '#a29fb6'), 0.35);
        for (const x of [24, 72, 120, 168]) Light.add(x, cb + 18, 32, 26, '#ffe2b0', 0.5, 0, 1.2);
        Light.add(97, my + 19, 52, 16, '#5dff9d', m.pour ? 0.35 : 0.25, 0.06);
        Light.add(97, ct - 30, 46, 46, '#ffe2b0', 0.3, 0, 1.1); Light.add(33, ct - 61, 6, 4, '#5dff9d', 0.5, 0.15);
        Light.end(); }
      // the order ticket, with whoever is asking
      { const tx = 6, ty = 22, tw = LW - 12, drop = m.state === 'in' ? Math.round((1 - Math.min(1, m.st / 0.3)) * -16) : 0, lines = Font.wrap(o.text, tw - 34), th = 33 + Math.max(0, lines.length - 2) * 8, t0 = ty + drop;
        R(tx + 2, t0 + 2, tw, th, '#00000033'); R(tx - 1, t0 - 1, tw + 2, th + 2, K); R(tx, t0, tw, th, '#fff8dc'); R(tx, t0, tw, 9, '#8a5a33');
        for (let x = tx + 3; x < tx + tw - 3; x += 6) R(x, t0 + th - 1, 3, 1, '#e9dcb0');
        Font.small(ctx, o.who.toUpperCase() + ' WANTS:', tx + 4, t0 + 2, '#fff'); const sv = 'SERVED ' + m.served; Font.small(ctx, sv, tx + tw - 4 - Font.smallWidth(sv), t0 + 2, '#ffe066');
        R(tx + 4, t0 + 11, 20, 20, K); R(tx + 5, t0 + 12, 18, 18, '#ffd6e8');
        { const img = Sprites.staff('nurse', (typeof HAIR !== 'undefined' && HAIR[o.who]) || ['#4f3322', '#38231a'], 0, false); ctx.save(); ctx.beginPath(); ctx.rect(tx + 5, t0 + 12, 18, 18); ctx.clip(); ctx.drawImage(img, Math.round(tx + 14 - img.width / 2), t0 + 14); ctx.restore(); }
        lines.forEach((l, i) => Font.small(ctx, l, tx + 28, t0 + 13 + i * 8, '#334155'));
        if (lines.length < 2) Font.small(ctx, o.extra, tx + 28, t0 + 21, '#94a3b8');
        // what's in the mug against the order
        const have = [['SUGAR', m.sugar, o.sugar], ['MILK', m.parts.filter(k => k === 'milk').length, o.milk], ['COFFEE', m.parts.filter(k => k === 'cof').length, o.cof]];
        have.forEach(([n, h, w], i) => { const x = tx + 1 + i * 62, yy = t0 + th + 3, okk = h === w, over = h > w, lbl = n + ' ' + h + '/' + w;
          badge(x, yy, 58, 9, okk ? '#c9ffd9' : over ? '#ffd6dc' : '#fff'); Font.small(ctx, lbl, x + 29 - Math.floor(Font.smallWidth(lbl) / 2), yy + 1, okk ? '#22a35a' : over ? '#c0392b' : '#475569'); }); }
      // their verdict
      if (m.say) { const a = m.say.t < 1.1 ? 1 : (1.4 - m.say.t) / 0.3; ctx.globalAlpha = Math.max(0, a); bubble(m.say.text, 97, cy - 34, m.say.ok ? '#fff' : '#e8424f', m.say.ok ? '#2e8a5f' : '#fff', 4, LW - 4); ctx.globalAlpha = 1; }
      // buttons along the bottom, with icons
      for (const b of coffeeBtns()) { const dn = m.press && m.press.id === b.id ? 2 : 0, off = m.state !== 'ready' || m.pour, warn = b.id !== 'serve' && m.parts.length >= 4, col = off ? '#64748b' : warn ? '#9c6a3e' : b.col;
        R(b.x - 1, b.y - 1 + dn, b.w + 2, b.h + 2 - dn, K); R(b.x, b.y + dn, b.w, b.h - dn, col); R(b.x, b.y + b.h - 4, b.w, 4, '#00000033'); R(b.x, b.y + dn, b.w, 1, off ? '#7d8ca1' : b.hi);
        const ix = b.x + b.w / 2, iy = b.y + 6 + dn;
        if (b.id === 'cof') { R(ix - 5, iy, 10, 9, K); R(ix - 4, iy + 1, 8, 7, '#fff'); R(ix - 4, iy + 3, 8, 5, '#5a3520'); R(ix + 4, iy + 2, 3, 4, K); }
        else if (b.id === 'milk') { R(ix - 4, iy - 1, 8, 10, K); R(ix - 3, iy + 2, 6, 6, '#fff'); R(ix - 2, iy, 4, 2, '#fff'); R(ix - 3, iy + 4, 6, 2, '#5b8def'); }
        else { R(ix - 4, iy + 3, 2, 2, '#fff'); R(ix - 2, iy + 5, 2, 2, '#fff'); R(ix, iy + 3, 2, 2, '#fff'); R(ix + 2, iy + 1, 2, 2, '#fff'); R(ix + 4, iy - 1, 2, 2, '#fff'); }
        Font.smallCentered(ctx, b.label, b.x + b.w / 2, b.y + 19 + dn, '#fff', 1, K); }
      hud(m, 1 - m.t / m.dur);
    },
  };

  // ======================= BREAK ROOM DEFENSE (mid-shift break) =======================
  const SLEEVES = ['#2b3a67', '#6b4ea0', '#1f8a8a', '#c2185b', '#3a86ff'];
  const pizza = {
    title: 'PIZZA DEFENSE!', head: '#e67e22', song: 'break', isBreak: true,
    blurb: 'Someone left pizza in the break room. Day shift is coming for it. Tap the hands to slap them away.',
    rows: [
      [(x, y) => { disc(x + 4, y, 4, '#2b3a67'); disc(x - 3, y, 5, '#f4c7a1'); }, 'SLAP DAY SHIFT HANDS', 'EVERY SLICE LEFT IS POINTS', '#c0392b'],
      [(x, y) => { disc(x + 4, y, 4, '#4b5563'); disc(x - 3, y, 5, '#f4c7a1'); R(x - 9, y - 2, 6, 4, '#ffd166'); }, 'NOT THE MANAGER!', 'THEY BRING MORE PIZZA', '#2e8a5f'],
    ],
    init(m) { m.dur = 14; m.slices = [1, 1, 1, 1, 1, 1, 1, 1]; m.hands = []; m.spawnT = 0.5; m.slaps = 0; m.cx = 97; m.cy = Math.round(LH / 2 + 14); },
    left: m => m.slices.filter(Boolean).length,
    update(m, dt) {
      m.spawnT -= dt;
      if (m.spawnT <= 0) { const mgr = Math.random() < 0.15 && pizza.left(m) < 8;
        m.hands.push({ a: rnd(0, Math.PI * 2), d: 150, v: 62 + m.t * 4 + m.shift * 1.5, state: 'reach', mgr, sleeve: mgr ? '#4b5563' : one(SLEEVES), carry: mgr, wob: rnd(0, 6) });
        m.spawnT = Math.max(0.42, 1.1 - m.t * 0.045); }
      for (const h of m.hands) {
        if (h.state === 'reach') { h.d -= h.v * dt; if (h.d <= 42) { h.state = 'back';
          const near = (Math.floor(((h.a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)));
          if (h.mgr) { const k = m.slices.indexOf(0); if (k >= 0) m.slices[k] = 1; h.carry = false; pop('PIZZA PARTY! +1', m.cx, m.cy - 56, '#c9ffd9'); Sound.sfx.bonus(); }
          else { let k = near; for (let j = 0; j < 8 && !m.slices[k]; j++) k = (k + 1) % 8; if (m.slices[k]) { m.slices[k] = 0; h.carry = true; pop('-1 SLICE', m.cx, m.cy - 56, '#ff8a8f'); Sound.sfx.nope(); } } } }
        else h.d += 260 * dt;
      }
      m.hands = m.hands.filter(h => h.d < 170);
      if (!pizza.left(m) && !m.done) { pop('DAY SHIFT ATE IT ALL', 97, m.cy, '#ff8a8f'); end(m, 'lose'); }
      if (m.t >= m.dur && !m.done) { m.score += pizza.left(m) * 25; end(m, 'win'); }
    },
    pos: (m, h) => ({ x: m.cx + Math.cos(h.a) * h.d, y: m.cy + Math.sin(h.a) * h.d * 1.1 }),
    down(m, p) {
      let best = null, bd = 20;
      for (const h of m.hands) if (h.state === 'reach') { const q = pizza.pos(m, h), d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = h; } }
      if (!best) return;
      const q = pizza.pos(m, best); best.state = 'back';
      if (best.mgr) { const k = m.slices.indexOf(1); if (k >= 0) m.slices[k] = 0; pop('THAT WAS YOUR MANAGER', 97, q.y - 10, '#ff8a8f'); Sound.sfx.nope(); }
      else { m.slaps++; m.score += 30; pop('SLAP! +30', q.x, q.y - 8); Sound.sfx.slap(); buzz(25); shakeScreen(0.12, 1); sparkle(q.x, q.y, 6, ['#fff', '#ffe066']); }
    },
    pizzaArt(m) {
      const key = 'pz' + m.slices.join('');
      return art(key, 97, 97, c => {
        const r = 46, o = 48;
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y); if (d > r) continue;
          const k = Math.floor(((Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)); if (!m.slices[k]) { if (d < r - 1 && (x * 7 + y * 3) % 23 === 0) R(o + x, o + y, 1, 1, '#c79a5a', c); continue; }
          const edge = Math.abs(((Math.atan2(y, x) + Math.PI * 2) % (Math.PI / 4))) < 0.05 && d > 4;
          R(o + x, o + y, 1, 1, d > r - 1 ? K : d > r - 6 ? '#d9a05b' : edge ? '#e9b44c' : '#ffd166', c); }
        for (let k = 0; k < 8; k++) if (m.slices[k]) for (const [rr, da] of [[19, 0.4], [33, 0.25], [33, 0.65]]) { const a = (k + da) * Math.PI / 4; disc(Math.round(o + Math.cos(a) * rr), Math.round(o + Math.sin(a) * rr), 3, '#d63b3b', c); R(Math.round(o + Math.cos(a) * rr) - 1, Math.round(o + Math.sin(a) * rr) - 2, 1, 1, '#ff8a8f', c); }
      });
    },
    paintBg(g) {
      const cx = 97, cy = Math.round(LH / 2 + 14);
      // break room table, plank by plank
      const TONE = ['#b07a4a', '#a87244', '#b8834f', '#ab7547'];
      for (let x = 0, i = 0; x < LW; x += 22, i++) { R(x, 0, 22, LH, TONE[i % 4], g); R(x, 0, 1, LH, '#7a4e2b', g); R(x + 1, 0, 1, LH, '#c48a56', g);
        for (let k = 0; k < 7; k++) { const gx = x + 4 + Math.floor(Math.random() * 14), gy = Math.floor(Math.random() * LH), gl = 10 + Math.floor(Math.random() * 30); R(gx, gy, 1, gl, '#9c6a3e', g); if (k % 3 === 0) R(gx + 1, gy + 3, 1, gl - 6, '#c48a56', g); }
        if (i % 2) { const ky = Math.floor(Math.random() * LH); ellipse(x + 11, ky, 3, 5, '#8a5a33', g); ellipse(x + 11, ky, 1, 3, '#7a4e2b', g); } }
      // coffee ring, crumbs, napkins, a soda, somebody's phone
      for (let a = 0; a < 48; a++) if (a % 9 > 1) R(Math.round(28 + Math.cos(a / 48 * 6.283) * 10), Math.round(cy + 88 + Math.sin(a / 48 * 6.283) * 10), 1, 1, '#7a4e2b', g);
      for (let i = 0; i < 30; i++) R(cx - 70 + Math.floor(Math.random() * 140), cy - 70 + Math.floor(Math.random() * 150), 1, 1, i % 3 ? '#e9b44c' : '#d9a05b', g);
      for (let k = 3; k >= 0; k--) { R(10 + k, LH - 66 - k * 2, 30, 26, K, g); R(11 + k, LH - 65 - k * 2, 28, 24, k ? '#f4f6f9' : '#fff', g); }
      R(15, LH - 60, 20, 1, '#e3e8ee', g); R(15, LH - 50, 20, 1, '#e3e8ee', g);
      ellipse(LW - 26, 46, 11, 11, K, g); ellipse(LW - 26, 46, 10, 10, '#e8424f', g); ellipse(LW - 26, 46, 7, 7, '#c9ced6', g); ellipse(LW - 26, 46, 5, 5, '#e9edf2', g); R(LW - 28, 43, 4, 2, '#6c7484', g);
      R(LW - 34, LH - 74, 26, 44, K, g); R(LW - 33, LH - 73, 24, 42, '#2b3446', g); R(LW - 31, LH - 69, 20, 34, '#1b2340', g);
      for (let k = 0; k < 3; k++) { R(LW - 30, LH - 67 + k * 9, 18, 7, '#e9edf2', g); disc(LW - 27, LH - 64 + k * 9, 1, '#e8424f', g); R(LW - 24, LH - 65 + k * 9, 10, 1, '#94a3b8', g); R(LW - 24, LH - 63 + k * 9, 7, 1, '#cbd5e1', g); }
      R(LW - 24, LH - 34, 6, 1, '#55607a', g);
      // the box, with its lid flipped open
      const ly = cy - 108;
      R(cx - 63, ly - 1, 126, 48, K, g); R(cx - 62, ly, 124, 46, '#e3c08a', g); R(cx - 58, ly + 4, 116, 38, '#d8b07a', g);
      disc(cx - 36, ly + 22, 17, K, g); disc(cx - 36, ly + 22, 16, '#d63b3b', g); disc(cx - 36, ly + 22, 14, '#fff', g); disc(cx - 36, ly + 22, 13, '#d63b3b', g);
      Font.smallCentered(g, 'LUIGI', cx - 36, ly + 19, '#fff'); for (let k = 0; k < 6; k++) R(cx - 54 + k * 6, ly + 39, 3, 2, '#d63b3b', g);
      Font.small(g, 'FOR NIGHT', cx - 16, ly + 10, K); Font.small(g, 'SHIFT ONLY!', cx - 16, ly + 19, K); Font.small(g, 'HANDS OFF', cx - 16, ly + 28, '#c0392b'); R(cx - 16, ly + 35, 40, 1, '#c0392b', g);
      R(cx - 63, ly + 47, 126, 3, '#7a4e2b', g);
      R(cx - 63, cy - 63, 126, 126, K, g); R(cx - 62, cy - 62, 124, 124, '#e3c08a', g); R(cx - 60, cy - 60, 120, 120, '#d8b07a', g); R(cx - 56, cy - 56, 112, 112, '#c99a5e', g);
      for (let x = cx - 60; x < cx + 60; x += 3) { R(x, cy - 62, 1, 2, '#b98a4e', g); R(x, cy + 60, 1, 2, '#b98a4e', g); }
      for (const [gx, gy, r] of [[-40, -38, 6], [42, 30, 8], [-30, 44, 4], [44, -44, 5]]) { ellipse(cx + gx, cy + gy, r, r - 1, '#b98a4e', g); ellipse(cx + gx, cy + gy, r - 2, r - 3, '#bf9152', g); }
    },
    draw(m) {
      bgLayer('pizza', g => pizza.paintBg(g));
      ellipse(m.cx + 2, m.cy + 3, 48, 48, 'rgba(60,30,10,.25)');
      put(pizza.pizzaArt(m), m.cx - 48, m.cy - 48);
      for (const h of m.hands) {
        const q = pizza.pos(m, h), ex = m.cx + Math.cos(h.a) * 220, ey = m.cy + Math.sin(h.a) * 240, ux = Math.cos(h.a), uy = Math.sin(h.a);
        const L = Math.hypot(ex - q.x, ey - q.y), n = Math.ceil(L / 3), skin = h.mgr ? '#e8b48e' : '#f4c7a1';
        const at = t => [Math.round(lerp(ex, q.x, t)), Math.round(lerp(ey, q.y, t))], cuff = 1 - 16 / L;
        for (let i = 0; i <= n; i++) disc(...at(i / n), 6, K);
        for (let i = 0; i <= n; i++) { const t = i / n; disc(...at(t), 5, t < cuff ? h.sleeve : skin); }
        for (let i = 0; i <= n; i++) { const t = i / n; if (t < cuff) R(at(t)[0] - Math.round(uy * 3), at(t)[1] + Math.round(ux * 3), 1, 1, '#ffffff33'); }
        const [kx, ky] = at(cuff); disc(kx, ky, 6, K); disc(kx, ky, 5, h.mgr ? '#fff' : h.sleeve); if (h.mgr) { disc(Math.round(kx - ux * 5), Math.round(ky - uy * 5), 3, '#ffd23f'); }
        const cx = Math.round(q.x - ux * 6), cy = Math.round(q.y - uy * 6);
        disc(cx, cy, 8, K); disc(cx, cy, 7, skin); disc(cx + Math.round(uy * 2), cy - Math.round(ux * 2), 3, '#ffd9bd');
        for (let f = -1.5; f <= 1.5; f++) { const fa = h.a + Math.PI + f * 0.38, fx = Math.round(cx + Math.cos(fa) * 8), fy = Math.round(cy + Math.sin(fa) * 8); disc(fx, fy, 3, K); disc(fx, fy, 2, skin); R(Math.round(fx + Math.cos(fa) * 1), Math.round(fy + Math.sin(fa) * 1), 1, 1, h.mgr ? '#f4f6f9' : '#ff9fb2'); }
        { const ta = h.a + Math.PI + 1.3, tx = Math.round(cx + Math.cos(ta) * 7), ty = Math.round(cy + Math.sin(ta) * 7); disc(tx, ty, 3, K); disc(tx, ty, 2, skin); }
        if (h.carry) { R(cx - 5, cy - 4, 10, 8, K); R(cx - 4, cy - 3, 8, 6, '#ffd166'); R(cx - 4, cy - 3, 8, 1, '#d9a05b'); R(cx - 1, cy - 1, 2, 2, '#d63b3b'); }
        if (h.mgr) Font.small(ctx, 'MGR', Math.round(q.x - Math.cos(h.a) * 22) - 5, Math.round(q.y - Math.sin(h.a) * 22) - 2, '#fff');
      }
      Light.begin(amb('#b3a79c', '#8f8296'), 0.45, '#20140e');
      Light.add(m.cx, m.cy - 10, 120, 130, '#ffe2b0', 0.5, 0, 1);
      Light.add(LW - 21, LH - 52, 18, 24, '#9fc0ff', 0.45, 0.1);
      Light.end();
      Font.smallCentered(ctx, 'SLICES LEFT ' + pizza.left(m), 97, LH - 12, '#fff', 1, K);
      hud(m, 1 - m.t / m.dur);
    },
  };

  // ======================= GROUP HANGOUT (find the date that suits everyone) =======================
  // eight fit on screen, so each hangout invites eight of the cast at random
  let CREW = [];
  const EXCUSES = ["I'M ON NIGHTS. I'M ALWAYS ON NIGHTS.", 'PICKING UP OT. RENT IS RENT.', "I'LL BE ASLEEP. ALL DAY.", "MAYBE? (THAT'S A NO.)", "THAT'S MY ONE DAY OFF.",
    'MANDATORY TRAINING. ON HAND WASHING.', "ON CALL. DON'T ASK.", 'MY CAT HAS A VET THING.', "GYM. I WON'T GO, BUT STILL.", 'FLOATING TO THE ED. PRAY FOR ME.',
    'MY BODY IS STILL ON NIGHTS.', 'I HAVE A NAP SCHEDULED.', "CAN'T. STILL CHARTING LAST SHIFT.", 'SKILLS DAY. THE CPR DUMMY AWAITS.', 'LAUNDRY. FOUR WEEKS OF IT.',
    "HIDING FROM MY MANAGER.", "I'LL BE STARING AT A WALL.", 'SOCIAL BATTERY: 0%.'];
  const crewHair = n => (typeof HAIR !== 'undefined' && HAIR[n]) || ['#4f3322', '#38231a'];
  const hangout = {
    title: 'GROUP HANGOUT', head: '#ff7eb6', song: 'break',
    blurb: 'Plan a night out with the crew. Everyone works different shifts. Find the one date that every nurse is free.',
    rows: [
      [(x, y) => putC(Sprites.staff('nurse', crewHair('Sarah'), 0, false), x, y + 9, 0.9), 'TAP A NURSE', 'THEY TELL YOU THEIR FREE DATES', '#b5427e'],
      [(x, y) => { R(x - 8, y - 7, 16, 14, K); R(x - 7, y - 6, 14, 12, '#fff'); Font.smallCentered(ctx, '14', x, y - 2, '#334155'); }, 'TAP THE DATE THAT WORKS', 'ON THE CALENDAR AT THE BOTTOM', '#2e8a5f'],
      [(x, y) => { heart(x - 9, y - 3, true); heart(x + 2, y - 3, true); }, 'TWO GUESSES', 'THE CLOCK IS TICKING TOO', '#c0392b'],
    ],
    goal: 'FIRST GUESS RIGHT = +1,000 BONUS',
    init(m) {
      CREW = NURSES.slice().sort(() => Math.random() - 0.5).slice(0, 8);
      m.dur = 60; m.lives = 2; m.maxLives = 2; m.days = 30; m.start = Math.floor(Math.random() * 5); m.sel = -1; m.selT = 0; m.asked = new Set(); m.guesses = []; m.say = null;
      m.month = one(['JUNE', 'SEPTEMBER', 'NOVEMBER', 'APRIL']);
      for (let tries = 0; tries < 200; tries++) {
        const days = [...Array(m.days).keys()].map(d => d + 1).sort(() => Math.random() - 0.5), D = days[0];
        const decoys = days.slice(1, 3 + Math.min(3, Math.floor(m.shift / 4)));
        const left = CREW.slice().sort(() => Math.random() - 0.5);
        const sets = CREW.map(() => new Set([D]));
        decoys.forEach((d, i) => CREW.forEach((n, k) => { if (n !== left[i % left.length]) sets[k].add(d); }));
        const filler = days.slice(1).filter(d => !decoys.includes(d));
        sets.forEach(s => { const want = 5 + Math.floor(Math.random() * 3); for (const d of filler.slice().sort(() => Math.random() - 0.5)) { if (s.size >= want) break; s.add(d); } });
        const common = days.filter(d => sets.every(s => s.has(d)));
        if (common.length === 1 && sets.every(s => s.size >= 5 && s.size <= 7)) { m.answer = D; m.free = sets.map(s => [...s].sort(() => Math.random() - 0.5)); break; }
      }
    },
    nurseCell(i) { const top = 22, h = Math.round((LH - 22 - 168) / 2); return { x: 2 + (i % 4) * 48, y: top + Math.floor(i / 4) * h, w: 47, h }; },
    calTop: () => LH - 128,
    dayCell(d) { const idx = d - 1 + M.start; return { x: 6 + (idx % 7) * 26, y: hangout.calTop() + 18 + Math.floor(idx / 7) * 21, w: 25, h: 20 }; },
    update(m, dt) { m.selT += dt; if (m.t >= m.dur && !m.done) { m.say = { name: 'GROUP CHAT', text: 'EVERYONE LEFT THE CHAT.' }; end(m, 'lose'); } },
    down(m, p) {
      for (let i = 0; i < CREW.length; i++) { const c = hangout.nurseCell(i);
        if (p.x >= c.x && p.x < c.x + c.w && p.y >= c.y && p.y < c.y + c.h) { m.sel = i; m.selT = 0; m.asked.add(i); m.free[i].sort(() => Math.random() - 0.5); m.say = null; Sound.sfx.blip(700 + i * 40); return; } }
      for (let d = 1; d <= m.days; d++) { const c = hangout.dayCell(d);
        if (p.x >= c.x && p.x < c.x + c.w && p.y >= c.y && p.y < c.y + c.h) {
          if (m.guesses.includes(d)) return;
          m.guesses.push(d);
          if (d === m.answer) { const pts = (m.guesses.length === 1 ? 800 : 400) + Math.max(0, Math.round((m.dur - m.t) * 15)); m.score += pts; pop('+' + fmt(pts), c.x + 12, c.y - 4);
            m.say = { name: 'EVERYONE', text: "IT'S A DATE! (TWO WILL CANCEL.)" }; sparkle(c.x + 12, c.y + 10, 14, ['#ffe066', '#fff', '#ff7eb6']); end(m, 'win'); }
          else { const k = m.free.findIndex(s => !s.includes(d)); m.lives--; m.say = { name: CREW[k], text: one(EXCUSES) }; m.sel = -1;
            Sound.sfx.nope(); buzz(50); shakeScreen(0.2, 1.5); if (m.lives <= 0) end(m, 'lose'); }
          return; } }
    },
    paintBg(g) {
      R(0, 0, LW, LH, '#fdf0f5', g);
      const nh = Sprites.staff('nurse', crewHair('Becca'), 0, false).height;
      for (let row = 0; row < 2; row++) {
        const c = hangout.nurseCell(row * 4), k = c.h >= 100 ? 3 : 2, fy = c.y + c.h - 16, room = c.h - 16 - nh * k - 8;
        // wallpaper, wainscot, then a strip of lounge floor to stand on
        for (let y = c.y + 2; y < fy; y += 8) for (let x = (y / 8 % 2) * 6; x < LW; x += 12) R(x, y, 1, 1, '#f3d3e1', g);
        const wy = fy - Math.round((fy - c.y) * 0.32);
        R(0, wy, LW, fy - wy, '#f6dce8', g); R(0, wy, LW, 2, '#e9bfd2', g); R(0, wy, LW, 1, '#fff6fa', g);
        for (let x = 6; x < LW; x += 24) { R(x, wy + 5, 18, fy - wy - 9, '#f0cfdd', g); R(x, wy + 5, 18, 1, '#e4b8cb', g); }
        R(0, fy, LW, 16, '#d9a77f', g); R(0, fy, LW, 1, '#b07a4a', g); for (let x = row * 11; x < LW; x += 28) R(x, fy + 1, 1, 15, '#c48e66', g); R(0, fy + 8, LW, 1, '#c99670', g);
        if (room < 12) continue;
        const bh = Math.min(26, room), by = c.y + 4;
        if (row === 0) {
          // corkboard of things nobody reads
          R(8, by, 92, bh, K, g); R(9, by + 1, 90, bh - 2, '#a8643a', g); R(11, by + 3, 86, bh - 6, '#c98a52', g);
          for (let i = 0; i < 12; i++) R(12 + (i * 29) % 84, by + 4 + (i * 7) % Math.max(1, bh - 8), 1, 1, '#a8643a', g);
          [['#fff', 14], ['#ffe98a', 36], ['#cfe8ff', 58], ['#ffd6e8', 78]].forEach(([col, x], i) => { const ny = by + 4 + (i % 2) * 3, nh2 = Math.min(14, bh - 10); R(x, ny, 16, nh2, col, g); R(x + 2, ny + 3, 11, 1, '#94a3b8', g); R(x + 2, ny + 6, 8, 1, '#94a3b8', g); disc(x + 8, ny, 1, ['#e8424f', '#3a86ff', '#2fbf71', '#9b6bd6'][i], g); });
          // window on the night
          const wx = 112, ww = 74;
          R(wx - 2, by - 1, ww + 4, bh + 2, K, g); R(wx - 1, by, ww + 2, bh, '#fff', g); R(wx, by + 1, ww, bh - 2, '#2b3a67', g);
          disc(wx + 60, by + 7, 3, '#fff3c4', g); for (let i = 0; i < 6; i++) R(wx + 4 + i * 11, by + 3 + (i * 5) % Math.max(1, bh - 8), 1, 1, '#c9d6ff', g);
          R(wx + ww / 2 - 1, by, 2, bh, '#fff', g); R(wx - 3, by + bh, ww + 6, 2, '#e9bfd2', g);
        } else {
          // sign and posters
          R(6, by, 64, 11, K, g); R(7, by + 1, 62, 9, '#b5427e', g); Font.small(g, 'STAFF LOUNGE', 10, by + 3, '#fff');
          const ph = Math.min(18, bh);
          R(80, by, 46, ph, K, g); R(81, by + 1, 44, ph - 2, '#fff3c4', g); Font.small(g, 'BINGO FRI', 84, by + 3, '#b5427e'); if (ph > 12) R(84, by + 11, 36, 1, '#e9bfd2', g);
          R(134, by, 54, ph, K, g); R(135, by + 1, 52, ph - 2, '#dcf5e6', g); Font.small(g, 'WASH MUGS', 139, by + 3, '#2e8a5f'); if (ph > 12) Font.small(g, 'SERIOUSLY', 139, by + 10, '#64748b');
        }
      }
    },
    draw(m) {
      bgLayer('hangout', g => hangout.paintBg(g));
      // the crew
      CREW.forEach((n, i) => {
        const c = hangout.nurseCell(i), img = Sprites.staff('nurse', crewHair(n), 0, i % 2 === 1), sel = m.sel === i, bob = sel ? Math.round(Math.abs(Math.sin(m.selT * 8)) * -2) : 0;
        if (sel) { ellipse(c.x + c.w / 2, c.y + c.h - 13, 18, 5, '#ff7eb6'); ellipse(c.x + c.w / 2, c.y + c.h - 13, 15, 3, '#ffb3d1'); }
        else ellipse(c.x + c.w / 2, c.y + c.h - 13, 11, 2, 'rgba(20,24,36,.2)');
        const k = c.h >= 100 ? 3 : 2; putC(img, c.x + c.w / 2, c.y + c.h - 12 + bob, k);
        const tw = Font.smallWidth(n.toUpperCase()) + 6, tx = Math.round(c.x + c.w / 2 - tw / 2), ty = c.y + c.h - 10;
        R(tx - 1, ty - 1, tw + 2, 9, K); R(tx, ty, tw, 7, m.asked.has(i) ? '#fff' : '#ffe066'); Font.small(ctx, n.toUpperCase(), tx + 3, ty + 1, K);
        if (!m.asked.has(i) && Math.floor(T * 2 + i) % 2) Font.bigCentered(ctx, '?', c.x + c.w - 6, c.y + c.h - 12 - img.height * k - 4, '#b5427e', 1, '#fff');
      });
      Light.begin(amb('#d6cfdf', '#aca4c6'), 0.25, '#2a1b33');
      for (let row = 0; row < 2; row++) { const c = hangout.nurseCell(row * 4); for (const x of [50, 146]) Light.add(x, c.y + c.h * 0.55, 56, c.h * 0.55, '#ffe2b0', 0.4, 0, 1.1); }
      { const c = hangout.nurseCell(0); Light.add(149, c.y + 18, 44, 26, '#a9c2ff', 0.35, 0, 1.1); }
      if (m.sel >= 0) { const c = hangout.nurseCell(m.sel); Light.add(c.x + c.w / 2, c.y + c.h - 30, 24, 40, '#ffd6e8', 0.45, 0.06); }
      Light.end();
      // chat box with whoever is talking
      const by = hangout.calTop() - 40;
      R(5, by - 1, LW - 10, 36, K); R(6, by, LW - 12, 34, '#fff'); R(6, by + 33, LW - 12, 1, '#f1e4ea');
      if (m.say) { Font.small(ctx, m.say.name.toUpperCase() + ':', 10, by + 4, '#b5427e'); if (Font.bigWidth(m.say.text) <= LW - 20) Font.bigCentered(ctx, m.say.text, 97, by + 18, '#334155', 1); else Font.smallCentered(ctx, m.say.text, 97, by + 19, '#334155'); }
      else if (m.sel >= 0) {
        Font.small(ctx, CREW[m.sel].toUpperCase() + ": I'M FREE ON THE...", 10, by + 4, '#b5427e');
        Font.bigCentered(ctx, m.free[m.sel].join(' '), 97, by + 17, '#334155', m.free[m.sel].join(' ').length * 12 <= LW - 20 ? 2 : 1);
      } else Font.smallCentered(ctx, 'TAP A NURSE TO ASK WHEN THEY ARE FREE', 97, by + 14, '#94a3b8');
      // calendar
      const ct = hangout.calTop();
      R(6, ct + 1, LW - 8, 128, '#00000022'); R(4, ct - 1, LW - 8, 128, K); R(5, ct, LW - 10, 126, '#fff'); R(5, ct, LW - 10, 9, '#ff7eb6'); Font.smallCentered(ctx, m.month, 97, ct + 2, '#fff');
      for (let x = 12; x < LW - 8; x += 15) if (Math.abs(x + 1 - 97) > 22) { R(x, ct - 4, 3, 7, K); R(x + 1, ct - 3, 1, 5, '#c7cbd3'); }
      'SMTWTFS'.split('').forEach((d, i) => Font.small(ctx, d, 6 + i * 26 + 11, ct + 11, i === 0 || i === 6 ? '#b5427e' : '#94a3b8'));
      for (let d = 1; d <= m.days; d++) {
        const c = hangout.dayCell(d), wk = ((d - 1 + m.start) % 7), g = m.guesses.includes(d), right = g && d === m.answer;
        R(c.x, c.y, c.w - 1, c.h - 1, right ? '#c9ffd9' : g ? '#ffe1e1' : wk === 0 || wk === 6 ? '#fff4f9' : '#f4f6f9');
        Font.bigCentered(ctx, String(d), c.x + 12, c.y + 6, g && !right ? '#c0392b' : '#334155', 1);
        if (g && !right) for (let k = 0; k < 14; k++) { R(c.x + 5 + k, c.y + 3 + k, 1, 1, '#e8424f'); R(c.x + 18 - k, c.y + 3 + k, 1, 1, '#e8424f'); }
        if (right) { for (let a = 0; a < 40; a++) R(Math.round(c.x + 12 + Math.cos(a / 40 * 6.283) * 11), Math.round(c.y + 9 + Math.sin(a / 40 * 6.283) * 9), 1, 1, '#22a35a'); }
      }
      hud(m, 1 - m.t / m.dur);
    },
    stats: m => ['GUESSES ' + m.guesses.length + '   TIME ' + Math.round(m.t) + 'S', m.done === 'win' && m.guesses.length === 1],
    endTitle: m => m.done === 'win' ? "IT'S A DATE!" : 'GROUP CHAT DIED',
  };

  const GAMES = { calls, cpr, meds, hangout, coffee, pizza };
  const ROTATION = ['calls', 'rush', 'cpr', 'meds', 'hangout'];

  // ---------- framework ----------
  function begin(kind, shift, mode) {
    const g = GAMES[kind]; M = { kind, g, mode: mode || (g.isBreak ? 'break' : 'between'), shift, t: 0, score: 0, done: null, endT: 0, pops: [], lives: null };
    g.init(M); screen = 'miniIntro'; overlayT = 0;
  }
  // which game comes next: a shuffled bag (so you see them all), reshuffled at random each round and never the same twice in a row
  function nextGame() {
    let bag = [], last = null;
    try { bag = JSON.parse(localStorage.getItem('aj.minibag') || '[]').filter(k => ROTATION.includes(k)); last = localStorage.getItem('aj.minilast'); } catch (e) {}
    if (!bag.length) { bag = ROTATION.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (bag[0] === last) bag.push(bag.shift()); }
    const k = bag.shift();
    try { localStorage.setItem('aj.minibag', JSON.stringify(bag)); localStorage.setItem('aj.minilast', k); } catch (e) {}
    return k;
  }
  function between(n) { const k = nextGame(); if (k === 'rush') { M = null; Rush.begin(n); } else begin(k, n, 'between'); }
  function go() { Sound.sfx.start(); Sound.play(M.g.song || 'rush'); if (M.g.start) M.g.start(M); screen = 'mini'; overlayT = 0; }
  function end(m, how) { if (m.done) return; m.done = how; m.endT = 0; if (!m.g.isBreak && m.g.stats(m)[1]) m.score += 1000; if (how === 'lose') Sound.sfx.lose(); else if (!m.g.isBreak && m.kind !== 'cpr') { Sound.sfx.win(); dropConfetti(30, true); } }
  function update(dt) {
    if (!M || screen !== 'mini') return;
    M.pops.forEach(p => p.t += dt); M.pops = M.pops.filter(p => p.t < 0.9);
    if (M.done) { M.endT += dt; if (M.endT > 1.5) { screen = 'miniEnd'; overlayT = 0; } if (M.kind === 'cpr') M.g.update(M, dt); return; }
    M.t += dt; M.g.update(M, dt);
  }
  const live = () => M && screen === 'mini' && !M.done;
  function down(p) { if (live() && M.g.down) M.g.down(M, p); }
  function move(p) { if (live() && M.g.move) M.g.move(M, p); }
  function up(p) { if (live() && M.g.up) M.g.up(M, p); }

  function drawIntro() {
    const g = M.g; g.draw(M); dim();
    const w = 180, x = Math.round(97 - w / 2), lines = Font.wrap(g.blurb, w - 16), brk = M.mode === 'break';
    const h = 22 + lines.length * 7 + 6 + g.rows.length * 22 + (brk ? 0 : 10) + 44, y = Math.max(4, Math.round(LH / 2 - h / 2)) + slideIn();
    panel(x, y, w, h, g.head);
    Font.bigCentered(ctx, g.title, 97, y + 5, '#fff', 1);
    lines.forEach((l, i) => Font.smallCentered(ctx, l, 97, y + 22 + i * 7, '#475569'));
    let yy = y + 22 + lines.length * 7 + 6;
    for (const [pic, a, b, col] of g.rows) { R(x + 6, yy, w - 12, 19, '#f1ece0'); pic(x + 22, yy + 9); Font.small(ctx, a, x + 44, yy + 3, col); Font.small(ctx, b, x + 44, yy + 11, '#64748b'); yy += 22; }
    if (!brk) { Font.smallCentered(ctx, g.goal, 97, yy + 1, '#2e8a5f'); yy += 10; }
    button('GO!', 97, y + h - 40, 100, '#22a35a', go);
    button(brk ? 'SKIP BREAK' : 'SKIP', 97, y + h - 20, 100, '#64748b', () => { Sound.sfx.click(); finish(false); });
  }
  function drawEnd() {
    const m = M, g = m.g; g.draw(m); drawPops(); dim();
    const brk = m.mode === 'break', bl = brk && g.breakLine ? g.breakLine(m) : '', w = 170, x = Math.round(97 - w / 2), h = brk ? (bl ? 92 : 82) : 96, y = Math.round(LH / 2 - h / 2) + slideIn();
    const [line, clean] = brk ? ['', false] : g.stats(m);
    panel(x, y, w, h, brk || m.done === 'win' ? '#22a35a' : '#c0392b');
    Font.bigCentered(ctx, brk ? 'BREAK OVER!' : g.endTitle(m), 97, y + 5, '#fff', 1);
    Font.bigCentered(ctx, (brk ? '+' : '') + fmt(m.score), 97, y + 24, '#22a35a', 2, K);
    if (brk) { Font.smallCentered(ctx, 'ADDED TO THIS SHIFT', 97, y + 45, '#475569'); if (bl) Font.smallCentered(ctx, bl, 97, y + 55, '#8a5a33'); }
    else { Font.smallCentered(ctx, line, 97, y + 45, '#475569');
      Font.smallCentered(ctx, clean ? 'CLEAN RUN! +1,000 BONUS' : 'NO CLEAN-RUN BONUS THIS TIME', 97, y + 55, clean ? '#2e8a5f' : '#94a3b8'); }
    button(brk ? 'BACK TO WORK' : 'NEXT SHIFT', 97, y + h - 24, 110, '#22a35a', () => { Sound.sfx.click(); finish(true); });
    drawConfetti();
  }
  function finish(played) {
    const m = M; M = null;
    if (m.mode === 'break') {
      if (played && m.score) { G.score += m.score; G.floats.push({ text: '+' + fmt(m.score) + ' BREAK', x: 97, y: 120, t: 0, col: '#ffe066' }); }
      Sound.play('play'); screen = 'play'; overlayT = 0; return;
    }
    if (played) { career += Math.round(m.score); try { localStorage.setItem('aj.total', career); } catch (e) {} }
    Sound.play('title'); startLevel(level + 1); screen = 'card'; overlayT = 0;
  }
  function frame() {
    if (!M) return;
    if (screen === 'miniIntro') drawIntro();
    else if (screen === 'miniEnd') drawEnd();
    else { M.g.draw(M); drawPops(); drawFx(); drawConfetti(); }
  }
  // a mid-shift break or two, from shift 2 on
  function scheduleBreaks(n) {
    if (n < 2) return [];
    const first = 14 + Math.random() * 26, list = [{ kind: one(['coffee', 'pizza']), at: first }];
    if (Math.random() < 0.4) list.push({ kind: list[0].kind === 'coffee' ? 'pizza' : 'coffee', at: first + 25 + Math.random() * 20 });
    return list;
  }

  return { begin, between, update, frame, down, move, up, scheduleBreaks, GAMES, get state() { return M; } };
})();
