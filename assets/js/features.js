/* =========================================================================
   Site features
   - Privacy-friendly analytics beacon (no cookies, no IP; honours Do Not Track)
   - Control center: theme switcher, Khmer/English, cursor companion, reduce motion
   - Achievements + trophy drawer, terminal mode (~), konami code
   - Sound-reactive aurora (Beat Lab), "Hire me" 3-step form, availability,
     testimonials, metrics, live GitHub/store stats
   Exposes window.Features (F) for showcase.js / arcade.js / lab / beatlab.
   ========================================================================= */
(() => {
    const PF = window.PF, SITE = window.SITE || {};
    if (!PF) return;
    const { C, esc } = PF;
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const ls = {
        get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
        set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
    };
    const sfx = (n) => { try { window.SFX?.play(n); } catch { /* audio off */ } };
    const osReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const HDR = { apikey: C.SUPABASE_ANON_KEY, Authorization: `Bearer ${C.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };

    // ---------- REST helpers ----------
    async function post(path, body, prefer = 'return=minimal') {
        const r = await fetch(`${C.SUPABASE_URL}/rest/v1/${path}`, { method: 'POST', headers: { ...HDR, Prefer: prefer }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
        const t = await r.text();
        return t ? JSON.parse(t) : null;
    }
    const rpc = (fn, args) => post(`rpc/${fn}`, args || {}, 'return=representation');
    const get = (path) => PF.rest(path);
    let settingsP = null;
    const settings = () => (settingsP ||= get('portfolio_settings?key=eq.site&select=value').then((r) => r?.[0]?.value || {}).catch(() => ({})));

    // ---------- Analytics ----------
    const noTrack = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true || ls.get('pf_notrack', false) || /^(localhost|127\.)/.test(location.hostname);
    const SID = (() => {
        const mk = () => (Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/[^a-z0-9]/g, '').slice(0, 14).padEnd(8, '0');
        try { let s = sessionStorage.getItem('pf_sid'); if (!s) { s = mk(); sessionStorage.setItem('pf_sid', s); } return s; } catch { return mk(); }
    })();
    const REF = (() => {
        const u = new URLSearchParams(location.search).get('utm_source') || new URLSearchParams(location.search).get('ref');
        if (u) return u.slice(0, 60);
        try { const h = document.referrer ? new URL(document.referrer).hostname : ''; return h && h !== location.hostname ? h : ''; } catch { return ''; }
    })();
    function track(name, meta) {
        if (noTrack || !/^[a-z0-9_:.-]{1,40}$/.test(name)) return;
        const body = { name, path: (location.pathname.split('/').pop() + location.hash).slice(0, 200) || '/', ref: REF || null, session: SID, meta: meta || null };
        try {
            fetch(`${C.SUPABASE_URL}/rest/v1/portfolio_events`, { method: 'POST', keepalive: true, headers: { ...HDR, Prefer: 'return=minimal' }, body: JSON.stringify(body) }).catch(() => {});
        } catch { /* offline */ }
    }

    // ---------- i18n ----------
    let lang = ls.get('pf_lang', 'en') === 'km' ? 'km' : 'en';
    const KM = SITE.KM || {};
    const t = (key, en) => (lang === 'km' && KM[key] ? KM[key] : en);
    let kmFont = false;
    function applyLang() {
        document.documentElement.lang = lang === 'km' ? 'km' : 'en';
        if (lang === 'km' && !kmFont) {
            kmFont = true;
            const l = document.createElement('link'); l.rel = 'stylesheet';
            l.href = 'https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@300;400;600;700&display=swap';
            document.head.appendChild(l);
        }
        translate(document);
        document.dispatchEvent(new CustomEvent('pf:lang', { detail: lang }));
    }
    // Swap text inside `root` (no event, safe to call from renderers)
    function translate(root) {
        $$('[data-i18n]', root).forEach((el) => {
            if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
            const k = KM[el.dataset.i18n];
            el.innerHTML = lang === 'km' && k ? esc(k) : el.dataset.en;
        });
        $$('[data-i18n-ph]', root).forEach((el) => {
            if (el.dataset.enPh === undefined) el.dataset.enPh = el.getAttribute('placeholder') || '';
            const k = KM[el.dataset.i18nPh];
            el.setAttribute('placeholder', lang === 'km' && k ? k : el.dataset.enPh);
        });
    }
    function setLang(l) {
        lang = l === 'km' ? 'km' : 'en'; ls.set('pf_lang', lang); applyLang();
        if (cc) { const on = cc.classList.contains('on'); cc.parentNode?.removeChild(cc); cc = null; if (on) toggleCC(true); }
        if (lang === 'km') unlock('polyglot');
        track('lang', { lang });
    }

    // ---------- Theme ----------
    const THEMES = [
        { id: 'aurora', n: 'Aurora', sw: 'linear-gradient(135deg,#C63AEB,#3b82f6)' },
        { id: 'cyber', n: 'Cyber', sw: 'linear-gradient(135deg,#00f0ff,#ff00aa)' },
        { id: 'retro', n: 'Retro', sw: 'repeating-linear-gradient(90deg,#ff004d 0 8px,#ffec27 8px 16px,#29adff 16px 24px)' },
        { id: 'minimal', n: 'Minimal', sw: 'linear-gradient(135deg,#fff,#555)' },
    ];
    let theme = ls.get('pf_theme', 'aurora');
    if (!THEMES.some((x) => x.id === theme)) theme = 'aurora';
    function applyTheme() {
        if (theme === 'aurora') delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = theme;
        const meta = $('meta[name="theme-color"]'); if (meta) meta.content = { cyber: '#05040d', retro: '#1d2b53', minimal: '#0b0b0b' }[theme] || '#060606';
    }
    function setTheme(id) {
        if (!THEMES.some((x) => x.id === id)) return false;
        theme = id; ls.set('pf_theme', id); applyTheme(); syncCC(); sfx('toggle');
        if (id !== 'aurora') unlock('stylist');
        track('theme', { id });
        return true;
    }

    // ---------- Reduce motion ----------
    let reduce = ls.get('pf_reduce', osReduce);
    const applyReduce = () => document.documentElement.classList.toggle('pf-reduce', !!reduce);

    // ---------- Achievements ----------
    const ACH = [
        { id: 'hello', i: 'fa-hand', t: 'Hello, world', d: 'Visit the portfolio' },
        { id: 'explorer', i: 'fa-compass', t: 'Explorer', d: 'Scroll all the way to the footer' },
        { id: 'case', i: 'fa-folder-open', t: 'Case closed', d: 'Read a case study' },
        { id: 'store', i: 'fa-store', t: 'Window shopper', d: 'Open the game store' },
        { id: 'player', i: 'fa-gamepad', t: 'Player one', d: 'Launch one of my games' },
        { id: 'arcade', i: 'fa-meteor', t: 'Comet rider', d: 'Finish the 30-second challenge' },
        { id: 'highscore', i: 'fa-ranking-star', t: 'High scorer', d: 'Score 500+ in the challenge' },
        { id: 'producer', i: 'fa-drum', t: 'Producer', d: 'Play a beat in Beat Lab 808' },
        { id: 'dj', i: 'fa-compact-disc', t: 'Song writer', d: 'Chain patterns in Beat Lab song mode' },
        { id: 'collector', i: 'fa-layer-group', t: 'Collector', d: 'Collect 5 different cards' },
        { id: 'completionist', i: 'fa-crown', t: 'Completionist', d: 'Collect every card' },
        { id: 'hacker', i: 'fa-terminal', t: 'Hacker', d: 'Open the terminal (press ~)' },
        { id: 'stylist', i: 'fa-palette', t: 'Stylist', d: 'Switch the site theme' },
        { id: 'polyglot', i: 'fa-language', t: 'Polyglot', d: 'Read the site in Khmer' },
        { id: 'labrat', i: 'fa-flask', t: 'Lab rat', d: 'Open 3 experiments full screen' },
        { id: 'fan', i: 'fa-heart', t: 'Fan', d: 'Heart a UI Lab experiment' },
        { id: 'room', i: 'fa-cube', t: 'House guest', d: 'Enter the 3D room' },
        { id: 'press', i: 'fa-newspaper', t: 'Press pass', d: 'Open a press kit' },
        { id: 'reader', i: 'fa-book-open', t: 'Devlog reader', d: 'Read a devlog post' },
        { id: 'hire', i: 'fa-handshake', t: 'Let’s build', d: 'Send a project request' },
        { id: 'konami', i: 'fa-arrow-up', t: 'Old school', d: '↑ ↑ ↓ ↓ ← → ← → B A' },
        { id: 'night', i: 'fa-moon', t: 'Night owl', d: 'Visit between midnight and 5 am' },
    ];
    const got = new Set(ls.get('pf_ach', []));
    let achQ = [], achBusy = false;
    function unlock(id) {
        if (got.has(id)) return false;
        const a = ACH.find((x) => x.id === id); if (!a) return false;
        got.add(id); ls.set('pf_ach', [...got]);
        document.dispatchEvent(new CustomEvent('pf:ach', { detail: id }));
        achQ.push(a); showAch(); badge(); renderTrophies();
        track('ach', { id });
        pet.say(`${a.t}!`, 2200);
        return true;
    }
    function showAch() {
        if (achBusy || !achQ.length) return;
        achBusy = true;
        const a = achQ.shift();
        const el = document.createElement('div');
        el.className = 'pf-ach-toast'; el.setAttribute('role', 'status');
        el.innerHTML = `<span class="pf-ach-ic"><i class="fas ${a.i}"></i></span><span><span class="block text-[10px] font-bold tracking-[.2em] text-yellow-300 uppercase">Achievement unlocked</span><span class="block font-bold">${esc(a.t)}</span><span class="block text-xs pf-muted">${esc(a.d)}</span></span>`;
        el.addEventListener('click', () => openTrophies());
        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
        sfx('legendary');
        setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.remove(); achBusy = false; showAch(); }, 500); }, 3200);
    }
    function badge() { $$('[data-pf-trophy-count]').forEach((b) => { b.textContent = got.size; b.hidden = !got.size; }); }

    // Drawer (shared by trophies; showcase.js reuses it for the binder)
    function drawer(title, html) {
        closeDrawer();
        const scrim = document.createElement('div'); scrim.className = 'pf-scrim';
        const d = document.createElement('aside'); d.className = 'pf-drawer'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', title);
        d.innerHTML = `<div class="pf-sheet-bar"><h2>${esc(title)}</h2><button class="pf-x" data-close aria-label="${esc(t('ui.close', 'Close'))}"><i class="fas fa-xmark"></i></button></div><div class="pf-sheet-body p-4">${html}</div>`;
        document.body.append(scrim, d);
        requestAnimationFrame(() => { scrim.classList.add('on'); d.classList.add('on'); });
        const close = () => closeDrawer();
        scrim.addEventListener('click', close); d.querySelector('[data-close]').addEventListener('click', close);
        d.querySelector('[data-close]').focus({ preventScroll: true });
        openDrawerEl = { d, scrim };
        return d;
    }
    let openDrawerEl = null;
    function closeDrawer() {
        if (!openDrawerEl) return false;
        const { d, scrim } = openDrawerEl; openDrawerEl = null;
        d.classList.remove('on'); scrim.classList.remove('on');
        setTimeout(() => { d.remove(); scrim.remove(); }, 450);
        return true;
    }
    function trophiesHtml() {
        const pct = Math.round((got.size / ACH.length) * 100);
        return `<div class="mb-5"><div class="flex justify-between text-sm mb-2"><span class="font-bold">${got.size} / ${ACH.length}</span><span class="pf-muted">${pct}%</span></div><div class="pf-prog"><i style="width:${pct}%"></i></div></div>
            <div class="pf-ach-list">${ACH.map((a) => `<div class="pf-ach ${got.has(a.id) ? '' : 'locked'}"><span class="pf-ach-ic"><i class="fas ${got.has(a.id) ? a.i : 'fa-lock'}"></i></span><span class="min-w-0"><span class="t block font-bold text-sm">${esc(a.t)}</span><span class="block text-xs pf-muted">${esc(a.d)}</span></span></div>`).join('')}</div>`;
    }
    function openTrophies() { const d = drawer(t('ui.trophies', 'Trophies'), trophiesHtml()); d.dataset.kind = 'trophies'; }
    function renderTrophies() { const d = $('.pf-drawer[data-kind="trophies"] .pf-sheet-body'); if (d) d.innerHTML = trophiesHtml(); }

    // ---------- Generic full-screen sheet ----------
    let sheetStack = [];
    function sheet({ title, html, route, onClose, cls = '' }) {
        const el = document.createElement('section');
        el.className = `pf-sheet ${cls}`; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', title);
        el.innerHTML = `<div class="pf-sheet-bar"><h2>${esc(title)}</h2><button class="pf-x" data-close aria-label="${esc(t('ui.close', 'Close'))}"><i class="fas fa-xmark"></i></button></div><div class="pf-sheet-body">${html}</div>`;
        document.body.appendChild(el);
        document.body.classList.add('pf-lock');
        const prev = document.activeElement;
        const entry = { el, route, onClose, prev };
        sheetStack.push(entry);
        requestAnimationFrame(() => el.classList.add('on'));
        el.querySelector('[data-close]').addEventListener('click', () => closeSheet(entry));
        setTimeout(() => el.querySelector('[data-close]')?.focus({ preventScroll: true }), 60);
        sfx('whoosh');
        return el;
    }
    function closeSheet(entry = sheetStack[sheetStack.length - 1], fromRoute) {
        if (!entry) return false;
        sheetStack = sheetStack.filter((x) => x !== entry);
        entry.el.classList.remove('on');
        try { entry.onClose?.(); } catch (e) { console.error(e); }
        setTimeout(() => entry.el.remove(), 400);
        if (!sheetStack.length) document.body.classList.remove('pf-lock');
        if (!fromRoute && entry.route && location.hash === entry.route) history.replaceState(null, '', location.pathname + location.search);
        entry.prev?.focus?.({ preventScroll: true });
        return true;
    }

    // ---------- Router for feature pages (#case/x, #press/x, #devlog, #binder, #room, #trophies, #lab/x, #hire, #terminal) ----------
    const routes = [];
    const addRoute = (re, fn) => routes.push({ re, fn });
    function route() {
        const h = location.hash;
        for (const r of routes) {
            const m = h.match(r.re);
            if (m) { try { r.fn(m); } catch (e) { console.error('[route]', e); } return true;
            }
        }
        // hash changed to something else: close route sheets
        sheetStack.filter((s) => s.route && s.route !== h).forEach((s) => closeSheet(s, true));
        return false;
    }
    window.addEventListener('hashchange', route);
    addRoute(/^#trophies$/, () => { openTrophies(); history.replaceState(null, '', location.pathname + location.search); });
    addRoute(/^#hire$/, () => { openHire(); });
    addRoute(/^#terminal$/, () => { openTerm(); history.replaceState(null, '', location.pathname + location.search); });
    addRoute(/^#lab\/([a-z0-9-]+)$/, (m) => {
        history.replaceState(null, '', location.pathname + location.search);
        openLab(m[1]);
    });
    function openLab(id) {
        const go = () => { const i = window.Lab.DEMOS.findIndex((d) => d.id === id); if (i >= 0) window.Lab.openFocus(i); };
        if (window.Lab) return go();
        document.getElementById('playground')?.scrollIntoView({ behavior: 'smooth' });
        let n = 0; const iv = setInterval(() => { if (window.Lab) { clearInterval(iv); go(); } else if (++n > 60) clearInterval(iv); }, 150);
    }

    // ---------- Control center ----------
    let cc = null;
    function buildCC() {
        cc = document.createElement('div');
        cc.className = 'pf-cc'; cc.id = 'pf-cc'; cc.setAttribute('role', 'dialog'); cc.setAttribute('aria-label', 'Site settings');
        cc.innerHTML = `
            <h4>${esc(t('ui.theme', 'Theme'))}</h4>
            <div class="pf-themes">${THEMES.map((x) => `<button class="pf-theme" data-theme-id="${x.id}" aria-pressed="false"><i style="background:${x.sw}"></i>${x.n}</button>`).join('')}</div>
            <h4>Language</h4>
            <div class="pf-row"><span>Language · ភាសា</span><span class="pf-seg"><button data-lang="en" aria-pressed="false">EN</button><button data-lang="km" aria-pressed="false">ខ្មែរ</button></span></div>
            <h4>Experience</h4>
            <div class="pf-row"><span><i class="fas fa-ghost mr-2 text-brand-purple"></i>Cursor companion</span><button class="pf-switch" role="switch" data-sw="pet" aria-label="Cursor companion"></button></div>
            <div class="pf-row"><span><i class="fas fa-person-walking mr-2 text-brand-purple"></i>Reduce motion</span><button class="pf-switch" role="switch" data-sw="reduce" aria-label="Reduce motion"></button></div>
            <div class="pf-row"><span><i class="fas fa-volume-high mr-2 text-brand-purple"></i>Interface sounds</span><button class="pf-switch" role="switch" data-sw="sound" aria-label="Interface sounds"></button></div>
            <h4>Explore</h4>
            <div class="pf-links">
                <button data-go="trophies"><i class="fas fa-trophy"></i>${esc(t('ui.trophies', 'Trophies'))}</button>
                <button data-go="binder"><i class="fas fa-layer-group"></i>${esc(t('cards.binder', 'Card binder'))}</button>
                <button data-go="room"><i class="fas fa-cube"></i>3D room</button>
                <button data-go="terminal"><i class="fas fa-terminal"></i>Terminal <kbd class="ml-auto text-[10px] pf-muted">~</kbd></button>
                <a href="cv.html"><i class="fas fa-file-arrow-down"></i>${esc(t('cv.download', 'CV'))}</a>
                <a href="design-system.html"><i class="fas fa-swatchbook"></i>${esc(t('footer.ds', 'Design system'))}</a>
                <button data-go="hire"><i class="fas fa-handshake"></i>${esc(t('hire.start', 'Hire me'))}</button>
                <a href="accessibility.html"><i class="fas fa-universal-access"></i>${esc(t('footer.a11y', 'Accessibility'))}</a>
            </div>`;
        document.body.appendChild(cc);
        cc.addEventListener('click', (e) => {
            const th = e.target.closest('[data-theme-id]'); if (th) return setTheme(th.dataset.themeId);
            const lg = e.target.closest('[data-lang]'); if (lg) return setLang(lg.dataset.lang);
            const sw = e.target.closest('[data-sw]');
            if (sw) {
                const k = sw.dataset.sw;
                if (k === 'pet') { pet.toggle(); }
                if (k === 'reduce') { reduce = !reduce; ls.set('pf_reduce', reduce); applyReduce(); }
                if (k === 'sound') { window.SFX?.setEnabled(!window.SFX.enabled); }
                syncCC(); return;
            }
            const go = e.target.closest('[data-go]');
            if (go) { toggleCC(false); action(go.dataset.go); }
        });
        syncCC();
    }
    function syncCC() {
        if (!cc) return;
        $$('[data-theme-id]', cc).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeId === theme)));
        $$('[data-lang]', cc).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
        const sw = (k, v) => $(`[data-sw="${k}"]`, cc)?.setAttribute('aria-checked', String(!!v));
        sw('pet', pet.enabled); sw('reduce', reduce); sw('sound', window.SFX?.enabled);
    }
    function toggleCC(force) {
        if (!cc) buildCC();
        const on = force ?? !cc.classList.contains('on');
        cc.classList.toggle('on', on);
        $$('[data-pf-cc]').forEach((b) => b.setAttribute('aria-expanded', String(on)));
        if (on) { syncCC(); setTimeout(() => cc.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true }), 50); }
    }
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-pf-cc]')) { e.preventDefault(); toggleCC(); return; }
        if (cc?.classList.contains('on') && !e.target.closest('#pf-cc')) toggleCC(false);
        const tr = e.target.closest('[data-pf-trophies]'); if (tr) { e.preventDefault(); openTrophies(); }
        const hi = e.target.closest('[data-hire]'); if (hi) { e.preventDefault(); openHire(hi.dataset.hire || ''); }
    });
    document.addEventListener('sfx:toggle', syncCC);
    function action(name) {
        const S = window.Showcase;
        if (name === 'trophies') return openTrophies();
        if (name === 'terminal') return openTerm();
        if (name === 'hire') return openHire();
        if (name === 'binder') return S ? S.openBinder() : (location.hash = '#binder');
        if (name === 'room') return S ? S.openRoom() : (location.hash = '#room');
        return null;
    }

    // Nav buttons: settings + trophies (inserted next to the sound toggle)
    function navButtons() {
        const slot = $('#site-nav .nav-pill > div:last-child');
        if (!slot || $('[data-pf-cc]', slot)) return;
        slot.insertAdjacentHTML('afterbegin', `
            <button class="pf-navbtn pf-sm-hide" data-pf-trophies aria-label="Trophies"><i class="fas fa-trophy text-sm"></i><span class="pf-badge" data-pf-trophy-count hidden>0</span></button>
            <button class="pf-navbtn" data-pf-cc aria-label="Site settings: theme, language and more" aria-expanded="false" aria-controls="pf-cc"><i class="fas fa-sliders text-sm"></i></button>`);
        badge();
    }

    // ---------- Cursor companion (original pixel mascot) ----------
    const pet = (() => {
        const MAP = [
            '....kkkk....',
            '..kkppppkk..',
            '.kppppppppk.',
            '.kpwwppwwpk.',
            'kppwkppwkppk',
            'kpphppppphpk',
            'kppppmmppppk',
            'kssssssssssk',
            'kpppppsspppk',
            '.kppppssppk.',
            '.kpk.kpk.kp.',
            '..k...k...k.',
        ];
        const BLINK = { 3: '.kppppppppk.', 4: 'kppkkppkkppk' };
        const COL = { k: '#1a0d22', p: '#c63aeb', w: '#ffffff', h: '#f472b6', m: '#3b0a45', s: '#facc15' };
        const LINES = {
            home: ['Hi! I’m Gojo.', 'Press ~ for the terminal', 'Try the 30-sec challenge!'],
            projects: ['Every card is playable!', 'Read a case study →'],
            skills: ['Drag the sphere!', 'Click a skill for proof'],
            games: ['Beat my high score?', 'Play right in the browser'],
            playground: ['Beat Lab is my favourite', 'Heart the ones you like'],
            testimonials: ['Kind words go here'],
            contact: ['Say hi! He replies fast.', 'Start a project?'],
        };
        let enabled = finePointer && !osReduce && ls.get('pf_pet', true);
        let el = null, cv = null, g = null, sayEl = null, raf = 0, x = -100, y = -100, tx = -100, ty = -100, last = 0, blinkT = 0, sayT = 0, flip = false, idle = 0, seenSec = new Set();
        function draw(blink) {
            g.clearRect(0, 0, 12, 12);
            MAP.forEach((row, r) => {
                const line = blink && BLINK[r] ? BLINK[r] : row;
                for (let c = 0; c < 12; c++) { const ch = line[c]; if (ch !== '.' && COL[ch]) { g.fillStyle = COL[ch]; g.fillRect(c, r, 1, 1); } }
            });
        }
        function build() {
            el = document.createElement('div'); el.className = 'pf-pet'; el.setAttribute('aria-hidden', 'true');
            cv = document.createElement('canvas'); cv.width = 12; cv.height = 12; g = cv.getContext('2d');
            sayEl = document.createElement('span'); sayEl.className = 'pf-pet-say';
            el.append(cv, sayEl); document.body.appendChild(el); draw(false);
        }
        function frame(now) {
            raf = 0;
            if (!enabled || !el) return;
            const dt = Math.min(50, now - (last || now)); last = now;
            const k = 1 - Math.pow(0.0035, dt / 1000);
            x += (tx - x) * k; y += (ty - y) * k;
            const bob = Math.sin(now / 260) * 2.5;
            const f = tx < x - 2 ? true : tx > x + 2 ? false : flip;
            if (f !== flip) { flip = f; el.classList.toggle('flip', flip); }
            el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + bob).toFixed(1)}px, 0)`;
            cv.style.transform = flip ? 'scaleX(-1)' : '';
            if (now > blinkT) { draw(true); setTimeout(() => draw(false), 140); blinkT = now + 2200 + Math.random() * 3000; }
            if (Math.abs(tx - x) + Math.abs(ty - y) < 0.5) idle += dt; else idle = 0;
            if (idle < 1500 || sayEl.classList.contains('on')) raf = requestAnimationFrame(frame);
        }
        const kick = () => { if (!raf && enabled && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
        function onMove(e) {
            if (!enabled) return;
            if (!el) build();
            tx = e.clientX + 18; ty = e.clientY + 16;
            if (x < -50) { x = tx; y = ty; }
            kick();
        }
        function say(text, ms = 2600) {
            if (!enabled || !el) return;
            sayEl.textContent = text; sayEl.classList.add('on');
            clearTimeout(sayT); sayT = setTimeout(() => sayEl.classList.remove('on'), ms);
            kick();
        }
        function section(id) {
            const l = LINES[id]; if (!l || seenSec.has(id)) return;
            seenSec.add(id);
            say(l[(Math.random() * l.length) | 0]);
        }
        function toggle() {
            enabled = !enabled; ls.set('pf_pet', enabled);
            if (!enabled && el) { el.remove(); el = null; }
            if (enabled) say('I’m back!');
        }
        if (finePointer) window.addEventListener('pointermove', onMove, { passive: true });
        return { say, section, toggle, get enabled() { return enabled; } };
    })();

    // ---------- Terminal ----------
    let term = null, histT = ls.get('pf_term_hist', []), hi = -1;
    const SECTIONS = { home: '#home', work: '#projects', projects: '#projects', process: '#process', skills: '#skills', games: '#games', challenge: '#arcade', arcade: '#arcade', lab: '#playground', playground: '#playground', testimonials: '#testimonials', contact: '#contact' };
    function openTerm() {
        if (!term) buildTerm();
        term.classList.add('on');
        setTimeout(() => $('input', term).focus({ preventScroll: true }), 30);
        unlock('hacker'); sfx('open');
        track('terminal');
    }
    function closeTerm() { if (!term?.classList.contains('on')) return false; term.classList.remove('on'); return true; }
    function buildTerm() {
        term = document.createElement('div');
        term.className = 'pf-term'; term.setAttribute('role', 'dialog'); term.setAttribute('aria-label', 'Terminal'); term.dataset.sfx = 'none';
        term.innerHTML = `<div class="pf-term-bar"><span style="background:#ff5f57"></span><span style="background:#febc2e"></span><span style="background:#28c840"></span><b class="ml-2">voraman@portfolio: ~</b><button class="ml-auto pf-muted hover:text-white" data-tclose aria-label="Close terminal"><i class="fas fa-xmark"></i></button></div>
            <div class="pf-term-out" aria-live="polite"></div>
            <label class="pf-term-in"><span>➜ ~</span><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command"></label>`;
        document.body.appendChild(term);
        const input = $('input', term), out = $('.pf-term-out', term);
        $('[data-tclose]', term).addEventListener('click', closeTerm);
        out.addEventListener('click', (e) => { const b = e.target.closest('[data-cmd]'); if (b) { run(b.dataset.cmd); input.focus(); } });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { const v = input.value; input.value = ''; hi = -1; run(v); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); if (histT.length) { hi = Math.min(histT.length - 1, hi + 1); input.value = histT[histT.length - 1 - hi]; } }
            else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.max(-1, hi - 1); input.value = hi < 0 ? '' : histT[histT.length - 1 - hi]; }
            else if (e.key === 'Tab') {
                e.preventDefault();
                const v = input.value.trim(); if (!v) return;
                const words = v.split(/\s+/);
                const pool = words.length === 1 ? Object.keys(CMDS) : completions(words[0]);
                const hit = pool.filter((c) => c.startsWith(words[words.length - 1].toLowerCase()));
                if (hit.length === 1) { words[words.length - 1] = hit[0]; input.value = `${words.join(' ')} `; }
                else if (hit.length > 1) print(`<span class="d">${hit.join('  ')}</span>`);
            } else if (e.key === 'Escape') { e.stopPropagation(); closeTerm(); }
            else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
        });
        print(`<span class="w">Voraman OS 2.0</span> <span class="d">— type <button data-cmd="help">help</button> to see commands, <button data-cmd="ls projects">ls projects</button> to browse.</span>`);
    }
    function print(html) {
        const out = $('.pf-term-out', term);
        const div = document.createElement('div'); div.innerHTML = html; out.appendChild(div);
        out.scrollTop = out.scrollHeight;
    }
    const projById = (id) => (SITE.PROJECTS || []).find((p) => p.id === id || p.title.toLowerCase() === id);
    function completions(cmd) {
        if (cmd === 'open' || cmd === 'cd') return [...Object.keys(SECTIONS), 'store', 'beatlab', 'cv', 'design', 'a11y', 'room', 'binder', 'trophies', 'devlog', 'case'];
        if (cmd === 'play') return ['earthfall', 'stick', 'comet'];
        if (cmd === 'theme') return THEMES.map((x) => x.id);
        if (cmd === 'lang') return ['en', 'km'];
        if (cmd === 'cat' || cmd === 'case' || cmd === 'press') return (cmd === 'case' ? Object.keys(SITE.CASES || {}) : (SITE.PROJECTS || []).map((p) => p.id));
        if (cmd === 'ls') return ['projects', 'games', 'lab', 'sections', 'cards', 'achievements', 'skills'];
        return [];
    }
    function goSection(id) {
        const sel = SECTIONS[id]; if (!sel) return false;
        closeTerm(); const el = $(sel); if (!el) return false;
        el.scrollIntoView({ behavior: 'smooth' }); return true;
    }
    const CMDS = {
        help: () => print(`<span class="y">Commands</span>
  <span class="c">ls</span> [projects|games|lab|skills|sections|cards|achievements]
  <span class="c">open</span> &lt;section|store|beatlab|cv|design|a11y|room|binder|trophies|devlog&gt;
  <span class="c">case</span> &lt;game|store|mobile&gt;     <span class="c">press</span> &lt;earthfall|stick-empire-conquest-3d&gt;
  <span class="c">play</span> &lt;earthfall|stick|comet&gt;   <span class="c">cat</span> &lt;project&gt;
  <span class="c">theme</span> &lt;aurora|cyber|retro|minimal&gt;   <span class="c">lang</span> &lt;en|km&gt;
  <span class="c">whoami</span>  <span class="c">hire</span>  <span class="c">stats</span>  <span class="c">pack</span>  <span class="c">clear</span>  <span class="c">exit</span>`),
        ls: (a) => {
            const what = (a[0] || 'sections').toLowerCase();
            if (what === 'projects') return print((SITE.PROJECTS || []).map((p) => `<span class="c">${esc(p.id.padEnd(26))}</span><span class="d">${esc(p.kind)}</span>`).join('\n'));
            if (what === 'games') return print(['earthfall', 'stick-empire-conquest-3d', 'comet (30-second challenge)'].map((g) => `<span class="c">${g}</span>`).join('\n'));
            if (what === 'lab') return print((window.Lab?.DEMOS || []).map((d, i) => `<span class="d">${String(i + 1).padStart(2, '0')}</span> <button data-cmd="open lab/${d.id}">${esc(d.id)}</button> <span class="d">${esc(d.n)}</span>`).join('\n') || '<span class="d">The lab loads when you scroll to it. Try </span><button data-cmd="open lab">open lab</button>');
            if (what === 'skills') return print((SITE.CV?.skillGroups || []).map((g) => `<span class="y">${esc(g.name)}</span>  ${esc(g.items.join(', '))}`).join('\n'));
            if (what === 'cards') { const c = window.Showcase?.cardStats?.(); return print(c ? `${c.have} / ${c.total} cards collected. <button data-cmd="open binder">open binder</button>` : 'Card binder not loaded.'); }
            if (what === 'achievements') return print(ACH.map((x) => `${got.has(x.id) ? '<span class="c">✔</span>' : '<span class="d">·</span>'} ${esc(x.t)} <span class="d">— ${esc(x.d)}</span>`).join('\n'));
            return print(Object.keys(SECTIONS).filter((k, i, arr) => arr.findIndex((z) => SECTIONS[z] === SECTIONS[k]) === i).map((k) => `<button data-cmd="open ${k}">${k}/</button>`).join('  '));
        },
        open: (a) => {
            const w = (a[0] || '').toLowerCase();
            if (!w) return print('<span class="e">open what?</span> try <button data-cmd="ls">ls</button>');
            if (w.startsWith('lab/')) { closeTerm(); return openLab(w.slice(4)); }
            if (goSection(w)) return;
            closeTerm();
            const map = { store: () => (location.hash = '#store'), beatlab: () => openLab('beats'), cv: () => (location.href = 'cv.html'), design: () => (location.href = 'design-system.html'), a11y: () => (location.href = 'accessibility.html'), room: () => action('room'), binder: () => action('binder'), trophies: () => openTrophies(), devlog: () => (location.hash = '#devlog'), case: () => (location.hash = `#case/${a[1] || 'game'}`) };
            if (map[w]) return map[w]();
            openTerm(); print(`<span class="e">open: ${esc(w)}: no such place</span>`);
        },
        cd: (a) => CMDS.open(a),
        case: (a) => { closeTerm(); location.hash = `#case/${(a[0] || 'game').toLowerCase()}`; },
        press: (a) => { closeTerm(); location.hash = `#press/${(a[0] || 'earthfall').toLowerCase()}`; },
        play: (a) => {
            const g = (a[0] || '').toLowerCase();
            if (g.startsWith('earth')) { closeTerm(); return window.openStore?.('earthfall'); }
            if (g.startsWith('stick')) { closeTerm(); return window.openStore?.('stick-empire-conquest-3d', true); }
            if (g.startsWith('comet') || g === 'challenge') { closeTerm(); goSection('arcade'); return setTimeout(() => window.Arcade?.start(), 700); }
            print('usage: play &lt;earthfall|stick|comet&gt;');
        },
        cat: (a) => { const p = projById((a[0] || '').toLowerCase()); if (!p) return print(`<span class="e">cat: ${esc(a[0] || '')}: not found</span> — <button data-cmd="ls projects">ls projects</button>`); print(`<span class="w">${esc(p.title)}</span> <span class="d">(${esc(p.kind)})</span>\n${esc(p.blurb)}\n<span class="d">stack:</span> ${esc(p.skills.join(', '))}\n<a href="${esc(p.link)}">${esc(p.link)}</a>`); },
        whoami: () => { const P = SITE.PROFILE || {}; print(`<span class="w">${esc(P.name)}</span> — ${esc(P.title)}\n${esc(P.summary || '')}\n<span class="d">${esc(P.location || '')} · ${esc(P.email || '')}</span>`); },
        theme: (a) => { if (setTheme((a[0] || '').toLowerCase())) print(`theme → <span class="c">${esc(a[0])}</span>`); else print(`themes: ${THEMES.map((x) => `<button data-cmd="theme ${x.id}">${x.id}</button>`).join('  ')}`); },
        lang: (a) => { setLang((a[0] || 'en').toLowerCase()); print(`lang → ${lang}`); },
        hire: () => { closeTerm(); openHire(); },
        pack: () => { closeTerm(); window.Showcase?.openPack?.(); },
        stats: async () => {
            print('<span class="d">fetching github…</span>');
            const s = await ghStats().catch(() => null);
            if (!s) return print('<span class="e">GitHub API unavailable right now.</span>');
            print(`repos <span class="w">${s.repos}</span> · stars <span class="w">${s.stars}</span> · followers <span class="w">${s.followers}</span>\nlatest push: <span class="c">${esc(s.latest?.name || '-')}</span> <span class="d">${esc(s.latest ? ago(s.latest.pushed_at) : '')}</span>`);
        },
        echo: (a) => print(esc(a.join(' '))),
        date: () => print(new Date().toString()),
        sudo: () => print('<span class="e">Nice try. This incident will be reported to Gojo.</span>'),
        rm: () => print('<span class="e">rm: permission denied (the portfolio stays).</span>'),
        clear: () => { $('.pf-term-out', term).innerHTML = ''; },
        exit: () => closeTerm(),
    };
    function run(line) {
        line = line.trim();
        print(`<span class="c">➜ ~</span> <span class="w">${esc(line)}</span>`);
        if (!line) return;
        histT.push(line); if (histT.length > 50) histT.shift(); ls.set('pf_term_hist', histT);
        const [cmd, ...args] = line.split(/\s+/);
        const fn = CMDS[cmd.toLowerCase()];
        if (!fn) return print(`<span class="e">command not found: ${esc(cmd)}</span> — try <button data-cmd="help">help</button>`);
        try { const r = fn(args); if (r?.catch) r.catch((e) => print(`<span class="e">${esc(e.message)}</span>`)); } catch (e) { print(`<span class="e">${esc(e.message)}</span>`); }
    }

    // ---------- Keyboard: ~ terminal, Esc, konami ----------
    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let kIdx = 0;
    const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    window.addEventListener('keydown', (e) => {
        const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        kIdx = k === KONAMI[kIdx] ? kIdx + 1 : (k === KONAMI[0] ? 1 : 0);
        if (kIdx === KONAMI.length) { kIdx = 0; unlock('konami'); confetti(); pet.say('↑↑↓↓←→←→BA!'); }
        if ((e.key === '`' || e.key === '~') && !typing(e.target) && !document.body.classList.contains('lab-focus-open')) {
            e.preventDefault(); term?.classList.contains('on') ? closeTerm() : openTerm(); return;
        }
        if (e.key === 'Escape') {
            if (closeTerm()) { e.stopImmediatePropagation(); return; }
            if (cc?.classList.contains('on')) { toggleCC(false); e.stopImmediatePropagation(); return; }
            if (openDrawerEl) { closeDrawer(); e.stopImmediatePropagation(); return; }
            if (sheetStack.length) { closeSheet(); e.stopImmediatePropagation(); }
        }
    }, true);

    // ---------- Confetti (tiny canvas burst) ----------
    function confetti(x = innerWidth / 2, y = innerHeight / 3, n = 120) {
        if (reduce) return;
        const cv = document.createElement('canvas'); cv.width = innerWidth; cv.height = innerHeight;
        cv.style.cssText = 'position:fixed;inset:0;z-index:320;pointer-events:none';
        document.body.appendChild(cv);
        const g = cv.getContext('2d'), cols = ['#c63aeb', '#60a5fa', '#facc15', '#f472b6', '#4ade80', '#fff'];
        const P = Array.from({ length: n }, () => ({ x, y, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, s: 4 + Math.random() * 5, c: cols[(Math.random() * cols.length) | 0] }));
        let t0 = performance.now();
        (function f(now) {
            const k = Math.min(2, (now - t0) / 16.7); t0 = now;
            g.clearRect(0, 0, cv.width, cv.height);
            let alive = 0;
            for (const p of P) {
                p.vy += 0.35 * k; p.vx *= 0.99; p.x += p.vx * k; p.y += p.vy * k; p.r += p.vr * k;
                if (p.y < cv.height + 20) alive++;
                g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore();
            }
            if (alive) requestAnimationFrame(f); else cv.remove();
        })(t0);
    }

    // ---------- Sound-reactive aurora ----------
    const pulse = (() => {
        let an = null, buf = null, raf = 0, el = null, title = null, quiet = 0, lvl = 0;
        function attach(a) { an = a; buf = new Uint8Array(an.frequencyBinCount); start(); }
        function start() {
            if (raf || !an || reduce) return;
            if (!el) { el = document.createElement('i'); el.className = 'pf-pulse'; $('.aurora')?.appendChild(el); title = $('#home .hero-title'); }
            quiet = 0; raf = requestAnimationFrame(loop);
        }
        function loop() {
            raf = 0;
            an.getByteFrequencyData(buf);
            let low = 0, all = 0;
            for (let i = 0; i < 10; i++) low += buf[i];
            for (let i = 0; i < 120; i++) all += buf[i];
            const target = Math.min(1, (low / 10 / 255) * 1.15 * 0.75 + (all / 120 / 255) * 0.6);
            lvl += (target - lvl) * (target > lvl ? 0.5 : 0.12);
            if (el) { el.style.opacity = (lvl * 0.95).toFixed(3); el.style.transform = `scale(${(0.7 + lvl * 0.55).toFixed(3)})`; }
            if (title) title.style.textShadow = lvl > 0.04 ? `0 0 ${(lvl * 60).toFixed(0)}px rgba(198,58,235,${(lvl * 0.8).toFixed(2)})` : '';
            quiet = lvl < 0.01 ? quiet + 1 : 0;
            if (quiet < 120 && !document.hidden) raf = requestAnimationFrame(loop);
            else if (el) { el.style.opacity = '0'; if (title) title.style.textShadow = ''; }
        }
        window.addEventListener('pf:analyser', (e) => attach(e.detail));
        document.addEventListener('pf:beatplay', start);
        return { start };
    })();

    // ---------- "Hire me" multi-step form ----------
    const HIRE = {
        types: [
            ['uiux', 'fa-pen-ruler', 'UI/UX design', 'Web or app interface'],
            ['gameui', 'fa-gamepad', 'Game UI / HUD', 'Menus, HUD, store'],
            ['website', 'fa-globe', 'Website', 'Design and build'],
            ['mobile', 'fa-mobile-screen', 'Mobile app', 'iOS / Android UI'],
            ['gamedev', 'fa-dragon', 'Game development', 'Prototype or full game'],
            ['other', 'fa-lightbulb', 'Something else', 'Tell me about it'],
        ],
        budgets: ['Under $500', '$500 – $1,500', '$1,500 – $5,000', '$5,000+', 'Not sure yet'],
        timelines: ['As soon as possible', '2 – 4 weeks', '1 – 3 months', 'Flexible'],
    };
    function openHire(preType) {
        const st = { step: 0, type: preType || '', budget: '', timeline: '' };
        const el = sheet({ title: t('hire.start', 'Start a project'), route: location.hash === '#hire' ? '#hire' : null, html: '<div class="pf-hire"></div>' });
        const box = $('.pf-hire', el);
        track('hire:open');
        const opt = (group, val, icon, label, sub) => `<button type="button" class="pf-opt" data-g="${group}" data-v="${esc(val)}" aria-pressed="${st[group] === val}">${icon ? `<i class="fas ${icon}"></i>` : ''}<b>${esc(label)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</button>`;
        function render() {
            const steps = `<div class="pf-steps">${[0, 1, 2, 3].map((i) => `<i class="${i <= st.step ? 'on' : ''}"></i>`).join('')}</div>`;
            let body = '';
            if (st.step === 0) body = `<p class="pf-kicker mb-2">1 / 4</p><h3 class="text-2xl md:text-3xl font-bold mb-6">${esc(t('hire.type', 'What do you need?'))}</h3><div class="pf-opts">${HIRE.types.map(([v, i, l, s]) => opt('type', v, i, l, s)).join('')}</div>`;
            if (st.step === 1) body = `<p class="pf-kicker mb-2">2 / 4</p><h3 class="text-2xl md:text-3xl font-bold mb-6">${esc(t('hire.budget', 'Budget'))}</h3><div class="pf-opts">${HIRE.budgets.map((b) => opt('budget', b, '', b)).join('')}</div>`;
            if (st.step === 2) body = `<p class="pf-kicker mb-2">3 / 4</p><h3 class="text-2xl md:text-3xl font-bold mb-6">${esc(t('hire.timeline', 'Timeline'))}</h3><div class="pf-opts">${HIRE.timelines.map((b) => opt('timeline', b, '', b)).join('')}</div>`;
            if (st.step === 3) body = `<p class="pf-kicker mb-2">4 / 4</p><h3 class="text-2xl md:text-3xl font-bold mb-2">${esc(t('hire.details', 'Your details'))}</h3>
                <p class="text-sm pf-muted mb-6">${esc(HIRE.types.find((x) => x[0] === st.type)?.[2] || '')} · ${esc(st.budget)} · ${esc(st.timeline)}</p>
                <form class="space-y-4" novalidate>
                    <div><label class="block text-xs font-bold tracking-widest text-gray-400 uppercase mb-2" for="hire-name">${esc(t('contact.name', 'Your name'))}</label><input id="hire-name" class="pf-input" maxlength="80" required autocomplete="name"></div>
                    <div><label class="block text-xs font-bold tracking-widest text-gray-400 uppercase mb-2" for="hire-email">${esc(t('contact.email', 'Your e-mail'))}</label><input id="hire-email" type="email" class="pf-input" maxlength="160" required autocomplete="email"></div>
                    <div><label class="block text-xs font-bold tracking-widest text-gray-400 uppercase mb-2" for="hire-msg">${esc(t('contact.message', 'Message'))}</label><textarea id="hire-msg" class="pf-input" rows="4" maxlength="4000" placeholder="Goals, links, anything that helps"></textarea></div>
                    <input type="text" name="website" class="hidden" tabindex="-1" autocomplete="off" aria-hidden="true">
                    <p class="hire-err text-sm text-red-400 hidden" role="alert"></p>
                    <button class="pf-btn primary w-full" type="submit"><i class="fas fa-paper-plane"></i>${esc(t('hire.send', 'Send request'))}</button>
                </form>`;
            if (st.step === 4) body = `<div class="text-center py-10"><div class="w-20 h-20 mx-auto rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-3xl mb-6"><i class="fas fa-check"></i></div><h3 class="text-3xl font-bold mb-3">Request sent</h3><p class="pf-muted max-w-sm mx-auto">${esc(t('hire.thanks', 'Thanks! I’ll reply within 2 days.'))}</p></div>`;
            const nav = st.step > 0 && st.step < 4 ? `<div class="flex justify-between mt-8"><button type="button" class="pf-btn" data-back><i class="fas fa-arrow-left"></i>${esc(t('hire.back', 'Back'))}</button>${st.step < 3 ? `<button type="button" class="pf-btn primary" data-next ${st[['type', 'budget', 'timeline'][st.step]] ? '' : 'disabled'}>${esc(t('hire.next', 'Next'))}<i class="fas fa-arrow-right"></i></button>` : ''}</div>` : '';
            box.innerHTML = `${st.step < 4 ? steps : ''}<div class="pf-step">${body}</div>${nav}`;
            const form = $('form', box);
            if (form) { form.addEventListener('submit', submit); setTimeout(() => $('#hire-name', box)?.focus(), 50); }
        }
        box.addEventListener('click', (e) => {
            const o = e.target.closest('.pf-opt');
            if (o) { st[o.dataset.g] = o.dataset.v; sfx('pop'); st.step = Math.min(3, st.step + 1); render(); return; }
            if (e.target.closest('[data-back]')) { st.step = Math.max(0, st.step - 1); render(); }
            if (e.target.closest('[data-next]')) { st.step = Math.min(3, st.step + 1); render(); }
        });
        async function submit(e) {
            e.preventDefault();
            const f = e.target, err = $('.hire-err', f), btn = $('button[type="submit"]', f);
            const name = $('#hire-name', f).value.trim(), email = $('#hire-email', f).value.trim(), message = $('#hire-msg', f).value.trim();
            const fail = (m) => { err.textContent = m; err.classList.remove('hidden'); };
            if (!name) return fail('Please add your name.');
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Please check your e-mail address.');
            if (f.website.value) { st.step = 4; return render(); } // bot
            const lastSent = ls.get('pf_hire_t', 0);
            if (Date.now() - lastSent < 60000) return fail('You just sent a request. Please wait a minute.');
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            const typeLabel = HIRE.types.find((x) => x[0] === st.type)?.[2] || st.type;
            try {
                await post('portfolio_leads', { name, email, project_type: typeLabel, budget: st.budget, timeline: st.timeline, message, lang });
                ls.set('pf_hire_t', Date.now());
                track('lead', { type: st.type });
                unlock('hire'); confetti(); sfx('success');
                st.step = 4; render();
            } catch {
                // Fallback: open an e-mail with the same details
                const P = SITE.PROFILE || {};
                const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nProject: ${typeLabel}\nBudget: ${st.budget}\nTimeline: ${st.timeline}\n\n${message}`);
                window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(P.email || 'voramanvuth@gmail.com')}&su=${encodeURIComponent(`Project request: ${typeLabel}`)}&body=${body}`, '_blank', 'noopener');
                btn.disabled = false; btn.innerHTML = `<i class="fas fa-paper-plane"></i>${esc(t('hire.send', 'Send request'))}`;
                fail('Couldn’t reach the server, so an e-mail draft opened instead.');
            }
        }
        render();
    }

    // ---------- Availability ----------
    async function renderAvailability() {
        const box = $('#pf-availability'); if (!box) return;
        const s = await settings();
        const months = s.availability?.months || {};
        const now = new Date();
        const fmt = new Intl.DateTimeFormat(lang === 'km' ? 'km-KH' : 'en', { month: 'short' });
        const cells = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const st = ['open', 'limited', 'booked'].includes(months[key]) ? months[key] : (s.available === false ? 'limited' : 'open');
            cells.push(`<div class="pf-month ${st}" title="${st}"><b>${esc(fmt.format(d))}</b>${esc(t(`avail.${st}`, st[0].toUpperCase() + st.slice(1)))}<i></i></div>`);
        }
        box.innerHTML = `<div class="flex items-center justify-between mb-3"><h3 class="text-xs font-bold tracking-[.25em] uppercase text-gray-400" data-i18n="avail.title">Availability</h3><span class="flex gap-3 text-[10px] pf-muted"><span><i class="inline-block w-2 h-2 rounded-full bg-green-400 mr-1"></i>${esc(t('avail.open', 'Open'))}</span><span><i class="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-1"></i>${esc(t('avail.limited', 'Limited'))}</span><span><i class="inline-block w-2 h-2 rounded-full bg-red-400 mr-1"></i>${esc(t('avail.booked', 'Booked'))}</span></span></div>
            <div class="pf-months">${cells.join('')}</div>${s.availability?.note ? `<p class="text-xs pf-muted mt-3">${esc(s.availability.note)}</p>` : ''}
            <button class="pf-btn primary w-full mt-4" data-hire><i class="fas fa-handshake"></i><span data-i18n="hire.start">Start a project</span></button>`;
        translate(box);
    }

    // ---------- Testimonials ----------
    async function renderTestimonials() {
        const box = $('#pf-testimonials'); if (!box) return;
        const s = await settings();
        const list = (Array.isArray(s.testimonials) ? s.testimonials : []).filter((x) => x && x.quote && x.name);
        const P = SITE.PROFILE || {};
        if (!list.length) {
            box.innerHTML = `<div class="glass rounded-3xl p-8 md:p-12 text-center max-w-2xl mx-auto"><i class="fas fa-quote-left text-3xl text-brand-purple mb-5"></i><p class="text-lg text-gray-300" data-i18n="testi.empty">Worked with me? I’d love to share your words here.</p>
                <a class="pf-btn primary mt-6" href="mailto:${esc(P.email)}?subject=${encodeURIComponent('A testimonial for Voraman')}"><i class="fas fa-pen"></i><span data-i18n="testi.leave">Leave a testimonial</span></a></div>`;
            translate(box); return;
        }
        box.innerHTML = `<div class="pf-testi max-w-3xl mx-auto" aria-roledescription="carousel"><div class="pf-testi-track">${list.map((x, i) => `
            <figure class="pf-testi-slide" aria-roledescription="slide" aria-label="${i + 1} of ${list.length}"><div class="glass rounded-3xl p-8 md:p-12 h-full">
                <i class="fas fa-quote-left text-3xl text-brand-purple mb-5"></i>
                <blockquote class="text-lg md:text-xl leading-relaxed text-gray-100">${esc(x.quote)}</blockquote>
                <figcaption class="flex items-center gap-4 mt-8">${x.avatar ? `<img src="${esc(PF.mediaUrl(x.avatar))}" alt="" width="48" height="48" class="w-12 h-12 rounded-full object-cover" loading="lazy">` : `<span class="w-12 h-12 rounded-full bg-brand-purple/25 flex items-center justify-center font-bold">${esc(x.name.slice(0, 1))}</span>`}
                <span><b class="block">${x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener" class="hover:underline">${esc(x.name)}</a>` : esc(x.name)}</b><span class="text-sm pf-muted">${esc([x.role, x.company].filter(Boolean).join(' · '))}</span></span></figcaption>
            </div></figure>`).join('')}</div>
            ${list.length > 1 ? `<div class="flex items-center justify-center gap-4 mt-6"><button class="pf-x" data-tp aria-label="Previous testimonial"><i class="fas fa-chevron-left"></i></button><div class="pf-dots">${list.map((_, i) => `<button data-ti="${i}" aria-label="Testimonial ${i + 1}"></button>`).join('')}</div><button class="pf-x" data-tn aria-label="Next testimonial"><i class="fas fa-chevron-right"></i></button></div>` : ''}</div>`;
        const track_ = $('.pf-testi-track', box), dots = $$('[data-ti]', box);
        let i = 0, timer = 0;
        const go = (k) => { i = (k + list.length) % list.length; track_.style.transform = `translateX(-${i * 100}%)`; dots.forEach((d, j) => d.setAttribute('aria-current', String(j === i))); };
        const auto = () => { clearInterval(timer); if (!reduce && list.length > 1) timer = setInterval(() => go(i + 1), 6500); };
        box.addEventListener('click', (e) => { if (e.target.closest('[data-tp]')) go(i - 1); else if (e.target.closest('[data-tn]')) go(i + 1); else { const d = e.target.closest('[data-ti]'); if (d) go(+d.dataset.ti); } auto(); });
        box.addEventListener('pointerenter', () => clearInterval(timer)); box.addEventListener('pointerleave', auto);
        go(0); auto();
    }

    // ---------- Metrics ----------
    async function renderMetrics() {
        const box = $('#pf-metrics'); if (!box) return;
        const s = await settings();
        const list = (Array.isArray(s.metrics) && s.metrics.length ? s.metrics : SITE.METRICS || []).filter((m) => m && m.value && m.label);
        if (!list.length) { box.remove(); return; }
        box.innerHTML = list.map((m) => `<div class="pf-metric reveal"><i class="fas ${esc(m.icon || 'fa-star')} text-brand-purple mb-3"></i><b data-count="${esc(m.value)}">${esc(m.value)}</b><span class="text-sm pf-muted">${esc(m.label)}</span></div>`).join('');
        const io = new IntersectionObserver((es) => es.forEach((e) => {
            if (!e.isIntersecting) return; io.unobserve(e.target);
            e.target.classList.add('active');
            const b = $('b', e.target), raw = b.dataset.count, m = raw.match(/^([^\d]*)([\d,.]+)(.*)$/);
            if (!m || reduce) return;
            const end = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, t0 = performance.now();
            (function f(now) { const p = Math.min(1, (now - t0) / 1200), v = end * (1 - Math.pow(1 - p, 3)); b.textContent = `${m[1]}${v.toLocaleString('en', { minimumFractionDigits: dec, maximumFractionDigits: dec })}${m[3]}`; if (p < 1) requestAnimationFrame(f); })(t0);
        }), { threshold: 0.4 });
        $$('.pf-metric', box).forEach((el) => io.observe(el));
    }

    // ---------- Live GitHub + store stats ----------
    const ago = (iso) => { const s = (Date.now() - new Date(iso)) / 1000; if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`; if (s < 86400) return `${Math.round(s / 3600)} h ago`; return `${Math.round(s / 86400)} days ago`; };
    async function ghStats() {
        const key = 'pf_gh_v1';
        try { const c = JSON.parse(sessionStorage.getItem(key) || 'null'); if (c && Date.now() - c.t < 30 * 60000) return c.d; } catch { /* ignore */ }
        const user = (SITE.PROFILE || {}).githubUser || 'VoRaMaN';
        const [u, repos] = await Promise.all([
            fetch(`https://api.github.com/users/${user}`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
            fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=pushed`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
        ]);
        const own = repos.filter((r) => !r.fork);
        const langs = {};
        own.forEach((r) => { if (r.language) langs[r.language] = (langs[r.language] || 0) + 1; });
        const d = { repos: u.public_repos, followers: u.followers, stars: own.reduce((a, r) => a + r.stargazers_count, 0), latest: own[0] ? { name: own[0].name, url: own[0].html_url, pushed_at: own[0].pushed_at } : null, langs: Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 6) };
        try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch { /* ignore */ }
        return d;
    }
    const LANG_COL = { JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3776ab', 'C#': '#9b4f96', HTML: '#e34f26', CSS: '#563d7c', PHP: '#8892bf', Vue: '#42b883', Java: '#e76f00', GDScript: '#478cbf', ShaderLab: '#222c37' };
    async function renderStats() {
        const box = $('#pf-stats'); if (!box) return;
        const P = SITE.PROFILE || {};
        const [gh, games] = await Promise.all([ghStats().catch(() => null), get('portfolio_games?select=slug,title,kind,download_count&published=eq.true').catch(() => null)]);
        const myGames = (games || []).filter((g) => g.kind === 'game');
        const downloads = myGames.reduce((a, g) => a + (g.download_count || 0), 0);
        const total = gh ? gh.langs.reduce((a, l) => a + l[1], 0) : 0;
        box.innerHTML = `
            <a href="${esc(P.github)}" target="_blank" rel="noopener" class="glass spot rounded-2xl p-5 block group">
                <div class="flex items-center justify-between mb-4"><span class="font-bold"><i class="fab fa-github mr-2"></i>GitHub</span><span class="text-[10px] font-bold tracking-widest uppercase text-green-400"><i class="fas fa-circle text-[6px] align-middle mr-1"></i>Live</span></div>
                ${gh ? `<div class="grid grid-cols-3 gap-3 text-center mb-4"><div><b class="block text-2xl font-black">${gh.repos}</b><span class="text-[10px] pf-muted uppercase tracking-widest">Repos</span></div><div><b class="block text-2xl font-black">${gh.stars}</b><span class="text-[10px] pf-muted uppercase tracking-widest">Stars</span></div><div><b class="block text-2xl font-black">${gh.followers}</b><span class="text-[10px] pf-muted uppercase tracking-widest">Followers</span></div></div>
                ${total ? `<div class="pf-lang-bar mb-2">${gh.langs.map(([l, n]) => `<i style="width:${(n / total) * 100}%;background:${LANG_COL[l] || '#888'}" title="${esc(l)}"></i>`).join('')}</div><p class="text-[11px] pf-muted">${gh.langs.map(([l]) => esc(l)).join(' · ')}</p>` : ''}
                ${gh.latest ? `<p class="text-xs mt-3 text-gray-300"><i class="fas fa-code-commit mr-1 text-brand-purple"></i>Latest push: <b>${esc(gh.latest.name)}</b> <span class="pf-muted">${esc(ago(gh.latest.pushed_at))}</span></p>` : ''}` : '<p class="text-sm pf-muted">GitHub stats are unavailable right now. Open my profile →</p>'}
            </a>
            <a href="${esc(P.itch)}" target="_blank" rel="noopener" data-itch class="glass spot rounded-2xl p-5 block">
                <div class="flex items-center justify-between mb-4"><span class="font-bold"><i class="fab fa-itch-io mr-2 text-[#fa5c5c]"></i>Gojo Studio</span><span class="text-[10px] font-bold tracking-widest uppercase text-green-400"><i class="fas fa-circle text-[6px] align-middle mr-1"></i>Live</span></div>
                <div class="grid grid-cols-2 gap-3 text-center mb-4"><div><b class="block text-2xl font-black">${games ? myGames.length : '–'}</b><span class="text-[10px] pf-muted uppercase tracking-widest">Games in store</span></div><div><b class="block text-2xl font-black">${games ? downloads.toLocaleString() : '–'}</b><span class="text-[10px] pf-muted uppercase tracking-widest">Downloads here</span></div></div>
                <p class="text-xs text-gray-300">Playable builds, devlogs and updates on <b>gojo-studio.itch.io</b> <i class="fas fa-up-right-from-square text-[10px] ml-1"></i></p>
            </a>`;
    }

    // ---------- Section tracking + companion lines + explorer ----------
    function watchSections() {
        const seen = new Set();
        const io = new IntersectionObserver((es) => es.forEach((e) => {
            if (!e.isIntersecting) return;
            const id = e.target.id;
            pet.section(id);
            if (!seen.has(id)) { seen.add(id); track('section', { id }); }
        }), { threshold: 0.35 });
        $$('main > section[id]').forEach((s) => io.observe(s));
        const foot = $('main footer');
        if (foot) new IntersectionObserver((es) => { if (es[0].isIntersecting) unlock('explorer'); }).observe(foot);
    }

    // ---------- Hooks into other modules ----------
    function hooks() {
        // store + games
        const onHash = () => {
            const h = location.hash;
            if (h.startsWith('#store')) unlock('store');
            const m = h.match(/^#store\/([a-z0-9-]+)\/play$/);
            if (m) { unlock('player'); track('play', { slug: m[1] }); }
        };
        window.addEventListener('hashchange', onHash); onHash();
        // UI Lab focus count
        let focusN = 0;
        document.addEventListener('click', (e) => { if (e.target.closest('[data-expand]') && ++focusN >= 3) unlock('labrat'); }, true);
        document.addEventListener('pf:beatplay', () => unlock('producer'));
        // case-study cards: "detail" overlays count as reading the prototype
        const od = window.openDetail;
        if (typeof od === 'function') window.openDetail = function (type, fromRoute) { track('detail', { type }); return od.apply(this, arguments); };
    }

    // ---------- Boot ----------
    function boot() {
        applyTheme(); applyReduce();
        navButtons();
        applyLang();
        unlock('hello');
        const h = new Date().getHours(); if (h >= 0 && h < 5) unlock('night');
        track('view', { lang, theme, w: innerWidth < 640 ? 'm' : innerWidth < 1024 ? 't' : 'd' });
        watchSections(); hooks();
        renderAvailability(); renderTestimonials(); renderMetrics();
        const stats = $('#pf-stats');
        if (stats) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); renderStats(); } }, { rootMargin: '300px' }).observe(stats);
        document.addEventListener('pf:lang', () => { renderAvailability(); renderTestimonials(); });
        route();
    }

    window.Features = { track, unlock, t, get lang() { return lang; }, setLang, setTheme, sheet, closeSheet, drawer, closeDrawer, addRoute, route, post, rpc, get, settings, confetti, pet, openHire, openTerm, openTrophies, openLab, esc, ls, sfx, ghStats, translate };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
