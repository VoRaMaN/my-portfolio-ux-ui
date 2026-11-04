/* =========================================================================
   Comet Dash: a 30-second arcade mini-game on the homepage, with a Top 10
   leaderboard stored in Supabase (portfolio_scores, game = 'comet').
   Mouse / touch: steer the ship. Keys: arrows or WASD, Space/Enter to start.
   Grab stars (combo multiplier), dodge comets, pick up magnet and shield.
   ========================================================================= */
(() => {
    const root = document.getElementById('arcade');
    const cv = document.getElementById('arcade-cv');
    if (!root || !cv) return;
    const F = window.Features || null;
    const ui = document.getElementById('arcade-ui'), board = document.getElementById('arcade-board');
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const ls = F?.ls || { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } } };
    const t = (k, en) => (F ? F.t(k, en) : en);
    const sfx = (n) => { try { window.SFX?.play(n); } catch { /* */ } };
    const tone = (f, o) => { try { window.SFX?.tone?.(f, o); } catch { /* */ } };
    const g = cv.getContext('2d');
    const DUR = 30, GAME = 'comet';

    let W = 0, H = 0, M = 0, dpr = 1, raf = 0, last = 0, visible = false;
    const S = {
        mode: 'idle', t: 0, score: 0, combo: 1, comboT: 0, shields: 3, best: ls.get('pf_comet_best', 0), stars: [], comets: [], pups: [], parts: [], pops: [],
        ship: { x: 0.5, y: 0.78, vx: 0, vy: 0, tx: 0.5, ty: 0.78, inv: 0, mag: 0 }, shake: 0, nS: 0, nC: 0, nP: 6, keys: {}, pointer: false, grabbed: 0,
    };
    const bg = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8 }));

    // ---------- sizing + sprites ----------
    function fit() {
        const r = cv.getBoundingClientRect();
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = Math.max(200, r.width); H = Math.max(150, r.height); M = Math.min(W, H);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (S.mode !== 'play') draw();
    }
    const glow = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
        return c;
    })();
    function blob(x, y, r, color, a = 1) {
        g.globalAlpha = a; g.globalCompositeOperation = 'lighter';
        g.drawImage(glow, x - r, y - r, r * 2, r * 2);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        if (color) { g.fillStyle = color; }
    }
    function starShape(x, y, r, rot) {
        g.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = rot + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
            g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        g.closePath();
    }

    // ---------- game flow ----------
    function reset() {
        Object.assign(S, { t: 0, score: 0, combo: 1, comboT: 0, shields: 3, stars: [], comets: [], pups: [], parts: [], pops: [], shake: 0, nS: 0.2, nC: 1.2, nP: 6 + Math.random() * 3, grabbed: 0 });
        Object.assign(S.ship, { x: 0.5, y: 0.78, vx: 0, vy: 0, tx: 0.5, ty: 0.78, inv: 0, mag: 0 });
    }
    function start() {
        reset(); S.mode = 'play'; ui.innerHTML = ''; ui.classList.add('hide');
        cv.focus({ preventScroll: true });
        sfx('whoosh'); F?.track('game:start', { game: GAME });
        loop0();
    }
    function end() {
        S.mode = 'over';
        const score = Math.round(S.score), isBest = score > S.best;
        if (isBest) { S.best = score; ls.set('pf_comet_best', score); }
        sfx(isBest ? 'legendary' : 'success');
        F?.unlock('arcade'); if (score >= 500) F?.unlock('highscore');
        F?.track('game:score', { game: GAME, score });
        const name = ls.get('pf_comet_name', '');
        ui.classList.remove('hide');
        ui.innerHTML = `<div class="arc-card">
            <p class="pf-kicker">${isBest ? 'New personal best!' : 'Time!'}</p>
            <p class="arc-big">${score.toLocaleString()}</p>
            <p class="text-xs text-gray-400 mb-4">${S.grabbed} stars · best ${S.best.toLocaleString()}</p>
            ${score > 0 ? `<form class="arc-save flex gap-2 mb-3"><label class="sr-only" for="arc-name">${esc(t('mini.name', 'Your name'))}</label><input id="arc-name" class="pf-input !py-2" maxlength="16" placeholder="${esc(t('mini.name', 'Your name'))}" value="${esc(name)}" required autocomplete="nickname"><button class="pf-btn primary !px-4 shrink-0" type="submit"><i class="fas fa-trophy"></i><span class="hidden sm:inline">${esc(t('mini.save', 'Save'))}</span></button></form>` : ''}
            <button class="pf-btn w-full" data-arc-start><i class="fas fa-rotate-right"></i>${esc(t('mini.again', 'Play again'))}</button>
        </div>`;
        const form = ui.querySelector('.arc-save');
        if (form) form.addEventListener('submit', (e) => { e.preventDefault(); saveScore(form, score); });
        draw();
    }
    async function saveScore(form, score) {
        const name = form.querySelector('input').value.trim().slice(0, 16);
        if (!name) return;
        ls.set('pf_comet_name', name);
        const btn = form.querySelector('button'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
            if (!F) throw new Error('offline');
            const rows = await F.post('portfolio_scores', { game: GAME, name, score }, 'return=representation');
            const id = rows?.[0]?.id;
            if (id) ls.set('pf_comet_ids', [...ls.get('pf_comet_ids', []), id].slice(-30));
            form.outerHTML = '<p class="text-sm text-green-400 mb-3"><i class="fas fa-check mr-1"></i>Saved to the leaderboard</p>';
            loadBoard();
        } catch {
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-rotate-right"></i>';
            form.insertAdjacentHTML('afterend', '<p class="text-xs text-red-400 mb-3">Couldn’t reach the leaderboard. Try again.</p>');
        }
    }
    async function loadBoard() {
        if (!board) return;
        let rows = null;
        try { rows = F ? await F.get(`portfolio_scores?game=eq.${GAME}&select=id,name,score&order=score.desc,created_at.asc&limit=10`) : null; } catch { rows = null; }
        const mine = new Set(ls.get('pf_comet_ids', []));
        if (!rows) { board.innerHTML = `<li class="text-sm text-gray-400">Leaderboard offline. Your best: <b class="text-white">${S.best.toLocaleString()}</b></li>`; return; }
        if (!rows.length) { board.innerHTML = '<li class="text-sm text-gray-400">No scores yet. Be the first!</li>'; return; }
        board.innerHTML = rows.map((r, i) => `<li class="arc-row ${mine.has(r.id) ? 'me' : ''}"><span class="arc-rank r${i + 1}">${i + 1}</span><span class="flex-1 truncate">${esc(r.name)}</span><b>${Number(r.score).toLocaleString()}</b></li>`).join('');
    }
    function idleUi() {
        ui.classList.remove('hide');
        ui.innerHTML = `<div class="arc-card">
            <p class="pf-kicker">Comet Dash</p>
            <p class="arc-title">30 seconds.<br>Grab stars, dodge comets.</p>
            <p class="text-xs text-gray-400 mb-5"><i class="fas fa-computer-mouse mr-1"></i>Mouse / touch to steer · <kbd>←↑→↓</kbd> or <kbd>WASD</kbd>${S.best ? ` · best <b class="text-white">${S.best.toLocaleString()}</b>` : ''}</p>
            <button class="pf-btn primary w-full" data-arc-start><i class="fas fa-play"></i>${esc(t('mini.play', 'Play'))}</button>
        </div>`;
    }

    // ---------- spawning ----------
    const rnd = (a, b) => a + Math.random() * (b - a);
    function spawn(dt) {
        const d = S.t / DUR;
        S.nS -= dt; S.nC -= dt; S.nP -= dt;
        if (S.nS <= 0) { S.nS = rnd(0.32, 0.55) - d * 0.12; S.stars.push({ x: rnd(0.06, 0.94), y: -0.05, vy: rnd(0.22, 0.3) + d * 0.18, ph: Math.random() * 6, rot: Math.random() * 6 }); }
        if (S.nC <= 0) {
            S.nC = Math.max(0.28, rnd(0.75, 1.1) - d * 0.6);
            const r = rnd(0.022, 0.045) * (1 + d * 0.4);
            const side = Math.random() < 0.25 + d * 0.25;
            S.comets.push(side
                ? { x: Math.random() < 0.5 ? -0.05 : 1.05, y: rnd(0.05, 0.5), vx: 0, vy: rnd(0.25, 0.4) + d * 0.3, r }
                : { x: rnd(0.05, 0.95), y: -0.08, vx: rnd(-0.08, 0.08), vy: rnd(0.38, 0.6) + d * 0.45, r });
            const c = S.comets[S.comets.length - 1];
            if (side) c.vx = (c.x < 0 ? 1 : -1) * rnd(0.22, 0.35);
        }
        if (S.nP <= 0) { S.nP = rnd(6, 9); S.pups.push({ x: rnd(0.1, 0.9), y: -0.05, vy: 0.2, k: S.shields < 3 && Math.random() < 0.5 ? 'shield' : 'mag', ph: 0 }); }
    }
    function burst(x, y, color, n = 14, sp = 0.5) {
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = rnd(0.1, 1) * sp; S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.4, 0.8), max: 0.8, c: color }); }
    }

    // ---------- update ----------
    function update(dt) {
        S.t += dt;
        if (S.t >= DUR || S.shields <= 0) { end(); return; }
        spawn(dt);
        const sh = S.ship, a = W / H;
        // steer
        let kx = (S.keys.ArrowRight || S.keys.d ? 1 : 0) - (S.keys.ArrowLeft || S.keys.a ? 1 : 0);
        let ky = (S.keys.ArrowDown || S.keys.s ? 1 : 0) - (S.keys.ArrowUp || S.keys.w ? 1 : 0);
        if (kx || ky) { S.pointer = false; sh.tx = Math.min(0.97, Math.max(0.03, sh.x + kx * 0.9 * dt / a)); sh.ty = Math.min(0.95, Math.max(0.2, sh.y + ky * 0.9 * dt)); }
        const k = 1 - Math.pow(0.0008, dt);
        const nx = sh.x + (sh.tx - sh.x) * k, ny = sh.y + (sh.ty - sh.y) * k;
        sh.vx = (nx - sh.x) / dt; sh.vy = (ny - sh.y) / dt; sh.x = nx; sh.y = ny;
        sh.inv = Math.max(0, sh.inv - dt); sh.mag = Math.max(0, sh.mag - dt);
        S.comboT -= dt; if (S.comboT <= 0 && S.combo > 1) S.combo = 1;
        S.shake = Math.max(0, S.shake - dt * 3);
        const px = sh.x * W, py = sh.y * H, R = M * 0.035;
        // stars
        for (const s of S.stars) {
            s.y += s.vy * dt; s.ph += dt * 3; s.rot += dt * 1.5;
            if (sh.mag > 0) { const dx = sh.x - s.x, dy = sh.y - s.y, dd = Math.hypot(dx * W, dy * H); if (dd < M * 0.45) { s.x += (dx / Math.max(0.0001, dd / M)) * dt * 0.9 * (H / W) * 0.6; s.y += (dy / Math.max(0.0001, dd / M)) * dt * 0.9 * 0.6; } }
            const sx = (s.x + Math.sin(s.ph) * 0.01) * W, sy = s.y * H;
            if (Math.hypot(sx - px, sy - py) < R + M * 0.03) {
                s.dead = true; S.grabbed++;
                S.combo = Math.min(8, S.combo + (S.comboT > 0 ? 1 : 0)); S.comboT = 1.6;
                const pts = 10 * S.combo; S.score += pts;
                S.pops.push({ x: sx, y: sy, txt: `+${pts}`, life: 0.8 });
                burst(sx / W, sy / H, '#facc15', 10, 0.35);
                tone(660 + S.combo * 70, { type: 'triangle', dur: 0.08, vol: 0.08 });
            }
            if (s.y > 1.08) s.dead = true;
        }
        // comets
        for (const c of S.comets) {
            c.x += c.vx * dt; c.y += c.vy * dt;
            const cx = c.x * W, cy = c.y * H;
            if (sh.inv <= 0 && Math.hypot(cx - px, cy - py) < R * 0.8 + c.r * M) {
                c.dead = true; S.shields--; S.combo = 1; S.comboT = 0; sh.inv = 1.3; S.shake = 1;
                burst(c.x, c.y, '#fb7185', 26, 0.8);
                sfx('drop'); try { navigator.vibrate?.(60); } catch { /* */ }
            }
            if (c.y > 1.15 || c.x < -0.2 || c.x > 1.2) c.dead = true;
        }
        // power-ups
        for (const p of S.pups) {
            p.y += p.vy * dt; p.ph += dt * 4;
            if (Math.hypot(p.x * W - px, p.y * H - py) < R + M * 0.035) {
                p.dead = true;
                if (p.k === 'mag') { sh.mag = 5; S.pops.push({ x: p.x * W, y: p.y * H, txt: 'MAGNET', life: 1 }); }
                else { S.shields = Math.min(5, S.shields + 1); S.pops.push({ x: p.x * W, y: p.y * H, txt: '+SHIELD', life: 1 }); }
                burst(p.x, p.y, p.k === 'mag' ? '#60a5fa' : '#4ade80', 18, 0.5); sfx('success');
            }
            if (p.y > 1.08) p.dead = true;
        }
        for (const p of S.parts) { p.x += p.vx * dt * (H / W); p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt; }
        for (const p of S.pops) { p.y -= 40 * dt; p.life -= dt; }
        S.stars = S.stars.filter((x) => !x.dead); S.comets = S.comets.filter((x) => !x.dead); S.pups = S.pups.filter((x) => !x.dead);
        S.parts = S.parts.filter((x) => x.life > 0); S.pops = S.pops.filter((x) => x.life > 0);
    }

    // ---------- draw ----------
    function draw(time = performance.now()) {
        if (!W) return;
        const sh = S.ship;
        g.save();
        if (S.shake > 0) g.translate((Math.random() - 0.5) * 14 * S.shake, (Math.random() - 0.5) * 14 * S.shake);
        const bgG = g.createLinearGradient(0, 0, 0, H); bgG.addColorStop(0, '#07051a'); bgG.addColorStop(1, '#1a0b2e');
        g.fillStyle = bgG; g.fillRect(-20, -20, W + 40, H + 40);
        // parallax stars
        const sp = S.mode === 'play' ? 0.18 + S.t / DUR * 0.25 : 0.05;
        g.fillStyle = '#fff';
        for (const b of bg) {
            b.y += sp * b.z * 0.016; if (b.y > 1) { b.y = 0; b.x = Math.random(); }
            g.globalAlpha = 0.25 + b.z * 0.6; g.fillRect(b.x * W, b.y * H, b.z * 2, b.z * 2 + (S.mode === 'play' ? b.z * 6 * sp : 0));
        }
        g.globalAlpha = 1;
        // stars
        for (const s of S.stars) {
            const x = (s.x + Math.sin(s.ph) * 0.01) * W, y = s.y * H, r = M * 0.026;
            blob(x, y, r * 2.4, null, 0.55);
            g.fillStyle = '#facc15'; starShape(x, y, r, s.rot); g.fill();
        }
        // power-ups
        for (const p of S.pups) {
            const x = p.x * W, y = p.y * H, r = M * 0.03 * (1 + Math.sin(p.ph) * 0.08);
            blob(x, y, r * 2.6, null, 0.5);
            g.fillStyle = p.k === 'mag' ? '#60a5fa' : '#4ade80'; g.beginPath(); g.arc(x, y, r, 0, 6.28); g.fill();
            g.fillStyle = '#05040d'; g.font = `900 ${Math.round(r * 1.1)}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(p.k === 'mag' ? 'M' : '+', x, y + 1);
        }
        // comets
        for (const c of S.comets) {
            const x = c.x * W, y = c.y * H, r = c.r * M, sp2 = Math.hypot(c.vx, c.vy) || 1;
            const tx = x - (c.vx / sp2) * r * 7, ty = y - (c.vy / sp2) * r * 7;
            const tg = g.createLinearGradient(x, y, tx, ty); tg.addColorStop(0, 'rgba(251,113,133,.85)'); tg.addColorStop(1, 'rgba(198,58,235,0)');
            g.strokeStyle = tg; g.lineWidth = r * 1.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.stroke();
            blob(x, y, r * 2.2, null, 0.6);
            g.fillStyle = '#fecdd3'; g.beginPath(); g.arc(x, y, r * 0.75, 0, 6.28); g.fill();
        }
        // particles
        for (const p of S.parts) { g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.c; g.fillRect(p.x * W - 2, p.y * H - 2, 4, 4); }
        g.globalAlpha = 1;
        // ship
        if (S.mode === 'play' || S.mode === 'over') {
            const x = sh.x * W, y = sh.y * H, R = M * 0.035, tilt = Math.max(-0.5, Math.min(0.5, sh.vx * 0.4));
            if (!(sh.inv > 0 && Math.floor(time / 90) % 2)) {
                if (sh.mag > 0) { g.strokeStyle = 'rgba(96,165,250,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, M * 0.12 + Math.sin(time / 120) * 4, 0, 6.28); g.stroke(); }
                g.save(); g.translate(x, y); g.rotate(tilt);
                const fl = R * (0.9 + Math.random() * 0.6);
                g.fillStyle = '#fb923c'; g.beginPath(); g.moveTo(-R * 0.35, R * 0.7); g.lineTo(0, R * 0.7 + fl); g.lineTo(R * 0.35, R * 0.7); g.fill();
                blob(0, R * 0.2, R * 2.4, null, 0.5);
                const sg = g.createLinearGradient(0, -R, 0, R); sg.addColorStop(0, '#f0abfc'); sg.addColorStop(1, '#7c3aed');
                g.fillStyle = sg; g.beginPath(); g.moveTo(0, -R * 1.15); g.lineTo(R * 0.9, R * 0.8); g.lineTo(0, R * 0.45); g.lineTo(-R * 0.9, R * 0.8); g.closePath(); g.fill();
                g.fillStyle = '#e0f2fe'; g.beginPath(); g.ellipse(0, -R * 0.2, R * 0.18, R * 0.32, 0, 0, 6.28); g.fill();
                g.restore();
            }
        }
        // score pops
        g.textAlign = 'center'; g.textBaseline = 'middle';
        for (const p of S.pops) { g.globalAlpha = Math.min(1, p.life * 2); g.fillStyle = '#fff'; g.font = `800 ${Math.round(M * 0.04)}px Inter, sans-serif`; g.fillText(p.txt, p.x, p.y); }
        g.globalAlpha = 1;
        g.restore();
        // HUD
        if (S.mode === 'play') {
            const left = Math.max(0, DUR - S.t), pad = 14;
            g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, 0, W, 5);
            const tg = g.createLinearGradient(0, 0, W, 0); tg.addColorStop(0, '#c63aeb'); tg.addColorStop(1, left < 6 ? '#fb7185' : '#60a5fa');
            g.fillStyle = tg; g.fillRect(0, 0, W * (left / DUR), 5);
            g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = '#fff';
            g.font = `900 ${Math.round(Math.max(18, M * 0.06))}px Inter, sans-serif`; g.fillText(Math.round(S.score).toLocaleString(), pad, pad);
            if (S.combo > 1) { g.fillStyle = '#facc15'; g.font = `800 ${Math.round(Math.max(12, M * 0.035))}px Inter, sans-serif`; g.fillText(`×${S.combo} combo`, pad, pad + Math.max(22, M * 0.07)); }
            g.textAlign = 'right'; g.fillStyle = left < 6 ? '#fb7185' : '#fff'; g.font = `800 ${Math.round(Math.max(16, M * 0.05))}px ui-monospace, Menlo, monospace`;
            g.fillText(`${left.toFixed(1)}s`, W - pad, pad);
            g.font = `${Math.round(Math.max(13, M * 0.035))}px sans-serif`; g.fillStyle = '#fb7185';
            g.fillText('♥'.repeat(Math.max(0, S.shields)), W - pad, pad + Math.max(22, M * 0.065));
        }
    }

    // ---------- loop ----------
    function frame(now) {
        raf = 0;
        const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
        if (S.mode === 'play') update(dt);
        draw(now);
        if ((S.mode === 'play' || visible) && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function loop0() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }

    // ---------- input ----------
    function aim(e) {
        const r = cv.getBoundingClientRect();
        S.ship.tx = Math.min(0.97, Math.max(0.03, (e.clientX - r.left) / r.width));
        S.ship.ty = Math.min(0.95, Math.max(0.15, (e.clientY - r.top) / r.height - (e.pointerType === 'touch' ? 0.08 : 0)));
        S.pointer = true;
    }
    cv.addEventListener('pointermove', (e) => { if (S.mode === 'play') aim(e); });
    cv.addEventListener('pointerdown', (e) => { if (S.mode === 'play') { aim(e); if (e.pointerType !== 'mouse') cv.setPointerCapture(e.pointerId); } });
    cv.addEventListener('keydown', (e) => {
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (S.mode !== 'play' && (k === ' ' || k === 'Enter')) { e.preventDefault(); start(); return; }
        if (S.mode === 'play' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' '].includes(k)) { e.preventDefault(); S.keys[k] = true; }
    });
    cv.addEventListener('keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; S.keys[k] = false; });
    cv.addEventListener('blur', () => { S.keys = {}; });
    ui.addEventListener('click', (e) => { if (e.target.closest('[data-arc-start]')) start(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && (visible || S.mode === 'play')) loop0(); });
    new IntersectionObserver((es) => {
        visible = es[0].isIntersecting;
        if (visible) { loop0(); loadBoardOnce(); }
    }, { threshold: 0.15 }).observe(cv);
    let boardLoaded = false;
    const loadBoardOnce = () => { if (!boardLoaded) { boardLoaded = true; loadBoard(); } };
    new ResizeObserver(fit).observe(cv);
    document.addEventListener('pf:lang', () => { if (S.mode === 'idle') idleUi(); });

    fit(); idleUi();
    window.Arcade = { start, loadBoard };
})();
