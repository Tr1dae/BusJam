// Fake pixel lighting. Each frame a low-res light map is filled with an ambient tint, light pools are
// added on top, and the map is multiplied over the scene. Bright sources then get a faint additive
// bloom. Pools are banded and Bayer-dithered so they read as hand-placed pixel light, not a blur.
const Light = (() => {
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const sprites = new Map();
  // an elliptical pool, brightest in the middle, in `bands` steps with dithered edges between them
  function pool(rx, ry, col, soft = 1.4, bands = 4) {
    // sizes snap to a few steps so moving or scaling lights reuse cached pools
    const snap = v => { v = Math.max(2, Math.round(v)); const k = v < 16 ? 1 : v < 48 ? 2 : 4; return Math.round(v / k) * k; };
    rx = snap(rx); ry = snap(ry);
    const key = rx + '|' + ry + '|' + col + '|' + soft + '|' + bands; let c = sprites.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = rx * 2; c.height = ry * 2;
    const g = c.getContext('2d'), img = g.createImageData(c.width, c.height), d = img.data, [r, gg, b] = hex(col);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const dist = Math.hypot((x + 0.5 - rx) / rx, (y + 0.5 - ry) / ry); if (dist >= 1) continue;
      // flat bands, with a thin dithered fringe just inside each step
      const lv = Math.pow(1 - dist, soft) * bands, base = Math.floor(lv), th = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      const q = Math.min(bands, base + (lv - base > 0.7 + th * 0.3 ? 1 : 0)) / bands; if (!q) continue;
      const k = (y * c.width + x) * 4; d[k] = r; d[k + 1] = gg; d[k + 2] = b; d[k + 3] = Math.round(q * 255);
    }
    g.putImageData(img, 0, 0); sprites.set(key, c); return c;
  }
  // darker, dithered corners
  const vignettes = new Map();
  function vignette(w, h, col, strength) {
    const key = w + '|' + h + '|' + col + '|' + strength; let c = vignettes.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data, [r, gg, b] = hex(col);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dist = Math.hypot((x - w / 2) / (w * 0.62), (y - h / 2) / (h * 0.62)), lv = Math.max(0, dist - 0.55) / 0.45 * 3;
      const base = Math.floor(lv), th = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16, q = Math.min(3, base + (lv - base > 0.6 + th * 0.4 ? 1 : 0)) / 3;
      const k = (y * w + x) * 4; d[k] = r; d[k + 1] = gg; d[k + 2] = b; d[k + 3] = Math.round(q * strength * 255);
    }
    g.putImageData(img, 0, 0); vignettes.set(key, c); return c;
  }
  const LIFT = 0.62, GLOW = 0.1;
  const map = document.createElement('canvas'); let mg = null, blooms = [], on = true;
  try { on = localStorage.getItem('aj.lights') !== 'off'; } catch (e) {}
  return {
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('aj.lights', on ? 'on' : 'off'); } catch (e) {} },
    pool,
    // start a light map: ambient is what unlit areas are multiplied by
    begin(ambient, vig = 0.35, vigCol = '#1b2140') {
      if (!on) return;
      // keep the world bright: the ambient only takes the edge off, and the vignette stays faint
      { const a = hex(ambient), m = v => Math.round(v + (255 - v) * LIFT); ambient = 'rgb(' + a.map(m).join(',') + ')'; vig *= 0.45; }
      if (map.width !== LW || map.height !== LH) { map.width = LW; map.height = LH; }
      mg = map.getContext('2d'); mg.globalAlpha = 1; mg.globalCompositeOperation = 'source-over';
      mg.fillStyle = ambient; mg.fillRect(0, 0, LW, LH);
      if (vig) mg.drawImage(vignette(LW, LH, vigCol, vig), 0, 0);
      mg.globalCompositeOperation = 'lighter'; blooms = [];
    },
    // add a pool of light; bloom > 0 also brightens the scene there a little (for things that glow)
    add(x, y, rx, ry, col, a = 1, bloom = 0, soft) {
      if (!on || !mg || a <= 0) return;
      const s = pool(rx, ry, col, soft); mg.globalAlpha = Math.min(1, a); mg.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height / 2));
      // pools also add a little light of their own, so lamps read as warm highlights rather than holes in the dark
      blooms.push([x, y, rx, ry, col, bloom + a * GLOW, soft]);
    },
    end() {
      if (!on || !mg) return;
      mg.globalAlpha = 1; mg.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(map, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, y, rx, ry, col, a, soft] of blooms) { const s = pool(rx, ry, col, soft); ctx.globalAlpha = Math.min(1, a); ctx.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height / 2)); }
      ctx.restore(); mg = null;
    },
    // a buzzing tube light: mostly steady, now and then it stutters
    flicker(seed, every = 9) { const t = (T + seed * 3.7) % every; if (t > 0.5) return 1; return [1, 0.15, 0.8, 0.1, 1, 0.3, 0.9, 1][Math.floor(t * 16)] ?? 1; },
  };
})();
