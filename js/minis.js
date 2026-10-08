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
    if (m.lives != null) for (let i = 0; i < 3; i++) heart(4 + i * 10, 3, i < m.lives);
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
    draw(m) {
      R(0, 0, LW, LH, '#f3efe4');
      for (let i = 0; i < 9; i++) {
        const c = calls.cell(i), r = m.rooms[i], fl = c.y + c.h - 7, dw = 34, dh = Math.min(74, c.h - 44), dx = c.x + 11, dy = fl - dh;
        if (i % 3 === 0) { R(0, fl - 20, LW, 20, '#a9d8c6'); R(0, fl - 21, LW, 1, '#7d8ca1'); R(0, fl - 22, LW, 1, '#c8d3db'); R(0, fl, LW, 7, '#c3d2dc'); R(0, fl, LW, 1, '#5f8f80'); }
        R(dx - 2, dy - 2, dw + 4, dh + 2, '#7a5236');
        if (r.open > 0.05) {
          R(dx, dy, dw, dh, '#3b4252'); R(dx, dy, dw, Math.round(dh * 0.45), '#4b5570');
          const img = r.kind === 'doctor' ? Sprites.staff('doctor', ['#4f3322', '#38231a'], 0, false) : Sprites.patient(r.dept, 0, Math.floor(T * 3 + i) % 2, false);
          const k = Math.min(3, (dh - 4) / img.height, (dw - 2) / img.width);
          ctx.save(); ctx.beginPath(); ctx.rect(dx, dy, dw, dh); ctx.clip(); putC(img, dx + dw / 2, fl + Math.round((1 - r.open) * 30), k); ctx.restore();
          R(dx, dy, Math.max(3, Math.round(dw * (1 - r.open))), dh, '#b9844f');
        } else {
          R(dx, dy, dw, dh, '#c99460'); R(dx + 2, dy + 2, dw - 4, 1, '#d9a876'); R(dx + 6, dy + 8, 9, 16, '#7a5236'); R(dx + 7, dy + 9, 7, 14, '#9ed0f7'); R(dx + 7, dy + 9, 2, 14, '#cfe9f7');
          R(dx + dw - 6, dy + Math.round(dh / 2), 3, 2, '#e9c46a');
        }
        R(dx + dw + 7, dy + 22, 7, 11, K); R(dx + dw + 8, dy + 23, 5, 9, '#e9edf2'); R(dx + dw + 9, dy + 26, 3, 3, '#7cc0ee'); R(dx + dw + 10, dy + 33, 1, 2, '#9aa3b2');
        R(dx + dw + 4, dy + 3, 15, 9, K); R(dx + dw + 5, dy + 4, 13, 7, '#fff'); Font.small(ctx, String(r.num), dx + dw + 6, dy + 5, '#334155');
        // call light dome over the door
        const on = r.state === 'call' && r.kind !== 'doctor' && Math.floor(T * 6 + i) % 2 === 0;
        R(dx + dw / 2 - 5, dy - 8, 10, 5, K); R(dx + dw / 2 - 4, dy - 7, 8, 4, on ? '#ff4d4d' : '#d8dde4'); if (on) R(dx + dw / 2 - 3, dy - 7, 3, 1, '#ffd6dc');
        if (r.state === 'call') {
          const real = r.kind === 'real', bg = real ? '#e8424f' : r.kind === 'fake' ? '#fff' : '#e9edf2', fg = real ? '#fff' : r.kind === 'fake' ? '#3d6fb6' : '#475569';
          const b = bubble(r.text, c.x + 32, dy - 22 + (real ? Math.round(Math.sin(T * 12 + i)) : 0), bg, fg, c.x + 1, c.x + c.w - 1);
          if (real) { const left = Math.max(0, 1 - r.t / r.life); R(b.bx, dy - 11, b.w, 2, K); R(b.bx, dy - 11, Math.round(b.w * left), 2, left < 0.35 ? '#ff4d4d' : '#ffd23f'); }
        }
      }
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
    draw(m) {
      const st = cpr.now(m), beat = st / m.spb, sy = cpr.sy(), floor = sy + 120;
      R(0, 0, LW, LH, '#dfe9ef'); R(0, floor, LW, LH, '#c3d2dc'); R(0, floor, LW, 1, '#9fb3bb');
      for (let x = 0; x < LW; x += 24) R(x, floor + 1, 1, LH, '#b5c6d1');
      // monitor
      const mx = 22, my = 22, mw = 150, mh = 54;
      R(mx - 3, my - 3, mw + 6, mh + 6, '#4b5563'); R(mx, my, mw, mh, '#0f1a24');
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
      R(0, ly, LW, lh, '#14202e'); R(0, ly, LW, 1, '#3b4252'); R(0, ly + lh - 1, LW, 1, '#3b4252');
      for (let b = Math.ceil(beat); b < beat + 3; b++) R(Math.round(hx + (b - beat) * m.spb * pps), ly + 2, 1, lh - 4, '#24324a');
      const pulse = Math.max(0, 1 - (beat - Math.floor(beat)) * 4);
      disc(hx, ly + lh / 2, 13 + Math.round(pulse * 2), '#ffffff'); disc(hx, ly + lh / 2, 11 + Math.round(pulse * 2), '#14202e');
      for (const n of m.notes) {
        if (n.judged) continue; const x = hx + (n.beat * m.spb - st) * pps; if (x > LW + 16 || x < -16) continue;
        if (n.kind === 'shock') putC(bolt(), x, ly + lh / 2 + 8, 2); else putC(Sprites.icon(DEPTS[0]), x, ly + lh / 2 + 7, 2);
      }
      Font.small(ctx, 'COMBO ' + m.combo, LW - 6 - Font.smallWidth('COMBO ' + m.combo), ly + lh + 5, '#475569');
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
    draw(m) {
      R(0, 0, LW, LH, '#e7eef2'); for (let y = 60; y < LH; y += 16) R(0, y, LW, 1, '#dbe4ea');
      // order card
      const flash = m.flashOrder > 0 && Math.floor(T * 10) % 2;
      R(9, 21, 177, 30, K); R(10, 22, 175, 28, flash ? '#fff3c4' : '#fff'); R(10, 22, 175, 8, '#9b6bd6');
      Font.small(ctx, 'BED ' + m.bed + ' ORDERS:', 14, 24, '#fff'); Font.small(ctx, '+ TYLENOL OK', 181 - Font.smallWidth('+ TYLENOL OK'), 24, '#efe4ff');
      m.order.forEach((k, i) => { putC(PILLS[k].img(), 40 + i * 80, 46, 2); Font.small(ctx, PILLS[k].name, 52 + i * 80 + (PILLS[k].img().width > 9 ? 4 : 0), 37, '#475569'); });
      R(10, 49, Math.round(175 * Math.max(0, 1 - m.orderT / 8)), 1, '#9b6bd6');
      for (const p of m.pills) putC(PILLS[p.kind].img(), p.x + Math.sin(T * 2 + p.sway) * 3, p.y + 9, 3);
      // the med cup, pleated
      const cx = Math.round(m.cx), cy = meds.cupY();
      R(0, LH - 18, LW, 18, '#9aa3b2'); R(0, LH - 18, LW, 2, '#dfe5ec'); for (let x = 8; x < LW; x += 48) { R(x, LH - 12, 40, 9, '#b8c2cc'); R(x + 16, LH - 9, 8, 2, '#6c7484'); }
      R(cx - 23, cy - 2, 46, 3, K); R(cx - 22, cy, 44, 30, K); R(cx - 21, cy, 42, 29, '#ffffff');
      for (let i = 0; i < 8; i++) R(cx - 18 + i * 5, cy + 2, 1, 26, '#dfe5ec'); R(cx - 20, cy + 29, 40, 2, K); R(cx - 22, cy - 1, 44, 1, '#fff');
      Font.big(ctx, 'MEDS', cx - 11, cy + 12, '#9b6bd6');
      hud(m, 1 - m.t / m.dur);
    },
    stats: m => ['CAUGHT ' + m.caught + '   WRONG MEDS ' + m.wrong, m.done === 'win' && m.wrong === 0],
    endTitle: m => m.done === 'win' ? 'MEDS PASSED!' : 'INCIDENT REPORT',
  };

  // ======================= COFFEE POUR (mid-shift break) =======================
  const MUGS = [["WORLD'S", 'OKAYEST', 'NURSE', '#fff', '#e8424f'], ['NIGHT', 'SHIFT', 'SURVIVOR', '#2b3446', '#ffd23f'], ['NOT', 'TODAY', '', '#ffd6dc', '#b52a3a'], ['I PUT', 'THE IV', 'IN IVY', '#d6ecff', '#1f4e9c']];
  const coffee = {
    title: 'COFFEE BREAK!', head: '#8a5a33', song: 'break', isBreak: true,
    blurb: 'Hold to pour. Let go right on the line. Three cups before your break ends.',
    rows: [[(x, y) => { R(x - 7, y - 6, 14, 14, K); R(x - 6, y - 5, 12, 12, '#fff'); R(x - 6, y + 1, 12, 6, '#6b3f22'); R(x - 8, y - 1, 16, 1, '#e8424f'); }, 'STOP ON THE RED LINE', 'OVERFILL AND IT IS A CODE BROWN', '#8a5a33']],
    init(m) { m.dur = 15; m.cups = MUGS.slice().sort(() => Math.random() - 0.5).slice(0, 3).map((g, i) => ({ g, line: rnd(0.5, 0.86), rate: 0.34 + i * 0.1 + m.shift * 0.005 })); m.cup = 0; m.level = 0; m.state = 'in'; m.st = 0; m.pourT = 0; m.spill = 0; m.grade = ''; },
    update(m, dt) {
      m.st += dt; m.spill = Math.max(0, m.spill - dt);
      const c = m.cups[m.cup];
      if (m.state === 'in' && m.st > 0.35) { m.state = 'ready'; m.st = 0; }
      if (m.state === 'pour') { m.pourT += dt; m.level += c.rate * (1 + m.pourT * 0.5) * dt; if (Math.floor(m.pourT * 10) !== Math.floor((m.pourT - dt) * 10)) Sound.sfx.pour();
        if (m.level >= 1.04) { m.level = 1.04; m.spill = 0.8; coffee.grade(m); } }
      if (m.state === 'graded' && m.st > 0.8) { m.state = 'out'; m.st = 0; }
      if (m.state === 'out' && m.st > 0.35) { m.cup++; m.level = 0; m.pourT = 0; m.st = 0; m.state = 'in'; if (m.cup >= m.cups.length) end(m, 'win'); }
      if (m.t >= m.dur && !m.done) end(m, 'win');
    },
    grade(m) {
      const c = m.cups[m.cup], d = m.level - c.line; let pts, msg, col = '#ffe066';
      if (m.level > 1) { pts = 0; msg = 'CODE BROWN!'; col = '#ff8a8f'; Sound.sfx.slip(); shakeScreen(0.2, 1.5); }
      else if (Math.abs(d) <= 0.035) { pts = 150; msg = 'PERFECT!'; Sound.sfx.bonus(); sparkle(97, Math.round(LH * 0.66) - 40, 12, ['#ffe066', '#fff']); }
      else if (Math.abs(d) <= 0.09) { pts = 80; msg = 'GOOD'; Sound.sfx.ding(); }
      else if (d < 0) { pts = 20; msg = 'WEAK'; col = '#e2e8f0'; Sound.sfx.nope(); }
      else { pts = 30; msg = 'TOO MUCH'; col = '#e2e8f0'; Sound.sfx.nope(); }
      m.score += pts; pop(msg + (pts ? ' +' + pts : ''), 97, Math.round(LH * 0.66) - 186, col); m.state = 'graded'; m.st = 0;
    },
    down(m) { if (m.state === 'ready') { m.state = 'pour'; m.pourT = 0; } },
    up(m) { if (m.state === 'pour') coffee.grade(m); },
    draw(m) {
      const ct = Math.round(LH * 0.66);
      R(0, 0, LW, ct, '#f2ead8'); for (let y = 16; y < ct; y += 12) for (let x = (y / 12 % 2) * 12; x < LW; x += 24) R(x, y, 12, 12, '#ebe1cb');
      R(0, ct, LW, LH - ct, '#8a5a33'); R(0, ct, LW, 4, '#b07a4a'); R(0, ct + 4, LW, 1, '#5e3b20');
      // the machine
      const mx = 44, mw = 108, my = ct - 172;
      R(mx - 1, my - 1, mw + 2, 174, K); R(mx, my, mw, 172, '#3b4252'); R(mx, my, mw, 3, '#55607a'); R(mx + 6, my + 8, mw - 12, 22, '#14202e');
      Font.small(ctx, m.state === 'pour' ? 'BREWING...' : 'READY', mx + 12, my + 16, '#3ddc84'); R(mx + mw - 16, my + 15, 5, 5, Math.floor(T * 3) % 2 ? '#ff4d4d' : '#7a1f1f');
      R(mx + 6, my + 36, mw - 12, 4, '#2b3446'); R(mx + 45, my + 40, 18, 10, '#2b3446'); R(mx + 51, my + 50, 6, 4, '#9aa3b2');
      R(mx + 4, ct - 8, mw - 8, 8, '#2b3446'); for (let x = mx + 8; x < mx + mw - 8; x += 4) R(x, ct - 7, 2, 1, '#55607a');
      // the cup slides in, gets poured, slides out
      const c = m.cups[Math.min(m.cup, m.cups.length - 1)], slide = m.state === 'in' ? (1 - Math.min(1, m.st / 0.35)) * 140 : m.state === 'out' ? -Math.min(1, m.st / 0.35) * 140 : 0;
      const cw = 50, chh = 58, cx = Math.round(97 - cw / 2 + slide), cy = ct - 8 - chh;
      if (m.state === 'pour') { const top = cy + Math.round(chh * (1 - Math.min(1, m.level))); R(95, my + 54, 3, top - my - 54, '#6b3f22'); R(96, my + 54, 1, top - my - 54, '#8a5a33'); }
      R(cx - 1, cy - 1, cw + 2, chh + 2, K); R(cx, cy, cw, chh, c.g[3]);
      R(cx + cw + 1, cy + 12, 10, 3, K); R(cx + cw + 8, cy + 14, 3, 22, K); R(cx + cw + 1, cy + 35, 10, 3, K);
      const lv = Math.min(1, m.level), fh = Math.round((chh - 4) * lv);
      if (fh > 0) { R(cx + 2, cy + chh - 2 - fh, cw - 4, fh, '#6b3f22'); R(cx + 2, cy + chh - 2 - fh, cw - 4, 2, '#b5835a'); }
      // fill line
      const ly = cy + 2 + Math.round((chh - 4) * (1 - c.line));
      for (let x = cx - 4; x < cx + cw + 4; x += 4) R(x, ly, 2, 1, '#e8424f'); R(cx - 6, ly - 2, 3, 5, '#e8424f'); R(cx + cw + 3, ly - 2, 3, 5, '#e8424f');
      // mug slogan under the coffee line, so it shows through
      c.g.slice(0, 3).forEach((t, i) => t && Font.smallCentered(ctx, t, cx + cw / 2, cy + 10 + i * 8, c.g[4]));
      if (m.spill > 0) { for (let i = 0; i < 10; i++) R(cx - 10 + i * 6, ct - 2 + (i % 3), 5, 2, '#6b3f22'); }
      if (m.state === 'graded' && m.level <= 1) for (let i = 0; i < 3; i++) { const yy = cy - 6 - ((T * 18 + i * 7) % 18); ctx.globalAlpha = 0.5; R(cx + 10 + i * 9 + Math.round(Math.sin(T * 4 + i) * 2), Math.round(yy), 2, 3, '#fff'); ctx.globalAlpha = 1; }
      // sugar jar and a box of very old donuts
      R(13, ct - 19, 20, 19, K); R(14, ct - 18, 18, 18, '#d6ecff'); R(15, ct - 9, 16, 8, '#fff'); R(12, ct - 22, 22, 4, K); R(13, ct - 21, 20, 2, '#e8424f'); Font.small(ctx, 'SUGAR', 13, ct - 30, '#8a5a33');
      R(160, ct - 12, 30, 12, K); R(161, ct - 11, 28, 10, '#ff7eb6'); disc(168, ct - 6, 3, '#d9a05b'); disc(181, ct - 6, 3, '#d9a05b'); R(168, ct - 6, 1, 1, '#ff7eb6'); R(181, ct - 6, 1, 1, '#ff7eb6');
      Font.small(ctx, 'FROM 2019', 156, ct - 20, '#8a5a33');
      Font.smallCentered(ctx, 'CUP ' + Math.min(m.cup + 1, 3) + ' OF 3', 97, ct + 12, '#f2ead8');
      if (m.state === 'ready' && Math.floor(T * 3) % 2) Font.bigCentered(ctx, 'HOLD TO POUR', 97, ct + 26, '#fff', 2, K);
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
    draw(m) {
      R(0, 0, LW, LH, '#b07a4a'); for (let y = 0; y < LH; y += 9) R(0, y, LW, 1, '#9c6a3e'); for (let y = 4; y < LH; y += 27) R((y * 7) % LW, y, 30, 1, '#c48a56');
      R(m.cx - 62, m.cy - 62, 124, 124, '#5e3b20'); R(m.cx - 60, m.cy - 60, 120, 120, '#d8b07a'); R(m.cx - 56, m.cy - 56, 112, 112, '#c99a5e');
      Font.smallCentered(ctx, 'FOR NIGHT SHIFT. HANDS OFF.', m.cx, m.cy - 70, '#fff');
      put(pizza.pizzaArt(m), m.cx - 48, m.cy - 48);
      for (const h of m.hands) {
        const q = pizza.pos(m, h), ex = m.cx + Math.cos(h.a) * 200, ey = m.cy + Math.sin(h.a) * 220, n = 18;
        for (let i = 0; i <= n; i++) { const x = Math.round(lerp(ex, q.x, i / n)), y = Math.round(lerp(ey, q.y, i / n)); disc(x, y, 6, K); }
        for (let i = 0; i <= n; i++) { const x = Math.round(lerp(ex, q.x, i / n)), y = Math.round(lerp(ey, q.y, i / n)); disc(x, y, 5, h.sleeve); }
        const cx = Math.round(q.x - Math.cos(h.a) * 6), cy = Math.round(q.y - Math.sin(h.a) * 6);
        disc(Math.round(q.x - Math.cos(h.a) * 2), Math.round(q.y - Math.sin(h.a) * 2), 5, h.mgr ? '#fff' : h.sleeve);
        disc(cx, cy, 7, K); disc(cx, cy, 6, '#f4c7a1');
        for (let f = -1; f <= 1; f++) { const fa = h.a + Math.PI + f * 0.45, fx = Math.round(cx + Math.cos(fa) * 7), fy = Math.round(cy + Math.sin(fa) * 7); disc(fx, fy, 2, '#f4c7a1'); }
        if (h.carry) { R(cx - 4, cy - 3, 8, 6, '#ffd166'); R(cx - 4, cy - 3, 8, 1, '#d9a05b'); R(cx - 1, cy - 1, 2, 2, '#d63b3b'); }
        if (h.mgr) Font.small(ctx, 'MGR', Math.round(q.x - Math.cos(h.a) * 22) - 5, Math.round(q.y - Math.sin(h.a) * 22) - 2, '#fff');
      }
      Font.smallCentered(ctx, 'SLICES LEFT ' + pizza.left(m), 97, LH - 12, '#fff');
      hud(m, 1 - m.t / m.dur);
    },
  };

  const GAMES = { calls, cpr, meds, coffee, pizza };
  const ROTATION = ['calls', 'rush', 'cpr', 'meds'];

  // ---------- framework ----------
  function begin(kind, shift, mode) {
    const g = GAMES[kind]; M = { kind, g, mode: mode || (g.isBreak ? 'break' : 'between'), shift, t: 0, score: 0, done: null, endT: 0, pops: [], lives: null };
    g.init(M); screen = 'miniIntro'; overlayT = 0;
  }
  function between(n) { const k = ROTATION[(n - 1) % ROTATION.length]; if (k === 'rush') { M = null; Rush.begin(n); } else begin(k, n, 'between'); }
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
    const brk = m.mode === 'break', w = 170, x = Math.round(97 - w / 2), h = brk ? 82 : 96, y = Math.round(LH / 2 - h / 2) + slideIn();
    const [line, clean] = brk ? ['', false] : g.stats(m);
    panel(x, y, w, h, brk || m.done === 'win' ? '#22a35a' : '#c0392b');
    Font.bigCentered(ctx, brk ? 'BREAK OVER!' : g.endTitle(m), 97, y + 5, '#fff', 1);
    Font.bigCentered(ctx, (brk ? '+' : '') + fmt(m.score), 97, y + 24, '#22a35a', 2, K);
    if (brk) Font.smallCentered(ctx, 'ADDED TO THIS SHIFT', 97, y + 45, '#475569');
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
