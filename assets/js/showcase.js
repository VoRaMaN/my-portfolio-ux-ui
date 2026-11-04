/* =========================================================================
   Showcase: case studies (#case/<id>) with a blueprint ↔ final slider,
   before/after gallery, "How I think" process timeline, Fighting HUD
   anatomy, press kits (#press/<slug>), devlog (#devlog), collectible cards
   (daily booster + binder) and a CSS 3D room (#room).
   Depends on features.js (window.Features) and site-data.js (window.SITE).
   ========================================================================= */
(() => {
    const F = window.Features, SITE = window.SITE, PF = window.PF;
    if (!F || !SITE || !PF) return;
    const { esc, t, ls, sfx } = F;
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const media = (u) => PF.mediaUrl(u);
    const clearHash = () => history.replaceState(null, '', location.pathname + location.search);

    // ---------- Compare slider (before/after, blueprint/final) ----------
    function compareHtml(a, b, la, lb, ratio = '16/9') {
        return `<div class="pf-cmp" style="--p:50%;aspect-ratio:${ratio}">
            <div class="pf-cmp-a">${a}</div>
            <div class="pf-cmp-b">${b}</div>
            <div class="pf-cmp-h" aria-hidden="true"><span><i class="fas fa-arrows-left-right"></i></span></div>
            <b class="pf-cmp-l l">${esc(la)}</b><b class="pf-cmp-l r">${esc(lb)}</b>
            <input class="pf-cmp-r" type="range" min="0" max="100" value="50" step="0.5" aria-label="${esc(`${la} / ${lb}`)}" data-sfx="none">
        </div>`;
    }
    function bindCompare(root) {
        $$('.pf-cmp', root).forEach((c) => {
            const r = $('.pf-cmp-r', c);
            r.addEventListener('input', () => c.style.setProperty('--p', `${r.value}%`));
        });
    }
    // "Blueprint": Sobel edges of the final image, drawn as cyan lines on a navy grid
    function blueprint(src, cv) {
        const img = new Image();
        img.decoding = 'async'; img.src = src;
        img.decode().then(() => {
            const W = 900, H = Math.round((img.naturalHeight * W) / img.naturalWidth);
            cv.width = W; cv.height = H;
            const g = cv.getContext('2d', { willReadFrequently: true });
            g.drawImage(img, 0, 0, W, H);
            const src_ = g.getImageData(0, 0, W, H).data, gray = new Float32Array(W * H);
            for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = src_[j] * 0.3 + src_[j + 1] * 0.59 + src_[j + 2] * 0.11;
            const out = g.createImageData(W, H), o = out.data;
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const i = y * W + x, k = i * 4;
                    let v = 0;
                    if (x > 0 && y > 0 && x < W - 1 && y < H - 1) {
                        const gx = -gray[i - W - 1] - 2 * gray[i - 1] - gray[i + W - 1] + gray[i - W + 1] + 2 * gray[i + 1] + gray[i + W + 1];
                        const gy = -gray[i - W - 1] - 2 * gray[i - W] - gray[i - W + 1] + gray[i + W - 1] + 2 * gray[i + W] + gray[i + W + 1];
                        v = Math.min(1, Math.max(0, (Math.hypot(gx, gy) - 40) / 220));
                    }
                    o[k] = 9 + v * 140; o[k + 1] = 22 + v * 210; o[k + 2] = 46 + v * 209; o[k + 3] = 255;
                }
            }
            g.putImageData(out, 0, 0);
            g.strokeStyle = 'rgba(125,211,252,.09)'; g.lineWidth = 1;
            for (let x = 0; x < W; x += 30) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
            for (let y = 0; y < H; y += 30) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
            g.fillStyle = 'rgba(125,211,252,.75)'; g.font = '600 12px ui-monospace, Menlo, monospace';
            g.fillText(`${W} × ${H} · 8-PT GRID`, 14, H - 14);
        }).catch(() => {});
    }

    // ---------- HUD anatomy ----------
    function hudHtml() {
        const H = SITE.HUD; if (!H) return '';
        return `<div class="pf-hud grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-5 items-start">
            <div class="pf-hud-img relative rounded-2xl overflow-hidden border border-white/10">
                <img src="${esc(H.image)}" alt="Fighting game HUD" width="1600" height="900" loading="lazy" decoding="async" class="w-full h-auto block">
                ${H.spots.map((s, i) => `<button class="pf-hud-spot" data-spot="${i}" style="left:${s.x}%;top:${s.y}%;width:${s.w}%;height:${s.h}%" aria-label="${esc(s.t)}"><span>${i + 1}</span></button>`).join('')}
            </div>
            <ol class="pf-hud-list space-y-2">${H.spots.map((s, i) => `<li><button class="pf-hud-item" data-spot="${i}"><span class="n">${i + 1}</span><span><b class="block text-sm">${esc(s.t)}</b><span class="block text-xs pf-muted mt-0.5">${esc(s.d)}</span></span></button></li>`).join('')}</ol>
        </div>`;
    }
    function bindHud(root) {
        const box = $('.pf-hud', root); if (!box) return;
        const set = (i) => $$('[data-spot]', box).forEach((b) => b.classList.toggle('on', +b.dataset.spot === i));
        box.addEventListener('click', (e) => { const b = e.target.closest('[data-spot]'); if (b) { set(+b.dataset.spot); sfx('tick'); } });
        box.addEventListener('pointerover', (e) => { const b = e.target.closest('[data-spot]'); if (b) set(+b.dataset.spot); });
        set(0);
    }

    // ---------- Case study ----------
    async function openCase(id) {
        const c = SITE.CASES?.[id];
        if (!c) { clearHash(); return; }
        const s = await F.settings();
        const figma = s.figma?.[id];
        const ids = Object.keys(SITE.CASES), next = ids[(ids.indexOf(id) + 1) % ids.length];
        const pair = (Array.isArray(s.before_after) && s.before_after.length ? s.before_after : SITE.BEFORE_AFTER).find((p) => (id === 'game' ? /hud|fight/i.test(p.title) : id === 'store' ? /store/i.test(p.title) : /mobile|app/i.test(p.title)));
        const el = F.sheet({
            title: c.title, route: `#case/${id}`, html: `
            <article class="pf-case">
                <header class="relative min-h-[46vh] flex items-end overflow-hidden">
                    <img src="${esc(c.cover)}" alt="" class="absolute inset-0 w-full h-full object-cover opacity-50" decoding="async">
                    <div class="absolute inset-0 bg-gradient-to-t from-[#060608] via-[#060608]/60 to-transparent"></div>
                    <div class="relative max-w-5xl mx-auto w-full px-5 pb-10">
                        <p class="pf-kicker mb-3">${esc(c.kicker)}</p>
                        <h1 class="text-4xl md:text-6xl font-serif font-bold">${esc(c.title)}</h1>
                        <div class="flex flex-wrap gap-2 mt-5"><span class="pf-chip"><i class="fas fa-user"></i>${esc(c.role)}</span><span class="pf-chip"><i class="fas fa-display"></i>${esc(c.platform)}</span>${c.tools.map((x) => `<span class="pf-chip">${esc(x)}</span>`).join('')}</div>
                    </div>
                </header>
                <div class="max-w-5xl mx-auto px-5 pb-20 space-y-16">
                    <section class="grid md:grid-cols-[180px_1fr] gap-4"><h2 class="pf-kicker pt-1">01 · Problem</h2><p class="text-xl md:text-2xl leading-relaxed text-gray-100">${esc(c.problem)}</p></section>
                    <section class="grid md:grid-cols-[180px_1fr] gap-4"><h2 class="pf-kicker pt-1">02 · Research</h2><ul class="space-y-3">${c.research.map((r) => `<li class="flex gap-3 text-gray-300"><i class="fas fa-magnifying-glass text-brand-purple mt-1"></i><span>${esc(r)}</span></li>`).join('')}</ul></section>
                    <section><div class="grid md:grid-cols-[180px_1fr] gap-4 mb-5"><h2 class="pf-kicker pt-1">03 · Wireframe → final</h2><p class="pf-muted text-sm">Drag the handle. The blueprint layer traces the structure of the final screen on an 8-pt grid.</p></div>
                        ${compareHtml('<canvas class="pf-bp w-full h-full block" aria-hidden="true"></canvas>', `<img src="${esc(c.final)}" alt="${esc(c.title)} final design" class="w-full h-full object-contain bg-black" decoding="async">`, 'Blueprint', 'Final', id === 'mobile' ? '4/5' : id === 'game' ? '20/9' : '16/9')}
                    </section>
                    <section class="grid md:grid-cols-[180px_1fr] gap-4"><h2 class="pf-kicker pt-1">04 · Decisions</h2><div class="grid sm:grid-cols-2 gap-3">${c.decisions.map((d, i) => `<div class="glass rounded-2xl p-5"><span class="text-xs font-black text-brand-purple">${String(i + 1).padStart(2, '0')}</span><p class="mt-2 text-sm text-gray-200 leading-relaxed">${esc(d)}</p></div>`).join('')}</div></section>
                    ${c.hud ? `<section><h2 class="pf-kicker mb-5">05 · HUD anatomy</h2>${hudHtml()}</section>` : ''}
                    ${pair ? `<section><h2 class="pf-kicker mb-2">${c.hud ? '06' : '05'} · Iteration: ${esc(pair.title)}</h2><p class="pf-muted text-sm mb-5">${esc(pair.note || '')}</p>${compareHtml(`<img src="${esc(media(pair.before))}" alt="Before" class="w-full h-full object-contain bg-black">`, `<img src="${esc(media(pair.after))}" alt="After" class="w-full h-full object-contain bg-black">`, t('ba.before', 'Before'), t('ba.after', 'After'))}</section>` : ''}
                    ${figma ? `<section><h2 class="pf-kicker mb-5">Figma prototype</h2><div class="rounded-2xl overflow-hidden border border-white/10 bg-black" style="aspect-ratio:16/10"><iframe title="${esc(c.title)} Figma prototype" class="w-full h-full" loading="lazy" allowfullscreen src="https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(figma)}"></iframe></div></section>` : ''}
                    <section><h2 class="pf-kicker mb-5">More screens</h2><div class="grid sm:grid-cols-3 gap-3">${c.gallery.map((g) => `<a href="${esc(g)}" target="_blank" rel="noopener" class="block rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-colors"><img src="${esc(g)}" alt="" loading="lazy" decoding="async" class="w-full aspect-video object-cover"></a>`).join('')}</div></section>
                    <section class="glass rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div><p class="pf-kicker mb-2">Outcome</p><h3 class="text-2xl font-bold">Try the live prototype</h3><p class="pf-muted text-sm mt-1">Everything in this case study is clickable on the site.</p></div>
                        <div class="flex flex-wrap gap-3"><button class="pf-btn primary" data-open-detail="${esc(c.detail)}"><i class="fas fa-play"></i>Open prototype</button><a class="pf-btn" href="#case/${esc(next)}">Next: ${esc(SITE.CASES[next].title)} <i class="fas fa-arrow-right"></i></a></div>
                    </section>
                </div>
            </article>`,
        });
        blueprint(c.blueprint, $('.pf-bp', el));
        bindCompare(el); bindHud(el);
        $('[data-open-detail]', el).addEventListener('click', () => { F.closeSheet(); window.openDetail?.(c.detail); });
        F.unlock('case'); F.track('case', { id });
    }
    F.addRoute(/^#case\/([a-z0-9-]+)$/, (m) => {
        const open = $$('.pf-sheet').find((x) => x.getAttribute('aria-label') === SITE.CASES?.[m[1]]?.title);
        if (!open) { $$('.pf-sheet').forEach(() => F.closeSheet()); openCase(m[1]); }
    });

    // Case-study links under the project cards
    function renderCaseLinks() {
        const box = $('#pf-case-links'); if (!box) return;
        box.innerHTML = Object.entries(SITE.CASES).map(([id, c]) => `<a href="#case/${id}" class="glass spot rounded-2xl p-4 flex items-center gap-3 group"><span class="w-10 h-10 rounded-xl bg-brand-purple/15 text-brand-purple flex items-center justify-center"><i class="fas fa-book-open"></i></span><span class="flex-1 min-w-0"><span class="block text-[10px] font-bold tracking-widest text-gray-500 uppercase" data-i18n="work.case">Read the case study</span><span class="block text-sm font-semibold truncate">${esc(c.title)}</span></span><i class="fas fa-arrow-right text-xs text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all"></i></a>`).join('');
        F.translate(box);
    }

    // ---------- Before / after gallery ----------
    async function renderBA() {
        const box = $('#pf-ba'); if (!box) return;
        const s = await F.settings();
        const list = (Array.isArray(s.before_after) && s.before_after.length ? s.before_after : SITE.BEFORE_AFTER).filter((p) => p && p.before && p.after);
        if (!list.length) { box.parentElement?.remove(); return; }
        let cur = 0;
        const draw = () => {
            const p = list[cur];
            $('.pf-ba-stage', box).innerHTML = `${compareHtml(`<img src="${esc(media(p.before))}" alt="${esc(p.title)} before" class="w-full h-full object-contain bg-black" decoding="async">`, `<img src="${esc(media(p.after))}" alt="${esc(p.title)} after" class="w-full h-full object-contain bg-black" decoding="async">`, t('ba.before', 'Before'), t('ba.after', 'After'))}<p class="text-sm text-gray-300 mt-4 max-w-3xl">${esc(p.note || '')}</p>`;
            bindCompare(box);
            $$('[data-ba]', box).forEach((b, i) => b.setAttribute('aria-pressed', String(i === cur)));
        };
        box.innerHTML = `<div class="flex gap-2 overflow-x-auto no-scrollbar mb-5" role="group" aria-label="Redesigns">${list.map((p, i) => `<button class="pf-ba-tab shrink-0" data-ba="${i}" aria-pressed="false">${esc(p.title)}</button>`).join('')}</div><div class="pf-ba-stage"></div>`;
        box.addEventListener('click', (e) => { const b = e.target.closest('[data-ba]'); if (b) { cur = +b.dataset.ba; draw(); } });
        draw();
    }

    // ---------- Process timeline ----------
    function renderProcess() {
        const box = $('#pf-process'); if (!box) return;
        box.innerHTML = `<div class="pf-tl" style="--fill:0"><div class="pf-tl-line"><i></i></div>${(SITE.PROCESS || []).map((p, i) => `
            <div class="pf-tl-step ${i % 2 ? 'r' : 'l'}" data-i="${i}">
                <span class="pf-tl-dot"><i class="fas ${esc(p.icon)}"></i></span>
                <div class="pf-tl-card glass rounded-2xl p-5">
                    <span class="text-[10px] font-black tracking-[.25em] text-brand-purple">STEP ${String(i + 1).padStart(2, '0')}</span>
                    <h3 class="text-xl font-bold mt-1">${esc(p.title)}</h3>
                    <p class="text-sm text-gray-300 mt-2 leading-relaxed">${esc(p.text)}</p>
                    ${p.link ? `<a href="${esc(p.link)}" class="inline-flex items-center gap-2 text-xs font-bold text-gray-300 hover:text-white mt-3"><i class="fas fa-eye text-brand-purple"></i>${esc(p.proof || 'See it')}<i class="fas fa-arrow-right text-[10px]"></i></a>` : ''}
                </div>
            </div>`).join('')}</div>`;
        const tl = $('.pf-tl', box), steps = $$('.pf-tl-step', box);
        let ticking = false;
        const update = () => {
            ticking = false;
            const r = tl.getBoundingClientRect(), vh = innerHeight;
            const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
            tl.style.setProperty('--fill', p.toFixed(4));
            steps.forEach((s) => { const sr = s.getBoundingClientRect(); s.classList.toggle('on', sr.top < vh * 0.62); });
        };
        const io = new IntersectionObserver((es) => {
            if (es[0].isIntersecting) { window.addEventListener('scroll', onScroll, { passive: true }); update(); }
            else window.removeEventListener('scroll', onScroll);
        });
        const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
        io.observe(tl);
    }

    // ---------- HUD block in the games section ----------
    function renderHudBlock() {
        const box = $('#pf-hud'); if (!box) return;
        box.innerHTML = hudHtml();
        bindHud(box);
    }

    // ---------- Press kit ----------
    async function openPress(slug) {
        await window.Store?.ready?.();
        const g = window.Store?.game?.(slug);
        if (!g) { clearHash(); return; }
        const P = SITE.PROFILE;
        const shots = (g.screenshots || []).map(media);
        const vids = (g.videos || []).map((v) => (typeof v === 'string' ? v : v.url || '')).filter((u) => /^https?:/.test(u));
        const link = `${P.site}#store/${g.slug}`;
        const release = g.release_date ? new Date(g.release_date).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' }) : (g.playable ? 'Available now (free)' : 'In development');
        const facts = [
            ['Developer', g.developer || P.studio], ['Publisher', g.publisher || g.developer || P.studio], ['Release', release],
            ['Platforms', (g.platforms || []).join(', ')], ['Genres', (g.genres || []).join(', ')], ['Price', Number(g.price) > 0 ? `$${Number(g.price).toFixed(2)}` : 'Free'],
            ['Store page', link], ['itch.io', g.play?.itch_url || P.itch], ['Press contact', P.email],
        ].filter((f) => f[1]);
        const factText = `${g.title}${g.subtitle ? ` — ${g.subtitle}` : ''}\n${facts.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${g.short_description || ''}`;
        const el = F.sheet({
            title: `Press kit · ${g.title}`, route: `#press/${slug}`, html: `
            <div class="max-w-5xl mx-auto px-5 py-8 space-y-12">
                <header class="relative rounded-3xl overflow-hidden border border-white/10">
                    ${g.banner_url ? `<img src="${esc(media(g.banner_url))}" alt="" class="w-full aspect-[21/9] object-cover">` : '<div class="aspect-[21/9] bg-brand-grey"></div>'}
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                    <div class="absolute bottom-0 inset-x-0 p-6 flex items-end gap-4">
                        ${g.icon_url ? `<img src="${esc(media(g.icon_url))}" alt="${esc(g.title)} icon" class="w-16 h-16 md:w-20 md:h-20 rounded-2xl border border-white/20 object-cover">` : ''}
                        <div><p class="pf-kicker">Press kit</p><h1 class="text-3xl md:text-5xl font-black tracking-tight">${esc(g.title)}</h1>${g.tagline ? `<p class="text-xs tracking-[.25em] text-gray-300 mt-1">${esc(g.tagline)}</p>` : ''}</div>
                    </div>
                </header>
                <div class="grid lg:grid-cols-[1fr_320px] gap-8">
                    <section class="space-y-8">
                        <div><h2 class="pf-kicker mb-3">Description</h2>${String(g.description || g.short_description || '').split(/\n{2,}/).map((p) => `<p class="text-gray-300 leading-relaxed mb-3">${esc(p)}</p>`).join('')}</div>
                        ${(g.tags || []).length ? `<div><h2 class="pf-kicker mb-3">Features</h2><div class="flex flex-wrap gap-2">${g.tags.map((x) => `<span class="pf-chip">${esc(x)}</span>`).join('')}</div></div>` : ''}
                        <div><h2 class="pf-kicker mb-3">About ${esc(P.studio)}</h2><p class="text-gray-300 leading-relaxed">${esc(P.studio)} is the indie label of ${esc(P.name)}, a UX/UI designer and game developer based in ${esc(P.location)}. The studio makes games where the interface is part of the fun, from HUDs to menus.</p></div>
                    </section>
                    <aside class="glass rounded-3xl p-5 h-fit">
                        <h2 class="pf-kicker mb-4">Factsheet</h2>
                        <dl class="space-y-3 text-sm">${facts.map(([k, v]) => `<div><dt class="text-[10px] uppercase tracking-widest text-gray-500">${esc(k)}</dt><dd class="text-gray-100 break-words">${/^https?:/.test(v) ? `<a class="underline hover:text-brand-purple" href="${esc(v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\//, ''))}</a>` : /@/.test(v) ? `<a class="underline" href="mailto:${esc(v)}">${esc(v)}</a>` : esc(v)}</dd></div>`).join('')}</dl>
                        <button class="pf-btn w-full mt-5" data-copy-facts><i class="fas fa-copy"></i>Copy factsheet</button>
                    </aside>
                </div>
                <section><h2 class="pf-kicker mb-4">Screenshots <span class="pf-muted normal-case tracking-normal font-normal">· click to open full size</span></h2>
                    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">${shots.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener" download class="block group rounded-2xl overflow-hidden border border-white/10 relative"><img src="${esc(u)}" alt="${esc(g.title)} screenshot ${i + 1}" loading="lazy" class="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"><span class="absolute bottom-2 right-2 pf-chip bg-black/60"><i class="fas fa-download"></i></span></a>`).join('') || '<p class="pf-muted text-sm">No screenshots yet.</p>'}</div>
                </section>
                <section><h2 class="pf-kicker mb-4">Logo & art</h2><div class="flex flex-wrap gap-3">
                    ${[[g.icon_url, 'Icon'], [g.banner_url, 'Key art'], [g.capsule_url, 'Store capsule'], ['assets/img/gojo-logo.webp', 'Studio logo']].filter((x) => x[0]).map(([u, l]) => `<a href="${esc(media(u))}" target="_blank" rel="noopener" download class="pf-btn"><i class="fas fa-image"></i>${esc(l)}</a>`).join('')}
                </div></section>
                ${vids.length ? `<section><h2 class="pf-kicker mb-4">Videos</h2><div class="flex flex-wrap gap-3">${vids.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener" class="pf-btn"><i class="fas fa-film"></i>Trailer ${i + 1}</a>`).join('')}</div></section>` : ''}
                <section class="glass rounded-3xl p-6 flex flex-col sm:flex-row gap-4 items-center justify-between"><div><h3 class="font-bold text-lg">Writing about ${esc(g.title)}?</h3><p class="pf-muted text-sm">Keys, interviews and extra assets: just ask.</p></div><a class="pf-btn primary" href="mailto:${esc(P.email)}?subject=${encodeURIComponent(`Press: ${g.title}`)}"><i class="fas fa-envelope"></i>Contact press</a></section>
            </div>`,
        });
        $('[data-copy-facts]', el).addEventListener('click', async (e) => {
            try { await navigator.clipboard.writeText(factText); e.currentTarget.innerHTML = '<i class="fas fa-check"></i>Copied'; } catch { prompt('Factsheet', factText); }
        });
        F.unlock('press'); F.track('press', { slug });
    }
    F.addRoute(/^#press\/([a-z0-9-]+)$/, (m) => openPress(m[1]));

    // ---------- Devlog ----------
    const devlogCache = { all: null };
    const loadDevlog = () => (devlogCache.all ||= F.get('portfolio_devlog?published=eq.true&select=id,game_slug,title,body,cover_url,created_at&order=created_at.desc&limit=100').catch(() => []));
    const fmtDate = (d) => new Date(d).toLocaleDateString(F.lang === 'km' ? 'km-KH' : 'en', { year: 'numeric', month: 'short', day: 'numeric' });
    const excerpt = (b) => String(b || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*_`>-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 150);
    const safeUrl = (u) => (/^(https?:\/\/|assets\/|#|mailto:)/.test(u) ? u : '#');
    function md(src) {
        const lines = esc(src).split('\n');
        let html = '', list = false, para = [];
        const inline = (s) => s
            .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img src="${safeUrl(media(u.replace(/&amp;/g, '&')))}" alt="${a}" loading="lazy" class="rounded-2xl my-4 w-full">`)
            .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, a, u) => `<a href="${safeUrl(u.replace(/&amp;/g, '&'))}" target="_blank" rel="noopener" class="underline text-brand-purple">${a}</a>`)
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1<em>$2</em>').replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/10 text-[.9em]">$1</code>');
        const flush = () => { if (para.length) { html += `<p class="mb-4 leading-relaxed text-gray-200">${inline(para.join(' '))}</p>`; para = []; } };
        for (const l of lines) {
            const h = l.match(/^(#{1,3})\s+(.*)$/), li = l.match(/^\s*[-*]\s+(.*)$/);
            if (h) { flush(); if (list) { html += '</ul>'; list = false; } const n = h[1].length; html += `<h${n + 1} class="${n === 1 ? 'text-2xl' : n === 2 ? 'text-xl' : 'text-lg'} font-bold mt-8 mb-3">${inline(h[2])}</h${n + 1}>`; }
            else if (li) { flush(); if (!list) { html += '<ul class="list-disc pl-6 mb-4 space-y-1 text-gray-200">'; list = true; } html += `<li>${inline(li[1])}</li>`; }
            else if (!l.trim()) { flush(); if (list) { html += '</ul>'; list = false; } }
            else { if (list) { html += '</ul>'; list = false; } para.push(l); }
        }
        flush(); if (list) html += '</ul>';
        return html;
    }
    const gameTitle = (slug) => window.Store?.game?.(slug)?.title || slug || 'Studio';
    const postCard = (p) => `<a href="#devlog/${esc(p.id)}" class="glass-dark spot rounded-3xl overflow-hidden flex flex-col group">
        ${p.cover_url ? `<img src="${esc(media(p.cover_url))}" alt="" loading="lazy" class="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700">` : '<div class="aspect-video bg-gradient-to-br from-brand-purple/30 to-blue-500/20 flex items-center justify-center text-3xl text-white/60"><i class="fas fa-book-open"></i></div>'}
        <div class="p-5 flex-1 flex flex-col"><div class="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-gray-400"><span class="text-brand-purple">${esc(gameTitle(p.game_slug))}</span>·<span>${esc(fmtDate(p.created_at))}</span></div>
        <h4 class="font-bold text-lg mt-2 leading-snug">${esc(p.title)}</h4><p class="text-sm pf-muted mt-2 flex-1">${esc(excerpt(p.body))}…</p>
        <span class="text-xs font-bold mt-4 text-gray-300 group-hover:text-white"><span data-i18n="devlog.read">Read</span> <i class="fas fa-arrow-right text-[10px] ml-1"></i></span></div></a>`;
    async function renderDevlogBlock() {
        const box = $('#pf-devlog'); if (!box) return;
        const posts = await loadDevlog();
        const list = (posts || []).slice(0, 3);
        box.innerHTML = list.length
            ? `<div class="grid md:grid-cols-3 gap-5">${list.map(postCard).join('')}</div>${posts.length > 3 ? '<div class="text-center mt-6"><a href="#devlog" class="pf-btn">All posts <i class="fas fa-arrow-right"></i></a></div>' : ''}`
            : `<div class="glass rounded-3xl p-8 text-center"><i class="fas fa-book-open text-3xl text-brand-purple mb-4"></i><p class="text-gray-300" data-i18n="devlog.empty">The first devlog post is coming soon.</p><a data-itch href="https://gojo-studio.itch.io/" target="_blank" rel="noopener" class="pf-btn mt-5"><i class="fab fa-itch-io"></i>Updates on itch.io</a></div>`;
        F.translate(box);
    }
    async function openDevlog(arg) {
        const posts = await loadDevlog();
        if (arg && !arg.startsWith('game/')) {
            const p = posts.find((x) => x.id === arg);
            if (!p) { clearHash(); return; }
            F.sheet({
                title: p.title, route: `#devlog/${arg}`, html: `<article class="max-w-3xl mx-auto px-5 py-10">
                    <a href="#devlog" class="text-xs font-bold text-gray-400 hover:text-white"><i class="fas fa-arrow-left mr-1"></i>Devlog</a>
                    <p class="pf-kicker mt-6">${esc(gameTitle(p.game_slug))} · ${esc(fmtDate(p.created_at))}</p>
                    <h1 class="text-3xl md:text-5xl font-serif font-bold mt-3 mb-8 leading-tight">${esc(p.title)}</h1>
                    ${p.cover_url ? `<img src="${esc(media(p.cover_url))}" alt="" class="rounded-3xl w-full mb-8">` : ''}
                    <div class="pf-md text-base md:text-lg">${md(p.body)}</div>
                    ${p.game_slug ? `<div class="mt-12 flex flex-wrap gap-3"><a class="pf-btn primary" href="#store/${esc(p.game_slug)}"><i class="fas fa-store"></i>Store page</a><a class="pf-btn" href="#devlog/game/${esc(p.game_slug)}">More ${esc(gameTitle(p.game_slug))} posts</a></div>` : ''}
                </article>`,
            });
            F.unlock('reader'); F.track('devlog', { id: p.id });
            return;
        }
        const slug = arg ? arg.slice(5) : '';
        const list = slug ? posts.filter((p) => p.game_slug === slug) : posts;
        F.sheet({
            title: slug ? `Devlog · ${gameTitle(slug)}` : t('devlog.title', 'Devlog'), route: location.hash, html: `<div class="max-w-6xl mx-auto px-5 py-10">
                <p class="pf-kicker mb-2">Gojo Studio</p><h1 class="text-4xl md:text-5xl font-serif font-bold mb-8">${esc(slug ? `${gameTitle(slug)} devlog` : t('devlog.title', 'Devlog'))}</h1>
                ${list.length ? `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">${list.map(postCard).join('')}</div>` : `<p class="pf-muted">${esc(t('devlog.empty', 'The first devlog post is coming soon.'))}</p>`}
            </div>`,
        });
    }
    F.addRoute(/^#devlog(?:\/(.+))?$/, (m) => { $$('.pf-sheet').forEach(() => F.closeSheet(undefined, true)); openDevlog(m[1] || ''); });

    // ---------- Collectible cards ----------
    const CARDS = SITE.CARDS || [], RAR = SITE.RARITY || {};
    let coll = ls.get('pf_cards', {});
    const today = () => new Date().toISOString().slice(0, 10);
    const packsLeft = () => (ls.get('pf_pack_day', '') !== today() ? 1 : 0) + ls.get('pf_pack_credits', 0);
    const cardStats = () => ({ have: CARDS.filter((c) => coll[c.id]).length, total: CARDS.length });
    document.addEventListener('pf:ach', () => { ls.set('pf_pack_credits', ls.get('pf_pack_credits', 0) + 1); packFab(); });
    function rollRarity(min) {
        const keys = Object.keys(RAR).filter((k) => !min || 'crel'.indexOf(k) >= 'crel'.indexOf(min));
        let n = Math.random() * keys.reduce((a, k) => a + RAR[k].w, 0);
        for (const k of keys) { n -= RAR[k].w; if (n <= 0) return k; }
        return keys[0];
    }
    function pull(min) {
        const r = rollRarity(min);
        const pool = CARDS.filter((c) => c.r === r);
        return (pool.length ? pool : CARDS)[(Math.random() * (pool.length || CARDS.length)) | 0];
    }
    const cardFace = (c, n) => `<div class="pf-card r-${c.r}" style="--rc:${RAR[c.r]?.color || '#fff'}"><div class="pf-card-in"><img src="${esc(c.img)}" alt="" loading="lazy" decoding="async"><div class="pf-card-sheen"></div><div class="pf-card-cap"><span class="pf-card-r">${esc(RAR[c.r]?.name || '')}</span><b>${esc(c.n)}</b><span class="pf-card-set">${esc(c.set)}${n > 1 ? ` · ×${n}` : ''}</span></div></div></div>`;
    function openPack() {
        if (!CARDS.length) return;
        if (packsLeft() <= 0) { F.pet.say('Come back tomorrow!'); openBinder(); return; }
        if (ls.get('pf_pack_day', '') !== today()) ls.set('pf_pack_day', today());
        else ls.set('pf_pack_credits', Math.max(0, ls.get('pf_pack_credits', 0) - 1));
        const hand = [pull(), pull(), pull('r')];
        const fresh = hand.map((c) => !coll[c.id]);
        hand.forEach((c) => { coll[c.id] = (coll[c.id] || 0) + 1; });
        ls.set('pf_cards', coll);
        const el = F.sheet({
            title: t('cards.daily', 'Daily pack'), cls: 'pf-packsheet', html: `<div class="pf-pack-stage">
                <button class="pf-pack" aria-label="${esc(t('cards.open', 'Open the pack'))}"><span class="pf-pack-top"></span><span class="pf-pack-body"><img src="assets/img/gojo-logo.webp" alt=""><b>GOJO</b><small>3 cards · 1 rare+</small></span></button>
                <div class="pf-hand">${hand.map((c, i) => `<button class="pf-flip" data-i="${i}" aria-label="Reveal card ${i + 1}"><span class="pf-flip-in"><span class="pf-flip-back"><img src="assets/img/gojo-logo.webp" alt=""></span><span class="pf-flip-front">${cardFace(c, 1)}${fresh[i] ? '<em class="pf-new">NEW</em>' : ''}</span></span></button>`).join('')}</div>
                <p class="pf-pack-hint pf-muted text-sm">Tap the pack to tear it open</p>
                <div class="pf-pack-done flex flex-wrap gap-3 justify-center"><button class="pf-btn primary" data-binder><i class="fas fa-layer-group"></i>${esc(t('cards.binder', 'Open binder'))}</button><button class="pf-btn" data-close-pack>Done</button></div>
            </div>`,
        });
        const stage = $('.pf-pack-stage', el);
        let revealed = 0;
        $('.pf-pack', el).addEventListener('click', () => {
            if (stage.classList.contains('open')) return;
            stage.classList.add('open'); sfx('open');
            $('.pf-pack-hint', el).textContent = 'Tap each card to flip it';
        });
        $$('.pf-flip', el).forEach((b) => b.addEventListener('click', () => {
            if (b.classList.contains('on') || !stage.classList.contains('open')) return;
            b.classList.add('on'); revealed++;
            const c = hand[+b.dataset.i];
            sfx(c.r === 'l' ? 'legendary' : c.r === 'e' ? 'success' : 'pop');
            if (c.r === 'l' || c.r === 'e') { const r = b.getBoundingClientRect(); F.confetti(r.left + r.width / 2, r.top + r.height / 2, c.r === 'l' ? 160 : 70); }
            if (revealed === hand.length) { stage.classList.add('done'); $('.pf-pack-hint', el).textContent = `${cardStats().have} / ${cardStats().total} collected`; }
        }));
        $('[data-binder]', el).addEventListener('click', () => { F.closeSheet(); openBinder(); });
        $('[data-close-pack]', el).addEventListener('click', () => F.closeSheet());
        const st = cardStats();
        if (st.have >= 5) F.unlock('collector');
        if (st.have >= st.total) F.unlock('completionist');
        F.track('pack', { got: hand.map((c) => c.id).join(',') });
        packFab();
    }
    function openBinder() {
        coll = ls.get('pf_cards', {});
        const st = cardStats(), pct = Math.round((st.have / st.total) * 100), left = packsLeft();
        const el = F.sheet({
            title: t('cards.binder', 'Card binder'), route: location.hash === '#binder' ? '#binder' : null, html: `<div class="max-w-6xl mx-auto px-5 py-8">
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
                    <div><p class="pf-kicker mb-2">Collection</p><h1 class="text-4xl font-serif font-bold">${st.have} / ${st.total} cards</h1><div class="pf-prog mt-4 max-w-sm"><i style="width:${pct}%"></i></div></div>
                    <div class="flex items-center gap-3"><span class="text-sm pf-muted">${left ? `${left} pack${left > 1 ? 's' : ''} ready` : 'Next pack tomorrow · trophies earn extra packs'}</span><button class="pf-btn primary" data-pack ${left ? '' : 'disabled'}><i class="fas fa-box-open"></i>${esc(t('cards.open', 'Open pack'))}</button></div>
                </div>
                <div class="pf-binder">${CARDS.map((c) => coll[c.id] ? `<button class="pf-slot has" data-card="${esc(c.id)}" aria-label="${esc(c.n)}">${cardFace(c, coll[c.id])}</button>` : `<div class="pf-slot"><span><i class="fas fa-question"></i><small>${esc(c.set)}</small></span></div>`).join('')}</div>
            </div>`,
        });
        $('[data-pack]', el)?.addEventListener('click', () => { F.closeSheet(); openPack(); });
        el.addEventListener('click', (e) => {
            const b = e.target.closest('[data-card]'); if (!b) return;
            const c = CARDS.find((x) => x.id === b.dataset.card);
            const z = document.createElement('div'); z.className = 'pf-zoom'; z.innerHTML = `<div class="pf-zoom-card">${cardFace(c, coll[c.id])}</div>`;
            el.appendChild(z);
            const card = $('.pf-card', z);
            z.addEventListener('pointermove', (ev) => { const r = card.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5; card.style.transform = `perspective(900px) rotateY(${x * 24}deg) rotateX(${-y * 24}deg)`; card.style.setProperty('--mx', `${(x + 0.5) * 100}%`); card.style.setProperty('--my', `${(y + 0.5) * 100}%`); });
            z.addEventListener('click', () => z.remove());
            sfx('whoosh');
        });
    }
    F.addRoute(/^#binder$/, () => openBinder());
    F.addRoute(/^#pack$/, () => { clearHash(); openPack(); });
    // Floating "pack ready" button
    function packFab() {
        let b = $('#pf-packfab');
        if (packsLeft() <= 0) { b?.remove(); return; }
        if (!b) {
            b = document.createElement('button'); b.id = 'pf-packfab'; b.className = 'pf-packfab';
            b.innerHTML = '<img src="assets/img/gojo-logo.webp" alt=""><span><b>Card pack ready</b><small>Tap to open</small></span><em></em>';
            b.setAttribute('aria-label', 'Open your free card pack');
            b.addEventListener('click', openPack);
            document.body.appendChild(b);
        }
        const n = packsLeft(); $('em', b).textContent = n > 1 ? n : '';
    }

    // ---------- 3D room ----------
    function face(cls, w, h, tr, style = '') { return `<i class="rm-f ${cls}" style="width:${w}px;height:${h}px;transform:${tr};${style}"></i>`; }
    function box({ w, h, d, c = '#3a2a4a', top, front, side, extra = '' }) {
        return face('rm-front', w, h, `translate3d(${-w / 2}px,${-h}px,${d / 2}px)`, `background:${front || c}`)
            + face('rm-back', w, h, `translate3d(${w / 2}px,${-h}px,${-d / 2}px) rotateY(180deg)`, `background:${c}`)
            + face('rm-right', d, h, `translate3d(${w / 2}px,${-h}px,${d / 2}px) rotateY(90deg)`, `background:${side || c};filter:brightness(.78)`)
            + face('rm-left', d, h, `translate3d(${-w / 2}px,${-h}px,${-d / 2}px) rotateY(-90deg)`, `background:${side || c};filter:brightness(.7)`)
            + face('rm-top', w, d, `translate3d(${-w / 2}px,${-h}px,${-d / 2}px) rotateX(90deg)`, `background:${top || c};filter:brightness(1.12)`) + extra;
    }
    const at = (x, y, z) => `transform:translate3d(${x}px,${-y}px,${z}px)`;
    const ROOM = [
        { id: 'work', label: 'Desk & monitor', go: 'Work', href: '#projects', icon: 'fa-display', html: () => `<span class="rm-g" style="${at(-50, 0, -215)}">${box({ w: 210, h: 92, d: 90, c: '#5b3a29', top: '#7a5038' })}</span><span class="rm-g" style="${at(-50, 92, -240)}">${box({ w: 140, h: 86, d: 8, c: '#15151c', front: 'url(assets/img/game-fighting-v3-1600.webp) center/cover, #111' })}</span>` },
        { id: 'arcade', label: 'Arcade cabinet', go: '30-second challenge', href: '#arcade', icon: 'fa-meteor', html: () => `<span class="rm-g" style="${at(-235, 0, -40)}">${box({ w: 84, h: 210, d: 86, c: '#2a1640', front: 'linear-gradient(180deg,#c63aeb 0 12%,#111 12% 18%,#0b1a3a 18% 52%,#2a1640 52%)', top: '#c63aeb' })}</span>` },
        { id: 'skills', label: 'Bookshelf', go: 'Skills', href: '#skills', icon: 'fa-book', html: () => `<span class="rm-g" style="${at(-268, 0, 150)}">${box({ w: 56, h: 230, d: 170, c: '#4a3326', side: 'repeating-linear-gradient(180deg,#4a3326 0 8px,transparent 8px 56px),repeating-linear-gradient(90deg,#c63aeb 0 10px,#60a5fa 10px 18px,#facc15 18px 26px,#f472b6 26px 34px,#4ade80 34px 42px,#4a3326 42px 46px)' })}</span>` },
        { id: 'beats', label: 'Speakers & 808', go: 'Beat Lab 808', href: '#lab/beats', icon: 'fa-drum', html: () => `<span class="rm-g" style="${at(120, 0, -250)}">${box({ w: 54, h: 100, d: 54, c: '#1c1c24', front: 'radial-gradient(circle at 50% 30%,#333 0 11px,#0d0d12 12px 15px,transparent 16px),radial-gradient(circle at 50% 70%,#333 0 17px,#0d0d12 18px 21px,transparent 22px),#1c1c24' })}</span><span class="rm-g" style="${at(210, 0, -250)}">${box({ w: 54, h: 100, d: 54, c: '#1c1c24', front: 'radial-gradient(circle at 50% 30%,#333 0 11px,#0d0d12 12px 15px,transparent 16px),radial-gradient(circle at 50% 70%,#333 0 17px,#0d0d12 18px 21px,transparent 22px),#1c1c24' })}</span><span class="rm-g" style="${at(165, 0, -190)}">${box({ w: 46, h: 30, d: 60, c: '#d4d4d8', top: 'repeating-linear-gradient(90deg,#ef4444 0 5px,#f97316 5px 10px,#facc15 10px 15px,#fafafa 15px 20px)' })}</span>` },
        { id: 'games', label: 'Game poster', go: 'My games', href: '#games', icon: 'fa-gamepad', html: () => `<span class="rm-g" style="${at(140, 300, -298)}">${face('rm-front', 170, 96, 'translate3d(-85px,0,0)', 'background:url(assets/img/earthfall-banner-800.webp) center/cover;box-shadow:0 0 0 6px #111')}</span>` },
        { id: 'cv', label: 'Framed CV', go: 'Download my CV', href: 'cv.html', icon: 'fa-file-lines', html: () => `<span class="rm-g" style="${at(-298, 290, -170)}">${face('rm-front', 80, 104, 'translate3d(0,0,40px) rotateY(90deg)', 'background:linear-gradient(#f5f5f4,#e7e5e4);box-shadow:0 0 0 5px #3f2a1d;background-image:repeating-linear-gradient(180deg,transparent 0 12px,#a8a29e 12px 14px)')}</span>` },
        { id: 'trophies', label: 'Trophy', go: 'Trophies', action: 'trophies', icon: 'fa-trophy', html: () => `<span class="rm-g" style="${at(-268, 230, 150)}">${box({ w: 26, h: 34, d: 26, c: '#f59e0b', top: '#fde68a' })}</span>` },
        { id: 'binder', label: 'Card binder', go: 'Card binder', action: 'binder', icon: 'fa-layer-group', html: () => `<span class="rm-g" style="${at(10, 92, -200)}">${box({ w: 46, h: 10, d: 60, c: '#7c3aed', top: 'linear-gradient(135deg,#c63aeb,#3b82f6)' })}</span>` },
        { id: 'contact', label: 'Mailbox', go: 'Contact', href: '#contact', icon: 'fa-envelope', html: () => `<span class="rm-g" style="${at(215, 0, 160)}">${box({ w: 14, h: 110, d: 14, c: '#3f3f46' })}</span><span class="rm-g" style="${at(215, 110, 160)}">${box({ w: 60, h: 46, d: 80, c: '#ef4444', top: '#f87171' })}</span>` },
    ];
    function openRoom() {
        const el = F.sheet({
            title: '3D room', route: location.hash === '#room' ? '#room' : null, cls: 'pf-roomsheet', html: `<div class="rm-wrap">
                <div class="rm-view"><div class="rm-scene">
                    ${face('rm-floor', 600, 600, 'translate3d(-300px,0,-300px) rotateX(90deg)')}
                    ${face('rm-wall b', 600, 380, 'translate3d(-300px,-380px,-300px)')}
                    ${face('rm-wall l', 600, 380, 'translate3d(-300px,-380px,300px) rotateY(90deg)')}
                    ${face('rm-rug', 260, 200, 'translate3d(-100px,-1px,-60px) rotateX(90deg)')}
                    ${face('rm-window', 150, 110, 'translate3d(-260px,-330px,-299px)')}
                    ${ROOM.map((o) => `<button class="rm-obj" data-room="${o.id}" aria-label="${esc(`${o.label}: ${o.go}`)}">${o.html()}</button>`).join('')}
                </div></div>
                <div class="rm-hud"><p class="pf-kicker mb-1">Welcome in</p><p class="rm-tip text-sm text-gray-200">Hover an object, click to go there. Drag to look around.</p></div>
                <nav class="rm-legend" aria-label="Room objects">${ROOM.map((o) => `<button data-room="${o.id}"><i class="fas ${o.icon}"></i>${esc(o.go)}</button>`).join('')}</nav>
            </div>`,
        });
        const view = $('.rm-view', el), scene = $('.rm-scene', el), tip = $('.rm-tip', el);
        let ry = -45, rx = -24, try_ = -45, trx = -24, drag = null, raf = 0, alive = true;
        const fit = () => { const s = Math.min(view.clientWidth / 900, view.clientHeight / 760, 1.25); scene.style.setProperty('--s', s.toFixed(3)); };
        fit(); const ro = new ResizeObserver(fit); ro.observe(view);
        const loop = () => { ry += (try_ - ry) * 0.1; rx += (trx - rx) * 0.1; scene.style.transform = `translate(-50%,-30%) scale(var(--s,1)) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`; raf = alive ? requestAnimationFrame(loop) : 0; };
        loop();
        view.addEventListener('pointermove', (e) => {
            if (drag) { try_ = Math.max(-80, Math.min(-10, drag.ry + (e.clientX - drag.x) * 0.25)); trx = Math.max(-45, Math.min(-8, drag.rx - (e.clientY - drag.y) * 0.15)); return; }
            const r = view.getBoundingClientRect(); try_ = -45 + ((e.clientX - r.left) / r.width - 0.5) * 14; trx = -24 - ((e.clientY - r.top) / r.height - 0.5) * 8;
        });
        view.addEventListener('pointerdown', (e) => { if (!e.target.closest('.rm-obj')) { drag = { x: e.clientX, y: e.clientY, ry: try_, rx: trx }; view.setPointerCapture(e.pointerId); } });
        const end = () => { drag = null; };
        view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end);
        const show = (id) => { const o = ROOM.find((x) => x.id === id); if (!o) return; tip.innerHTML = `<b>${esc(o.label)}</b> → ${esc(o.go)}`; $$('.rm-obj', el).forEach((b) => b.classList.toggle('hot', b.dataset.room === id)); };
        el.addEventListener('pointerover', (e) => { const b = e.target.closest('[data-room]'); if (b) show(b.dataset.room); });
        el.addEventListener('focusin', (e) => { const b = e.target.closest('[data-room]'); if (b) show(b.dataset.room); });
        el.addEventListener('click', (e) => {
            const b = e.target.closest('[data-room]'); if (!b) return;
            const o = ROOM.find((x) => x.id === b.dataset.room);
            sfx('whoosh'); F.closeSheet();
            setTimeout(() => {
                if (o.action === 'trophies') F.openTrophies();
                else if (o.action === 'binder') openBinder();
                else if (o.href.endsWith('.html')) location.href = o.href;
                else if (o.href.startsWith('#lab/')) F.openLab(o.href.slice(5));
                else document.querySelector(o.href)?.scrollIntoView({ behavior: 'smooth' });
            }, 250);
        });
        const obs = new MutationObserver(() => { if (!el.isConnected) { alive = false; cancelAnimationFrame(raf); ro.disconnect(); obs.disconnect(); } });
        obs.observe(document.body, { childList: true });
        F.unlock('room'); F.track('room');
    }
    F.addRoute(/^#room$/, () => openRoom());

    // ---------- Boot ----------
    function boot() {
        renderCaseLinks(); renderBA(); renderProcess(); renderHudBlock();
        const dl = $('#pf-devlog');
        if (dl) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); renderDevlogBlock(); } }, { rootMargin: '400px' }).observe(dl);
        setTimeout(packFab, 2500);
        document.addEventListener('pf:lang', () => { renderCaseLinks(); });
    }
    window.Showcase = { openCase, openPress, openDevlog, openPack, openBinder, openRoom, cardStats };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
