/* =========================================================================
   Beat Lab 808 — the UI Lab's drum machine. lab.js loads this file the
   first time the Beat Lab card comes into view.

   Every sound is synthesized live with the Web Audio API (no samples): the
   16 classic 808 voices — kick, snare, three toms, three congas, rim shot,
   claves, clap, maracas, cowbell, cymbal, open + closed hats — plus a tuned,
   gliding 808 bass. Patterns run 8–128 steps (½ to 8 bars of 16ths) with
   tempo, swing, an accent track, per-step velocity / rolls / chance / nudge /
   808 notes, mute + solo, per-voice tone knobs, genre presets, a groove
   generator, keyboard pads with record, undo, autosave, WAV export
   (rendered offline, loops seamlessly) and share links (?beat=…).
   ========================================================================= */
window.BeatLab = (() => {
    'use strict';
    const MAXS = 128, LENS = [8, 16, 32, 64, 128], AHEAD = 0.12, LS = 'pf_beatlab_v1', LSS = 'pf_beatlab_song_v1', SL = 'ABCD';
    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const VEL = [0, 0.45, 0.74, 1];
    const A64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const NCH = 'LKJIHGFEDCBA0123456789abc'; // preset 808 notes: L = −12 … A = −1, 0–9, a = 10, b = 11, c = 12
    // nudge moves a hit off the grid in sixths of a step, so ±⅓ lands true triplets on a 16th grid
    const NUD = ['−½', '−⅓', '−⅙', 'on grid', '+⅙', '+⅓', '+½'];
    const JERSEY_KICK = { 0: 0, 4: 0, 8: 0, 11: -2, 13: 2 };  // two straight kicks, then a quarter-note-triplet trio
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const barsLabel = (n) => (n === 8 ? '½ bar' : `${n / 16} bar${n > 16 ? 's' : ''}`);

    // ------------------------------------------------------------------ voices
    // short code, colour, pad key, core = shown on the small card, g = mix gain,
    // pan / send = stereo position and reverb send, tone = what the Tone knob does
    const V = [
        { id: 'ac', name: 'Accent', short: 'ACC', c: '#fb7185', accent: true },
        { id: 'bd', name: 'Kick', short: 'BD', c: '#d946ef', key: 'a', core: true, g: 1, tone: 'Click' },
        { id: 'b8', name: '808 Bass', short: '808', c: '#a78bfa', core: true, bass: true, g: 0.9, tone: 'Drive' },
        { id: 'sd', name: 'Snare', short: 'SD', c: '#60a5fa', key: 's', core: true, g: 0.72, send: 0.16, tone: 'Snappy' },
        { id: 'cp', name: 'Clap', short: 'CP', c: '#38bdf8', key: 'd', core: true, g: 0.7, send: 0.3, tone: 'Bright' },
        { id: 'rs', name: 'Rim Shot', short: 'RS', c: '#22d3ee', key: 'k', g: 0.5, pan: 0.58, send: 0.18, tone: 'Crack' },
        { id: 'ch', name: 'Closed Hat', short: 'CH', c: '#facc15', key: 'f', core: true, g: 0.5, pan: 0.56, tone: 'Bright', tr: 5 },
        { id: 'oh', name: 'Open Hat', short: 'OH', c: '#fbbf24', key: 'g', core: true, g: 0.44, pan: 0.56, send: 0.08, tone: 'Bright', tr: 5 },
        { id: 'cy', name: 'Cymbal', short: 'CY', c: '#fb923c', key: 'h', g: 0.36, pan: 0.4, send: 0.12, tone: 'Color', tr: 5 },
        { id: 'cb', name: 'Cowbell', short: 'CB', c: '#f97316', key: 'j', g: 0.36, pan: 0.62, send: 0.14, tone: 'Ring' },
        { id: 'lt', name: 'Low Tom', short: 'LT', c: '#34d399', key: 'z', g: 0.66, pan: 0.36, send: 0.2, tone: 'Skin' },
        { id: 'mt', name: 'Mid Tom', short: 'MT', c: '#10b981', key: 'x', g: 0.62, pan: 0.5, send: 0.2, tone: 'Skin' },
        { id: 'ht', name: 'Hi Tom', short: 'HT', c: '#2dd4bf', key: 'c', g: 0.58, pan: 0.64, send: 0.2, tone: 'Skin' },
        { id: 'lc', name: 'Low Conga', short: 'LC', c: '#f472b6', key: 'v', g: 0.58, pan: 0.34, send: 0.14, tone: 'Slap' },
        { id: 'mc', name: 'Mid Conga', short: 'MC', c: '#ec4899', key: 'b', g: 0.55, pan: 0.48, send: 0.14, tone: 'Slap' },
        { id: 'hc', name: 'Hi Conga', short: 'HC', c: '#e879f9', key: 'n', g: 0.52, pan: 0.66, send: 0.14, tone: 'Slap' },
        { id: 'cl', name: 'Claves', short: 'CL', c: '#a3e635', key: 'l', g: 0.34, pan: 0.7, send: 0.2, tone: 'Wood' },
        { id: 'ma', name: 'Maracas', short: 'MA', c: '#84cc16', key: 'm', g: 0.36, pan: 0.3, send: 0.04, tone: 'Air' },
    ];
    const ACC = 0, BASS = V.findIndex((v) => v.bass), ID = {};
    V.forEach((v, i) => { ID[v.id] = i; });
    const PADS = new Map(V.filter((v) => v.key).map((v) => [v.key, ID[v.id]]));
    const BASSKEYS = 'qwertyuiop', BASS_SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];

    // ------------------------------------------------------------------ synthesis
    const tm = (p, semis = 7) => Math.pow(2, ((p - 0.5) * 2 * semis) / 12); // Tune knob → pitch ratio
    const dm = (p) => Math.pow(3, (p - 0.5) * 2);                            // Decay knob → ×⅓ … ×3
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const bassFreq = (S, n) => mtof(24 + S.key + n) * tm(S.r[BASS].tune);   // key root sits in octave 1
    const noteName = (S, n) => { const m = 24 + S.key + n; return NOTES[m % 12] + (Math.floor(m / 12) - 1); };

    function osc(c, type, f, t, end) { const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(end); return o; }
    function amp(c, t, peak, attack, decay, out) {
        const g = c.createGain(), e = t + attack + decay;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
        g.gain.exponentialRampToValueAtTime(0.0004, e);
        g.gain.linearRampToValueAtTime(0, e + 0.01);
        g.connect(out);
        return g;
    }
    function filt(c, type, f, q = 0.7) { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
    function loopSrc(E, buffer, t, end, rate = 1) {
        const s = E.c.createBufferSource(); s.buffer = buffer; s.loop = true; s.playbackRate.value = rate;
        s.start(t, Math.random() * (buffer.duration - 0.05)); s.stop(end);
        return s;
    }
    // mono voices (808 bass, open hat): a later hit fades the ringing one out
    function choke(v, t) {
        if (!v || t < v.t) return false;
        try { v.k.gain.setValueAtTime(v.kv, t); v.k.gain.linearRampToValueAtTime(0, t + 0.012); v.src.stop(t + 0.03); } catch { /* already stopped */ }
        return true;
    }

    const SYN = {
        bd(E, out, t, v, P) {
            const c = E.c, f = 48 * tm(P.tune), d = 0.85 * dm(P.decay), end = t + d + 0.05;
            const o = osc(c, 'sine', f * 5, t, end);
            o.frequency.exponentialRampToValueAtTime(f * 1.7, t + 0.014);
            o.frequency.exponentialRampToValueAtTime(f, t + 0.085);
            o.connect(amp(c, t, v, 0.0015, d, out));
            loopSrc(E, E.noise, t, t + 0.03).connect(filt(c, 'highpass', 1800 + P.tone * 3000, 0.6)).connect(amp(c, t, v * (0.06 + P.tone * 0.42), 0.0005, 0.012, out));
        },
        b8(E, out, t, v, P, x) {
            const c = E.c, f = x.f, d = 1.7 * dm(P.decay), end = t + d + 0.08, vv = Math.max(v, 0.001);
            const tracked = !E.bass || t >= E.bass.t;
            choke(E.bass, t);
            const o = osc(c, 'sine', x.from || f * 2.4, t, end);
            o.frequency.exponentialRampToValueAtTime(f, t + (x.from ? 0.085 : 0.045));
            const g = c.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(vv, t + 0.005);
            g.gain.setValueAtTime(vv, t + 0.005 + d * 0.22);
            g.gain.exponentialRampToValueAtTime(0.001, t + d);
            g.gain.linearRampToValueAtTime(0, t + d + 0.03);
            const sh = c.createWaveShaper(); sh.curve = E.curve(1.4 + P.tone * 7); sh.oversample = '2x';
            const k = c.createGain(); k.gain.value = 0.68;
            o.connect(g).connect(sh).connect(filt(c, 'lowpass', 700 + P.tone * 2800, 0.6)).connect(k).connect(out);
            if (tracked) E.bass = { k, kv: 0.68, src: o, f, t, end: t + d };
        },
        sd(E, out, t, v, P) {
            const c = E.c, k = tm(P.tune), d = dm(P.decay), body = 1.15 - P.tone * 0.6;
            [[180, 0.14, 0.62, 'sine'], [330, 0.08, 0.34, 'triangle']].forEach(([f, dd, a, type]) => {
                const o = osc(c, type, f * k * 1.25, t, t + dd * d + 0.05);
                o.frequency.exponentialRampToValueAtTime(f * k, t + 0.02);
                o.connect(amp(c, t, v * a * body, 0.001, dd * d, out));
            });
            loopSrc(E, E.noise, t, t + 0.3 * d + 0.05).connect(filt(c, 'highpass', 1300 + P.tone * 1500, 0.8)).connect(amp(c, t, v * (0.4 + P.tone * 0.5), 0.001, 0.2 * d, out));
        },
        cp(E, out, t, v, P) {
            const c = E.c, d = dm(P.decay), g = c.createGain(), vv = Math.max(v, 0.001) * 2.2;
            let u = t;
            for (let i = 0; i < 3; i++) { g.gain.setValueAtTime(vv, u); g.gain.exponentialRampToValueAtTime(vv * 0.12, u + 0.0095); u += 0.0105; }
            g.gain.setValueAtTime(vv * 0.95, u);
            g.gain.exponentialRampToValueAtTime(0.0004, u + 0.24 * d);
            g.gain.linearRampToValueAtTime(0, u + 0.24 * d + 0.01);
            loopSrc(E, E.noise, t, u + 0.24 * d + 0.03).connect(filt(c, 'highpass', 500)).connect(filt(c, 'bandpass', 1150 * tm(P.tune), 0.9 + P.tone * 2)).connect(g).connect(out);
        },
        rs(E, out, t, v, P) {
            const c = E.c, k = tm(P.tune), d = dm(P.decay), end = t + 0.06 * d + 0.03, mix = c.createGain();
            mix.gain.value = 0.7;
            osc(c, 'triangle', 455 * k, t, end).connect(mix);
            osc(c, 'sine', 1667 * k, t, end).connect(mix);
            const sh = c.createWaveShaper(); sh.curve = E.curve(3 + P.tone * 4);
            mix.connect(sh).connect(filt(c, 'highpass', 260)).connect(amp(c, t, v * 0.6, 0.0004, 0.03 * d, out));
        },
        cl(E, out, t, v, P) {
            const c = E.c, k = tm(P.tune), d = dm(P.decay);
            osc(c, 'sine', 2500 * k, t, t + 0.06 * d + 0.03).connect(amp(c, t, v * 1.1, 0.0004, 0.045 * d, out));
            osc(c, 'sine', 5175 * k, t, t + 0.03).connect(amp(c, t, v * 0.12 * (0.3 + P.tone), 0.0004, 0.012, out));
        },
        ch(E, out, t, v, P) {
            const c = E.c, d = dm(P.decay);
            if (choke(E.oh, t)) E.oh = null; // a closed hat chokes the open one, like the hardware
            loopSrc(E, E.metal, t, t + 0.12 * d + 0.03, tm(P.tune, 5)).connect(filt(c, 'bandpass', 10000, 0.8)).connect(filt(c, 'highpass', 6200 + P.tone * 2600)).connect(amp(c, t, v * 4, 0.0005, 0.055 * d, out));
        },
        oh(E, out, t, v, P) {
            const c = E.c, d = dm(P.decay), dd = 0.45 * d, k = c.createGain();
            const tracked = !E.oh || t >= E.oh.t;
            choke(E.oh, t);
            const s = loopSrc(E, E.metal, t, t + dd + 0.05, tm(P.tune, 5));
            s.connect(filt(c, 'bandpass', 10000, 0.8)).connect(filt(c, 'highpass', 6000 + P.tone * 2600)).connect(amp(c, t, v * 3, 0.0008, dd, k));
            k.connect(out);
            if (tracked) E.oh = { k, kv: 1, src: s, t };
        },
        cy(E, out, t, v, P) {
            const c = E.c, d = dm(P.decay), s = loopSrc(E, E.metal, t, t + 1.3 * d + 0.05, tm(P.tune, 5));
            s.connect(filt(c, 'bandpass', 3800 + P.tone * 1500, 1.2)).connect(amp(c, t, v * 0.7, 0.001, 0.3 * d, out));
            s.connect(filt(c, 'highpass', 7200)).connect(amp(c, t, v * 1.6, 0.002, 1.2 * d, out));
        },
        cb(E, out, t, v, P) {
            const c = E.c, k = tm(P.tune), d = dm(P.decay), end = t + 0.45 * d + 0.05, g = c.createGain(), vv = Math.max(v, 0.001);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(vv * 0.55, t + 0.002);
            g.gain.exponentialRampToValueAtTime(vv * 0.18, t + 0.035);
            g.gain.exponentialRampToValueAtTime(0.0004, t + 0.42 * d);
            g.gain.linearRampToValueAtTime(0, t + 0.42 * d + 0.01);
            osc(c, 'square', 540 * k, t, end).connect(g);
            osc(c, 'square', 800 * k, t, end).connect(g);
            g.connect(filt(c, 'bandpass', 1050 * k, 0.55 + P.tone)).connect(filt(c, 'lowpass', 5200, 0.5)).connect(out);
        },
        ma(E, out, t, v, P) {
            const c = E.c, dd = 0.055 * dm(P.decay), g = c.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(Math.max(v, 0.001) * 0.55, t + 0.007);
            g.gain.exponentialRampToValueAtTime(0.0004, t + dd);
            g.gain.linearRampToValueAtTime(0, t + dd + 0.01);
            loopSrc(E, E.noise, t, t + dd + 0.03).connect(filt(c, 'highpass', 5200 * tm(P.tune), 0.8)).connect(g).connect(out);
        },
    };
    // toms + congas: a sine with a pitch drop and a little skin noise
    const DRUMS = { lt: [87, 0.42, 1.3, 1], mt: [130, 0.34, 1.3, 1], ht: [196, 0.27, 1.3, 1], lc: [172, 0.22, 1.07, 0], mc: [262, 0.18, 1.07, 0], hc: [370, 0.15, 1.07, 0] };
    Object.entries(DRUMS).forEach(([id, [f0, dd, bend, skin]]) => {
        SYN[id] = (E, out, t, v, P) => {
            const c = E.c, f = f0 * tm(P.tune), d = dd * dm(P.decay);
            const o = osc(c, 'sine', f * bend, t, t + d + 0.05);
            o.frequency.exponentialRampToValueAtTime(f, t + (skin ? 0.09 : 0.025));
            o.connect(amp(c, t, v, 0.001, d, out));
            loopSrc(E, E.noise, t, t + 0.06).connect(skin ? filt(c, 'lowpass', 2400) : filt(c, 'bandpass', f * 6, 1.5)).connect(amp(c, t, v * (skin ? 0.1 : 0.06) * (0.4 + P.tone * 1.2), 0.0005, 0.035, out));
        };
    });

    function noiseBuf(c) {
        const n = Math.round(c.sampleRate * 2), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        return b;
    }
    // six square oscillators at the 808's cymbal frequencies — the metallic source of hats + cymbal
    function metalBuf(c) {
        const F = [205.3, 304.4, 369.6, 522.7, 540, 800], sr = c.sampleRate, n = Math.round(sr * 2);
        const b = c.createBuffer(1, n, sr), d = b.getChannelData(0), ph = F.map(() => Math.random());
        for (let i = 0; i < n; i++) {
            let s = 0;
            for (let k = 0; k < 6; k++) { ph[k] += F[k] / sr; if (ph[k] >= 1) ph[k] -= 1; s += ph[k] < 0.5 ? 1 : -1; }
            d[i] = s / 6;
        }
        return b;
    }
    function impulse(c) {
        const sr = c.sampleRate, n = Math.round(sr * 1.8), b = c.createBuffer(2, n, sr);
        for (let ch = 0; ch < 2; ch++) {
            const d = b.getChannelData(ch); let lp = 0;
            for (let i = 0; i < n; i++) { lp += ((Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2) - lp) * 0.35; d[i] = lp; }
        }
        return b;
    }

    // kick + 808 → BOOM bus (low shelf + drive); everything → glue compressor → volume → limiter
    function createEngine(c, dest) {
        const E = { c, rows: [], bass: null, oh: null, curves: {} };
        E.noise = noiseBuf(c); E.metal = metalBuf(c);
        E.curve = (k) => {
            const key = Math.round(k * 20);
            if (!E.curves[key]) {
                const n = 1024, cu = new Float32Array(n), th = Math.tanh(k);
                for (let i = 0; i < n; i++) cu[i] = Math.tanh(k * ((i / (n - 1)) * 2 - 1)) / th;
                E.curves[key] = cu;
            }
            return E.curves[key];
        };
        E.low = c.createGain(); E.clean = c.createGain();
        E.shelf = filt(c, 'lowshelf', 95);
        E.drive = c.createWaveShaper(); E.drive.oversample = '2x'; E.dpost = c.createGain();
        E.comp = c.createDynamicsCompressor();
        E.comp.threshold.value = -16; E.comp.knee.value = 8; E.comp.ratio.value = 3.5; E.comp.attack.value = 0.006; E.comp.release.value = 0.16;
        E.vol = c.createGain();
        E.lim = c.createDynamicsCompressor();
        E.lim.threshold.value = -3; E.lim.knee.value = 0; E.lim.ratio.value = 20; E.lim.attack.value = 0.001; E.lim.release.value = 0.09;
        E.an = c.createAnalyser(); E.an.fftSize = 1024; E.an.smoothingTimeConstant = 0.78;
        E.low.connect(E.shelf).connect(E.drive).connect(E.dpost).connect(E.comp);
        E.clean.connect(E.comp);
        E.comp.connect(E.vol).connect(E.lim).connect(E.an).connect(dest);
        E.send = c.createGain(); E.verb = c.createConvolver(); E.verb.buffer = impulse(c); E.ret = c.createGain();
        E.send.connect(E.verb).connect(E.ret).connect(E.comp);
        V.forEach((v) => {
            if (v.accent) { E.rows.push(null); return; }
            const g = c.createGain(), bus = v.id === 'bd' || v.bass ? E.low : E.clean;
            const p = c.createStereoPanner ? c.createStereoPanner() : null;
            if (p) g.connect(p).connect(bus); else g.connect(bus);
            if (v.send) { const s = c.createGain(); s.gain.value = v.send; g.connect(s).connect(E.send); }
            E.rows.push({ g, p });
        });
        return E;
    }
    function mix(E, S, now) {
        const t = E.c.currentTime, set = (param, v) => (now ? param.setValueAtTime(v, t) : param.setTargetAtTime(v, t, 0.015));
        const solo = S.r.some((r, i) => i !== ACC && r.solo);
        V.forEach((v, i) => {
            const R = E.rows[i]; if (!R) return;
            const r = S.r[i];
            set(R.g.gain, !r.mute && (!solo || r.solo) ? (v.g || 0.5) * Math.pow(r.level / 0.75, 2) : 0);
            if (R.p) set(R.p.pan, (r.pan - 0.5) * 1.6);
        });
        const k = 1 + S.boom * 6;
        E.drive.curve = E.curve(k);
        set(E.dpost.gain, 1 / Math.pow(k / Math.tanh(k), 0.6));
        set(E.shelf.gain, S.boom * 7);
        set(E.vol.gain, S.vol * 1.1);
        set(E.ret.gain, S.space * 0.85);
    }
    function voice(E, S, i, t, v, x) { const R = E.rows[i]; if (R) SYN[V[i].id](E, R.g, t, v, S.r[i], x || {}); }
    // everything one step plays — shared by the live scheduler and the offline WAV render
    function playStep(E, S, s, t, dur, skip, limit) {
        const accent = S.r[ACC].on[s] ? 1 + S.r[ACC].level * 0.7 : 1;
        const solo = S.r.some((r, i) => i !== ACC && r.solo);
        for (let i = 1; i < V.length; i++) {
            const r = S.r[i];
            if (!r.on[s] || r.mute || (solo && !r.solo)) continue;
            if (skip && skip.delete(i * 1000 + s)) continue;
            if (r.prob[s] < 4 && Math.random() * 4 >= r.prob[s]) continue;
            const v = VEL[r.vel[s]] * accent, n = r.roll[s] || 1, t0 = t + ((r.nud[s] || 0) * dur) / 6;
            for (let k = 0; k < n; k++) {
                const tt = Math.max(E.c.currentTime, t0 + (k * dur) / n), vv = k ? v * 0.82 : v; // a hit nudged into the past plays now
                if (limit != null && tt >= limit) continue;
                if (i === BASS) {
                    const f = bassFreq(S, r.note[s]), B = E.bass;
                    const from = S.glide && B && tt >= B.t && tt < B.end - 0.03 && Math.abs(B.f - f) > 0.5 ? B.f : 0;
                    voice(E, S, i, tt, vv, { f, from });
                } else voice(E, S, i, tt, vv);
            }
        }
    }

    // ------------------------------------------------------------------ state
    function blankRow(i) {
        const v = V[i];
        return { on: new Uint8Array(MAXS), vel: new Uint8Array(MAXS).fill(2), roll: new Uint8Array(MAXS).fill(1), prob: new Uint8Array(MAXS).fill(4), note: new Int8Array(MAXS), nud: new Int8Array(MAXS), mute: false, solo: false, level: v.accent ? 0.5 : 0.75, tune: 0.5, decay: 0.5, tone: 0.5, pan: v.pan ?? 0.5 };
    }
    function blankState() { return { bpm: 120, swing: 0, len: 16, key: 5, glide: true, preset: 'trap', vol: 0.8, boom: 0.4, space: 0.22, r: V.map((_, i) => blankRow(i)) }; }
    function clearStep(r, s) { r.on[s] = 0; r.vel[s] = 2; r.roll[s] = 1; r.prob[s] = 4; r.nud[s] = 0; }
    function copyStep(S, a, b) { S.r.forEach((r) => { r.on[b] = r.on[a]; r.vel[b] = r.vel[a]; r.roll[b] = r.roll[a]; r.prob[b] = r.prob[a]; r.note[b] = r.note[a]; r.nud[b] = r.nud[a]; }); }

    // Presets — original grooves in each style. '.' off · x hit · X hard · o soft · 2/3/4 roll · ? 50 % chance.
    // 808 rows hold notes relative to the key (see NCH).
    const PRESETS = [
        { id: 'trap', name: 'Trap 808', bpm: 140, len: 32, key: 5, glide: 1, boom: 0.5, desc: 'half-time trap with rolling hats and gliding 808s',
            rows: { ac: 'x.......x.......x.......x.......', bd: 'x......x..x.....x.....x...x..x..', b8: '0......0..3.....0.....7...5..3..', sd: '........x...............x.......', cp: '........x...............x.......', ch: 'x.x.x.x.x.x.x.3.x.x.x.x.x.xxx.4.', oh: '...............x.......x........', rs: '.............o...............o..' },
            params: { b8: { decay: 0.62, tone: 0.55 }, bd: { decay: 0.42, tone: 0.55 }, ch: { decay: 0.4 } } },
        { id: 'drill', name: 'UK Drill', bpm: 142, len: 32, key: 1, glide: 1, boom: 0.55, desc: 'sliding 808s and triplet-feel hats',
            rows: { ac: '........x...............x.......', bd: 'x.....x....x......x..x....x.....', b8: '0.....0....7......c..a....7.....', sd: '........X...............X.....x.', ch: 'x..x..x.x..x..x.x..x..x.x..3..x.', rs: '.............o...............o..' },
            params: { b8: { decay: 0.7, tone: 0.6 }, sd: { tone: 0.62, decay: 0.42 }, ch: { decay: 0.35 } } },
        { id: 'jersey', name: 'Jersey Club', bpm: 140, len: 32, key: 7, boom: 0.45, desc: 'the Jersey bounce: two kicks then a true triplet trio, claps on 2 & 4, conga chirps',
            rows: { ac: 'x.......x.......', bd: 'X...x...x..x.x..X...x...x..x.x.o', b8: '0.......0..3.5..0.......B..0.3..', cp: '....x.......x.......x.......x.2.', ch: '..o...o...o...o...o...o...o.....', oh: '..............................x.', hc: '.......x.......x.......x.x......', rs: '...o............' },
            nud: { bd: { 11: -2, 13: 2, 27: -2, 29: 2 }, b8: { 11: -2, 13: 2, 27: -2, 29: 2 } },
            params: { bd: { decay: 0.45, tone: 0.72 }, b8: { decay: 0.32, tone: 0.5 }, cp: { tone: 0.6, decay: 0.42 }, hc: { tune: 0.9, decay: 0.28, tone: 0.9 }, ch: { decay: 0.35 } } },
        { id: 'boombap', name: 'Boom Bap', bpm: 90, swing: 0.48, len: 16, key: 2, boom: 0.3, desc: 'swung 90s hip-hop with ghost notes',
            rows: { ac: '....x.......x...', bd: 'X......x.xx..o..', sd: '....X.......X...', ch: 'x.o.x.o.x.o.x..o', oh: '..............x.', rs: '..o.......o....o' },
            params: { sd: { tone: 0.35, decay: 0.55 }, bd: { decay: 0.36, tone: 0.6 } } },
        { id: 'electro', name: 'Electro Funk', bpm: 126, len: 16, key: 9, boom: 0.35, desc: 'syncopated kicks, cowbell and congas',
            rows: { ac: '..x...x...x...x.', bd: 'x.....x...x..x..', b8: '0.....0...5..7..', cp: '....x.......x...', ch: 'xoxoxoxoxoxoxoxo', cb: '......x.......x.', hc: '...x.....x..x...', lc: '.......x.......x' },
            params: { b8: { decay: 0.3, tone: 0.45 }, cp: { decay: 0.45 } } },
        { id: 'miami', name: 'Miami Bass', bpm: 132, len: 16, key: 4, boom: 0.6, desc: 'booming long 808s under a clap',
            rows: { ac: 'x...x...x...x...', bd: 'x.....x.x.....x.', b8: '0.....0.0.....7.', cp: '....x.......x...', ch: 'xoxoxoxoxoxoxoxo', cb: '...x.......x....' },
            params: { b8: { decay: 0.58 }, bd: { decay: 0.5 } } },
        { id: 'house', name: 'House 808', bpm: 124, len: 16, key: 7, boom: 0.3, desc: 'four on the floor, open hats on the off-beat',
            rows: { ac: '....x.......x...', bd: 'x...x...x...x...', b8: '..0...0...7...5.', cp: '....x.......x...', oh: '..x...x...x...x.', ch: 'oo.ooo.ooo.ooo.o', rs: '...x.......x....', ma: 'o.o.o.o.o.o.o.o.' },
            params: { b8: { decay: 0.24, tone: 0.4 }, oh: { decay: 0.4 } } },
        { id: 'dembow', name: 'Dembow', bpm: 96, len: 16, key: 9, boom: 0.4, desc: 'the reggaeton boom-ch-boom-chick',
            rows: { ac: '...x..x....x..x.', bd: 'x...x...x...x...', b8: '0.......5.......', sd: '...x..x....x..x.', ch: 'x.x.x.x.x.x.x.x.', hc: '..x.......x.....', rs: '.o.......o......' },
            params: { b8: { decay: 0.5 }, sd: { tone: 0.6, decay: 0.4 } } },
        { id: 'afro', name: 'Afrobeats', bpm: 106, len: 16, key: 2, boom: 0.35, desc: 'shaker groove, clave and talking congas',
            rows: { ac: '........x.......', bd: 'x......x..x.....', b8: '0......0..3.....', cp: '........x.......', cl: 'x..x..x...x.x...', ma: 'oxoxoxoxoxoxoxox', hc: '..x.....x.x.....', lc: '.....x.......x..', mc: '...........x....' },
            params: { b8: { decay: 0.4 }, ma: { decay: 0.55 } } },
        { id: 'lofi', name: 'Lo-Fi', bpm: 80, swing: 0.55, len: 16, key: 3, boom: 0.25, space: 0.4, desc: 'lazy swing, soft hats and a dusty rim',
            rows: { ac: '....x.......x...', bd: 'X.....x..x......', b8: '0.....5..3......', sd: '....x.......x...', rs: '....o.......o..o', ch: 'x.o.x.?.x.o.x.?.' },
            params: { sd: { tone: 0.3, decay: 0.4, level: 0.62 }, ch: { decay: 0.35, tone: 0.3, level: 0.6 }, b8: { decay: 0.5, tone: 0.2 }, bd: { tone: 0.3 } } },
    ];
    function applyPreset(S, id) {
        const p = PRESETS.find((x) => x.id === id) || PRESETS[0];
        S.r = V.map((_, i) => blankRow(i));
        Object.assign(S, { preset: p.id, bpm: p.bpm, swing: p.swing || 0, len: p.len, key: p.key, glide: !!p.glide, boom: p.boom ?? 0.4, space: p.space ?? 0.22 });
        Object.entries(p.rows).forEach(([rid, str]) => {
            const i = ID[rid], r = S.r[i];
            for (let s = 0; s < S.len; s++) {
                const ch = str[s % str.length];
                if (ch === '.') continue;
                r.on[s] = 1;
                if (i === BASS) { const k = NCH.indexOf(ch); r.note[s] = k >= 0 ? k - 12 : 0; }
                else if (ch === 'o') r.vel[s] = 1;
                else if (ch === 'X') r.vel[s] = 3;
                else if (ch === '?') r.prob[s] = 2;
                else if (ch >= '2' && ch <= '4') r.roll[s] = +ch;
            }
        });
        Object.entries(p.nud || {}).forEach(([rid, m]) => Object.entries(m).forEach(([st, n]) => { S.r[ID[rid]].nud[+st] = n; }));
        Object.entries(p.params || {}).forEach(([rid, o]) => Object.assign(S.r[ID[rid]], o));
    }

    // ------------------------------------------------------------------ groove generator
    const STY = {
        trap: { len: 32, half: 1, back: [8], snare: ['sd', 'cp'], kick: [3, 6, 7, 10, 11, 14], kp: 0.3, hat: 2, roll: 0.3, oh: 0.25, bass: 0.95, notes: [0, 0, 3, 5, 7, -2, 12], perc: ['rs'], pp: 0.05, fill: 'hats' },
        drill: { len: 32, half: 1, back: [8], snare: ['sd'], drill: 1, kick: [3, 6, 9, 11, 14], kp: 0.32, hat: 'trip', roll: 0.28, oh: 0, bass: 0.95, notes: [0, 12, 7, 5, 3, -2, 10], perc: ['rs'], pp: 0.04, fill: 'hats' },
        jersey: { len: 32, jersey: 1, back: [4, 12], snare: ['cp'], kick: [2, 6, 15], kp: 0.16, hat: 'off', roll: 0.12, oh: 0.3, bass: 0.7, notes: [0, 0, 3, 5, 7, -2], perc: ['hc', 'rs'], pp: 0.2, fill: 'kicks' },
        boombap: { len: 16, back: [4, 12], snare: ['sd'], kick: [3, 7, 9, 10, 13], kp: 0.4, hat: 2, roll: 0, oh: 0.2, ghost: 0.35, bass: 0, perc: ['rs'], pp: 0.1, fill: 'snare' },
        electro: { len: 16, back: [4, 12], snare: ['cp'], kick: [3, 6, 10, 13, 14], kp: 0.42, hat: 1, roll: 0.04, oh: 0.1, bass: 0.65, notes: [0, 0, 7, 5, 3, 10, 12], perc: ['cb', 'hc', 'lc', 'mc', 'cl'], pp: 0.14, fill: 'toms' },
        miami: { len: 16, back: [4, 12], snare: ['cp'], kick: [3, 6, 8, 10, 14], kp: 0.42, hat: 1, roll: 0.06, oh: 0.1, bass: 1, notes: [0, 0, 0, 7, 5, 3], perc: ['cb', 'rs'], pp: 0.07, fill: 'toms' },
        house: { len: 16, four: 1, back: [4, 12], snare: ['cp'], hat: 1, ohOff: 1, roll: 0, oh: 0, bass: 0, offBass: 0.75, notes: [0, 0, 7, 12, 5, 3], perc: ['rs', 'cb', 'ma', 'cl'], pp: 0.1, fill: 'congas' },
        dembow: { len: 16, four: 1, dembow: 1, back: [], snare: ['sd'], hat: 2, roll: 0.05, oh: 0.12, bass: 0.55, notes: [0, 0, 5, 7, 3], perc: ['rs', 'hc', 'cl'], pp: 0.08, fill: 'congas' },
        afro: { len: 16, back: [8], snare: ['cp'], kick: [3, 6, 7, 10], kp: 0.4, hat: 'shaker', clave: 1, roll: 0, oh: 0.1, bass: 0.6, notes: [0, 0, 3, 5, 7, 10], perc: ['lc', 'mc', 'hc', 'cb', 'rs'], pp: 0.16, fill: 'congas' },
        lofi: { len: 16, back: [4, 12], snare: ['sd', 'rs'], kick: [6, 7, 9, 10, 13], kp: 0.32, hat: 2, roll: 0, oh: 0.15, ghost: 0.2, bass: 0.4, notes: [0, 0, 3, 5, 7, 10], perc: [], pp: 0, fill: 'snare', soft: 1 },
    };
    const rnd = Math.random, pick = (a) => a[(rnd() * a.length) | 0];
    function hit(S, id, s, vel = 2) { const r = S.r[ID[id]]; r.on[s] = 1; r.vel[s] = vel; return r; }
    function phrase(S, st, o, n) {
        const kicks = [];
        for (let s = o; s < o + n; s++) {
            const p = s % 16, bar = ((s - o) / 16) | 0;
            const back = st.dembow ? [3, 6, 11, 14].includes(p) : st.back.includes(p);
            let k = st.four ? p % 4 === 0 : st.jersey ? JERSEY_KICK[p] !== undefined : p === 0 && (bar === 0 || !st.half || rnd() < 0.7);
            if (!k && !st.four && !back && st.kick.includes(p) && rnd() < st.kp) k = true;
            if (k) { hit(S, 'bd', s, p === 0 ? 3 : 2).nud[s] = st.jersey ? JERSEY_KICK[p] || 0 : 0; kicks.push(s); }
            if (back) { st.snare.forEach((id, j) => hit(S, id, s, j && st.soft ? 1 : 2)); if (rnd() < 0.75) hit(S, 'ac', s); }
            if (st.drill && bar === 1 && p === 14 && rnd() < 0.75) hit(S, 'sd', s);
            if (st.ghost && !back && [7, 9, 15].includes(p) && rnd() < st.ghost) hit(S, st.snare[0], s, 1);
            const hh = st.hat === 1 || (st.hat === 2 && p % 2 === 0) || (st.hat === 'trip' && [0, 3, 6, 8, 11, 14].includes(p)) || (st.hat === 'off' && p % 4 === 2);
            if (hh) {
                const r = hit(S, 'ch', s, st.hat === 1 ? (p % 2 ? 1 : 2) : st.hat === 'off' || (st.soft && rnd() < 0.5) ? 1 : 2);
                if (st.soft && rnd() < 0.2) r.prob[s] = 3;
                if (st.roll && rnd() < st.roll * (p >= 12 ? 1.5 : 0.5)) r.roll[s] = pick([2, 2, 3, 3, 4]);
            }
            if (st.hat === 'shaker') hit(S, 'ma', s, p % 2 ? 2 : 1);
            if (st.ohOff && p % 4 === 2) { hit(S, 'oh', s); S.r[ID.ch].on[s] = 0; }
            if (st.clave && [0, 3, 6, 10, 12].includes(p)) hit(S, 'cl', s);
            if (st.jersey && (p === 7 || p === 15) && rnd() < 0.7) hit(S, 'hc', s);      // the off-beat chirps
            if (p % 2) st.perc.forEach((id) => { if (rnd() < st.pp) hit(S, id, s, rnd() < 0.5 ? 1 : 2); });
            if (st.offBass && p % 4 === 2 && rnd() < st.offBass) hit(S, 'b8', s).note[s] = pick(st.notes);
        }
        const ohAt = [6, 14, 22, 30].filter((x) => x < n);
        if (st.oh && ohAt.length && rnd() < st.oh * 2.5) { const s = o + pick(ohAt); hit(S, 'oh', s); S.r[ID.ch].on[s] = 0; }
        if (st.bass) kicks.forEach((s, j) => { if (j === 0 || rnd() < st.bass) { const r = hit(S, 'b8', s); r.note[s] = j === 0 ? 0 : pick(st.notes); r.nud[s] = S.r[ID.bd].nud[s]; } });
        for (let s = o; s < o + n; s += 16) if (rnd() < 0.5) hit(S, 'ac', s);
    }
    function fill(S, st, o, n) {
        const f = o + n - 4;
        if (st.fill === 'toms') [['ht', 0], ['mt', 1], ['mt', 2], ['lt', 3]].forEach(([id, k]) => hit(S, id, f + k, k === 1 ? 1 : 2));
        else if (st.fill === 'congas') [['hc', 0], ['hc', 1], ['mc', 2], ['lc', 3]].forEach(([id, k]) => hit(S, id, f + k, k === 1 ? 1 : 2));
        else if (st.fill === 'snare') { hit(S, st.snare[0], f + 2, 1); hit(S, st.snare[0], f + 3); }
        else if (st.fill === 'kicks') { [1, 1, 2, 3].forEach((v, k) => { hit(S, 'bd', f + k, v).nud[f + k] = 0; }); hit(S, st.snare[0], f + 3).roll[f + 3] = 2; }
        else { const r = S.r[ID.ch]; for (let s = f; s < f + 4; s++) { r.on[s] = 1; r.vel[s] = 2; r.roll[s] = 1; } r.roll[f + 2] = pick([3, 4]); r.roll[f + 3] = 2; }
        if (st.bass) {
            const r = S.r[BASS];
            for (let s = o + n - 1; s >= o; s--) if (r.on[s]) { const alt = st.notes.filter((x) => x !== r.note[s]); if (alt.length) r.note[s] = pick(alt); break; }
        }
    }
    function generate(S) {
        const st = STY[S.preset] || STY.trap, L = S.len, base = Math.min(L, st.len);
        S.r.forEach((r) => { r.on.fill(0); r.vel.fill(2); r.roll.fill(1); r.prob.fill(4); r.note.fill(0); r.nud.fill(0); });
        phrase(S, st, 0, base);
        for (let o = base; o < L; o += base) { for (let s = 0; s < base; s++) copyStep(S, s, o + s); if (o + base >= L) fill(S, st, o, base); }
        if (L === base && L >= 16 && rnd() < 0.35) fill(S, st, 0, base);
        if (L >= 32 && rnd() < 0.5) hit(S, 'cy', 0);
    }

    // ------------------------------------------------------------------ save / share
    function pack(S, n) {
        const rows = [];
        S.r.forEach((r, i) => {
            let steps = '', any = false;
            for (let s = 0; s < n; s++) {
                const code = r.on[s] ? 1 + (r.vel[s] - 1) + 3 * (r.roll[s] - 1) + 12 * (4 - r.prob[s]) : 0;
                if (code) any = true;
                steps += A64[code];
            }
            const d = blankRow(i), prm = ['level', 'tune', 'decay', 'tone', 'pan'].map((k) => Math.round(r[k] * 100));
            const same = ['level', 'tune', 'decay', 'tone', 'pan'].every((k, j) => prm[j] === Math.round(d[k] * 100));
            if (!any && same && !r.mute && !r.solo) return;
            const notes = i === BASS && any ? Array.from(r.note.subarray(0, n), (x) => A64[x + 24]).join('').replace(/Y+$/, '') : '';
            const nud = any ? Array.from(r.nud.subarray(0, n), (x, k) => A64[(r.on[k] ? x : 0) + 3]).join('').replace(/D+$/, '') : '';
            rows.push([V[i].id, any ? steps.replace(/A+$/, '') : '', notes, prm, (r.mute ? 1 : 0) | (r.solo ? 2 : 0), nud]);
        });
        return { v: 1, p: S.preset, b: S.bpm, w: Math.round(S.swing * 100), l: S.len, k: S.key, g: S.glide ? 1 : 0, m: [S.vol, S.boom, S.space].map((x) => Math.round(x * 100)), r: rows };
    }
    function unpack(S, o) {
        if (!o || o.v !== 1 || !Array.isArray(o.r)) return false;
        const num = (x, a, b, d) => (typeof x === 'number' && Number.isFinite(x) ? clamp(x, a, b) : d);
        S.r = V.map((_, i) => blankRow(i));
        S.preset = PRESETS.some((p) => p.id === o.p) ? o.p : 'trap';
        S.bpm = Math.round(num(o.b, 40, 240, 120));
        S.swing = num(o.w, 0, 100, 0) / 100;
        S.len = LENS.includes(o.l) ? o.l : 16;
        S.key = Math.round(num(o.k, 0, 11, 5));
        S.glide = !!o.g;
        if (Array.isArray(o.m)) { S.vol = num(o.m[0], 0, 100, 80) / 100; S.boom = num(o.m[1], 0, 100, 40) / 100; S.space = num(o.m[2], 0, 100, 22) / 100; }
        o.r.slice(0, 40).forEach((row) => {
            if (!Array.isArray(row) || !Object.prototype.hasOwnProperty.call(ID, row[0])) return;
            const i = ID[row[0]], r = S.r[i], st = typeof row[1] === 'string' ? row[1].slice(0, MAXS) : '';
            for (let s = 0; s < st.length; s++) {
                const code = A64.indexOf(st[s]);
                if (code < 1 || code > 48) continue;
                const k = code - 1;
                r.on[s] = 1; r.vel[s] = (k % 3) + 1; r.roll[s] = (Math.floor(k / 3) % 4) + 1; r.prob[s] = 4 - Math.floor(k / 12);
            }
            if (i === BASS && typeof row[2] === 'string') {
                for (let s = 0; s < Math.min(MAXS, row[2].length); s++) { const x = A64.indexOf(row[2][s]); if (x >= 0) r.note[s] = clamp(x - 24, -12, 24); }
            }
            if (Array.isArray(row[3])) ['level', 'tune', 'decay', 'tone', 'pan'].forEach((k, j) => { r[k] = num(row[3][j], 0, 100, r[k] * 100) / 100; });
            const f = num(row[4], 0, 3, 0);
            r.mute = !!(f & 1); r.solo = !!(f & 2);
            if (typeof row[5] === 'string') for (let s = 0; s < Math.min(MAXS, row[5].length); s++) { const x = A64.indexOf(row[5][s]); if (x >= 0) r.nud[s] = clamp(x - 3, -3, 3); }
        });
        return true;
    }
    const b64u = (u8) => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
    const unb64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
    async function encode(obj) {
        const raw = new TextEncoder().encode(JSON.stringify(obj));
        if (window.CompressionStream) {
            try { const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); return 'z' + b64u(z); } catch { /* fall back to plain */ }
        }
        return 'j' + b64u(raw);
    }
    async function decode(code) {
        if (typeof code !== 'string' || code.length > 16000) throw new Error('bad code');
        let raw = unb64u(code.slice(1));
        if (code[0] === 'z') raw = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
        else if (code[0] !== 'j') throw new Error('bad code');
        if (raw.length > 200000) throw new Error('too big');
        return JSON.parse(new TextDecoder().decode(raw));
    }

    // ------------------------------------------------------------------ WAV export
    // Renders the pattern in an OfflineAudioContext. A short pre-roll of the loop's end is played first,
    // so tails (808s, cymbals, reverb) wrap into the start and the file loops seamlessly.
    async function render(S) {
        const sr = 44100, dur = 60 / S.bpm / 4, loop = S.len * dur;
        let reps = clamp(Math.ceil(12 / loop), 1, 16);
        if (loop * reps > 120) reps = Math.max(1, Math.floor(120 / loop));
        const pre = Math.min(loop, 3), OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const oc = new OAC(2, Math.ceil((pre + loop * reps) * sr), sr), E = createEngine(oc, oc.destination);
        mix(E, S, true);
        const sw = (s) => (s % 2 ? S.swing * 0.5 * dur : 0), first = Math.ceil((loop - pre) / dur - 1e-9);
        for (let s = first; s < S.len; s++) playStep(E, S, s, s * dur - (loop - pre) + sw(s), dur);
        for (let k = 0; k < reps; k++) for (let s = 0; s < S.len; s++) playStep(E, S, s, pre + k * loop + s * dur + sw(s), dur);
        const end = pre + loop * reps;
        playStep(E, S, 0, end, dur, null, end); // the next loop's first step, if nudged early, wraps into the end
        const buffer = await oc.startRendering();
        return { buffer, from: Math.round(pre * sr), reps, seconds: loop * reps };
    }
    // Song: every pattern in the chain, back to back, plus a tail so the last hits ring out
    async function renderSong(list, S0) {
        const sr = 44100, dur = 60 / S0.bpm / 4, total = list.reduce((a, x) => a + x.len * dur, 0), tail = 2.5, start = 0.1;
        const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const oc = new OAC(2, Math.ceil((start + total + tail) * sr), sr), E = createEngine(oc, oc.destination);
        mix(E, S0, true);
        let off = start;
        for (const x of list) {
            for (let s = 0; s < x.len; s++) playStep(E, x, s, off + s * dur + (s % 2 ? S0.swing * 0.5 * dur : 0), dur);
            off += x.len * dur;
        }
        const buffer = await oc.startRendering();
        return { buffer, from: 0, seconds: start + total + tail };
    }
    function wavBlob(b, from) {
        const n = b.length - from, L = b.getChannelData(0), R = b.numberOfChannels > 1 ? b.getChannelData(1) : L;
        const buf = new ArrayBuffer(44 + n * 4), dv = new DataView(buf);
        const str = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
        str(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
        dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true); dv.setUint32(24, b.sampleRate, true);
        dv.setUint32(28, b.sampleRate * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, n * 4, true);
        for (let i = 0, o = 44; i < n; i++, o += 4) {
            const l = clamp(L[from + i], -1, 1), r = clamp(R[from + i], -1, 1);
            dv.setInt16(o, l < 0 ? l * 0x8000 : l * 0x7fff, true);
            dv.setInt16(o + 2, r < 0 ? r * 0x8000 : r * 0x7fff, true);
        }
        return new Blob([buf], { type: 'audio/wav' });
    }

    // ------------------------------------------------------------------ UI
    const CSS = `
    .bt-stage{background:radial-gradient(ellipse at 50% 28%,#1c1031 0%,#07060c 72%);outline:none}
    .bt-cv{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}
    .bt-mode-card .bt-cv,.bt-mode-focus .bt-cv{top:auto;height:55%}
    .bt{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;gap:8px;padding:12px;color:#e4e4e7;--lw:128px;--cols:16;--rh:16px}
    :where(.bt) button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
    :where(.bt) button:disabled{cursor:default;opacity:.35}
    .bt :focus-visible{outline:2px solid #f0abfc;outline-offset:2px}
    .bt-mode-card .lab-hint,.bt-mode-focus .lab-hint{display:none}
    .bt-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
    /* transport */
    .bt-top{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px}
    .bt-grp{display:flex;align-items:center;gap:6px}
    .bt-play{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#c63aeb,#7c3aed);box-shadow:0 0 22px rgba(198,58,235,.45);display:grid;place-items:center;font-size:14px;flex-shrink:0;transition:transform .15s}
    .bt-play:active{transform:scale(.92)}
    .bt-play .fa-stop,.bt-playing .bt-play .fa-play{display:none}
    .bt-playing .bt-play .fa-stop{display:inline-block}
    .bt-rec{height:30px;padding:0 10px;border-radius:999px;border:1px solid rgba(255,255,255,.14);font-size:10px;font-weight:800;letter-spacing:.14em;display:flex;align-items:center;gap:6px;color:#a1a1aa}
    .bt-rec i{width:8px;height:8px;border-radius:50%;background:#7f1d1d}
    .bt-rec[aria-pressed="true"]{color:#fecaca;border-color:rgba(248,113,113,.6);background:rgba(239,68,68,.14)}
    .bt-rec[aria-pressed="true"] i{background:#ef4444;box-shadow:0 0 10px #ef4444;animation:btRec 1s steps(2) infinite}
    @keyframes btRec{50%{opacity:.25}}
    .bt-lcd{display:flex;align-items:center;gap:10px;padding:5px 10px;border-radius:12px;background:#07070b;border:1px solid rgba(255,255,255,.09);box-shadow:inset 0 0 22px rgba(198,58,235,.12)}
    .bt-tempo{display:flex;align-items:baseline;gap:4px;cursor:ns-resize;touch-action:none;user-select:none;border-radius:6px}
    .bt-tempo b{font-size:24px;font-weight:800;color:#f0abfc;text-shadow:0 0 12px rgba(240,171,252,.55);min-width:3ch;text-align:right;line-height:1}
    .bt-tempo small{font-size:9px;font-weight:800;letter-spacing:.16em;color:#a1a1aa}
    .bt-tb{display:flex;gap:4px}
    .bt-tb button{min-width:26px;height:26px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);font-size:13px;font-weight:800;padding:0 6px}
    .bt-tb .bt-tap{font-size:9px;letter-spacing:.14em}
    .bt-tb button:active,.bt-tb .bt-tap.hit{background:#c63aeb;border-color:#c63aeb}
    .bt-info{display:flex;flex-direction:column;gap:3px;font-size:9px;letter-spacing:.12em;color:#a1a1aa;min-width:126px}
    .bt-info strong{color:#e9d5ff;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}
    .bt-leds{display:flex;gap:4px}
    .bt-leds i{width:6px;height:6px;border-radius:50%;background:#3f3f46;transition:background .08s}
    .bt-leds i.on{background:#f0abfc;box-shadow:0 0 8px #f0abfc}
    .bt-len{display:flex;align-items:center;gap:2px;padding:3px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
    .bt-len span{font-size:8px;font-weight:800;letter-spacing:.16em;color:#71717a;padding:0 5px 0 4px}
    .bt-len button{min-width:30px;height:24px;border-radius:7px;font-size:11px;font-weight:800;color:#a1a1aa;padding:0 6px}
    .bt-len button[aria-checked="true"]{background:#fff;color:#000}
    .bt-tools{display:flex;align-items:center;gap:6px;margin-left:auto;flex-wrap:wrap}
    .bt-btn{height:30px;padding:0 10px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);font-size:11px;font-weight:700;display:flex;align-items:center;gap:6px;white-space:nowrap;transition:background .2s,border-color .2s}
    .bt-btn:hover{background:rgba(255,255,255,.13);border-color:rgba(255,255,255,.22)}
    .bt-gen{background:linear-gradient(135deg,rgba(198,58,235,.38),rgba(124,58,237,.38));border-color:rgba(198,58,235,.55)}
    .bt-btn.busy{pointer-events:none;opacity:.7}
    .bt-sel{height:30px;border-radius:9px;background:#111018;color:#e4e4e7;border:1px solid rgba(255,255,255,.12);font-size:11px;font-weight:700;padding:0 8px;max-width:150px;cursor:pointer}
    /* bars */
    .bt-bars{display:flex;align-items:center;gap:6px;min-height:28px}
    .bt-lbl{font-size:8px;font-weight:800;letter-spacing:.16em;color:#71717a}
    .bt-pages{position:relative;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0}
    .bt-pages::-webkit-scrollbar{display:none}
    .bt-pg{position:relative;flex:0 0 auto;height:26px;border-radius:8px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:6px;padding:0 7px;overflow:hidden}
    .bt-pg b{font-size:10px;font-weight:800;color:#a1a1aa}
    .bt-pg[aria-selected="true"]{border-color:rgba(240,171,252,.7);background:rgba(198,58,235,.2)}
    .bt-pg[aria-selected="true"] b{color:#fff}
    .bt-pg.now::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:#f0abfc;box-shadow:0 0 8px #f0abfc}
    .bt-dots{display:grid;grid-template-columns:repeat(var(--cols),3px);gap:1px}
    .bt-dots i{width:3px;height:9px;border-radius:1px;background:rgba(255,255,255,.1)}
    .bt-dots i.on{background:#e9d5ff}
    .bt-chip{height:24px;padding:0 9px;border-radius:999px;border:1px solid rgba(255,255,255,.12);font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#a1a1aa;white-space:nowrap}
    .bt-chip[aria-pressed="true"]{color:#fff;border-color:rgba(240,171,252,.6);background:rgba(198,58,235,.22)}
    /* grid */
    .bt-gw{position:relative;flex:1;min-height:0}
    .bt-grid{height:100%;display:flex;flex-direction:column;gap:3px}
    .bt-row{flex:1 1 0;min-height:0;display:grid;grid-template-columns:var(--lw) repeat(var(--cols),minmax(0,1fr));gap:3px}
    .bt-row.acc{flex-grow:.8}
    .bt-lab{display:flex;align-items:center;gap:3px;min-width:0}
    .bt-name{flex:1;min-width:0;height:100%;display:flex;align-items:center;gap:6px;padding:0 6px;border-radius:6px;text-align:left;transition:background .15s}
    .bt-name:hover,.bt-row.sel .bt-name{background:rgba(255,255,255,.07)}
    .bt-row.sel .bt-led{opacity:1;box-shadow:0 0 8px var(--c)}
    .bt-name b{font-size:9px;font-weight:900;letter-spacing:.06em;color:var(--c);min-width:24px}
    .bt-name span{font-size:10.5px;font-weight:600;color:#d4d4d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
    .bt-name kbd{font:700 8px ui-monospace,monospace;color:#71717a;border:1px solid rgba(255,255,255,.12);border-radius:4px;padding:1px 3px;white-space:nowrap}
    .bt-led{width:6px;height:6px;border-radius:50%;background:var(--c);opacity:.25;flex-shrink:0}
    .bt-ms{width:18px;height:100%;max-height:22px;border-radius:5px;font-size:8px;font-weight:900;color:#71717a;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);flex-shrink:0}
    .bt-m[aria-pressed="true"]{background:#f59e0b;color:#000;border-color:#f59e0b}
    .bt-s[aria-pressed="true"]{background:#22d3ee;color:#000;border-color:#22d3ee}
    .bt-row.mute .bt-step,.bt-row.mute .bt-name{opacity:.38}
    .bt-step{position:relative;min-width:0;min-height:0;border-radius:5px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.07);transition:background-color .12s,box-shadow .12s,opacity .12s;touch-action:none;display:flex;align-items:center;justify-content:center;font:900 9px/1 ui-monospace,monospace;color:rgba(0,0,0,.72);overflow:hidden}
    .bt-step.b{background:rgba(255,255,255,.1)}
    .bt-step.g{margin-right:4px}
    .bt-step:hover{border-color:rgba(255,255,255,.35)}
    .bt-step.on{background:var(--c);border-color:rgba(255,255,255,.25);box-shadow:0 0 12px -3px var(--c),inset 0 1px 0 rgba(255,255,255,.45)}
    .bt-step.on.v1{opacity:.5}
    .bt-step.on.v3{box-shadow:0 0 16px -1px var(--c),inset 0 0 0 2px rgba(255,255,255,.85)}
    .bt-step.p::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 3px,rgba(0,0,0,.4) 3px 5px)}
    .bt-step[data-roll]::after{content:attr(data-roll);position:absolute;right:2px;top:2px;font:900 8px/1 ui-monospace,monospace;color:rgba(0,0,0,.75)}
    .bt-step.x{visibility:hidden}
    .bt-ph{position:absolute;left:0;top:-3px;bottom:-3px;width:20px;margin-left:-2px;border-radius:7px;background:linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,.05));box-shadow:0 0 0 1px rgba(255,255,255,.22),0 0 26px rgba(198,58,235,.5);pointer-events:none;opacity:0;transition:opacity .2s;will-change:transform;z-index:2}
    .bt-ph.vis{opacity:1}
    /* bottom panel */
    .bt-bottom{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .bt-voice,.bt-master{display:flex;align-items:center;gap:4px;padding:6px 8px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);flex-shrink:0}
    .bt-master{margin-left:auto}
    .bt-pad{position:relative;width:96px;height:50px;border-radius:12px;background:var(--c);box-shadow:0 0 18px -4px var(--c),inset 0 1px 0 rgba(255,255,255,.45);display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:0 10px;color:#0a0a0a;flex-shrink:0;margin-right:4px;transition:transform .08s}
    .bt-pad:active,.bt-pad.hit{transform:scale(.93)}
    .bt-pad b{font-size:13px;font-weight:900;line-height:1.1}
    .bt-pad span{font-size:9px;font-weight:700;opacity:.75;white-space:nowrap}
    .bt-pad kbd{position:absolute;right:8px;top:6px;font:800 8px ui-monospace,monospace;opacity:.6}
    .bt-vk{display:flex;gap:2px}
    .bt-bx{display:flex;flex-direction:column;gap:5px;margin-left:4px}
    .bt-bx label{font-size:8px;font-weight:800;letter-spacing:.14em;color:#71717a;display:flex;align-items:center;gap:5px}
    .bt-bx .bt-sel{height:24px;font-size:10px}
    .bt-help{flex-basis:100%;font-size:9.5px;color:#71717a;letter-spacing:.02em;margin:0;line-height:1.4}
    .bt-help kbd{font:700 8.5px ui-monospace,monospace;color:#a1a1aa;border:1px solid rgba(255,255,255,.14);border-radius:4px;padding:0 3px}
    .bt-knob{width:48px;display:flex;flex-direction:column;align-items:center;gap:1px;cursor:ns-resize;touch-action:none;user-select:none;border-radius:8px;--kc:#e879f9}
    .bt-knob svg{width:32px;height:32px;overflow:visible}
    .bt-knob .kt,.bt-knob .ka{fill:none;stroke-width:3.5;stroke-linecap:round;transform:rotate(135deg);transform-origin:20px 20px}
    .bt-knob .kt{stroke:rgba(255,255,255,.1);stroke-dasharray:70.69 200}
    .bt-knob .ka{stroke:var(--kc);filter:drop-shadow(0 0 3px var(--kc))}
    .bt-knob .kp{stroke:#fff;stroke-width:2.5;stroke-linecap:round;transform-origin:20px 20px}
    .bt-knob .kl{font-size:7.5px;font-weight:800;letter-spacing:.12em;color:#71717a;text-transform:uppercase;white-space:nowrap}
    .bt-knob b{font:700 9px ui-monospace,monospace;color:#e4e4e7;white-space:nowrap}
    .bt-knob.on .kl,.bt-knob:focus-visible .kl{color:#f0abfc}
    /* step popover */
    .bt-pop{position:absolute;z-index:40;width:240px;max-height:calc(100% - 16px);overflow:auto;padding:10px;border-radius:14px;background:#101016;border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 60px -12px rgba(0,0,0,.85),0 0 0 1px rgba(198,58,235,.15);font-size:11px}
    .bt-pop[hidden]{display:none}
    .bp-h{display:flex;align-items:center;gap:6px;margin-bottom:6px}
    .bp-h>i{width:8px;height:8px;border-radius:50%}
    .bp-h b{font-weight:800}
    .bp-h span{color:#71717a;font-size:10px;flex:1}
    .bp-x{width:24px;height:24px;border-radius:7px;color:#a1a1aa}
    .bp-x:hover{background:rgba(255,255,255,.08)}
    .bp-r{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px}
    .bp-r>span{font-size:8px;font-weight:800;letter-spacing:.14em;color:#71717a;text-transform:uppercase}
    .bp-seg{display:flex;gap:2px;padding:2px;border-radius:8px;background:rgba(255,255,255,.05)}
    .bp-seg button{min-width:34px;height:22px;border-radius:6px;font-size:10px;font-weight:700;color:#a1a1aa}
    .bp-seg button[aria-pressed="true"]{background:#fff;color:#000}
    .bp-oct{display:flex;align-items:center;gap:6px}
    .bp-oct button{width:22px;height:22px;border-radius:6px;background:rgba(255,255,255,.08);font-weight:800}
    .bp-note{font:800 12px ui-monospace,monospace;color:#f0abfc;min-width:30px;text-align:center}
    .bp-nud{font:800 11px ui-monospace,monospace;color:#f0abfc;min-width:56px;text-align:center}
    .bp-keys{display:grid;grid-template-columns:repeat(12,1fr);gap:2px;margin-top:7px;align-items:start}
    .bp-keys button{height:32px;border-radius:4px;font-size:7px;font-weight:800;display:flex;align-items:flex-end;justify-content:center;padding-bottom:3px}
    .bp-keys .w{background:#e4e4e7;color:#18181b}
    .bp-keys .k{background:#27272a;color:#a1a1aa;height:24px}
    .bp-keys button[aria-pressed="true"]{background:#c63aeb;color:#fff;box-shadow:0 0 10px #c63aeb}
    .bp-del{margin-top:10px;width:100%;height:28px;border-radius:8px;border:1px solid rgba(248,113,113,.35);color:#fca5a5;font-size:10px;font-weight:800;letter-spacing:.06em}
    .bp-del:hover{background:rgba(239,68,68,.12)}
    /* toast */
    .bt-toast{position:absolute;left:50%;bottom:14px;z-index:45;transform:translate(-50%,12px);opacity:0;pointer-events:none;padding:8px 14px;border-radius:999px;background:rgba(10,10,14,.94);border:1px solid rgba(255,255,255,.14);font-size:11px;font-weight:600;white-space:nowrap;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis;transition:opacity .25s,transform .35s cubic-bezier(.22,1,.36,1)}
    .bt-toast.on{opacity:1;transform:translate(-50%,0)}
    /* small card: visualizer + the 6 core rows */
    .bt-mini{display:none;align-items:center;gap:8px}
    .bt-play.sm{width:34px;height:34px;font-size:12px}
    .bt-mbpm{font-size:11px;font-weight:800;color:#f0abfc;letter-spacing:.06em;white-space:nowrap}
    .bt-mbpm b{font-size:14px}
    .bt-mname{font-size:10px;color:#a1a1aa;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .bt-open{height:26px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);font-size:10px;font-weight:800;display:flex;align-items:center;gap:6px;white-space:nowrap}
    .bt-mode-compact .bt{justify-content:flex-end;gap:7px;padding:10px 12px 12px;--lw:30px}
    .bt-mode-compact .bt-top,.bt-mode-compact .bt-bars,.bt-mode-compact .bt-bottom{display:none}
    .bt-mode-compact .bt-mini{display:flex}
    .bt-mode-compact .bt-gw{flex:none}
    .bt-mode-compact .bt-grid{gap:2px}
    .bt-mode-compact .bt-row{flex:none;height:var(--rh);gap:2px}
    .bt-mode-compact .bt-row:not(.core){display:none}
    .bt-mode-compact .bt-name{padding:0;gap:0}
    .bt-mode-compact .bt-name span,.bt-mode-compact .bt-name kbd,.bt-mode-compact .bt-led,.bt-mode-compact .bt-ms{display:none}
    .bt-mode-compact .bt-name b{font-size:7.5px;min-width:0}
    .bt-mode-compact .bt-row.sel .bt-name{background:none}
    .bt-mode-compact .bt-step{border-radius:3px;font-size:0;touch-action:pan-y}
    .bt-mode-compact .bt-step::after{display:none}
    .bt-mode-compact .bt-step.g{margin-right:2px}
    .bt-mode-compact .bt-ph{border-radius:4px;top:-2px;bottom:-2px}
    /* wide card: the full machine, no knob panel */
    .bt-mode-card .bt{--lw:156px;gap:7px}
    .bt-mode-card .bt-bottom,.bt-mode-card .bt-rec,.bt-mode-card .bt-name kbd{display:none}
    .bt-mode-card .bt-tools .bt-btn span{display:none}
    .bt-mode-card .bt-tools .bt-btn{padding:0 9px}
    .bt-mode-focus .bt{padding:14px 16px;gap:9px;--lw:190px}
    .bt-short .bt-help{display:none}
    .bt-mode-focus.bt-narrow .bt,.bt-narrow .bt{--lw:68px;padding:10px;gap:7px}
    .bt-narrow .bt-name span,.bt-narrow .bt-name kbd,.bt-narrow .bt-info,.bt-narrow .bt-help,.bt-narrow .bt-led,.bt-narrow .bt-lbl{display:none}
    .bt-narrow .bt-name{padding:0 3px;gap:3px}
    .bt-narrow .bt-name b{min-width:23px}
    .bt-narrow .bt-row.sel .bt-name b{text-shadow:0 0 8px var(--c)}
    .bt-narrow .bt-ms{width:15px}
    .bt-narrow .bt-tools{margin-left:0}
    .bt-narrow .bt-tools .bt-btn span{display:none}
    .bt-narrow .bt-bottom{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
    .bt-narrow .bt-bottom::-webkit-scrollbar{display:none}
    .bt-narrow .bt-master{margin-left:0}
    .bt-narrow .bt-play{width:38px;height:38px}
    .bt-narrow .bt-tempo b{font-size:20px}
    @media (prefers-reduced-motion:reduce){.bt-rec[aria-pressed="true"] i{animation:none}}
    .bt-song{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0 2px}
    .bt-song[hidden]{display:none}
    .bt-slots,.bt-chain,.bt-adds{display:flex;gap:4px;flex-wrap:wrap;align-items:center}
    .bt-slot{width:30px;height:26px;border-radius:8px;font:800 11px/1 ui-monospace,Menlo,monospace;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#ddd}
    .bt-slot[aria-pressed="true"]{background:#c63aeb;border-color:#c63aeb;color:#fff}
    .bt-ch{height:24px;min-width:24px;padding:0 6px;border-radius:7px;font:800 11px/1 ui-monospace,Menlo,monospace;background:rgba(96,165,250,.14);border:1px solid rgba(96,165,250,.35);color:#bfdbfe}
    .bt-ch.now{background:#60a5fa;color:#05040d}
    .bt-ch:hover{border-color:#f87171}
    .bt-add{height:24px;padding:0 7px;border-radius:7px;font:700 10px/1 ui-monospace,Menlo,monospace;color:#9ca3af;border:1px dashed rgba(255,255,255,.2)}
    .bt-add:hover{color:#fff;border-color:#fff}
    .bt-songbtn[aria-pressed="true"]{background:rgba(198,58,235,.25);border-color:#c63aeb}
    .bt-wall{position:absolute;inset:0;z-index:40;background:rgba(8,8,12,.97);display:flex;flex-direction:column;border-radius:inherit}
    .bt-wall[hidden]{display:none}
    .bt-wall-h{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);font-size:13px}
    .bt-wall-l{flex:1;overflow:auto;padding:10px 14px;display:flex;flex-direction:column;gap:6px}
    .bt-wi{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);font-size:12px}
    .bt-wi b{display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bt-wi small{display:block;color:#9ca3af;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bt-wi .bt-wl[aria-pressed="true"]{color:#fb7185;border-color:rgba(244,63,94,.5)}
    .bt-wall form{display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;border-top:1px solid rgba(255,255,255,.08)}
    .bt-wall input{flex:1;min-width:110px;height:32px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);padding:0 10px;color:#fff;font-size:12px;outline:none}
    .bt-wall input:focus{border-color:#c63aeb}
    `;
    function injectCss() {
        if (document.getElementById('bt-css')) return;
        const st = document.createElement('style'); st.id = 'bt-css'; st.textContent = CSS; document.head.appendChild(st);
    }

    function template() {
        const play = (cls) => `<button class="bt-play${cls}" aria-label="Play"><i class="fas fa-play"></i><i class="fas fa-stop"></i></button>`;
        const row = (v, i) => `<div class="bt-row${v.core ? ' core' : ''}${v.accent ? ' acc' : ''}" style="--c:${v.c}">`
            + `<div class="bt-lab"><button class="bt-name" data-r="${i}" title="${v.name}${v.key ? ` · key ${v.key.toUpperCase()}` : v.bass ? ' · keys Q–P' : ''}"><i class="bt-led"></i><b>${v.short}</b><span>${v.name}</span>${v.key ? `<kbd>${v.key.toUpperCase()}</kbd>` : v.bass ? '<kbd>Q–P</kbd>' : ''}</button>`
            + (v.accent ? '' : `<button class="bt-ms bt-m" data-r="${i}" aria-pressed="false" aria-label="Mute ${v.name}" title="Mute">M</button><button class="bt-ms bt-s" data-r="${i}" aria-pressed="false" aria-label="Solo ${v.name}" title="Solo">S</button>`)
            + '</div>' + Array.from({ length: 16 }, (_, c) => `<button class="bt-step" data-r="${i}" data-c="${c}" tabindex="-1"></button>`).join('') + '</div>';
        return `
        <div class="bt-top">
            <div class="bt-grp">${play('')}<button class="bt-rec" aria-pressed="false" title="Record: while the beat plays, hit pads (keys A–M, Q–P or the voice names) and they land on the grid"><i></i>REC</button></div>
            <div class="bt-lcd">
                <div class="bt-tempo bt-mono" role="spinbutton" tabindex="0" aria-label="Tempo in BPM" aria-valuemin="40" aria-valuemax="240" title="Drag up/down, scroll or use the arrow keys"><b class="bt-bpmv">120</b><small>BPM</small></div>
                <div class="bt-tb"><button data-bpm="-1" aria-label="Slower">−</button><button data-bpm="1" aria-label="Faster">+</button><button class="bt-tap" title="Tap along to set the tempo">TAP</button></div>
                <div class="bt-info bt-mono"><span class="bt-leds" aria-hidden="true"><i></i><i></i><i></i><i></i></span><em class="bt-posv" style="font-style:normal">BAR 1/1 · 01/16</em><strong class="bt-namev"></strong></div>
            </div>
            <div class="bt-swing"></div>
            <div class="bt-len" role="radiogroup" aria-label="Pattern length in steps"><span>STEPS</span>${LENS.map((n) => `<button role="radio" data-len="${n}" aria-checked="false" title="${n} steps · ${barsLabel(n)}">${n}</button>`).join('')}</div>
            <div class="bt-tools">
                <select class="bt-sel bt-preset" aria-label="Preset">${PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
                <button class="bt-btn bt-gen" title="Generate a new groove in this style"><i class="fas fa-wand-magic-sparkles"></i><span>Generate</span></button>
                <button class="bt-btn bt-undo" aria-label="Undo" title="Undo (Ctrl/⌘ Z)" disabled><i class="fas fa-rotate-left"></i></button>
                <button class="bt-btn bt-clear" aria-label="Clear" title="Clear every step"><i class="fas fa-eraser"></i><span>Clear</span></button>
                <button class="bt-btn bt-wav" aria-label="Export WAV" title="Export the beat as a WAV file"><i class="fas fa-download"></i><span>WAV</span></button>
                <button class="bt-btn bt-share" aria-label="Share" title="Copy a link to this beat"><i class="fas fa-link"></i><span>Share</span></button>
                <button class="bt-btn bt-songbtn" aria-pressed="false" aria-label="Song mode" title="Song mode: chain patterns A–D into a song"><i class="fas fa-list-ol"></i><span>Song</span></button>
                <button class="bt-btn bt-wallbtn" aria-label="Community wall" title="Community wall: post your beat, play other people’s"><i class="fas fa-users"></i><span>Wall</span></button>
            </div>
        </div>
        <div class="bt-bars"><span class="bt-lbl">BARS</span><div class="bt-pages" role="tablist" aria-label="Pattern pages"></div><button class="bt-chip bt-follow" aria-pressed="true" title="Jump to the page that is playing">Follow</button><button class="bt-chip bt-dup" title="Copy this page onto every other page">Copy to all</button></div>
        <div class="bt-song" hidden><span class="bt-lbl">PATTERN</span><div class="bt-slots" role="group" aria-label="Pattern slots">${SL.split('').map((l, k) => `<button class="bt-slot" data-slot="${k}" aria-pressed="false" title="Edit pattern ${l}">${l}</button>`).join('')}</div>
            <span class="bt-lbl">CHAIN</span><div class="bt-chain" aria-label="Song chain (click a block to remove it)"></div><div class="bt-adds">${SL.split('').map((l) => `<button class="bt-add" data-add="${l}" title="Add ${l} to the chain">+${l}</button>`).join('')}</div></div>
        <div class="bt-gw"><div class="bt-grid" role="group" aria-label="Step sequencer">${V.map(row).join('')}</div><div class="bt-ph" aria-hidden="true"></div></div>
        <div class="bt-bottom">
            <div class="bt-voice"><button class="bt-pad"><b></b><span></span><kbd></kbd></button><div class="bt-vk"></div>
                <div class="bt-bx"><label>KEY <select class="bt-sel bt-key" aria-label="808 key">${NOTES.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select></label><button class="bt-chip bt-glide" aria-pressed="true" title="808 notes slide into each other">Glide</button></div></div>
            <div class="bt-master"></div>
            <p class="bt-help">Click or drag to paint · right-click / long-press a step for velocity, rolls, chance, nudge &amp; 808 notes · <kbd>Space</kbd> play · pads <kbd>A</kbd>–<kbd>M</kbd> · 808 <kbd>Q</kbd>–<kbd>P</kbd> · <kbd>⌘/Ctrl Z</kbd> undo</p>
        </div>
        <div class="bt-mini">${play(' sm')}<span class="bt-mbpm bt-mono"><b class="bt-bpmv">120</b> BPM</span><span class="bt-mname"></span><button class="bt-open" title="Open the full drum machine">Full 808 <i class="fas fa-expand"></i></button></div>
        <div class="bt-pop" role="dialog" aria-label="Step settings" hidden></div>
        <div class="bt-toast" role="status" aria-live="polite"></div>
        <div class="bt-wall" hidden role="dialog" aria-label="Community beats wall">
            <div class="bt-wall-h"><i class="fas fa-users" style="color:#c63aeb"></i><b style="flex:1">Community wall</b><button class="bt-btn bt-wall-r" aria-label="Refresh"><i class="fas fa-rotate"></i></button><button class="bt-btn bt-wall-x" aria-label="Close wall"><i class="fas fa-xmark"></i></button></div>
            <div class="bt-wall-l"></div>
            <form class="bt-wall-f"><input name="title" maxlength="40" placeholder="Beat title" required aria-label="Beat title"><input name="author" maxlength="24" placeholder="Your name" required aria-label="Your name"><button class="bt-btn" type="submit"><i class="fas fa-paper-plane"></i><span>Post</span></button></form>
        </div>`;
    }

    function knob(host, o) {
        const el = document.createElement('div');
        el.className = 'bt-knob'; el.tabIndex = 0;
        el.setAttribute('role', 'slider'); el.setAttribute('aria-valuemin', '0'); el.setAttribute('aria-valuemax', '100');
        el.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true"><circle class="kt" cx="20" cy="20" r="15"/><circle class="ka" cx="20" cy="20" r="15"/><line class="kp" x1="20" y1="20" x2="20" y2="9"/></svg><span class="kl"></span><b class="kv"></b>';
        const ka = el.querySelector('.ka'), kp = el.querySelector('.kp'), kl = el.querySelector('.kl'), kv = el.querySelector('.kv');
        if (o.color) el.style.setProperty('--kc', o.color);
        const api = {
            el, key: o.key,
            label(t) { kl.textContent = t; el.setAttribute('aria-label', t); },
            paint() {
                const v = o.get(), s = o.fmt(v);
                ka.style.strokeDasharray = `${(v * 70.69).toFixed(2)} 200`;
                kp.style.transform = `rotate(${-135 + v * 270}deg)`;
                kv.textContent = s;
                el.setAttribute('aria-valuenow', String(Math.round(v * 100))); el.setAttribute('aria-valuetext', s);
            },
        };
        const setv = (v) => { o.set(clamp(v, 0, 1)); api.paint(); };
        let drag = null;
        el.addEventListener('pointerdown', (e) => {
            if (e.button > 0) return;
            e.preventDefault(); el.focus({ preventScroll: true });
            try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
            drag = { y: e.clientY, v: o.get() }; o.start?.(); el.classList.add('on');
        });
        el.addEventListener('pointermove', (e) => { if (drag) setv(drag.v + (drag.y - e.clientY) / (e.shiftKey ? 600 : 160)); });
        const end = () => { drag = null; el.classList.remove('on'); };
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => el.addEventListener(ev, end));
        el.addEventListener('wheel', (e) => { e.preventDefault(); setv(o.get() - Math.sign(e.deltaY) * 0.03); }, { passive: false });
        el.addEventListener('keydown', (e) => {
            const d = { ArrowUp: 0.02, ArrowRight: 0.02, ArrowDown: -0.02, ArrowLeft: -0.02, PageUp: 0.1, PageDown: -0.1 }[e.key];
            if (d == null && e.key !== 'Home' && e.key !== 'End') return;
            e.preventDefault(); e.stopPropagation();
            setv(e.key === 'Home' ? 0 : e.key === 'End' ? 1 : o.get() + d);
        });
        el.addEventListener('dblclick', () => { o.start?.(); setv(typeof o.def === 'function' ? o.def() : o.def); });
        api.label(o.label); host.appendChild(el); api.paint();
        return api;
    }

    // ------------------------------------------------------------------ mount
    function mount(stage, opts = {}) {
        injectCss();
        stage.classList.add('bt-stage');
        if (!stage.hasAttribute('tabindex')) stage.setAttribute('tabindex', '-1');
        const cv = document.createElement('canvas');
        cv.className = 'bt-cv'; cv.setAttribute('aria-hidden', 'true');
        stage.prepend(cv);
        const g2 = cv.getContext('2d');

        const S = blankState();
        let restored = false;
        try { const j = localStorage.getItem(LS); if (j) restored = unpack(S, JSON.parse(j)); } catch { /* storage blocked */ }
        if (!restored) applyPreset(S, 'trap');

        let E = null, fd = null, mode = '', narrow = false, cols = 16, page = 0, follow = true, sel = ID.bd;
        let visible = true, grace = 0, saveT = 0, busy = false, dirty = false, cvw = 0, cvh = 0, gridH = 0, colX = [], rects = [], pageBtns = [], dotsQ = 0, toastT = 0;
        let focusR = ID.bd, focusC = 0, popAt = null, taps = [];
        const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const T = { playing: false, step: 0, next: 0, timer: 0, queue: [], cur: -1, curU: 0, skip: new Set(), rec: false };
        const hist = [];

        const root = document.createElement('div');
        root.className = 'bt'; root.dataset.sfx = 'none';
        root.innerHTML = template();
        stage.appendChild(root);
        const $ = (s) => root.querySelector(s), $$ = (s) => [...root.querySelectorAll(s)];
        const grid = $('.bt-grid'), ph = $('.bt-ph'), pagesEl = $('.bt-pages'), pop = $('.bt-pop'), toastEl = $('.bt-toast');
        const rowsEl = $$('.bt-row'), leds = $$('.bt-row .bt-led'), cells = rowsEl.map((r) => [...r.querySelectorAll('.bt-step')]);
        const bpmEls = $$('.bt-bpmv'), posEl = $('.bt-posv'), nameEl = $('.bt-namev'), mname = $('.bt-mname'), beatLeds = $$('.bt-leds i');
        const playBtns = $$('.bt-play'), recBtn = $('.bt-rec'), lenBtns = $$('[data-len]'), presetSel = $('.bt-preset'), undoBtn = $('.bt-undo');
        const wavBtn = $('.bt-wav'), followBtn = $('.bt-follow'), dupBtn = $('.bt-dup'), padBtn = $('.bt-pad'), keySel = $('.bt-key'), glideBtn = $('.bt-glide'), bx = $('.bt-bx'), tempoEl = $('.bt-tempo');

        // ---------- audio + transport
        function audio() {
            if (E) return E.c;
            let c = null;
            try { c = window.SFX?.ctx?.() || null; } catch { c = null; }
            if (!c) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; c = new AC(); }
            E = createEngine(c, c.destination); fd = new Uint8Array(E.an.frequencyBinCount); mix(E, S, true);
            try { window.dispatchEvent(new CustomEvent('pf:analyser', { detail: E.an })); } catch { /* old browser */ }
            return c;
        }
        const mixNow = () => { if (E) mix(E, S); };
        function play() {
            const c = audio();
            if (!c) { toast('Audio isn’t available in this browser'); return; }
            if (window.SFX && !window.SFX.enabled) window.SFX.setEnabled(true);
            if (c.state !== 'running') c.resume();
            if (song.on && song.chain.length) { song.slots[song.cur] = pack(S, MAXS); song.pos = 0; loadSlot(SL.indexOf(song.chain[0]), 0, true); }
            try { document.dispatchEvent(new CustomEvent('pf:beatplay')); } catch { /* old browser */ }
            if (song.on && song.chain.length > 1) window.Features?.unlock('dj');
            const early = S.r.some((r) => r.on[0] && r.nud[0] < 0) ? (60 / S.bpm / 4) * 0.5 : 0; // room for hits nudged ahead of step 1
            T.playing = true; T.step = 0; T.next = c.currentTime + 0.08 + early; T.queue.length = 0; T.skip.clear(); T.cur = -1;
            clearInterval(T.timer); T.timer = setInterval(tick, 25); tick();
            stage.classList.add('bt-playing'); playUi();
        }
        function halt() {
            if (!T.playing) return;
            T.playing = false; clearInterval(T.timer); T.queue.length = 0; T.cur = -1;
            stage.classList.remove('bt-playing'); ph.classList.remove('vis');
            beatLeds.forEach((l) => l.classList.remove('on')); pageBtns.forEach((b) => b.classList.remove('now'));
            posEl.textContent = `BAR 1/${Math.ceil(S.len / 16)} · 01/${S.len}`;
            playUi();
        }
        const toggle = () => (T.playing ? halt() : play());
        function playUi() { playBtns.forEach((b) => b.setAttribute('aria-label', T.playing ? 'Stop' : 'Play')); }
        function tick() {
            if (!T.playing || !E) return;
            const c = E.c, dur = 60 / S.bpm / 4;
            if (T.next < c.currentTime - 0.2) T.next = c.currentTime + 0.03; // the tab was throttled: resync instead of bursting
            let guard = 0;
            while (T.next - dur * 0.5 < c.currentTime + AHEAD && guard++ < 64) {
                if (T.step >= S.len) T.step = 0;
                const s = T.step, u = T.next, t = u + (s % 2 ? S.swing * 0.5 * dur : 0);
                try { playStep(E, S, s, t, dur, T.skip); } catch (e) { console.error('[beatlab]', e); }
                T.queue.push({ s, t, u });
                if (T.queue.length > 256) T.queue.splice(0, 128);
                T.next = u + dur;
                if (s + 1 >= S.len) { T.step = 0; if (song.on && song.chain.length > 1) songAdvance(u + dur); } else T.step = s + 1;
            }
        }
        function pad(i, note) {
            if (i === ACC) return;
            const c = audio(); if (!c) return;
            if (window.SFX && !window.SFX.enabled) window.SFX.setEnabled(true);
            if (c.state !== 'running') c.resume();
            const t = c.currentTime + 0.003;
            if (i === BASS) voice(E, S, i, t, 0.85, { f: bassFreq(S, note || 0), from: 0 });
            else voice(E, S, i, t, 0.85);
            if (!rm) leds[i].animate([{ opacity: 1, transform: 'scale(1.9)' }, { opacity: 0.25, transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
            if (i === sel) { padBtn.classList.add('hit'); setTimeout(() => padBtn.classList.remove('hit'), 110); }
            if (T.rec && T.playing) record(i, note || 0);
        }
        function record(i, note) {
            if (T.cur < 0) return;
            const dur = 60 / S.bpm / 4, now = E.c.currentTime - (E.c.outputLatency || 0);
            let s = T.cur, u = T.curU;
            if (now - u > dur / 2) { s = (s + 1) % S.len; u += dur; } // closer to the next step
            const r = S.r[i];
            r.on[s] = 1; r.vel[s] = 2; r.roll[s] = 1; r.prob[s] = 4; r.nud[s] = 0;
            if (i === BASS) r.note[s] = note;
            if (u >= T.next - 1e-4) T.skip.add(i * 1000 + s); // not scheduled yet — don't double the live hit
            renderCell(i, s - page * cols); changed();
        }

        // ---------- rendering
        const presetName = () => (PRESETS.find((p) => p.id === S.preset) || PRESETS[0]).name;
        function nameUpdate() { const n = presetName() + (dirty ? ' *' : ''); nameEl.textContent = n.toUpperCase(); mname.textContent = `${n} · ${S.len} steps`; }
        function bpmUpdate() { bpmEls.forEach((b) => { b.textContent = S.bpm; }); tempoEl.setAttribute('aria-valuenow', String(S.bpm)); }
        function lenUpdate() {
            lenBtns.forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.len === S.len)));
            if (!T.playing) posEl.textContent = `BAR 1/${Math.ceil(S.len / 16)} · 01/${S.len}`;
        }
        function soloUi() {
            const solo = S.r.some((r, i) => i !== ACC && r.solo);
            rowsEl.forEach((el, i) => {
                const r = S.r[i];
                el.classList.toggle('mute', i !== ACC && (r.mute || (solo && !r.solo)));
                el.querySelector('.bt-m')?.setAttribute('aria-pressed', String(r.mute));
                el.querySelector('.bt-s')?.setAttribute('aria-pressed', String(r.solo));
            });
        }
        function renderCell(i, c) {
            if (c < 0 || c >= cols) return;
            const b = cells[i][c], s = page * cols + c, r = S.r[i], inLen = s < S.len, on = inLen && r.on[s] === 1;
            let cls = 'bt-step' + (c % 4 === 0 ? ' b' : '') + (c % 4 === 3 && c < cols - 1 ? ' g' : '');
            if (!inLen) cls += ' x';
            if (on) { cls += ' on v' + r.vel[s]; if (r.prob[s] < 4) cls += ' p'; }
            if (b.className !== cls) b.className = cls;
            const roll = on && r.roll[s] > 1 ? `${r.roll[s]}×` : '';
            if ((b.dataset.roll || '') !== roll) { if (roll) b.dataset.roll = roll; else delete b.dataset.roll; }
            if (i === BASS) { const txt = on ? noteName(S, r.note[s]) : ''; if (b.textContent !== txt) b.textContent = txt; }
            const nd = on ? r.nud[s] : 0, tr = nd ? `${nd * 7}% 0` : '';
            if (b.style.translate !== tr) b.style.translate = tr;
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
            b.setAttribute('aria-label', `${V[i].name}, step ${s + 1}${on ? `, ${['', 'soft', 'medium', 'hard'][r.vel[s]]}${r.roll[s] > 1 ? `, roll ${r.roll[s]}` : ''}${r.prob[s] < 4 ? `, ${r.prob[s] * 25}% chance` : ''}${nd ? `, nudged ${NUD[nd + 3]} step` : ''}${i === BASS ? `, ${noteName(S, r.note[s])}` : ''}` : ''}`);
        }
        function renderPage() { for (let i = 0; i < V.length; i++) for (let c = 0; c < cols; c++) renderCell(i, c); pageSel(); }
        const tabLabel = (k) => (cols === 16 ? `${k + 1}` : `${(k >> 1) + 1}${k % 2 ? 'B' : 'A'}`);
        function showTab(p) {
            const b = pageBtns[p];
            if (!b) return;
            const L = b.offsetLeft, R = L + b.offsetWidth;
            if (L < pagesEl.scrollLeft) pagesEl.scrollLeft = L - 4;
            else if (R > pagesEl.scrollLeft + pagesEl.clientWidth) pagesEl.scrollLeft = R - pagesEl.clientWidth + 4;
        }
        function renderPages() {
            const n = Math.ceil(S.len / cols);
            pagesEl.innerHTML = Array.from({ length: n }, (_, k) => {
                const lab = tabLabel(k);
                return `<button class="bt-pg" role="tab" data-p="${k}" title="Steps ${k * cols + 1}–${(k + 1) * cols}" aria-label="Page ${lab}, steps ${k * cols + 1} to ${(k + 1) * cols}"><b class="bt-mono">${lab}</b><span class="bt-dots">${'<i></i>'.repeat(cols)}</span></button>`;
            }).join('');
            pageBtns = [...pagesEl.children];
            dupBtn.style.display = n > 1 ? '' : 'none';
            pageSel(); dots();
        }
        function pageSel() { pageBtns.forEach((b, k) => b.setAttribute('aria-selected', String(k === page))); }
        function dots() {
            pageBtns.forEach((b, k) => {
                const is = b.querySelectorAll('i');
                for (let c = 0; c < cols; c++) {
                    const s = k * cols + c; let any = false;
                    if (s < S.len) for (let i = 1; i < V.length; i++) if (S.r[i].on[s]) { any = true; break; }
                    is[c].classList.toggle('on', any);
                }
            });
        }
        const queueDots = () => { if (!dotsQ) dotsQ = requestAnimationFrame(() => { dotsQ = 0; dots(); }); };
        function goPage(p, user) {
            const n = Math.ceil(S.len / cols); p = clamp(p, 0, n - 1);
            if (user && T.playing && follow) { follow = false; followBtn.setAttribute('aria-pressed', 'false'); }
            if (p === page) return;
            page = p; closePop(); renderPage(); showTab(p);
            if (T.playing && T.cur >= 0) onStep(T.cur, T.curU, true);
        }
        function wave() {
            if (rm) return;
            for (let i = 0; i < V.length; i++) {
                if (mode === 'compact' && !V[i].core) continue;
                for (let c = 0; c < cols; c++) {
                    const b = cells[i][c];
                    if (b.classList.contains('on')) b.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.12)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: 420, delay: c * 22 + i * 7, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }); // transform only, so soft steps keep their dimmer look
                }
            }
        }
        function toast(msg) {
            toastEl.textContent = msg; toastEl.classList.add('on');
            clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2800);
        }

        // ---------- layout (small card / wide card / full screen)
        function fit() {
            const w = stage.clientWidth, h = Math.round(stage.clientHeight * (mode === 'compact' ? 1 : 0.55));
            if (!w || !h) return;
            // the small card's ring stays crisp; behind the full grid the glow is ambient, so half resolution is plenty
            const dpr = mode === 'compact' ? Math.min(2, window.devicePixelRatio || 1) : 0.5;
            if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
            g2.setTransform(dpr, 0, 0, dpr, 0, 0); cvw = w; cvh = h;
        }
        function measure() {
            const row = cells[ID.bd];
            colX = row.slice(0, cols).map((b) => b.offsetLeft);
            ph.style.width = `${row[0].offsetWidth + 4}px`;
            gridH = grid.offsetHeight;
        }
        function layout(force) {
            const w = stage.clientWidth, h = stage.clientHeight;
            if (!w || !h) return;
            const m = stage.classList.contains('is-focus') ? 'focus' : w >= 600 && h >= 440 ? 'card' : 'compact';
            const nar = m !== 'compact' && w < 640;
            if (m !== mode) { if (mode) stage.classList.remove('bt-mode-' + mode); stage.classList.add('bt-mode-' + m); mode = m; force = true; closePop(); }
            if (nar !== narrow) { narrow = nar; stage.classList.toggle('bt-narrow', nar); force = true; }
            stage.classList.toggle('bt-short', h < 660);
            root.style.setProperty('--rh', `${clamp(Math.round(h * 0.052), 12, 24)}px`);
            const nc = Math.min(m === 'compact' || !nar ? 16 : 8, S.len);
            if (nc !== cols || force) {
                const first = page * cols;
                cols = nc; page = Math.min(Math.floor(first / cols), Math.ceil(S.len / cols) - 1);
                root.style.setProperty('--cols', String(cols));
                cells.forEach((row) => row.forEach((b, c) => { b.style.display = c < cols ? '' : 'none'; }));
                if (focusC >= cols) moveFocus(focusR, 0, false);
                renderPages(); renderPage();
            }
            fit(); measure();
            if (T.playing && T.cur >= 0) onStep(T.cur, T.curU, true);
        }

        // ---------- state changes
        function changed() {
            dirty = true; nameUpdate(); queueDots();
            clearTimeout(saveT); saveT = setTimeout(save, 500);
        }
        function save() { try { localStorage.setItem(LS, JSON.stringify(pack(S, S.len))); } catch { /* full or blocked */ } }
        function snapshot() { hist.push(JSON.stringify(pack(S, MAXS))); if (hist.length > 40) hist.shift(); undoBtn.disabled = false; }
        function undo() {
            const j = hist.pop(); undoBtn.disabled = !hist.length;
            if (!j) { toast('Nothing to undo'); return; }
            unpack(S, JSON.parse(j)); refresh(); changed(); toast('Undone');
        }
        function refresh() {
            mixNow(); bpmUpdate(); lenUpdate(); nameUpdate(); soloUi();
            presetSel.value = S.preset; keySel.value = String(S.key); glideBtn.setAttribute('aria-pressed', String(S.glide));
            swingK.paint(); VK.forEach((k) => k.paint()); MK.forEach((k) => k.paint());
            if (T.step >= S.len) T.step = 0;
            selectVoice(sel); layout(true);
        }
        function setStep(i, s, val, audition) {
            const r = S.r[i];
            if (s >= S.len || r.on[s] === val) return;
            if (val) r.on[s] = 1; else clearStep(r, s);
            renderCell(i, s - page * cols); changed();
            if (val && audition && !T.playing) pad(i, i === BASS ? r.note[s] : 0);
        }
        function setBpm(n) { n = clamp(Math.round(n), 40, 240); if (n === S.bpm) return; S.bpm = n; bpmUpdate(); changed(); }
        function setLen(n) {
            if (!LENS.includes(n) || n === S.len) return;
            snapshot();
            const old = S.len; let filled = false;
            if (n > old && S.r.every((r) => !r.on.subarray(old, n).some((x) => x))) { for (let s = old; s < n; s++) copyStep(S, s % old, s); filled = true; }
            S.len = n; if (T.step >= n) T.step %= n;
            lenUpdate(); layout(true); changed();
            toast(filled ? `${n} steps · ${barsLabel(n)} — your ${old}-step loop repeats ${n / old}×` : `${n} steps · ${barsLabel(n)}`);
        }
        function selectVoice(i) {
            sel = i;
            const v = V[i];
            rowsEl.forEach((r, k) => r.classList.toggle('sel', k === i));
            padBtn.style.setProperty('--c', v.c);
            padBtn.querySelector('b').textContent = v.short;
            padBtn.querySelector('span').textContent = v.name;
            padBtn.querySelector('kbd').textContent = v.key ? v.key.toUpperCase() : v.bass ? 'Q–P' : '';
            padBtn.setAttribute('aria-label', `Play ${v.name}`);
            VK.forEach((k) => {
                k.el.style.display = !v.accent || k.key === 'level' ? '' : 'none';
                k.el.style.setProperty('--kc', v.c);
                if (k.key === 'tone') k.label(v.tone || 'Tone');
                if (k.key === 'level') k.label(v.accent ? 'Amount' : 'Level');
                k.paint();
            });
            bx.style.display = v.bass ? '' : 'none';
        }

        // ---------- knobs
        const swingK = knob($('.bt-swing'), { label: 'Swing', def: 0, get: () => S.swing, set: (v) => { S.swing = v; changed(); }, fmt: (v) => `${Math.round(50 + v * 25)}%`, start: snapshot });
        const VK = [
            ['level', 'Level', 0.75, (v) => `${Math.round(v * 100)}%`],
            ['tune', 'Tune', 0.5, (v) => { const st = Math.round((v - 0.5) * 2 * (V[sel].tr || 7)); return `${st > 0 ? '+' : ''}${st} st`; }],
            ['decay', 'Decay', 0.5, (v) => `×${dm(v).toFixed(2)}`],
            ['tone', 'Tone', 0.5, (v) => `${Math.round(v * 100)}`],
            ['pan', 'Pan', 0.5, (v) => (Math.abs(v - 0.5) < 0.02 ? 'C' : v < 0.5 ? `L${Math.round((0.5 - v) * 200)}` : `R${Math.round((v - 0.5) * 200)}`)],
        ].map(([key, label, def, fmt]) => knob($('.bt-vk'), {
            key, label, fmt, start: snapshot,
            def: () => (key === 'pan' ? V[sel].pan ?? 0.5 : key === 'level' && V[sel].accent ? 0.5 : def),
            get: () => S.r[sel][key],
            set: (v) => { S.r[sel][key] = v; if (key === 'level' || key === 'pan') mixNow(); changed(); },
        }));
        const MK = [
            ['vol', 'Volume', 0.8, (v) => `${Math.round(v * 100)}%`],
            ['boom', 'Boom', 0.4, (v) => `${Math.round(v * 100)}`],
            ['space', 'Space', 0.22, (v) => `${Math.round(v * 100)}`],
        ].map(([key, label, def, fmt]) => knob($('.bt-master'), { key, label, def, fmt, color: '#e879f9', get: () => S[key], set: (v) => { S[key] = v; mixNow(); changed(); } }));

        // ---------- grid: paint, tap, long-press, right-click, keyboard
        let paint = null, lpT = 0;
        const colAt = (x) => {
            if (!rects.length) return -1;
            for (let c = 0; c < rects.length; c++) if (x < rects[c].right + 2) return c;
            return rects.length - 1;
        };
        function begin(e, i, c) {
            snapshot();
            const s = page * cols + c, val = S.r[i].on[s] ? 0 : 1;
            paint = { i, c0: c, last: c, val, id: e.pointerId };
            rects = cells[i].slice(0, cols).map((b) => b.getBoundingClientRect());
            setStep(i, s, val, true);
            try { grid.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        }
        grid.addEventListener('pointerdown', (e) => {
            const n = e.target.closest('.bt-name');
            if (n) { if (e.button === 0) { const i = +n.dataset.r; selectVoice(i); pad(i, 0); } return; }
            const b = e.target.closest('.bt-step');
            if (!b || e.button > 0) return;
            const i = +b.dataset.r, c = +b.dataset.c;
            if (page * cols + c >= S.len) return;
            closePop(); moveFocus(i, c, false);
            if (e.pointerType === 'mouse') { begin(e, i, c); return; }
            // touch / pen: tap toggles, a drag paints, a long press opens the step settings
            paint = { i, c0: c, last: c, val: null, id: e.pointerId, x: e.clientX, y: e.clientY };
            clearTimeout(lpT);
            lpT = setTimeout(() => { if (paint && paint.val === null) { paint = null; navigator.vibrate?.(8); openPop(i, page * cols + c, b); } }, 430);
        });
        grid.addEventListener('pointermove', (e) => {
            if (!paint || e.pointerId !== paint.id) return;
            if (paint.val === null) {
                if (Math.hypot(e.clientX - paint.x, e.clientY - paint.y) < 8) return;
                clearTimeout(lpT); begin(e, paint.i, paint.c0);
            }
            const c = colAt(e.clientX);
            if (c < 0 || c === paint.last) return;
            const a = Math.min(c, paint.last), z = Math.max(c, paint.last);
            for (let k = a; k <= z; k++) setStep(paint.i, page * cols + k, paint.val, false);
            paint.last = c;
        });
        const endPaint = (e) => {
            clearTimeout(lpT);
            if (!paint) return;
            const p = paint; paint = null;
            if (p.val === null && e.type === 'pointerup') { snapshot(); const s = page * cols + p.c0; setStep(p.i, s, S.r[p.i].on[s] ? 0 : 1, true); }
        };
        grid.addEventListener('pointerup', endPaint);
        grid.addEventListener('pointercancel', endPaint);
        grid.addEventListener('contextmenu', (e) => {
            const b = e.target.closest('.bt-step');
            if (!b) return;
            e.preventDefault(); clearTimeout(lpT); paint = null;
            const i = +b.dataset.r, s = page * cols + +b.dataset.c;
            if (popAt && popAt.i === i && popAt.s === s) return;
            openPop(i, s, b);
        });
        grid.addEventListener('wheel', (e) => {
            const b = e.target.closest('.bt-step');
            if (!b || mode === 'compact' || +b.dataset.r !== BASS) return;
            const s = page * cols + +b.dataset.c, r = S.r[BASS];
            if (!r.on[s]) return;
            e.preventDefault();
            r.note[s] = clamp(r.note[s] + (e.deltaY < 0 ? 1 : -1), -12, 24);
            renderCell(BASS, +b.dataset.c); changed();
            if (!T.playing) pad(BASS, r.note[s]);
        }, { passive: false });
        grid.addEventListener('click', (e) => {
            const m = e.target.closest('.bt-ms');
            if (m) {
                const r = S.r[+m.dataset.r];
                if (m.classList.contains('bt-m')) r.mute = !r.mute; else r.solo = !r.solo;
                soloUi(); mixNow(); changed(); return;
            }
            const n = e.target.closest('.bt-name');
            if (n && e.detail === 0) { const i = +n.dataset.r; selectVoice(i); pad(i, 0); } // keyboard activation
        });
        const visibleRows = () => V.map((v, i) => i).filter((i) => mode !== 'compact' || V[i].core);
        function moveFocus(i, c, focus = true) {
            cells[focusR][focusC].tabIndex = -1;
            focusR = i; focusC = c;
            const b = cells[i][c]; b.tabIndex = 0;
            if (focus) b.focus({ preventScroll: true });
        }
        grid.addEventListener('keydown', (e) => {
            const b = e.target.closest('.bt-step');
            if (!b) return;
            const i = +b.dataset.r, c = +b.dataset.c, rows = visibleRows(), ri = rows.indexOf(i);
            if (e.key === 'Enter') { e.preventDefault(); snapshot(); const s = page * cols + c; setStep(i, s, S.r[i].on[s] ? 0 : 1, true); return; }
            if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) { e.preventDefault(); openPop(i, page * cols + c, b); return; }
            const mv = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
            if (!mv) return;
            e.preventDefault(); e.stopPropagation();
            let nc = c + mv[1];
            if (nc < 0) { if (page > 0) { goPage(page - 1, true); nc = cols - 1; } else nc = 0; }
            if (nc >= cols) { if (page < Math.ceil(S.len / cols) - 1) { goPage(page + 1, true); nc = 0; } else nc = cols - 1; }
            moveFocus(rows[clamp(ri + mv[0], 0, rows.length - 1)], nc);
        });
        cells[focusR][focusC].tabIndex = 0;

        // ---------- step popover: velocity · roll · chance · 808 note
        function noteHtml(n) {
            const base = Math.floor(n / 12) * 12;
            return `<div class="bp-r"><span>808 note</span><div class="bp-oct"><button data-oct="-1" aria-label="Octave down">−</button><b class="bp-note">${noteName(S, n)}</b><button data-oct="1" aria-label="Octave up">+</button></div></div>`
                + `<div class="bp-keys">${Array.from({ length: 12 }, (_, k) => { const nm = NOTES[(S.key + k) % 12]; return `<button data-n="${base + k}" class="${nm.length > 1 ? 'k' : 'w'}" aria-pressed="${base + k === n}" aria-label="${nm}">${nm}</button>`; }).join('')}</div>`;
        }
        function openPop(i, s, anchor) {
            if (i === ACC || s >= S.len) return;
            const r = S.r[i];
            snapshot();
            if (!r.on[s]) { r.on[s] = 1; renderCell(i, s - page * cols); changed(); }
            popAt = { i, s };
            const seg = (f, label, list) => `<div class="bp-r"><span>${label}</span><div class="bp-seg" data-f="${f}">${list.map(([v, l]) => `<button data-v="${v}" aria-pressed="${r[f][s] === v}">${l}</button>`).join('')}</div></div>`;
            pop.innerHTML = `<div class="bp-h"><i style="background:${V[i].c}"></i><b>${V[i].name}</b><span>Step ${s + 1}</span><button class="bp-x" aria-label="Close step settings"><i class="fas fa-xmark"></i></button></div>`
                + seg('vel', 'Velocity', [[1, 'Soft'], [2, 'Med'], [3, 'Hard']])
                + seg('roll', 'Roll', [[1, '1×'], [2, '2×'], [3, '3×'], [4, '4×']])
                + seg('prob', 'Chance', [[4, '100%'], [3, '75%'], [2, '50%'], [1, '25%']])
                + `<div class="bp-r"><span>Nudge</span><div class="bp-oct"><button data-nud="-1" aria-label="Earlier">‹</button><b class="bp-nud">${NUD[r.nud[s] + 3]}</b><button data-nud="1" aria-label="Later">›</button></div></div>`
                + (i === BASS ? noteHtml(r.note[s]) : '')
                + '<button class="bp-del">Remove step</button>';
            pop.hidden = false;
            const sr = stage.getBoundingClientRect(), ar = anchor.getBoundingClientRect(), pw = pop.offsetWidth, phh = pop.offsetHeight;
            let x = ar.left - sr.left + ar.width / 2 - pw / 2, y = ar.bottom - sr.top + 8;
            if (y + phh > sr.height - 8) y = ar.top - sr.top - phh - 8;
            pop.style.left = `${clamp(x, 8, Math.max(8, sr.width - pw - 8))}px`;
            pop.style.top = `${clamp(y, 8, Math.max(8, sr.height - phh - 8))}px`;
            if (!rm) pop.animate([{ opacity: 0, transform: 'translateY(6px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.22,1,.36,1)' });
            pop.querySelector('.bp-seg button[aria-pressed="true"]')?.focus({ preventScroll: true });
        }
        function closePop() {
            if (pop.hidden) return;
            const back = popAt && pop.contains(document.activeElement);
            pop.hidden = true; pop.innerHTML = ''; popAt = null;
            if (back) cells[focusR][focusC].focus({ preventScroll: true });
        }
        function syncNotes() {
            const n = S.r[BASS].note[popAt.s], base = Math.floor(n / 12) * 12;
            pop.querySelector('.bp-note').textContent = noteName(S, n);
            pop.querySelectorAll('.bp-keys button').forEach((b, k) => { b.dataset.n = String(base + k); b.setAttribute('aria-pressed', String(base + k === n)); });
        }
        pop.addEventListener('click', (e) => {
            if (!popAt) return;
            const { i, s } = popAt, r = S.r[i], b = e.target.closest('button');
            if (!b) return;
            if (b.classList.contains('bp-x')) { closePop(); return; }
            if (b.classList.contains('bp-del')) { clearStep(r, s); renderCell(i, s - page * cols); changed(); closePop(); return; }
            const sg = b.closest('.bp-seg');
            if (sg) { r[sg.dataset.f][s] = +b.dataset.v; sg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }
            else if (b.dataset.n != null) { r.note[s] = clamp(+b.dataset.n, -12, 23); syncNotes(); pad(i, r.note[s]); }
            else if (b.dataset.oct) { r.note[s] = clamp(r.note[s] + 12 * +b.dataset.oct, -12, 23); syncNotes(); pad(i, r.note[s]); }
            else if (b.dataset.nud) { r.nud[s] = clamp(r.nud[s] + +b.dataset.nud, -3, 3); pop.querySelector('.bp-nud').textContent = NUD[r.nud[s] + 3]; }
            renderCell(i, s - page * cols); changed();
        });
        document.addEventListener('pointerdown', (e) => { if (!pop.hidden && !pop.contains(e.target)) closePop(); }, true);

        // ---------- transport + tools
        playBtns.forEach((b) => b.addEventListener('click', toggle));
        recBtn.addEventListener('click', () => {
            T.rec = !T.rec; recBtn.setAttribute('aria-pressed', String(T.rec));
            if (T.rec) { snapshot(); if (!T.playing) play(); toast('Recording — hit pads on the beat (A–M, Q–P or the voice names)'); }
        });
        tempoEl.addEventListener('pointerdown', (e) => {
            if (e.button > 0) return;
            e.preventDefault(); tempoEl.focus({ preventScroll: true });
            try { tempoEl.setPointerCapture(e.pointerId); } catch { /* ignore */ }
            const y0 = e.clientY, b0 = S.bpm;
            const mv = (ev) => setBpm(b0 + Math.round((y0 - ev.clientY) / 3));
            const up = () => { tempoEl.removeEventListener('pointermove', mv); tempoEl.removeEventListener('pointerup', up); tempoEl.removeEventListener('pointercancel', up); };
            tempoEl.addEventListener('pointermove', mv); tempoEl.addEventListener('pointerup', up); tempoEl.addEventListener('pointercancel', up);
        });
        tempoEl.addEventListener('wheel', (e) => { e.preventDefault(); setBpm(S.bpm + (e.deltaY < 0 ? 1 : -1)); }, { passive: false });
        tempoEl.addEventListener('keydown', (e) => {
            const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
            if (!d) return;
            e.preventDefault(); e.stopPropagation(); setBpm(S.bpm + d);
        });
        $$('[data-bpm]').forEach((b) => {
            const d = +b.dataset.bpm; let rt = 0, ri = 0;
            const stopR = () => { clearTimeout(rt); clearInterval(ri); };
            b.addEventListener('pointerdown', (e) => { if (e.button > 0) return; setBpm(S.bpm + d); stopR(); rt = setTimeout(() => { ri = setInterval(() => setBpm(S.bpm + d), 55); }, 380); });
            ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stopR));
            b.addEventListener('click', (e) => { if (e.detail === 0) setBpm(S.bpm + d); });
        });
        const tapBtn = $('.bt-tap');
        const tap = () => {
            const n = performance.now();
            if (taps.length && n - taps[taps.length - 1] > 2000) taps = [];
            taps.push(n); if (taps.length > 6) taps.shift();
            if (taps.length >= 2) setBpm(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
            tapBtn.classList.add('hit'); setTimeout(() => tapBtn.classList.remove('hit'), 90);
        };
        tapBtn.addEventListener('pointerdown', (e) => { if (e.button === 0) tap(); });
        tapBtn.addEventListener('click', (e) => { if (e.detail === 0) tap(); });
        lenBtns.forEach((b) => b.addEventListener('click', () => setLen(+b.dataset.len)));
        presetSel.addEventListener('change', () => {
            snapshot(); applyPreset(S, presetSel.value); dirty = false; refresh(); save(); wave();
            const p = PRESETS.find((x) => x.id === S.preset);
            toast(`${p.name} · ${p.bpm} BPM — ${p.desc}`);
        });
        $('.bt-gen').addEventListener('click', (e) => {
            snapshot(); generate(S); refresh(); changed(); wave();
            if (!rm) e.currentTarget.querySelector('i').animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(-25deg) scale(1.35)' }, { transform: 'rotate(0) scale(1)' }], { duration: 450 });
            toast(`Fresh ${presetName()} groove — hit Generate again for another`);
        });
        undoBtn.addEventListener('click', undo);
        $('.bt-clear').addEventListener('click', () => {
            snapshot(); S.r.forEach((r) => { r.on.fill(0); r.vel.fill(2); r.roll.fill(1); r.prob.fill(4); r.nud.fill(0); });
            renderPage(); changed(); toast('Cleared — undo brings it back');
        });
        wavBtn.addEventListener('click', async () => {
            if (busy) return;
            busy = true; wavBtn.classList.add('busy');
            const lab = wavBtn.querySelector('span'), old = lab.textContent; lab.textContent = 'Rendering…';
            try {
                let out, name;
                if (song.on && song.chain.length) {
                    song.slots[song.cur] = pack(S, MAXS);
                    const list = song.chain.split('').map((l) => { const x = blankState(); const o = song.slots[SL.indexOf(l)]; if (o) unpack(x, o); Object.assign(x, globals()); return x; });
                    out = await renderSong(list, S); out.reps = 1; name = `beat-lab-song-${song.chain}-${S.bpm}bpm.wav`;
                } else { out = await render(S); name = `beat-lab-${S.preset}-${S.bpm}bpm.wav`; }
                const url = URL.createObjectURL(wavBlob(out.buffer, out.from)), a = document.createElement('a');
                a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 5000);
                toast(song.on ? `Saved ${name} — ${out.seconds.toFixed(1)} s song` : `Saved ${name} — ${out.seconds.toFixed(1)} s, ${out.reps} loop${out.reps > 1 ? 's' : ''}, loops seamlessly`);
            } catch (err) { console.error('[beatlab] export', err); toast('Export didn’t work in this browser'); }
            busy = false; wavBtn.classList.remove('busy'); lab.textContent = old;
        });
        $('.bt-share').addEventListener('click', async () => {
            try {
                const url = `${location.origin}${location.pathname}?beat=${await shareCode()}#playground`;
                if (navigator.share && matchMedia('(pointer: coarse)').matches) {
                    try { await navigator.share({ title: 'My beat — Beat Lab 808', url }); return; } catch (err) { if (err && err.name === 'AbortError') return; }
                }
                try { await navigator.clipboard.writeText(url); toast('Link copied — whoever opens it hears this beat'); }
                catch { window.prompt('Copy this link to share your beat:', url); }
            } catch { toast('Couldn’t make a link in this browser'); }
        });
        pagesEl.addEventListener('click', (e) => { const b = e.target.closest('.bt-pg'); if (b) goPage(+b.dataset.p, true); });
        followBtn.addEventListener('click', () => {
            follow = !follow; followBtn.setAttribute('aria-pressed', String(follow));
            if (follow && T.playing && T.cur >= 0) onStep(T.cur, T.curU, true);
        });
        dupBtn.addEventListener('click', () => {
            snapshot();
            const n = Math.ceil(S.len / cols), src = page * cols;
            for (let p = 0; p < n; p++) if (p !== page) for (let c = 0; c < cols; c++) if (p * cols + c < S.len) copyStep(S, src + c, p * cols + c);
            changed(); dots(); toast(`Page ${tabLabel(page)} copied to all ${n} pages`);
        });
        padBtn.addEventListener('pointerdown', (e) => { if (e.button === 0) pad(sel, 0); });
        padBtn.addEventListener('click', (e) => { if (e.detail === 0) pad(sel, 0); });
        keySel.addEventListener('change', () => { S.key = +keySel.value; renderPage(); changed(); if (!T.playing) pad(BASS, 0); });
        glideBtn.addEventListener('click', () => { S.glide = !S.glide; glideBtn.setAttribute('aria-pressed', String(S.glide)); changed(); });
        $('.bt-open').addEventListener('click', () => opts.openFocus?.());

        // ---------- song mode: four pattern slots (A–D) chained into a song
        const songEl = $('.bt-song'), chainEl = $('.bt-chain'), songBtn = $('.bt-songbtn');
        const song = { on: false, slots: [null, null, null, null], chain: 'A', cur: 0, pos: 0, uiT: 0 };
        try {
            const j = JSON.parse(localStorage.getItem(LSS) || 'null');
            if (j && Array.isArray(j.slots)) {
                song.slots = [0, 1, 2, 3].map((k) => (j.slots[k] && j.slots[k].v === 1 ? j.slots[k] : null));
                song.chain = typeof j.chain === 'string' && /^[A-D]{1,16}$/.test(j.chain) ? j.chain : 'A';
                song.cur = clamp(j.cur | 0, 0, 3); song.on = !!j.on;
            }
        } catch { /* storage blocked */ }
        const globals = () => ({ bpm: S.bpm, swing: S.swing, key: S.key, glide: S.glide, vol: S.vol, boom: S.boom, space: S.space });
        function saveSong() { try { localStorage.setItem(LSS, JSON.stringify({ slots: song.slots, chain: song.chain, cur: song.cur, on: song.on })); } catch { /* full or blocked */ } }
        function songUi(noLayout) {
            songEl.hidden = !song.on; songBtn.setAttribute('aria-pressed', String(song.on));
            $$('.bt-slot').forEach((b, k) => b.setAttribute('aria-pressed', String(k === song.cur)));
            chainEl.innerHTML = song.chain.split('').map((l, i) => `<button class="bt-ch${T.playing && i === song.pos ? ' now' : ''}" data-ci="${i}" title="Remove this ${l}">${l}</button>`).join('');
            if (!noLayout) layout(true);
        }
        function loadSlot(k, at, now) {
            const keep = globals();
            song.cur = k;
            if (song.slots[k]) unpack(S, song.slots[k]);
            Object.assign(S, keep);
            if (T.step >= S.len) T.step = 0;
            clearTimeout(song.uiT);
            const delay = !now && at && E ? Math.max(0, (at - E.c.currentTime) * 1000) : 0;
            song.uiT = setTimeout(() => { refresh(); songUi(); }, delay);
            saveSong();
        }
        function songAdvance(at) {
            song.slots[song.cur] = pack(S, MAXS);
            song.pos = (song.pos + 1) % song.chain.length;
            loadSlot(SL.indexOf(song.chain[song.pos]), at);
        }
        function setSong(on) {
            song.on = on;
            if (on) {
                if (!song.slots.some(Boolean)) { const cur = pack(S, MAXS); song.slots = [cur, cur, cur, cur].map((x) => JSON.parse(JSON.stringify(x))); song.cur = 0; song.chain = 'A'; }
                song.slots[song.cur] = pack(S, MAXS);
                toast('Song mode: edit patterns A–D, then build the chain with +A … +D');
            } else { song.slots[song.cur] = pack(S, MAXS); toast('Song mode off — editing a single pattern'); }
            saveSong(); songUi();
        }
        songBtn.addEventListener('click', () => setSong(!song.on));
        songEl.addEventListener('click', (e) => {
            const sb = e.target.closest('[data-slot]');
            if (sb) {
                const k = +sb.dataset.slot; if (k === song.cur) return;
                song.slots[song.cur] = pack(S, MAXS);
                if (!song.slots[k]) song.slots[k] = pack(S, MAXS);
                hist.length = 0; undoBtn.disabled = true;
                const pi = song.chain.indexOf(SL[k]); if (pi >= 0) song.pos = pi;
                loadSlot(k, 0, true); toast(`Editing pattern ${SL[k]}`);
                return;
            }
            const ad = e.target.closest('[data-add]');
            if (ad) { if (song.chain.length >= 16) { toast('A song can chain up to 16 patterns'); return; } song.chain += ad.dataset.add; saveSong(); songUi(); if (song.chain.length > 1) window.Features?.unlock('dj'); return; }
            const ch = e.target.closest('[data-ci]');
            if (ch) {
                if (song.chain.length <= 1) { toast('The chain needs at least one pattern'); return; }
                const i = +ch.dataset.ci; song.chain = song.chain.slice(0, i) + song.chain.slice(i + 1);
                if (song.pos >= song.chain.length) song.pos = 0;
                saveSong(); songUi();
            }
        });
        async function shareCode() {
            if (!song.on) return encode(pack(S, S.len));
            song.slots[song.cur] = pack(S, MAXS);
            return 's' + await encode({ v: 1, slots: song.slots, chain: song.chain });
        }
        async function loadCode(code) {
            if (code[0] === 's') {
                const o = await decode(code.slice(1));
                if (!o || o.v !== 1 || !Array.isArray(o.slots) || typeof o.chain !== 'string' || !/^[A-D]{1,16}$/.test(o.chain)) throw new Error('bad song');
                song.slots = [0, 1, 2, 3].map((k) => (o.slots[k] && o.slots[k].v === 1 ? o.slots[k] : null));
                song.chain = o.chain; song.on = true; song.pos = 0;
                const first = SL.indexOf(o.chain[0]);
                if (song.slots[first]) unpack(S, song.slots[first]);
                song.cur = first; saveSong(); refresh(); songUi();
                return 'song';
            }
            const o = await decode(code);
            if (!unpack(S, o)) throw new Error('bad beat');
            if (song.on) { song.slots[song.cur] = pack(S, MAXS); saveSong(); }
            refresh();
            return 'beat';
        }
        songUi(true); // the "go" step below runs refresh() + layout
        if (song.on && song.slots[song.cur]) { const keep = globals(); unpack(S, song.slots[song.cur]); Object.assign(S, keep); }

        // ---------- community wall (Supabase: portfolio_beats)
        const wall = $('.bt-wall'), wallL = $('.bt-wall-l'), wallF = $('.bt-wall-f');
        const FX = () => window.Features;
        let wallRows = [], liked = new Set();
        try { liked = new Set(JSON.parse(localStorage.getItem('pf_beat_likes') || '[]')); } catch { /* */ }
        const escH = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        async function loadWall() {
            wallL.innerHTML = '<p style="color:#9ca3af;font-size:12px">Loading beats…</p>';
            try {
                const get = FX()?.get || window.PF?.rest;
                wallRows = await get('portfolio_beats?select=id,title,author,code,bpm,style,likes,created_at&order=created_at.desc&limit=40');
            } catch { wallRows = null; }
            if (!wallRows) { wallL.innerHTML = '<p style="color:#f87171;font-size:12px">The wall is offline right now.</p>'; return; }
            if (!wallRows.length) { wallL.innerHTML = '<p style="color:#9ca3af;font-size:12px">No beats yet. Post the first one below!</p>'; return; }
            wallL.innerHTML = wallRows.map((r) => `<div class="bt-wi"><button class="bt-btn" data-wload="${r.id}" aria-label="Load ${escH(r.title)}"><i class="fas fa-play"></i></button>
                <div style="flex:1;min-width:0"><b>${escH(r.title)}</b><small>${escH(r.author)} · ${r.bpm || '?'} BPM${r.style ? ` · ${escH(r.style)}` : ''}${r.code[0] === 's' ? ' · song' : ''}</small></div>
                <button class="bt-btn bt-wl" data-wlike="${r.id}" aria-pressed="${liked.has(r.id)}" aria-label="Like"><i class="fas fa-heart"></i><span>${r.likes}</span></button></div>`).join('');
        }
        function openWall() { wall.hidden = false; const n = localStorage.getItem('pf_beat_author'); if (n) wallF.elements.namedItem('author').value = n; loadWall(); }
        $('.bt-wallbtn').addEventListener('click', openWall);
        $('.bt-wall-x').addEventListener('click', () => { wall.hidden = true; });
        $('.bt-wall-r').addEventListener('click', loadWall);
        wallL.addEventListener('click', async (e) => {
            const lb = e.target.closest('[data-wload]');
            if (lb) {
                const r = wallRows.find((x) => String(x.id) === lb.dataset.wload); if (!r) return;
                try { snapshot(); const kind = await loadCode(r.code); dirty = true; wave(); wall.hidden = true; toast(`Loaded “${r.title}” by ${r.author}${kind === 'song' ? ' (song)' : ''}`); if (!T.playing) play(); }
                catch { toast('That beat couldn’t be loaded'); }
                return;
            }
            const lk = e.target.closest('[data-wlike]');
            if (lk && !liked.has(+lk.dataset.wlike)) {
                const id = +lk.dataset.wlike; liked.add(id);
                try { localStorage.setItem('pf_beat_likes', JSON.stringify([...liked])); } catch { /* */ }
                lk.setAttribute('aria-pressed', 'true'); const sp = lk.querySelector('span'); sp.textContent = String(+sp.textContent + 1);
                try { const n = await FX()?.rpc('portfolio_like_beat', { p_id: id }); if (typeof n === 'number') sp.textContent = String(n); } catch { /* keep local */ }
            }
        });
        wallF.addEventListener('submit', async (e) => {
            e.preventDefault();
            const F2 = FX(); if (!F2) { toast('Posting needs the full site'); return; }
            const title = wallF.elements.namedItem('title').value.trim(), author = wallF.elements.namedItem('author').value.trim();
            if (!title || !author) return;
            const lastT = +localStorage.getItem('pf_beat_t') || 0;
            if (Date.now() - lastT < 60000) { toast('One post a minute, please'); return; }
            const btn = wallF.querySelector('button'); btn.disabled = true;
            try {
                const code = await shareCode();
                if (code.length > 12000) throw new Error('too long');
                await F2.post('portfolio_beats', { title, author, code, bpm: S.bpm, style: song.on ? 'song' : S.preset });
                try { localStorage.setItem('pf_beat_author', author); localStorage.setItem('pf_beat_t', String(Date.now())); } catch { /* */ }
                wallF.elements.namedItem('title').value = ''; toast('Posted to the wall'); F2.track('beat:post', { song: song.on }); loadWall();
            } catch (err) { toast(err.message === 'too long' ? 'This song is too long to post — try fewer steps' : 'Couldn’t post right now'); }
            btn.disabled = false;
        });

        // ---------- keyboard: Space play/stop · pads · 808 notes · undo
        const typing = (el) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
        const active = () => stage.isConnected && (stage.classList.contains('is-focus') || stage.contains(document.activeElement));
        window.addEventListener('keydown', (e) => {
            if (!active() || typing(e.target)) return;
            if (e.key === 'Escape') { if (!pop.hidden) { e.preventDefault(); closePop(); } return; }
            if (e.metaKey || e.ctrlKey) { if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } return; }
            if (e.altKey) return;
            if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) toggle(); return; }
            if (e.repeat || e.key.length !== 1) return;
            const k = e.key.toLowerCase();
            if (PADS.has(k)) { e.preventDefault(); pad(PADS.get(k), 0); return; }
            const bi = BASSKEYS.indexOf(k);
            if (bi >= 0) { e.preventDefault(); pad(BASS, BASS_SCALE[bi]); }
        });
        window.addEventListener('keyup', (e) => { if (e.code === 'Space' && active() && !typing(e.target)) e.preventDefault(); });
        document.addEventListener('sfx:toggle', (e) => { if (!e.detail) halt(); });

        // ---------- per-frame: playhead, lights, visualizer
        function onStep(s, u, quiet) {
            T.cur = s; T.curU = u;
            const p = Math.floor(s / cols);
            if ((follow || mode === 'compact') && p !== page) { page = p; renderPage(); showTab(p); }
            const c = s - page * cols;
            if (c >= 0 && c < cols && colX[c] != null) { ph.style.transform = `translate3d(${colX[c]}px,0,0)`; ph.classList.add('vis'); } else ph.classList.remove('vis');
            pageBtns.forEach((b, k) => b.classList.toggle('now', k === p));
            posEl.textContent = `BAR ${Math.floor(s / 16) + 1}/${Math.ceil(S.len / 16)} · ${String(s + 1).padStart(2, '0')}/${S.len}`;
            if (s % 4 === 0) { const q = (s % 16) / 4; beatLeds.forEach((l, k) => l.classList.toggle('on', k === q)); }
            if (quiet || rm) return;
            if (s % 4 === 0) playBtns.forEach((b) => { if (b.offsetParent) b.animate([{ transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' }); });
            const solo = S.r.some((r, i) => i !== ACC && r.solo);
            for (let i = 0; i < V.length; i++) {
                const r = S.r[i];
                if (!r.on[s] || (i !== ACC && (r.mute || (solo && !r.solo)))) continue;
                if (mode === 'compact' && !V[i].core) continue;
                leds[i].animate([{ opacity: 1, transform: 'scale(1.9)' }, { opacity: 0.25, transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
                if (c >= 0 && c < cols) cells[i][c].animate([{ transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.3,1)' });
                if (i === sel && mode === 'focus') padBtn.animate([{ transform: 'scale(.93)' }, { transform: 'scale(1)' }], { duration: 160 });
            }
        }
        let drawn = 0;
        function draw(t) {
            const w = cvw, h = cvh;
            if (!w) return;
            // behind the full grid the glow is ambient: 30 fps is plenty and halves the compositing work
            if (mode !== 'compact') { if (t - drawn < 0.03) return; drawn = t; }
            g2.clearRect(0, 0, w, h);
            const live = T.playing && E && fd;
            if (live) E.an.getByteFrequencyData(fd);
            const val = (i, k) => (live ? fd[i] / 255 : 0.1 + 0.07 * Math.sin(t * 1.6 + k * 0.35));
            if (mode === 'compact') {
                const free = Math.max(80, h - gridH - 60), cx = w / 2, cy = free / 2 + 4, base = clamp(free * 0.2, 16, 90), N = 64;
                g2.save(); g2.translate(cx, cy); g2.rotate(t * 0.15); g2.lineWidth = 2.5; g2.lineCap = 'round';
                for (let i = 0; i < N; i++) {
                    const v = val((i * 1.5) | 0, i), len = 5 + v * base * 1.3, a = (i / N) * Math.PI * 2;
                    g2.strokeStyle = `hsl(${280 - v * 120 + i},90%,${55 + v * 20}%)`;
                    g2.beginPath(); g2.moveTo(Math.cos(a) * base, Math.sin(a) * base); g2.lineTo(Math.cos(a) * (base + len), Math.sin(a) * (base + len)); g2.stroke();
                }
                g2.restore();
                const lvl = live ? fd[2] / 255 : 0.15, rr = base * (0.9 + lvl * 0.5), gr = g2.createRadialGradient(cx, cy, 0, cx, cy, rr);
                gr.addColorStop(0, `rgba(198,58,235,${0.35 + lvl * 0.5})`); gr.addColorStop(1, 'rgba(198,58,235,0)');
                g2.fillStyle = gr; g2.beginPath(); g2.arc(cx, cy, rr, 0, Math.PI * 2); g2.fill();
            } else {
                const N = 64, bw = w / N, half = N / 2;
                for (let i = 0; i < N; i++) {
                    const k = Math.abs(i - half + 0.5) | 0, v = val(Math.min(511, (k * 2.4) | 0), k), hh = v * h;
                    g2.fillStyle = `hsla(${290 - v * 150 + k * 2},90%,60%,${0.06 + v * 0.17})`;
                    g2.fillRect(i * bw + 1, h - hh, bw - 2, hh);
                }
                const lvl = live ? fd[1] / 255 : 0;
                if (lvl > 0.45) {
                    const gr = g2.createRadialGradient(w / 2, h, 0, w / 2, h, w * 0.6);
                    gr.addColorStop(0, `rgba(217,70,239,${(lvl - 0.45) * 0.5})`); gr.addColorStop(1, 'rgba(217,70,239,0)');
                    g2.fillStyle = gr; g2.fillRect(0, 0, w, h);
                }
            }
        }
        function frame(t) {
            if (T.playing && E) {
                const now = E.c.currentTime - (E.c.outputLatency || 0);
                let q = null;
                while (T.queue.length && T.queue[0].t <= now) q = T.queue.shift();
                if (q) onStep(q.s, q.u);
            }
            draw(t);
        }

        // ---------- go
        // clicking anywhere in the machine gives it keyboard focus, so pads + Space work on the card too
        root.addEventListener('pointerdown', () => { if (!stage.contains(document.activeElement)) stage.focus({ preventScroll: true }); });
        new ResizeObserver(() => layout()).observe(stage);
        selectVoice(ID.bd); refresh();
        const code = new URLSearchParams(location.search).get('beat');
        if (code) {
            loadCode(code).then((kind) => {
                dirty = true; hist.length = 0; undoBtn.disabled = true; wave();
                toast(kind === 'song' ? 'Shared song loaded — press play' : 'Shared beat loaded — press play');
            }).catch(() => toast('That beat link didn’t work — here’s the default kit'));
        }

        const api = {
            frame,
            start() { visible = true; clearTimeout(grace); layout(); },
            stop() { visible = false; clearTimeout(grace); grace = setTimeout(() => { if (!visible) { halt(); closePop(); } }, 180); },
            escape() { if (!wall.hidden) { wall.hidden = true; return true; } if (!pop.hidden) { closePop(); return true; } return false; },
            // handles for tests and the console
            state: S, transport: T, engine: () => E, play, halt, setBpm, setLen, undo, goPage, song, setSong, openWall,
            preset: (id) => { presetSel.value = id; presetSel.dispatchEvent(new Event('change')); },
            get mode() { return mode; }, get cols() { return cols; }, get page() { return page; },
        };
        return api;
    }

    return { mount, render, renderSong, wavBlob, pack, unpack, encode, decode, applyPreset, generate, blankState, createEngine, mix, playStep, PRESETS, VOICES: V, LENS };
})();
