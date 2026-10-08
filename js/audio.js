// Chiptune music and sound effects, synthesised with Web Audio (no audio files).
const Sound = (() => {
  let ctx = null, master, musicBus, sfxBus, pulse25, pulse12, noiseBuf;
  const prefs = { music: true, sfx: true };
  try { const p = JSON.parse(localStorage.getItem('aj.sound') || '{}'); Object.assign(prefs, p); } catch (e) {}
  const save = () => { try { localStorage.setItem('aj.sound', JSON.stringify(prefs)); } catch (e) {} };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function pulseWave(duty) {
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return ctx.createPeriodicWave(re, im);
  }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = prefs.music ? 0.16 : 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = prefs.sfx ? 0.45 : 0; sfxBus.connect(master);
    pulse25 = pulseWave(0.25); pulse12 = pulseWave(0.125);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // iOS needs a sound started inside the gesture
    const o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = 0; o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.01);
  }

  function tone({ wave = 'square', f, f2, at = 0, dur = 0.1, vol = 0.3, attack = 0.004, bus }) {
    if (!ctx) return;
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    if (wave === 'pulse25') o.setPeriodicWave(pulse25); else if (wave === 'pulse12') o.setPeriodicWave(pulse12); else o.type = wave;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise({ at = 0, dur = 0.05, vol = 0.2, hp = 1000, bus, t0 }) {
    if (!ctx) return;
    const t = t0 ?? ctx.currentTime + at, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus); s.start(t); s.stop(t + dur + 0.02);
  }

  const PENT = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93];
  const sfx = {
    tap()   { tone({ wave:'pulse25', f:520, f2:880, dur:0.07, vol:0.25 }); },
    honk()  { tone({ wave:'square', f:330, dur:0.13, vol:0.18 }); tone({ wave:'square', f:415, dur:0.13, vol:0.14 });
              tone({ wave:'square', f:330, at:0.16, dur:0.1, vol:0.14 }); tone({ wave:'square', f:415, at:0.16, dur:0.1, vol:0.11 }); },
    nope()  { tone({ wave:'pulse25', f:220, f2:160, dur:0.15, vol:0.22 }); },
    board(i){ tone({ wave:'triangle', f:mtof(PENT[Math.min(i, PENT.length - 1)]), dur:0.09, vol:0.3 }); },
    pop()   { tone({ wave:'sine', f:1400, f2:2000, dur:0.05, vol:0.08 }); },
    park()  { tone({ wave:'pulse25', f:392, dur:0.06, vol:0.15 }); tone({ wave:'pulse25', f:523, at:0.06, dur:0.08, vol:0.15 }); },
    siren() { for (let i = 0; i < 4; i++) tone({ wave:'pulse12', f:i % 2 ? 660 : 880, at:i * 0.17, dur:0.16, vol:0.12, attack:0.01 }); },
    click() { tone({ wave:'square', f:880, dur:0.03, vol:0.12 }); },
    beep()  { tone({ wave:'sine', f:1046, dur:0.08, vol:0.2 }); tone({ wave:'sine', f:1046, at:0.12, dur:0.08, vol:0.2 }); },
    bonus() { [523, 659, 784, 1046].forEach((f, i) => tone({ wave:'pulse25', f, at:i * 0.05, dur:0.09, vol:0.16 })); },
    win()   { [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => tone({ wave:'pulse25', f:mtof(m), at:i * 0.08, dur:0.16, vol:0.18 }));
              [72, 76, 79].forEach(m => tone({ wave:'triangle', f:mtof(m), at:0.62, dur:0.6, vol:0.18 })); },
    lose()  { [67, 63, 60].forEach((m, i) => tone({ wave:'pulse25', f:mtof(m), f2:mtof(m - 1), at:i * 0.28, dur:0.26, vol:0.18 }));
              tone({ wave:'triangle', f:mtof(48), f2:mtof(43), at:0.84, dur:0.7, vol:0.25 }); },
    flatline() { tone({ wave:'sine', f:988, at:0, dur:1.4, vol:0.12, attack:0.01 }); },
    quack() { tone({ wave:'pulse12', f:620, f2:430, dur:0.1, vol:0.2 }); tone({ wave:'pulse12', f:600, f2:400, at:0.13, dur:0.12, vol:0.2 }); },
    start() { [64, 67, 72].forEach((m, i) => tone({ wave:'pulse25', f:mtof(m), at:i * 0.07, dur:0.1, vol:0.16 })); },
  };

  // ---------- music: step sequencer, eighth-note steps ----------
  const _ = null;
  const SONGS = {
    title: { bpm: 116,
      lead: [72,_,76,79, 84,_,79,76,  77,_,81,84, 81,_,77,_,  79,_,83,86, 83,79,_,74,  76,77,79,_, 72,_,_,_,
             76,_,79,84, 88,_,84,79,  81,_,77,81, 84,_,81,_,  83,_,79,74, 77,76,74,_,  72,_,76,_, 72,_,_,_],
      bass: [48,_,55,_, 48,_,55,_,  53,_,60,_, 53,_,60,_,  55,_,62,_, 55,_,62,_,  48,_,55,_, 48,_,48,_,
             48,_,55,_, 48,_,55,_,  53,_,60,_, 53,_,60,_,  55,_,62,_, 55,_,59,_,  48,_,55,_, 48,_,_,_],
      drums:'k.h.s.h.k.h.s.hh' },
    play: { bpm: 128,
      lead: [69,_,72,76, 74,72,69,_,  65,_,69,72, 71,69,65,_,  67,_,72,76, 79,_,76,72,  74,_,71,67, 71,74,_,_,
             76,_,74,72, 74,_,72,69,  72,_,69,65, 69,72,74,_,  76,77,79,_, 76,_,72,_,  74,_,_,71, 67,_,_,_],
      bass: [45,57,45,57, 45,57,45,57,  41,53,41,53, 41,53,41,53,  48,60,48,60, 48,60,48,60,  43,55,43,55, 43,55,47,55,
             45,57,45,57, 45,57,45,57,  41,53,41,53, 41,53,41,53,  48,60,48,60, 48,60,48,60,  43,55,43,55, 43,47,50,55],
      drums:'k.h.s.hkk.h.s.hh' },
  };
  let current = null, step = 0, nextTime = 0, timer = null;
  function scheduleStep(song, i, t) {
    const len = song.lead.length, spb = 60 / song.bpm / 2;
    const l = song.lead[i % len], b = song.bass[i % len], d = song.drums[i % song.drums.length];
    if (l != null) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.setPeriodicWave(pulse25);
      o.frequency.setValueAtTime(mtof(l), t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.28, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + spb * 1.6);
      o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + spb * 1.7);
    }
    if (b != null) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle';
      o.frequency.setValueAtTime(mtof(b), t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + spb * 0.95);
      o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + spb);
    }
    if (d === 'k') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.15); }
    if (d === 's') noise({ t0:t, dur:0.09, vol:0.25, hp:1500, bus:musicBus });
    if (d === 'h') noise({ t0:t, dur:0.025, vol:0.08, hp:7000, bus:musicBus });
  }
  function tick() {
    if (!ctx || !current) return;
    const song = SONGS[current], spb = 60 / song.bpm / 2;
    while (nextTime < ctx.currentTime + 0.15) { scheduleStep(song, step, nextTime); step++; nextTime += spb; }
  }
  function play(name) {
    if (!ctx || current === name) return;
    current = name; step = 0; nextTime = ctx.currentTime + 0.05;
    if (!timer) timer = setInterval(tick, 40);
  }
  function stop() { current = null; }

  return {
    init, play, stop, sfx: new Proxy(sfx, { get: (o, k) => (...a) => { if (ctx && prefs.sfx) o[k](...a); } }),
    get music() { return prefs.music; }, get effects() { return prefs.sfx; },
    toggleMusic() { prefs.music = !prefs.music; save(); if (musicBus) musicBus.gain.value = prefs.music ? 0.16 : 0; },
    toggleSfx() { prefs.sfx = !prefs.sfx; save(); if (sfxBus) sfxBus.gain.value = prefs.sfx ? 0.45 : 0; },
  };
})();
