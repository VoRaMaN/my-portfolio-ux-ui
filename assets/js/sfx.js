/* =========================================================================
   UI sound engine — every sound is synthesized with the Web Audio API
   (no audio files to download). Buttons/links play a soft click; use
   data-sfx="pop|whoosh|success|coin|…" for a different sound, or
   data-sfx="none" to stay silent. A mute toggle ([data-sound-toggle]) is
   remembered per visitor.
   ========================================================================= */
window.SFX = (() => {
    const KEY = 'pf_sound';
    let ctx = null, master = null, noiseBuf = null;
    let enabled = (() => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } })();

    function init() {
        if (ctx) return ctx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.55;
        // gentle limiter so stacked sounds never clip
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 6;
        master.connect(comp).connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        return ctx;
    }

    const env = (g, t, attack, peak, decay) => {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    };

    function tone(freq, { type = 'sine', dur = 0.08, vol = 0.2, to = null, attack = 0.003, delay = 0, out = null } = {}) {
        const c = init(); if (!c) return;
        const t = c.currentTime + delay;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
        env(g, t, attack, vol, dur);
        o.connect(g).connect(out || master);
        o.start(t); o.stop(t + attack + dur + 0.05);
    }

    function noise({ dur = 0.2, vol = 0.15, freq = 1200, q = 0.8, type = 'bandpass', sweepTo = null, delay = 0, out = null } = {}) {
        const c = init(); if (!c) return;
        const t = c.currentTime + delay;
        const src = c.createBufferSource(); src.buffer = noiseBuf;
        const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
        f.frequency.setValueAtTime(freq, t);
        if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
        const g = c.createGain(); env(g, t, 0.008, vol, dur);
        src.connect(f).connect(g).connect(out || master);
        src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    }

    const SOUNDS = {
        click: () => { tone(1700, { type: 'triangle', dur: 0.03, vol: 0.09, to: 900 }); tone(220, { dur: 0.035, vol: 0.06, to: 110 }); },
        tick: () => tone(2600, { dur: 0.018, vol: 0.04 }),
        pop: () => { tone(380, { dur: 0.12, vol: 0.2, to: 980 }); tone(1400, { type: 'triangle', dur: 0.05, vol: 0.05, delay: 0.04 }); },
        whoosh: () => noise({ dur: 0.38, vol: 0.12, freq: 350, sweepTo: 3200, q: 0.6 }),
        swipe: () => noise({ dur: 0.2, vol: 0.1, freq: 1800, sweepTo: 450, q: 0.7 }),
        success: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.22, vol: 0.1, delay: i * 0.065 })),
        toggle: () => { tone(660, { dur: 0.06, vol: 0.09 }); tone(990, { dur: 0.09, vol: 0.07, delay: 0.05 }); },
        hit: () => { noise({ dur: 0.16, vol: 0.26, freq: 900, q: 0.5, type: 'lowpass' }); tone(150, { type: 'square', dur: 0.12, vol: 0.08, to: 55 }); },
        crit: () => { noise({ dur: 0.3, vol: 0.3, freq: 2400, sweepTo: 300, q: 0.4, type: 'lowpass' }); tone(90, { type: 'sawtooth', dur: 0.3, vol: 0.12, to: 40 }); tone(1800, { type: 'square', dur: 0.06, vol: 0.05 }); },
        heal: () => [660, 880, 1320, 1760].forEach((f, i) => tone(f, { dur: 0.3, vol: 0.06, delay: i * 0.06 })),
        shield: () => { tone(300, { type: 'sine', dur: 0.4, vol: 0.1, to: 900 }); noise({ dur: 0.35, vol: 0.05, freq: 3000, q: 2 }); },
        coin: () => { tone(988, { type: 'square', dur: 0.06, vol: 0.05 }); tone(1319, { type: 'square', dur: 0.22, vol: 0.05, delay: 0.06 }); },
        glitch: () => { for (let i = 0; i < 6; i++) tone(180 + Math.random() * 2200, { type: 'square', dur: 0.022, vol: 0.035, delay: i * 0.028 }); },
        rumble: () => { noise({ dur: 0.7, vol: 0.18, freq: 120, q: 0.6, type: 'lowpass' }); tone(55, { type: 'sine', dur: 0.7, vol: 0.12 }); },
        open: () => { noise({ dur: 0.55, vol: 0.1, freq: 200, sweepTo: 5000, q: 1.2 }); [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.35, vol: 0.07, delay: 0.28 + i * 0.06 })); },
        legendary: () => { [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => tone(f, { type: 'triangle', dur: 0.5, vol: 0.07, delay: i * 0.07 })); noise({ dur: 1.2, vol: 0.05, freq: 6000, q: 3, delay: 0.1 }); },
        drop: () => tone(900, { dur: 0.18, vol: 0.12, to: 220 }),
    };

    function play(name) {
        if (!enabled) return;
        try {
            const c = init(); if (!c) return;
            if (c.state === 'suspended') c.resume();
            (SOUNDS[name] || SOUNDS.click)();
        } catch { /* audio unavailable */ }
    }

    function syncToggles() {
        document.querySelectorAll('[data-sound-toggle]').forEach((b) => {
            b.setAttribute('aria-pressed', String(enabled));
            b.setAttribute('aria-label', enabled ? 'Mute interface sounds' : 'Turn interface sounds on');
            const i = b.querySelector('i'); if (i) i.className = enabled ? 'fas fa-volume-high' : 'fas fa-volume-xmark';
        });
    }
    function setEnabled(v) {
        enabled = !!v;
        try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch { /* private mode */ }
        syncToggles();
        document.dispatchEvent(new CustomEvent('sfx:toggle', { detail: enabled }));
    }

    // Every button / link / card gets a click sound on press (fires on pointerdown for zero latency)
    document.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const el = e.target.closest('button, a[href], [role="button"], .store-card, input[type="checkbox"], select, summary, label.cursor-pointer');
        if (!el || el.closest('[data-sfx="none"]') || el.matches('[data-sound-toggle]')) return;
        play(el.dataset.sfx || 'click');
    }, { passive: true });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('[data-sound-toggle]')) return;
        setEnabled(!enabled);
        if (enabled) play('toggle');
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncToggles); else syncToggles();

    return {
        play, tone, noise, setEnabled,
        get enabled() { return enabled; },
        ctx: () => init(),
        out: () => (init(), master),
    };
})();
