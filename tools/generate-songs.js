/*
 * Sample track generator for Task 3 — Music Player
 * Synthesises short, original instrumental loops and writes them as
 * 16-bit mono WAV files into ../audio. Run with:  node tools/generate-songs.js
 */

const fs = require("fs");
const path = require("path");

const SR = 22050;
const OUT_DIR = path.join(__dirname, "..", "audio");
const TWO_PI = Math.PI * 2;

/* ------------------------------------------------------------------ */
/*  Audio helpers                                                      */
/* ------------------------------------------------------------------ */

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function noise() {
  return Math.random() * 2 - 1;
}

// One-pole low pass filter state runner
function lowpass(buf, cutoff) {
  const k = 1 - Math.exp((-TWO_PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    y += k * (buf[i] - y);
    buf[i] = y;
  }
  return buf;
}

function highpass(buf, cutoff) {
  const k = Math.exp((-TWO_PI * cutoff) / SR);
  let y = 0;
  let prev = 0;
  for (let i = 0; i < buf.length; i++) {
    y = k * (y + buf[i] - prev);
    prev = buf[i];
    buf[i] = y;
  }
  return buf;
}

function softClip(x) {
  return Math.tanh(x * 1.4);
}

/* ------------------------------------------------------------------ */
/*  Voice synthesis                                                    */
/* ------------------------------------------------------------------ */

function osc(type, phase) {
  switch (type) {
    case "sine":
      return Math.sin(phase);
    case "triangle":
      return 2 * Math.abs(((phase / TWO_PI) % 1) * 2 - 1) - 1;
    case "saw":
      return ((phase / TWO_PI) % 1) * 2 - 1;
    case "square":
      return Math.sin(phase) >= 0 ? 1 : -1;
    default:
      return Math.sin(phase);
  }
}

/** Generic enveloped tone voice written into `out` at sample offset `at`. */
function tone(out, at, freq, dur, opts = {}) {
  const {
    type = "sine",
    amp = 0.3,
    attack = 0.01,
    decay = dur * 0.6,
    release = Math.min(0.15, dur * 0.4),
    detune = 0,
    cutoff = 0,
    drive = 1,
  } = opts;

  const n = Math.floor(dur * SR);
  const a = Math.max(1, Math.floor(attack * SR));
  const d = Math.max(1, Math.floor(decay * SR));
  const r = Math.max(1, Math.floor(release * SR));
  const f = freq * Math.pow(2, detune / 1200);
  let phase = 0;
  const step = (TWO_PI * f) / SR;

  for (let i = 0; i < n; i++) {
    const idx = at + i;
    if (idx >= out.length) break;
    let env;
    if (i < a) env = i / a;
    else if (i < a + d) env = 1 - (1 - 0.65) * ((i - a) / d);
    else {
      const tail = (i - a - d) / Math.max(1, n - a - d);
      env = 0.65 * Math.max(0, 1 - tail);
    }
    if (i > n - r) env *= Math.max(0, (n - i) / r);

    phase += step;
    let s = osc(type, phase) * env * amp;
    if (drive !== 1) s = softClip(s * drive);
    out[idx] += s;
  }

  if (cutoff) {
    const start = clamp(at, 0, out.length);
    const end = clamp(at + n, 0, out.length);
    if (end > start) lowpass(out.subarray(start, end), cutoff);
  }
}

/** Pseudo-piano: stacked harmonics with per-partial decay. */
function piano(out, at, freq, dur, amp = 0.26) {
  const partials = [
    [1, 1, 1],
    [2, 0.45, 0.72],
    [3, 0.24, 0.55],
    [4, 0.13, 0.4],
    [5, 0.07, 0.3],
    [6, 0.04, 0.22],
  ];
  const n = Math.floor(dur * SR);
  for (const [mul, a, life] of partials) {
    const f = freq * mul;
    if (f > SR / 2.2) continue;
    const step = (TWO_PI * f) / SR;
    const decayLen = n * life;
    let phase = Math.random() * TWO_PI;
    for (let i = 0; i < n; i++) {
      const idx = at + i;
      if (idx >= out.length) break;
      const t = i / decayLen;
      const env = Math.exp(-3.4 * t) * (1 - Math.exp(-i / (0.004 * SR)));
      if (env < 0.0004) continue;
      phase += step;
      out[idx] += Math.sin(phase) * env * amp * a;
    }
  }
}

/** Bright pluck (arp / pop lead). */
function pluck(out, at, freq, dur, amp = 0.22) {
  const n = Math.floor(dur * SR);
  const step = (TWO_PI * freq) / SR;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const idx = at + i;
    if (idx >= out.length) break;
    const t = i / n;
    const env = Math.exp(-6 * t) * Math.min(1, i / (0.003 * SR));
    phase += step;
    const s = (osc("saw", phase) * 0.6 + osc("square", phase) * 0.4) * env * amp;
    out[idx] += softClip(s * 1.2);
  }
  const start = clamp(at, 0, out.length);
  const end = clamp(at + n, 0, out.length);
  if (end > start) lowpass(out.subarray(start, end), 2600);
}

