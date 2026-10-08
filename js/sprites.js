// All art is defined here as palette-key grids and rendered once into small
// cached canvases. Tint keys (T/t/L/D gown or body, h/H hair) are filled per department.
const PAL = {
  k:'#2b2238', s:'#f4c7a1', S:'#d99a76', w:'#f8f8f4', W:'#d9dde4', g:'#9aa3b2', G:'#6c7484',
  n:'#2c4a6e', N:'#7fb2e5', r:'#ff4d4d', R:'#b3202c', B:'#3d7bff', y:'#ffd23f', p:'#ff9fb0',
  o:'#3a3f4b', q:'#3ddc84', Q:'#1c6b3f', b:'#a0673a', c:'#6e4321', O:'#ff8c1a', F:'#ff4d1a',
  Y:'#ffe066', m:'#9aa3b2', z:'#c8ced8',
};

const DEPTS = [
  { name:'Cardiac',   T:'#e8424f', t:'#b52a3a', L:'#ff8a8f', D:'#7e1c2a' },
  { name:'Neuro',     T:'#9b5de5', t:'#7140b0', L:'#c9a2f5', D:'#4a2a78' },
  { name:'Ortho',     T:'#3a86ff', t:'#2a5fc0', L:'#8ab8ff', D:'#1c3e80' },
  { name:'Peds',      T:'#ffc93c', t:'#d99a1e', L:'#ffe58f', D:'#8a5d0e' },
  { name:'Maternity', T:'#ff7eb6', t:'#d4558f', L:'#ffb3d4', D:'#8a2f5a' },
  { name:'Burns',     T:'#ff8c42', t:'#d0631f', L:'#ffbb8a', D:'#86380b' },
];
const TRIAGE = { name:'Triage', T:'#a3abb8', t:'#7d8594', L:'#d0d5dd', D:'#4f5563' };
const bodyTint = d => ({ T:d.T, t:d.t, L:d.L, D:d.D });
const patientTint = d => ({ T:d.T, t:d.t, L:d.L, D:d.D, h:d.T, H:d.t });
const grid = rows => rows.map(r => r.split(''));

// ---------- patients: unique upper body per department + shared legs ----------
const HEAD = [
  '....kkkkk.....',
  '...khhhhhk....',
  '..khhhhhhhk...',
  '..kHhhhsssk...',
  '..kHhhsskssk..',
  '..kHHsssssk...',
  '...kHsssspk...',
  '....kkssskk...',
];
const BODY = [
  '...kTTTTTk....',
  '..kTLLTTTTk...',
  '.kTTLTTTsTk...',
  '.kWTLTTTsk....',
  '.ksTTTTTTk....',
  '.kSsTTTTTk....',
  '.kSsTTTTtk....',
  '..kTTTTttk....',
  '...kkkkkk.....',
];
const LEGS = [
  ['...ks..sk.....','...ks..sk.....','...kW..Wk.....'],
  ['..ks....sk....','.ks......sk...','.kW......Wk...'],
  ['...ks.sk......','....ksk.......','....kWWk......'],
  ['..ks....sk....','.ks......sk...','.kW......Wk...'],
];
const UPPER = {
  Cardiac: [HEAD, [            // hugging the post-op heart pillow
    '...kTTTTTk....',
    '..kTLLTkkTkk..',
    '.kTTLTTkpkpk..',
    '.kWTLTskpppk..',
    '.ksTTTTTkpk...',
    '.kSsTTTTTk....',
    '.kSsTTTTtk....',
    '..kTTTTttk....',
    '...kkkkkk.....',
  ]],
  Neuro: [[                    // gauze head wrap, seeing stars
    '....Y.........',
    '...YYY...Y....',
    '....Y...YYY...',
    '.........Y....',
    '....kkkkk.....',
    '...kwwwwwk....',
    '..kwzwwwwwk...',
    '..kzzzzzzzk...',
    '..kHhhsskssk..',
    '..kHHsssssk...',
    '...kHsssspk...',
    '....kkssskk...',
  ], BODY],
  Ortho: [HEAD, [              // arm in a cast and sling
    '...kTTTTTk....',
    '..kTLLTTzTk...',
    '.kTTLTTzkkkkk.',
    '.kWTLTzkwwwwk.',
    '.ksTTzTkwwwsk.',
    '.kSszTTTkkkk..',
    '.kSsTTTTtk....',
    '..kTTTTttk....',
    '...kkkkkk.....',
  ]],
  Peds: [[                     // little, with a teddy
    '.....kk.......',
    '....khhkkk....',
    '...khhhhhhk...',
    '..khhhhhhhhk..',
    '..kHhhhsssk...',
    '..kHhhsskssk..',
    '..kHHsssspk...',
    '...kkssssk....',
  ], [
    '...kTTTcc..cc.',
    '..kTLTTcbbbbc.',
    '.kTLTTsbkbbkb.',
    '.ksTTTTbbzzbb.',
    '..kTTTtcbbbbc.',
    '...kkkkkcccc..',
  ]],
  Maternity: [HEAD, [          // very pregnant, hand on the bump
    '...kTTTTTk....',
    '..kTLLTTTTk...',
    '.kTTLTTTTTTk..',
    '.kWTLTTTTLLTk.',
    '.ksTTTTTsLLTTk',
    '.kSsTTTTsTTTTk',
    '.kSsTTTTTTTtk.',
    '..kTTTTTttkk..',
    '...kkkkkk.....',
  ]],
  Burns: [[                    // actively on fire
    '...Y.....Y....',
    '..YO..Y.YO....',
    '..OFY.OYOF.Y..',
    '..kFFOkkFOOY..',
    '...kOFOFOk....',
    '..kFOOFOFOk...',
    '..kFOmssssk...',
    '..kOFsmkssk...',
    '..kFOsssssk...',
    '...kOsssmpk...',
    '....kkssskk...',
  ], BODY],
};
const BURNS_FLICKER = [
  '....Y...Y.....',
  '..Y.OY.YO.Y...',
  '..YOFOYOFYO...',
  '..kFOFkkOFOY..',
];
function patientGrid(dept, frame, flick) {
  let [head, body] = UPPER[dept];
  if (dept === 'Burns' && flick) head = BURNS_FLICKER.concat(head.slice(4));
  return grid(head.concat(body, LEGS[frame]));
}

