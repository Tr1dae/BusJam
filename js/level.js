// Level generation. Everything is in screen pixels of the low-res canvas.
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// oriented-box helpers
function corners(cx, cy, ang, hl, hw) { const c = Math.cos(ang), s = Math.sin(ang);
  return [[cx + c * hl - s * hw, cy + s * hl + c * hw], [cx + c * hl + s * hw, cy + s * hl - c * hw], [cx - c * hl + s * hw, cy - s * hl - c * hw], [cx - c * hl - s * hw, cy - s * hl + c * hw]]; }
function sat(A, B) {
  for (const P of [A, B]) for (let i = 0; i < 2; i++) {
    const p = P[i], q = P[i + 1], ax = p[1] - q[1], ay = q[0] - p[0];
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const v of A) { const d = v[0] * ax + v[1] * ay; if (d < a0) a0 = d; if (d > a1) a1 = d; }
    for (const v of B) { const d = v[0] * ax + v[1] * ay; if (d < b0) b0 = d; if (d > b1) b1 = d; }
    if (a1 <= b0 || b1 <= a0) return false;
  }
  return true;
}
const halfW = v => v.kind === 'cart' ? CART_W / 2 : AMB_W / 2;
const vAng = v => v.dir * Math.PI / 4;
const vBox = (v, pad = 0, dx = 0, dy = 0) => corners(v.x + dx, v.y + dy, vAng(v), v.len / 2 + pad, halfW(v) + pad);
function sweepBox(v, dir, dist = 600) { const a = dir * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
  return corners(v.x + c * dist / 2, v.y + s * dist / 2, a, v.len / 2 + dist / 2 - 0.1, halfW(v) - 0.4); }
function pathClear(v, dir, others) { const sw = sweepBox(v, dir);
  for (const o of others) if (o !== v && sat(sw, vBox(o, -0.1))) return false; return true; }

const LEVEL_SHAPES = [
  (u, v) => u * u + v * v <= 1,
  (u, v) => Math.max(Math.abs(u), Math.abs(v)) <= 0.9,
  (u, v) => Math.abs(u) + Math.abs(v) <= 1.25 && Math.abs(u) <= 1 && Math.abs(v) <= 1,
  (u, v) => Math.abs(v) <= 0.92 && Math.abs(u) * 0.55 + Math.abs(v) * 0.75 <= 0.92 && Math.abs(u) <= 1,
];

function levelConfig(n) {
  return {
    vehicles: n < 2 ? 14 : Math.min(16 + n * 3, 44),
    depts: n < 2 ? 3 : Math.min(4 + Math.floor((n - 2) / 2), 6),
    diag: n >= 2,
    sizes: n < 2 ? [1, 1, 0] : [1, 1.2, 0.8],
    mystery: n >= 3 ? Math.min(0.12 + 0.02 * (n - 3), 0.3) : 0,
    flip: n >= 5 ? Math.min(0.1 + 0.01 * (n - 5), 0.2) : 0,
    cart: n >= 7,
    cartTimer: 7,
    mix: Math.min(0.15 + n * 0.03, 0.45),
    // how many rows of patients can be on the loop at once (0 = as many as fit); fewer rows means less to choose from
    window: n < 2 ? 0 : Math.max(15, 21 - n),
    // how far patient blocks drift from the order their ambulances can get out
    scatter: n < 2 ? 0 : Math.min(2 + n, 8),
    // the first patients through the door belong to this many beds buried deep in the jam
    buried: n < 2 ? 0 : Math.min(1 + Math.floor((n - 2) / 3), 3),
    // jam building: each new bed scores points for parking in other beds' roads (wBlock), extra for
    // blocking a bed that was still free (wFree), for facing back across the lot (wRoad), plus noise
    samples: n < 2 ? 40 : Math.min(60 + n * 10, 140),
    wBlock: n < 2 ? 1 : Math.min(2 + n * 0.4, 6),
    wFree: n < 2 ? 0.5 : Math.min(2 + n * 0.5, 8),
    wRoad: n < 2 ? 0.5 : Math.min(1 + n * 0.25, 4),
    noise: n < 2 ? 6 : Math.max(1.5, 5 - n * 0.4),
    // pull toward the middle, so the jam grows as one packed blob rather than a snake
    wCenter: 14,
    // share of beds that turn across their neighbour instead of lining up with it
    turn: n < 2 ? 0.3 : Math.min(0.45 + n * 0.03, 0.7),
    // target share of beds free at the start, and waves needed to clear; several deals, the closest is kept
    free: n < 2 ? 0.4 : Math.max(0.1, 0.3 - n * 0.025),
    waves: n < 2 ? 4 : Math.min(5 + n, 16),
    deals: n < 2 ? 1 : 4,
    // the lot is shrunk to fit the beds, so it is always this full and the jam looks like a jam
    baseShape: LEVEL_SHAPES[(n - 1) % LEVEL_SHAPES.length],
    fill: n < 2 ? 0.45 : 0.56,
  };
}