/** Warm pad (chill / classical strings). */
function pad(out, at, freq, dur, amp = 0.1) {
  const n = Math.floor(dur * SR);
  const stepA = (TWO_PI * freq) / SR;
  const stepB = (TWO_PI * freq * Math.pow(2, 7 / 1200)) / SR;
  const stepC = (TWO_PI * freq * Math.pow(2, -9 / 1200)) / SR;
  const atk = Math.floor(0.25 * SR);
  const rel = Math.floor(Math.min(0.6, dur * 0.4) * SR);
  let pA = 0,
    pB = 0,
    pC = 0;
  for (let i = 0; i < n; i++) {
    const idx = at + i;
    if (idx >= out.length) break;
    let env = i < atk ? i / atk : 1;
    if (i > n - rel) env *= Math.max(0, (n - i) / rel);
    pA += stepA;
    pB += stepB;
    pC += stepC;
    const s =
      (osc("triangle", pA) + osc("saw", pB) * 0.5 + osc("sine", pC) * 0.7) / 2.2;
    out[idx] += s * env * amp;
  }
  const start = clamp(at, 0, out.length);
  const end = clamp(at + n, 0, out.length);
  if (end > start) lowpass(out.subarray(start, end), 1500);
}

/** 808 style sub with pitch drop. */
function sub808(out, at, freq, dur, amp = 0.5) {
  const n = Math.floor(dur * SR);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const idx = at + i;
    if (idx >= out.length) break;
    const t = i / n;
    const f = freq * (1 + 1.6 * Math.exp(-28 * (i / SR)));
    const env = Math.exp(-2.6 * t) * Math.min(1, i / (0.005 * SR));
    phase += (TWO_PI * f) / SR;
    out[idx] += Math.sin(phase) * env * amp;
  }
}

/** Distorted power chord (rock). */
function powerChord(out, at, freq, dur, amp = 0.16) {
  const n = Math.floor(dur * SR);
  const steps = [freq, freq * Math.pow(2, 7 / 12), freq * 2].map(
    (f) => (TWO_PI * f) / SR
  );
  const ph = [0, 0.7, 1.4];
  const atk = Math.floor(0.006 * SR);
  for (let i = 0; i < n; i++) {
    const idx = at + i;
    if (idx >= out.length) break;
    const t = i / n;
    const env =
      Math.min(1, i / atk) * (0.35 + 0.65 * Math.exp(-3 * t)) * (1 - Math.pow(t, 8));
    let s = 0;
    for (let v = 0; v < 3; v++) {
      ph[v] += steps[v];
      s += osc(v === 1 ? "square" : "saw", ph[v]);
    }
    s = softClip((s / 3) * 3.2);
    out[idx] += s * env * amp;
  }
  const start = clamp(at, 0, out.length);
  const end = clamp(at + n, 0, out.length);
  if (end > start) lowpass(out.subarray(start, end), 3200);
}