// ---------- vehicles: shapes rasterised per angle (clean 45° staircases) ----------
const AMB_W = 12, CART_W = 10;
function ambRegion(u, v, len) {
  const hl = len / 2, hw = AMB_W / 2, au = Math.abs(u), av = Math.abs(v), r = 2.2;
  if (au > hl || av > hw) return null;
  if (au > hl - r && av > hw - r && Math.hypot(au - (hl - r), av - (hw - r)) > r) return null;
  if (u > hl - 5.2 && u < hl - 2.2 && av < hw - 1.4) return v < -1.5 && u < hl - 3.6 ? 'N' : 'n';
  const small = len < 20;
  if (!small && u > hl - 7.6 && u < hl - 5.6 && av < hw - 2) return v < 0 ? 'r' : 'B';
  if (u >= hl - 2.2) return av > hw - 3 ? 'y' : 'g';
  if (u < -hl + 1.6) return av > hw - 3.2 && av < hw - 1.6 ? 'r' : 'G';
  const roofA = -hl + 2.6, roofB = small ? hl - 5.4 : hl - 8.2;
  if (u > roofA && u < roofB && av < hw - 2.4) {
    const tip = roofB - 1.2, head = Math.min(4.2, (roofB - roofA) * 0.5);
    if (u > tip - head && av < (tip - u) * 0.95 + 0.2) return 'w';
    if (u > roofA + 1.2 && u <= tip - head + 0.6 && av < 1.15) return 'w';
    return av > hw - 3.2 ? 'L' : 'T';
  }
  if (v < -hw + 1.8) return 'L';
  if (v > hw - 1.8) return 't';
  return 'T';
}
function cartRegion(u, v, len) {
  const hl = len / 2, hw = CART_W / 2, au = Math.abs(u), av = Math.abs(v);
  if (au > hl || av > hw) return null;
  if (au > hl - 1.4 && av > hw - 1.4) return null;
  if (av > hw - 1.3) return 'W';
  if (u < -hl + 6.2) {
    if (u > -hl + 1.6 && u < -hl + 5.2 && av < 2.6) return (Math.abs(v - Math.sin((u + hl) * 2.2) * 1.1) < 0.7) ? 'q' : 'Q';
    return 'g';
  }
  const tip = hl - 1.2, head = 3.4;
  if (u > tip - head && av < (tip - u) * 0.95) return 'w';
  if (u > -hl + 7.4 && u <= tip - head + 0.6 && av < 1.1) return 'w';
  return v > hw - 2.6 ? 'R' : 'r';
}
function rasterize(region, len, width, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const ex = Math.ceil(Math.abs(c) * len / 2 + Math.abs(s) * width / 2), ey = Math.ceil(Math.abs(s) * len / 2 + Math.abs(c) * width / 2);
  const w = ex * 2 + 2, h = ey * 2 + 2, g = [];
  for (let y = 0; y < h; y++) { const row = []; for (let x = 0; x < w; x++) {
    const px = x + 0.5 - w / 2, py = y + 0.5 - h / 2;
    row.push(region(px * c + py * s, -px * s + py * c, len) || '.'); } g.push(row); }
  const out = g.map(r => r.slice());
  const empty = (x, y) => x < 0 || y < 0 || x >= w || y >= h || g[y][x] === '.';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (g[y][x] !== '.' && (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1))) out[y][x] = 'k';
  return out;   // kept untrimmed so the vehicle centre is the grid centre
}

