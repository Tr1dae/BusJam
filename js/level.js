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
    vehicles: Math.min(12 + n * 2, 44),
    depts: Math.min(3 + Math.floor((n - 1) / 2), 6),
    diag: n >= 2,
    sizes: n < 2 ? [1, 1, 0] : [1, 1.2, 0.8],
    mystery: n >= 3 ? Math.min(0.12 + 0.02 * (n - 3), 0.3) : 0,
    flip: n >= 5 ? Math.min(0.1 + 0.01 * (n - 5), 0.2) : 0,
    cart: n >= 7,
    cartTimer: 7,
    mix: Math.min(0.15 + n * 0.03, 0.45),
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
function generateLevel(n, lot) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const lvl = generateOnce(n, lot, n * 7919 + 3 + attempt * 104729);
    if (!validateLevel(lvl.vehicles)) return lvl;
  }
  return generateOnce(n, lot, n * 7919 + 3);
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
    } else {
      const t = r() * Math.PI * 2, rad = Math.sqrt(r()) * Math.min(1, 0.5 + n * 0.025);
      v = { x: lot.cx + Math.cos(t) * rad * lot.rx, y: lot.cy + Math.sin(t) * rad * lot.ry, dir: axes[Math.floor(r() * axes.length)] };
    }
    v.x = Math.round(v.x); v.y = Math.round(v.y); v.len = sz.len; v.cap = sz.cap; v.kind = 'amb';
    if (!inside(v)) continue;
    const box = vBox(v, 0.5);
    if (packed.some(p => sat(box, vBox(p)))) continue;
    packed.push(v);
  }
  const left = packed.slice(), order = [];
  while (left.length) {
    const opts = [];
    for (const v of left) { const f = pathClear(v, v.dir, left), b = pathClear(v, (v.dir + 4) % 8, left); if (f || b) opts.push({ v, f, b }); }
    if (!opts.length) { left.splice(Math.floor(r() * left.length), 1); continue; }
    const o = opts[Math.floor(r() * opts.length)], v = o.v;
    v.flip = false;
    if (o.f && o.b) { if (r() < 0.5) v.dir = (v.dir + 4) % 8; v.flip = r() < cfg.flip * 2; }
    else if (o.b) v.dir = (v.dir + 4) % 8;
    order.push(v); left.splice(left.indexOf(v), 1);
  }
  if (cfg.cart && order.length > 8) {
    const c = order[2 + Math.floor(r() * 3)];
    c.kind = 'cart'; c.cap = 0; c.flip = false; c.len = 15; c.timer = cfg.cartTimer;
  }
  const deptPool = DEPTS.slice(0, cfg.depts);
  order.forEach((v, i) => { v.id = i; if (v.kind === 'amb') { v.dept = deptPool[Math.floor(r() * deptPool.length)]; v.mystery = r() < cfg.mystery; } });

  // patients come in rows of 4 of one department, in solution order, lightly shuffled
  // each ambulance's patients arrive as one solid block; neighbouring blocks sometimes swap
  const blocks = order.filter(v => v.kind === 'amb').map(v => Array.from({ length: Math.ceil(v.cap / 4) }, (_, k) => ({ dept: v.dept, n: Math.min(4, v.cap - k * 4) })));
  for (let i = 0; i + 1 < blocks.length; i++) if (r() < cfg.mix) { [blocks[i], blocks[i + 1]] = [blocks[i + 1], blocks[i]]; i++; }
  const rows = blocks.flat();
  return { vehicles: order, rows, cfg };
}