/* ---------------------------- drums ------------------------------- */

function kick(out, at, amp = 0.85) {
  const n = Math.floor(0.34 * SR);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const idx = at + i;
    if (idx >= out.length) break;
    const t = i / SR;
    const f = 44 + 118 * Math.exp(-38 * t);
    const env = Math.exp(-11 * t);
    phase += (TWO_PI * f) / SR;
    out[idx] += Math.sin(phase) * env * amp;
  }
}

function snare(out, at, amp = 0.5) {
  const n = Math.floor(0.22 * SR);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const idx = at + i;
    if (idx >= out.length) break;
    const t = i / n;
    const env = Math.exp(-7 * t);
    const nz = noise();
    lp += 0.55 * (nz - lp);
    const body = Math.sin(TWO_PI * 186 * (i / SR)) * Math.exp(-16 * (i / SR));
    out[idx] += (lp * 1.5 + body * 0.7) * env * amp;
  }
}

function clap(out, at, amp = 0.34) {
  const bursts = [0, 0.012, 0.025, 0.04];
  for (const off of bursts) {
    const start = at + Math.floor(off * SR);
    const n = Math.floor(0.14 * SR);
    let bp = 0;
    for (let i = 0; i < n; i++) {
      const idx = start + i;
      if (idx >= out.length) break;
      const env = Math.exp(-16 * (i / n));
      bp += 0.6 * (noise() - bp);
      out[idx] += (noise() * 0.5 + bp * 1.4) * env * amp;
    }
  }
  const start = clamp(at, 0, out.length);
  const end = clamp(at + Math.floor(0.2 * SR), 0, out.length);
  if (end > start) highpass(out.subarray(start, end), 900);
}

function hat(out, at, amp = 0.2, len = 0.05) {
  const n = Math.floor(len * SR);
  let hp = 0;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const idx = at + i;
    if (idx >= out.length) break;
    const env = Math.exp(-45 * (i / n));
    const x = noise();
    hp = 0.86 * (hp + x - prev);
    prev = x;
    out[idx] += hp * env * amp;
  }
}

function rim(out, at, amp = 0.3) {
  const n = Math.floor(0.07 * SR);
  for (let i = 0; i < n; i++) {
    const idx = at + i;
    if (idx >= out.length) break;
    const env = Math.exp(-38 * (i / n));
    out[idx] +=
      (Math.sin(TWO_PI * 820 * (i / SR)) * 0.6 + noise() * 0.4) * env * amp;
  }
}

/* ---------------------------- effects ----------------------------- */

function reverb(buf, wet = 0.16) {
  const combs = [2117, 2633, 2939, 3163].map((d) => ({
    buf: new Float32Array(d),
    i: 0,
    fb: 0.76,
    damp: 0.34,
    lp: 0,
  }));
  const out = new Float32Array(buf.length);
  for (let n = 0; n < buf.length; n++) {
    const x = buf[n];
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * (1 - c.damp) + c.lp * c.damp;
      c.buf[c.i] = x + c.lp * c.fb;
      c.i = (c.i + 1) % c.buf.length;
      acc += y;
    }
    acc *= 0.25;
    // allpass diffusers
    out[n] = acc;
  }
  for (let n = 0; n < buf.length; n++) buf[n] = buf[n] * (1 - wet) + out[n] * wet;
}

function fadeIn(buf, sec = 0.03) {
  const n = Math.floor(sec * SR);
  for (let i = 0; i < n && i < buf.length; i++) buf[i] *= i / n;
}

function fadeOut(buf, sec = 0.8) {
  const n = Math.floor(sec * SR);
  for (let i = 0; i < n && i < buf.length; i++) {
    const idx = buf.length - 1 - i;
    buf[idx] *= i / n;
  }
}