// ---------- icons that pop out of an ambulance when a patient boards ----------
const ICONS = {
  Cardiac:  ['.kk.kk.','kwwkwwk','kwwwwwk','kwwwwwk','.kwwwk.','..kwk..','...k...'],
  Neuro:    ['.kkkkk.','kwkwkwk','kwwkwwk','kwkwkwk','kwwkwwk','.kkkkk.','..kk...'],
  Ortho:    ['kk...kk','kwk.kwk','.kwkwk.','..kwk..','.kwkwk.','kwk.kwk','kk...kk'],
  Peds:     ['kk...kk','kwkkkwk','.kwwwk.','kwkwkwk','kwwwwwk','.kwkwk.','..kkk..'],
  Maternity:['...kk..','..kkkk.','.kwwwwk','kwkwkwk','kwwwwwk','.kwkwk.','..kkk..'],
  Burns:    ['...k...','..kwk..','.kwwk..','.kwwwk.','kwwkwwk','kwkkwwk','.kkkkk.'],
};

// ---------- cache ----------
const Sprites = (() => {
  const cache = new Map();
  function toCanvas(g, tint, flip) {
    const h = g.length, w = g[0].length, cv = document.createElement('canvas');
    cv.width = w; cv.height = h; const cx = cv.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = g[y][flip ? w - 1 - x : x]; if (k === '.') continue;
      cx.fillStyle = (tint && tint[k]) || PAL[k] || '#f0f';
      cx.fillRect(x, y, 1, 1);
    }
    return cv;
  }
  function get(key, make) { let v = cache.get(key); if (!v) { v = make(); cache.set(key, v); } return v; }
  const DIRS = 8;
  return {
    // dept: DEPTS entry or TRIAGE; dir 0..7 (0 = facing right, clockwise)
    ambulance(dept, len, dir, sirenSwap) {
      return get(`a|${dept.name}|${len}|${dir}|${sirenSwap ? 1 : 0}`, () => {
        const g = get(`ag|${len}|${dir}`, () => rasterize(ambRegion, len, AMB_W, dir * Math.PI / 4));
        const tint = bodyTint(dept); if (sirenSwap) { tint.r = PAL.B; tint.B = PAL.r; }
        return toCanvas(g, tint);
      });
    },
    cart(dir) { return get(`c|${dir}`, () => toCanvas(rasterize(cartRegion, 15, CART_W, dir * Math.PI / 4))); },
    shadow(kind, len, dir) {
      return get(`s|${kind}|${len}|${dir}`, () => {
        const g = kind === 'cart' ? rasterize(cartRegion, 15, CART_W, dir * Math.PI / 4) : rasterize(ambRegion, len, AMB_W, dir * Math.PI / 4);
        return toCanvas(g.map(r => r.map(k => k === '.' ? '.' : 'o')), { o:'rgba(30,35,45,0.35)' });
      });
    },
    patient(dept, frame, flick, flip) {
      return get(`p|${dept.name}|${frame}|${flick ? 1 : 0}|${flip ? 1 : 0}`, () => toCanvas(patientGrid(dept.name, frame, flick), patientTint(dept), flip));
    },
    icon(dept) { return get(`i|${dept.name}`, () => toCanvas(grid(ICONS[dept.name]), { w:dept.L, k:dept.D })); },
    DIRS,
  };
})();