// Build the jam one bed at a time while keeping a solution order. A new bed must leave after every
// bed in its road and before every bed whose road it sits in; if those don't conflict it slots into
// the order between them, so every layout is solvable. Beds that block and are blocked score best,
// which grows long chains, and new beds can fill gaps inside the jam as well as its edges.
// Safety net on top of the construction:
//  1. no two vehicles may block each other head-on (A's road hits B while B's road hits A)
//  2. the lot must be clearable by repeatedly removing any vehicle whose road is clear
function validateLevel(vs) {
  const dirsOf = v => v.flip ? [v.dir, (v.dir + 4) % 8] : [v.dir];
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
    const a = vs[i], b = vs[j];
    const aHitsB = dirsOf(a).some(d => sat(sweepBox(a, d), vBox(b, -0.1)));
    const bHitsA = dirsOf(b).some(d => sat(sweepBox(b, d), vBox(a, -0.1)));
    if (aHitsB && bHitsA) return 'head-on';
  }
  const left = vs.slice();
  while (left.length) {
    const i = left.findIndex(v => dirsOf(v).every(d => pathClear(v, d, left)) || (!v.flip && pathClear(v, v.dir, left)));
    if (i < 0) return 'stuck';
    left.splice(i, 1);
  }
  return null;
}
// how hard a layout is: share of beds free at the start, and how many waves it takes to clear
function jamStats(vs) {
  const left = vs.slice(); let free = 0, waves = 0;
  while (left.length && waves < 99) { const c = left.filter(v => pathClear(v, v.dir, left)); if (!waves) free = c.length; if (!c.length) break; c.forEach(v => left.splice(left.indexOf(v), 1)); waves++; }
  return { free: free / Math.max(1, vs.length), waves, count: vs.length };
}
// variant > 0 gives a fresh layout for the same shift (used on retries, so a bad deal never traps anyone)
// several layouts are dealt and the one closest to the shift's target difficulty is kept
function generateLevel(n, lot, variant = 0) {
  const cfg = levelConfig(n), base = n * 7919 + 3 + variant * 15485863;
  let best = null, bs = -1e9;
  for (let attempt = 0; attempt < 12 && (attempt < cfg.deals || !best); attempt++) {
    const lvl = generateOnce(n, lot, base + attempt * 104729);
    if (validateLevel(lvl.vehicles)) continue;
    const st = jamStats(lvl.vehicles), sc = st.count * 0.5 - Math.abs(st.free - cfg.free) * 60 + Math.min(st.waves, cfg.waves) * 2;
    if (sc > bs) { bs = sc; best = lvl; }
  }
  return best || generateOnce(n, lot, base);
}
function generateOnce(n, lot, seed) {
  const r = rng(seed), cfg = levelConfig(n);
  const SIZES = [{ cap: 16, len: 18 }, { cap: 24, len: 22 }, { cap: 40, len: 28 }];
  const sw = cfg.sizes, swSum = sw.reduce((a, b) => a + b, 0);
  const pickSize = () => { let x = r() * swSum; for (let i = 0; i < sw.length; i++) { x -= sw[i]; if (x < 0) return SIZES[i]; } return SIZES[0]; };
  // straight beds read best, so diagonals are the minority
  const pickAxis = () => { if (!cfg.diag) return r() < 0.45 ? 0 : 2; const x = r(); return x < 0.38 ? 0 : x < 0.78 ? 2 : x < 0.89 ? 1 : 3; };
  let area = 0; for (let y = -1; y < 1; y += 0.05) for (let x = -1; x < 1; x += 0.05) if (cfg.baseShape(x + 0.025, y + 0.025)) area += 0.0025;
  const ls = Math.min(1, Math.sqrt(cfg.vehicles * 300 / cfg.fill / (area * lot.rx * lot.ry)));
  cfg.shape = (u, v) => cfg.baseShape(u / ls, v / ls);
  const inShape = (x, y) => cfg.shape((x - lot.cx) / lot.rx, (y - lot.cy) / lot.ry);
  const inside = v => vBox(v).every(([x, y]) => inShape(x, y));
  // order is the solution: order[0] leaves first. hits[v] = how many beds sit in v's road
  const order = [], solid = new Map(), roads = new Map(), hits = new Map();
  const fits = v => { if (!inside(v)) return false; const b = vBox(v, 0.5); for (const o of solid.values()) if (sat(b, o)) return false; return true; };
  // how far a road runs inside the lot before it leaves: long roads leave room for more beds to block them later
  const roadRoom = (v, d) => { const a = d * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); let k = v.len / 2 + 2; while (k < 260 && inShape(v.x + c * k, v.y + s * k)) k += 4; return k - v.len / 2; };
  // slide a new bed out from a neighbour until it no longer overlaps, so the jam packs tight
  const nestle = (p, v, ux, uy) => {
    let lo = 0, hi = 40; const pb = vBox(p, 0.5);
    for (let k = 0; k < 7; k++) { const m = (lo + hi) / 2; if (sat(pb, corners(p.x + ux * m + v.ox, p.y + uy * m + v.oy, vAng(v), v.len / 2, halfW(v)))) lo = m; else hi = m; }
    v.x = Math.round(p.x + ux * (hi + 0.6) + v.ox); v.y = Math.round(p.y + uy * (hi + 0.6) + v.oy);
  };
  for (let step = 0; step < cfg.vehicles; step++) {
    let best = null, bs = -1e9;
    const tries = order.length ? cfg.samples : 40;
    for (let t = 0; t < tries; t++) {
      const sz = pickSize(), v = { len: sz.len, cap: sz.cap, kind: 'amb', ox: 0, oy: 0 };
      if (!order.length) {
        const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 0.35;
        v.dir = pickAxis(); v.x = Math.round(lot.cx + Math.cos(a) * rad * lot.rx); v.y = Math.round(lot.cy + Math.sin(a) * rad * lot.ry);
      } else {
        const p = order[Math.floor(r() * order.length)], pa = vAng(p);
        v.dir = r() < cfg.turn ? pickAxis() : p.dir % 4;
        const side = Math.floor(r() * 4), ua = pa + side * Math.PI / 2, ux = Math.cos(ua), uy = Math.sin(ua);
        const slide = r() < 0.5 ? 0 : (r() - 0.5) * (side % 2 ? p.len : 12);
        v.ox = -uy * slide; v.oy = ux * slide;
        nestle(p, v, ux, uy);
      }
      if (!fits(v)) continue;
      // beds whose road this one would sit in: they have to leave after it
      const tb = vBox(v, -0.1), after = [];
      for (const o of order) if (roads.get(o).some(rd => sat(rd, tb))) after.push(o);
      let firstAfter = order.length; for (const o of after) firstAfter = Math.min(firstAfter, order.indexOf(o));
      const frees = after.filter(o => !hits.get(o)).length;
      let near = 0; const nb = vBox(v, 2.5); for (const o of solid.values()) if (sat(nb, o)) near++;
      const base = cfg.wBlock * after.length + cfg.wFree * frees + 2 * Math.min(near, 4) - cfg.wCenter * Math.hypot((v.x - lot.cx) / lot.rx, (v.y - lot.cy) / lot.ry) + r() * cfg.noise;
      for (const d of [v.dir % 4, v.dir % 4 + 4]) {
        // beds in this one's road: they have to leave before it
        const before = [], sw = sweepBox(v, d);
        let lastBefore = -1;
        for (let i = 0; i < order.length; i++) if (sat(sw, vBox(order[i], -0.1))) { before.push(order[i]); lastBefore = i; if (lastBefore >= firstAfter) break; }
        if (lastBefore >= firstAfter) continue;
        const sc = base + cfg.wBlock * before.length + (before.length ? 0 : -cfg.wFree) + cfg.wRoad * Math.min(roadRoom(v, d), 120) / 40;
        if (sc > bs) { bs = sc; best = { v, d, after, before, lo: lastBefore + 1, hi: firstAfter }; }
      }
    }
    if (!best) break;
    const { v: c, d, after, before, lo, hi } = best;
    const v = { x: c.x, y: c.y, dir: d, len: c.len, cap: c.cap, kind: 'amb', flip: false };
    // a flip-flopper needs its other road to be just as free to use
    if (r() < cfg.flip * 2) { const sw2 = sweepBox(v, (d + 4) % 8), back = order.filter(o => sat(sw2, vBox(o, -0.1)));
      if (back.every(o => order.indexOf(o) < hi) && !back.some(o => after.includes(o))) { v.flip = true; before.push(...back.filter(o => !before.includes(o))); } }
    const lastB = before.reduce((m, o) => Math.max(m, order.indexOf(o)), -1);
    order.splice(Math.max(lo, lastB + 1) + Math.floor(r() * (hi - Math.max(lo, lastB + 1) + 1)), 0, v);
    after.forEach(o => hits.set(o, hits.get(o) + 1)); hits.set(v, before.length);
    solid.set(v, vBox(v)); roads.set(v, (v.flip ? [d, (d + 4) % 8] : [d]).map(dd => sweepBox(v, dd)));
  }
  // patients follow the order beds naturally come free: wave by wave, shuffled within each wave
  { const left = order.slice(), waves = [];
    const free = v => (v.flip ? [v.dir, (v.dir + 4) % 8] : [v.dir]).every(d => pathClear(v, d, left));
    while (left.length) { let w = left.filter(free); if (!w.length) w = [left[0]];
      for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; }
      w.forEach(v => left.splice(left.indexOf(v), 1)); waves.push(...w); }
    order.length = 0; order.push(...waves); }
  if (cfg.cart && order.length > 8) {
    const c = order[2 + Math.floor(r() * 3)];
    c.kind = 'cart'; c.cap = 0; c.flip = false; c.len = 15; c.timer = cfg.cartTimer;
  }
  const deptPool = DEPTS.slice(0, cfg.depts);
  order.forEach((v, i) => { v.id = i; if (v.kind === 'amb') { v.dept = deptPool[Math.floor(r() * deptPool.length)]; v.mystery = r() < cfg.mystery; } });

  // buried openers: pick a few of the last beds to come out, give them one department that no bed
  // near the surface shares, and send their patients first, so the player has to dig for them
  const ambs = order.filter(v => v.kind === 'amb'), cut = Math.floor(ambs.length * 0.6);
  let lead = [];
  if (cfg.buried && ambs.length > 6 && deptPool.length > 1) {
    const D0 = deptPool[Math.floor(r() * deptPool.length)], others = deptPool.filter(d => d !== D0), deep = ambs.slice(cut);
    // keep the openers to under half the loop, so there is always something else to work on while digging
    let room = Math.floor((cfg.window || 26) * 0.45);
    while (lead.length < cfg.buried && deep.length) { const v = deep.splice(Math.floor(r() * deep.length), 1)[0], rows = Math.ceil(v.cap / 4);
      if (rows <= room) { lead.push(v); room -= rows; } }
    lead.forEach(v => v.dept = D0);
    ambs.slice(0, cut).forEach(v => { if (v.dept === D0) v.dept = others[Math.floor(r() * others.length)]; });
  }
  // patients come in rows of 4 of one department, in solution order, lightly shuffled
  // each bed's patients arrive as one solid block; neighbouring blocks sometimes swap
  const blockOf = v => Array.from({ length: Math.ceil(v.cap / 4) }, (_, k) => ({ dept: v.dept, n: Math.min(4, v.cap - k * 4) }));
  const blocks = ambs.filter(v => !lead.includes(v)).map(blockOf);
  for (let i = 0; i + 1 < blocks.length; i++) if (r() < cfg.mix) { [blocks[i], blocks[i + 1]] = [blocks[i + 1], blocks[i]]; i++; }
  // later shifts scatter the blocks further, so patients turn up for ambulances still buried in the jam
  if (cfg.scatter) { const keyed = blocks.map((b, i) => ({ b, k: i + r() * cfg.scatter })); keyed.sort((a, b) => a.k - b.k); keyed.forEach((x, i) => blocks[i] = x.b); }
  const rows = lead.map(blockOf).concat(blocks).flat();
  return { vehicles: order, rows, cfg };
}