function normalise(buf, peak = 0.88) {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  if (max === 0) return;
  const g = peak / max;
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
}

function writeWav(file, buf) {
  const bytes = 2;
  const data = Buffer.alloc(buf.length * bytes);
  for (let i = 0; i < buf.length; i++) {
    const s = clamp(Math.round(buf[i] * 32767), -32768, 32767);
    data.writeInt16LE(s, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * bytes, 28);
  header.writeUInt16LE(bytes, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}

/* ------------------------------------------------------------------ */
/*  Arrangements                                                       */
/* ------------------------------------------------------------------ */

const sec2samp = (s) => Math.floor(s * SR);
const beatTime = (bpm) => 60 / bpm;

function makeBuffer(seconds) {
  return new Float32Array(Math.ceil(seconds * SR));
}

const CHORDS = {
  pop: [
    [60, 64, 67], // C
    [67, 71, 74], // G
    [69, 72, 76], // Am
    [65, 69, 72], // F
  ],
  rock: [
    [45, 52],
    [41, 48],
    [48, 55],
    [43, 50],
  ],
  hiphop: [
    [45, 48, 52],
    [43, 47, 50],
    [41, 45, 48],
    [43, 46, 50],
  ],
  chill: [
    [57, 60, 64, 67],
    [53, 57, 60, 64],
    [55, 59, 62, 66],
    [52, 55, 59, 62],
  ],
  classical: [
    [48, 55, 60, 64, 67],
    [50, 57, 62, 65, 69],
    [52, 59, 64, 67, 71],
    [55, 62, 67, 71, 74],
  ],
};

function buildPop(out, bars, seed) {
  const bpm = 116;
  const beat = beatTime(bpm);
  const bar = beat * 4;
  const chords = CHORDS.pop;
  const rand = mulberry(seed);
  const melody = [0, 2, 4, 7, 4, 2, 4, 0];

  for (let b = 0; b < bars; b++) {
    const t0 = b * bar;
    const at = sec2samp(t0);
    const chord = chords[b % chords.length];
    const root = chord[0] - 24;

    for (let step = 0; step < 8; step++) {
      const sAt = at + Math.floor(step * (bar / 8) * SR);
      const semi = melody[(step + b) % melody.length];
      pluck(out, sAt, midiToFreq(chord[0] + 12 + semi), bar / 8, 0.16);
    }

    for (let q = 0; q < 4; q++) {
      const qAt = at + Math.floor(q * beat * SR);
      kick(out, qAt, 0.8);
      hat(out, qAt + Math.floor(beat * 0.5 * SR), 0.16, 0.04);
      if (q === 1 || q === 3) clap(out, qAt, 0.32);
      sub808(out, qAt, midiToFreq(root), beat * 0.9, 0.34);
      if (rand() > 0.55) hat(out, qAt + Math.floor(beat * 0.25 * SR), 0.09, 0.03);
    }

    if (b % 4 === 0) {
      for (const m of chord) pad(out, at, midiToFreq(m), bar * 4, 0.055);
    }
  }
}

function buildRock(out, bars, seed) {
  const bpm = 138;
  const beat = beatTime(bpm);
  const bar = beat * 4;
  const chords = CHORDS.rock;
  const rand = mulberry(seed);

  for (let b = 0; b < bars; b++) {
    const at = sec2samp(b * bar);
    const chord = chords[b % chords.length];
    const root = chord[0];

    powerChord(out, at, midiToFreq(root), bar * 0.96, 0.2);
    if (rand() > 0.5) powerChord(out, at + Math.floor(beat * 2.5 * SR), midiToFreq(chord[1]), beat, 0.17);

    for (let e = 0; e < 8; e++) {
      const eAt = at + Math.floor(e * (bar / 8) * SR);
      if (e % 2 === 0) kick(out, eAt, 0.8);
      else if (e === 2 || e === 6) snare(out, eAt, 0.5);
      hat(out, eAt, 0.13, 0.035);
      sub808(out, eAt, midiToFreq(root - 12), bar / 8, 0.3);
    }
    snare(out, at + Math.floor(beat * 3.75 * SR), 0.34);
  }
}

function buildHipHop(out, bars, seed) {
  const bpm = 86;
  const beat = beatTime(bpm);
  const bar = beat * 4;
  const chords = CHORDS.hiphop;
  const rand = mulberry(seed);
  const lead = [7, 0, 3, 0, 10, 7, 3, 0];

  for (let b = 0; b < bars; b++) {
    const at = sec2samp(b * bar);
    const chord = chords[b % chords.length];

    sub808(out, at, midiToFreq(chord[0] - 12), bar * 0.7, 0.55);
    sub808(out, at + Math.floor(beat * 2.5 * SR), midiToFreq(chord[0] - 12 + 3), beat * 1.2, 0.42);

    kick(out, at, 0.85);
    kick(out, at + Math.floor(beat * 1.75 * SR), 0.7);
    kick(out, at + Math.floor(beat * 3.25 * SR), 0.75);
    snare(out, at + Math.floor(beat * 2 * SR), 0.45);

    for (let h = 0; h < 8; h++) {
      const hAt = at + Math.floor(h * (bar / 8) * SR);
      const a = rand() > 0.8 ? 0.16 : 0.1;
      hat(out, hAt, a, 0.03);
      if (rand() > 0.86) {
        for (let r = 0; r < 3; r++) {
          hat(out, hAt + Math.floor(r * (beat / 12) * SR), 0.09, 0.02);
        }
      }
    }

    for (let s = 0; s < 4; s++) {
      const sAt = at + Math.floor((s + 0.5) * beat * SR);
      const semi = lead[(s + b * 2) % lead.length];
      tone(out, sAt, midiToFreq(chord[0] + 12 + semi), beat * 0.9, {
        type: "sine",
        amp: 0.2,
        attack: 0.01,
        decay: beat * 0.5,
        release: beat * 0.3,
      });
    }

    if (b % 2 === 0) {
      for (const m of chord) pad(out, at, midiToFreq(m + 12), bar * 2, 0.05);
    }
  }
}

function buildChill(out, bars, seed) {
  const bpm = 72;
  const beat = beatTime(bpm);
  const bar = beat * 4;
  const chords = CHORDS.chill;
  const rand = mulberry(seed);

  for (let b = 0; b < bars; b++) {
    const at = sec2samp(b * bar);
    const chord = chords[b % chords.length];

    for (const m of chord) pad(out, at, midiToFreq(m), bar * 1.05, 0.075);

    const arps = [0, 2, 3, 2, 1, 3, 0, 2];
    for (let i = 0; i < 8; i++) {
      const aAt = at + Math.floor(i * (bar / 8) * SR);
      const m = chord[arps[(i + b) % arps.length] % chord.length];
      tone(out, aAt, midiToFreq(m + 12), beat, {
        type: "triangle",
        amp: 0.11,
        attack: 0.02,
        decay: beat * 0.7,
        release: beat * 0.3,
      });
    }

    kick(out, at, 0.55);
    kick(out, at + Math.floor(beat * 2.5 * SR), 0.45);
    rim(out, at + Math.floor(beat * 2 * SR), 0.26);
    hat(out, at + Math.floor(beat * 1.5 * SR), 0.08, 0.05);
    hat(out, at + Math.floor(beat * 3.5 * SR), 0.07, 0.05);
    sub808(out, at, midiToFreq(chord[0] - 24), bar * 0.8, 0.3);

    if (rand() > 0.6) {
      tone(out, at + Math.floor(beat * 3.5 * SR), midiToFreq(chord[0] + 24), beat, {
        type: "sine",
        amp: 0.12,
        attack: 0.01,
        decay: beat * 0.6,
        release: beat * 0.3,
      });
    }
  }

  // gentle vinyl air
  let lp = 0;
  for (let i = 0; i < out.length; i++) {
    lp += 0.06 * (noise() - lp);
    out[i] += lp * 0.012;
  }
}

function buildClassical(out, bars, seed) {
  const bpm = 66;
  const beat = beatTime(bpm);
  const bar = beat * 4;
  const chords = CHORDS.classical;
  const rand = mulberry(seed);

  for (let b = 0; b < bars; b++) {
    const at = sec2samp(b * bar);
    const chord = chords[b % chords.length];

    // rolling right-hand arpeggio
    const order = [0, 1, 2, 3, 4, 3, 2, 1];
    for (let i = 0; i < 8; i++) {
      const pAt = at + Math.floor(i * (bar / 8) * SR);
      const m = chord[order[i] % chord.length] + 12;
      piano(out, pAt, midiToFreq(m), beat * 1.6, 0.2);
    }

    // left-hand bass + occasional countermelody
    piano(out, at, midiToFreq(chord[0] - 12), bar * 0.9, 0.24);
    if (b % 2 === 1) {
      piano(out, at + Math.floor(beat * 2 * SR), midiToFreq(chord[0] - 5), bar * 0.5, 0.16);
    }
    if (rand() > 0.55) {
      piano(
        out,
        at + Math.floor(beat * 3 * SR),
        midiToFreq(chord[chord.length - 1] + 24),
        beat * 1.4,
        0.14
      );
    }
    for (const m of chord) pad(out, at, midiToFreq(m), bar, 0.035);
  }
}

function mulberry(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  Track definitions                                                  */
/* ------------------------------------------------------------------ */

const TRACKS = [
  { file: "midnight-mirage.wav", genre: "pop", builder: buildPop, bars: 12, seed: 11 },
  { file: "electric-bloom.wav", genre: "pop", builder: buildPop, bars: 12, seed: 27 },
  { file: "asphalt-thunder.wav", genre: "rock", builder: buildRock, bars: 14, seed: 35 },
  { file: "broken-compass.wav", genre: "rock", builder: buildRock, bars: 14, seed: 48 },
  { file: "concrete-dreams.wav", genre: "hiphop", builder: buildHipHop, bars: 8, seed: 52 },
  { file: "velvet-flow.wav", genre: "hiphop", builder: buildHipHop, bars: 8, seed: 66 },
  { file: "rain-on-glass.wav", genre: "chill", builder: buildChill, bars: 7, seed: 73 },
  { file: "slow-orbit.wav", genre: "chill", builder: buildChill, bars: 7, seed: 84 },
  { file: "nocturne-in-amber.wav", genre: "classical", builder: buildClassical, bars: 7, seed: 95 },
  { file: "glass-aria.wav", genre: "classical", builder: buildClassical, bars: 7, seed: 102 },
];

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const durations = {};
for (const t of TRACKS) {
  const bpmMap = { pop: 116, rock: 138, hiphop: 86, chill: 72, classical: 66 };
  const seconds = t.bars * (60 / bpmMap[t.genre]) * 4 + 1.2;
  const buf = makeBuffer(seconds);
  t.builder(buf, t.bars, t.seed);
  reverb(buf, t.genre === "classical" || t.genre === "chill" ? 0.2 : 0.13);
  fadeIn(buf, 0.05);
  fadeOut(buf, 0.9);
  normalise(buf, 0.9);
  writeWav(path.join(OUT_DIR, t.file), buf);
  const secs = +(buf.length / SR).toFixed(2);
  durations[t.file] = secs;
  console.log(`${t.file.padEnd(26)} ${secs}s`);
}

fs.writeFileSync(
  path.join(__dirname, "durations.json"),
  JSON.stringify(durations, null, 2)
);
console.log("\nDone. Durations written to tools/durations.json");
