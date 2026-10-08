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
    vehicles: n < 2 ? 14 : Math.min(14 + n * 3, 44),
    depts: n < 2 ? 3 : Math.min(4 + Math.floor((n - 2) / 2), 6),
    diag: n >= 2,
    sizes: n < 2 ? [1, 1, 0] : [1, 1.2, 0.8],
    mystery: n >= 3 ? Math.min(0.12 + 0.02 * (n - 3), 0.3) : 0,
    flip: n >= 5 ? Math.min(0.1 + 0.01 * (n - 5), 0.2) : 0,
    cart: n >= 7,
    cartTimer: 7,
    mix: Math.min(0.15 + n * 0.03, 0.45),
    // how many rows of patients can be on the loop at once (0 = as many as fit); fewer rows means less to choose from
    window: n < 2 ? 0 : Math.max(12, 18 - n),
    // how far patient blocks drift from the order their ambulances can get out
    scatter: n < 2 ? 0 : Math.min(2 + n, 8),
    // the first patients through the door belong to this many beds buried deep in the jam
    buried: n < 2 ? 0 : Math.min(1 + Math.floor((n - 2) / 3), 3),
    // chance that each bed, as the solution is built, is turned to face back into the jam (more beds in its way)
    inward: n < 2 ? 0 : Math.min(0.4 + n * 0.05, 0.9),
    // how many beds an inward-facing bed should have in its way
    depth: n < 2 ? 0 : Math.min(1 + Math.floor(n / 4), 3),
    // share of beds parked crosswise (left-right) across the others' roads
    cross: n < 2 ? 0 : Math.min(0.06 + n * 0.008, 0.16),
    // early shifts use a smaller lot so the jam still looks like a jam
    shape: ((base, ls) => (u, v) => base(u / ls, v / ls))(LEVEL_SHAPES[(n - 1) % LEVEL_SHAPES.length], Math.min(1, 0.5 + n * 0.025)),
  };
}

// Pack vehicles densely, then "peel": repeatedly pick one whose road out is
// clear, point it that way, lift it off. Peel order is a guaranteed solution.
// Safety net on top of the peel construction:
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
// variant > 0 gives a fresh layout for the same shift (used on retries, so a bad deal never traps anyone)
function generateLevel(n, lot, variant = 0) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const lvl = generateOnce(n, lot, n * 7919 + 3 + variant * 15485863 + attempt * 104729);
    if (!validateLevel(lvl.vehicles)) return lvl;
  }
  return generateOnce(n, lot, n * 7919 + 3 + variant * 15485863);
}
function generateOnce(n, lot, seed) {
  const r = rng(seed), cfg = levelConfig(n);
  const axes = cfg.diag ? [0, 1, 2, 3] : [0, 2];
  const SIZES = [{ cap: 16, len: 18 }, { cap: 24, len: 22 }, { cap: 40, len: 28 }];
  const sw = cfg.sizes, swSum = sw.reduce((a, b) => a + b, 0);
  const pickSize = () => { let x = r() * swSum; for (let i = 0; i < sw.length; i++) { x -= sw[i]; if (x < 0) return SIZES[i]; } return SIZES[0]; };
  const inside = v => vBox(v).every(([x, y]) => cfg.shape((x - lot.cx) / lot.rx, (y - lot.cy) / lot.ry));
  const packed = [];
  for (let a = 0; a < 30000 && packed.length < cfg.vehicles; a++) {
    const sz = pickSize(); let v;
    if (packed.length && r() < 0.78) {
      const p = packed[Math.floor(r() * packed.length)], ang = vAng(p), c = Math.cos(ang), s = Math.sin(ang);
      const side = r() < 0.7, sg = r() < 0.5 ? -1 : 1;
      if (side) { const d = AMB_W + 1, slide = r() < 0.5 ? 0 : (sz.len - p.len) / 2 * (r() < 0.5 ? -1 : 1); v = { x: p.x - s * d * sg + c * slide, y: p.y + c * d * sg + s * slide }; }
      else { const d = (p.len + sz.len) / 2 + 1; v = { x: p.x + c * d * sg, y: p.y + s * d * sg }; }
      v.dir = p.dir;
      // a crosswise blocker: same spot, turned to lie left-right
      if (r() < cfg.cross && p.dir !== 0) { v.dir = 0; if (!side) { v.x = p.x + c * ((p.len / 2) + AMB_W / 2 + 1) * sg; v.y = p.y + s * ((p.len / 2) + AMB_W / 2 + 1) * sg; } }
    } else {
      const t = r() * Math.PI * 2, rad = Math.sqrt(r()) * Math.min(1, 0.5 + n * 0.025);
      v = { x: lot.cx + Math.cos(t) * rad * lot.rx, y: lot.cy + Math.sin(t) * rad * lot.ry, dir: r() < cfg.cross ? 0 : axes[Math.floor(r() * axes.length)] };
    }
    v.x = Math.round(v.x); v.y = Math.round(v.y); v.len = sz.len; v.cap = sz.cap; v.kind = 'amb';
    if (!inside(v)) continue;
    const box = vBox(v, 0.5);
    if (packed.some(p => sat(box, vBox(p)))) continue;
    packed.push(v);
  }
  const left = packed.slice(), order = [];
  // how many already-peeled beds a road crosses: in the real jam those all have to move first
  const blockers = (v, d) => { const sw = sweepBox(v, d); let k = 0; for (const o of order) if (sat(sw, vBox(o, -0.1))) k++; return k; };
  while (left.length) {
    const opts = [];
    for (const v of left) { const f = pathClear(v, v.dir, left), b = pathClear(v, (v.dir + 4) % 8, left); if (f || b) opts.push({ v, f, b }); }
    if (!opts.length) { left.splice(Math.floor(r() * left.length), 1); continue; }
    let o, inward = false;
    if (r() < cfg.inward) {
      // point back into the jam: take the free bed and road with about cfg.depth earlier beds in the way
      let best = -1e9;
      for (const q of opts) for (const d of [q.f && q.v.dir, q.b && (q.v.dir + 4) % 8]) { if (d === false) continue; const k = -Math.abs(blockers(q.v, d) - cfg.depth) + r() * 0.5; if (k > best) { best = k; o = { ...q, d }; } }
      inward = true;
    } else o = opts[Math.floor(r() * opts.length)];
    const v = o.v;
    v.flip = false;
    if (inward) { v.dir = o.d; if (o.f && o.b) v.flip = r() < cfg.flip * 2; }
    else if (o.f && o.b) { if (r() < 0.5) v.dir = (v.dir + 4) % 8; v.flip = r() < cfg.flip * 2; }
    else if (o.b) v.dir = (v.dir + 4) % 8;
    order.push(v); left.splice(left.indexOf(v), 1);
  }
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
