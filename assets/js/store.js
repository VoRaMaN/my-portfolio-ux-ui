/* =========================================================================
   Game store (desktop "Web Storefronts" case study, now fully functional)
   - Data: Supabase (portfolio_games / portfolio_settings), with offline fallback
   - Search, genre filter, sort, wishlist, cart + demo checkout (localStorage)
   - Steam-style product page with video/screenshot viewer
   - Epic-style download manager: real progress, speed, ETA, pause/resume/cancel
   ========================================================================= */
(() => {
    const { esc, mediaUrl, fmtBytes, fmtTime, youTubeId, rest } = window.PF;

    // ---------- Fallback data (used if the database can't be reached) ----------
    const FALLBACK_SETTINGS = {
        hero_badge: 'OPEN TO UX/UI ROLES & COLLABS', available: true, itch_url: 'https://gojo-studio.itch.io/',
        store_name: 'COMET GAME', featured_game: 'earthfall', show_concepts: true, downloads_enabled: true,
    };
    const FALLBACK_GAMES = [
        {
            slug: 'earthfall', kind: 'game', title: 'EARTHFALL', subtitle: 'Humanity Zero', tagline: 'INVADE · DESTROY · CONQUER',
            short_description: 'Command the alien invasion of Earth. Pilot towering Tripods and Leviathan artillery platforms, raze the city block by block and complete 20 campaign objectives to conquer humanity.',
            description: 'EARTHFALL flips the alien-invasion story: you are the invader.\n\nDrop into a sprawling city and take control of alien war machines — the Balanced Assault Tripod or the Leviathan Artillery Platform. Burn through defences with the Heat Ray and Sunspear, call in Orbital Marks, Gravity Bombs and Barrage Protocols, and scan the battlefield with thermal vision.\n\nBuild a Harvester Extractor to fund the invasion, defend your Nexus from human raids, earn Command Points and air strikes, and push through the 20-objective "Conquest of Earth" campaign across a full city map.',
            developer: 'Gojo Studio', publisher: 'Gojo Studio', release_date: null, price: 0,
            genres: ['Action', 'Strategy'], tags: ['Playable', 'Sci-fi', 'Aliens', 'Destruction', 'Base Building', 'Third-Person', 'Singleplayer'], platforms: ['Windows'],
            playable: true, icon_url: 'assets/img/earthfall-icon.webp', banner_url: 'assets/img/earthfall-banner-1600.webp', capsule_url: 'assets/img/earthfall-icon.webp',
            screenshots: ['assets/img/earthfall-shot-1-1600.webp', 'assets/img/earthfall-shot-2-1600.webp', 'assets/img/earthfall-shot-3-1600.webp'],
            videos: [], download: { mode: 'none' },
            sys_req: { minimum: { os: 'Windows 10 64-bit', cpu: 'Quad-core 2.5 GHz', memory: '8 GB RAM', graphics: 'GTX 960 / RX 470 (2 GB)', storage: '1 GB available space' } },
            rating: null, download_count: 0, sort: 0,
        },
        {
            slug: 'stick-empire-conquest-3d', kind: 'game', title: 'Stick Empire Conquest 3D', subtitle: 'Real-time strategy', tagline: 'ORDER · CHAOS · WILDLANDS',
            short_description: 'A 3D real-time strategy battle game inspired by classic stick-figure warfare. Pick the Order or the Chaos Empire, build an army, manage resources and unlock upgrades — then battle the AI or real players online, right in your browser.',
            description: 'Stick Empire Conquest 3D is a real-time strategy and battle game inspired by classic stick-figure warfare and large-scale strategy games. Pick your side — the Order Empire or the Chaos Empire — build an army, manage resources and unlock upgrades.\n\nOnline multiplayer (1v1 and 2v2), a 49-region campaign on a candle-lit war table, a five-mission story, and every unit animated with procedural IK. Plays on phones and desktops, and installs as an app from the browser.',
            developer: 'Gojo Studio', publisher: 'Gojo Studio', release_date: null, price: 0,
            genres: ['Strategy', 'Action'], tags: ['Playable', 'Play in browser', 'Multiplayer', 'Singleplayer', '3D', 'Low-poly', 'Stickman', 'RTS'], platforms: ['Web browser', 'Mobile (installable app)'],
            playable: true, icon_url: 'assets/img/stickempire-icon-256.webp', banner_url: 'assets/img/stickempire-banner-1600.webp', capsule_url: 'assets/img/stickempire-banner-800.webp',
            screenshots: ['assets/img/stickempire-banner-1600.webp', 'assets/img/stickempire-emblems.webp'], videos: [], download: { mode: 'none' },
            play: { url: 'https://voraman.github.io/Stick-Empire-Conquest-3D/', itch_url: 'https://gojo-studio.itch.io/stick-empire-conquest-3d' },
            sys_req: { minimum: { os: 'Any modern browser (Chrome, Edge, Firefox, Safari) on desktop or phone', graphics: 'WebGL-capable GPU' } },
            rating: null, download_count: 0, sort: 1,
        },
        { slug: 'spider-man-ui', kind: 'concept', title: 'Spider-Man: Remastered', subtitle: 'UI concept', tagline: 'Dashboard UI concept', short_description: 'A game-launcher dashboard concept: most played, quick-launch apps and a store rail.', description: 'UI/UX concept by Voraman Vuth — a launcher dashboard exploring quick access to recently played games, social apps and a storefront rail.', developer: 'Voraman Vuth (UI concept)', price: 39.99, genres: ['Action', 'Adventure'], tags: ['UI Concept'], platforms: ['Windows'], banner_url: 'assets/img/desk-dashboard-1600.webp', capsule_url: 'assets/img/desk-dashboard-800.webp', screenshots: ['assets/img/desk-dashboard-1600.webp'], videos: [], download: { mode: 'none' }, sys_req: {}, rating: 4.8, sort: 10 },
        { slug: 'god-of-war-ui', kind: 'concept', title: 'God of War', subtitle: 'UI concept', tagline: 'Main menu UI concept', short_description: 'A cinematic main-menu concept with a store, profile and quick-play layout.', description: 'UI/UX concept by Voraman Vuth — a game main menu combining profile, shop and quick-play entry points.', developer: 'Voraman Vuth (UI concept)', price: 49.99, genres: ['Action', 'Fighting'], tags: ['UI Concept'], platforms: ['Windows'], banner_url: 'assets/img/desk-mainmenu-1600.webp', capsule_url: 'assets/img/desk-mainmenu-800.webp', screenshots: ['assets/img/desk-mainmenu-1600.webp'], videos: [], download: { mode: 'none' }, sys_req: {}, rating: 4.7, sort: 11 },
        { slug: 'need-for-speed-ui', kind: 'concept', title: 'Need For Speed', subtitle: 'UI concept', tagline: 'Studio website concept', short_description: 'A studio landing-page concept with trailer hero and bold call to action.', description: 'UI/UX concept by Voraman Vuth — a game studio website with a trailer hero, studio pitch and navigation.', developer: 'Voraman Vuth (UI concept)', price: 29.99, genres: ['Racing'], tags: ['UI Concept'], platforms: ['Windows'], banner_url: 'assets/img/desk-iggsite-1600.webp', capsule_url: 'assets/img/desk-iggsite-800.webp', screenshots: ['assets/img/desk-iggsite-1600.webp', 'assets/img/desk-iggsite2-1600.webp'], videos: [], download: { mode: 'none' }, sys_req: {}, rating: 4.5, sort: 12 },
    ];

    // ---------- State ----------
    const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
    const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
    const S = {
        games: FALLBACK_GAMES, settings: FALLBACK_SETTINGS, online: false,
        genre: 'All', q: '', sort: 'featured', tab: 'store',
        cart: load('pf_cart', []), wish: load('pf_wish', []), library: load('pf_library', []),
        current: null, mediaIndex: 0, dl: null, animateGrid: true, heroIndex: 0, heroRaf: 0, playing: null,
    };
    const $ = (id) => document.getElementById(id);
    const bySlug = (slug) => S.games.find((g) => g.slug === slug);
    const visibleGames = () => S.games.filter((g) => S.settings.show_concepts !== false || g.kind !== 'concept');
    const priceLabel = (g) => (Number(g.price) > 0 ? `$${Number(g.price).toFixed(2)}` : 'Free');
    const hasPlay = (g) => !!(g && g.play && g.play.url);
    const platIcon = (p) => {
        const s = String(p).toLowerCase();
        if (s.includes('win')) return 'fab fa-windows';
        if (s.includes('mac') || s.includes('ios')) return 'fab fa-apple';
        if (s.includes('linux')) return 'fab fa-linux';
        if (s.includes('android')) return 'fab fa-android';
        if (s.includes('mobile')) return 'fas fa-mobile-screen';
        return 'fas fa-globe';
    };
    const primaryLabel = (g) => {
        if (hasPlay(g)) return '<i class="fas fa-play mr-2"></i>Play free';
        if (g.kind === 'game' && Number(g.price) === 0) return hasBuild(g) ? '<i class="fas fa-download mr-2"></i>Download free' : 'View game';
        return 'View details';
    };
    const hasBuild = (g) => g.download && ((g.download.mode === 'parts' && g.download.parts?.length) || (g.download.mode === 'url' && g.download.url));

    function toast(msg, icon = 'fa-check') {
        const t = $('store-toast');
        if (!t) return;
        t.innerHTML = `<i class="fas ${icon} text-brand-purple"></i><span>${esc(msg)}</span>`;
        t.classList.remove('opacity-0', 'translate-y-4');
        clearTimeout(t._h);
        t._h = setTimeout(() => t.classList.add('opacity-0', 'translate-y-4'), 2400);
    }

    // ---------- Data ----------
    async function loadData() {
        try {
            const [games, settings] = await Promise.all([
                rest('portfolio_games?select=*&published=eq.true&order=sort.asc,created_at.asc'),
                rest('portfolio_settings?select=value&key=eq.site'),
            ]);
            if (Array.isArray(games) && games.length) S.games = games;
            if (settings?.[0]?.value) S.settings = { ...FALLBACK_SETTINGS, ...settings[0].value };
            S.online = true;
        } catch (e) {
            console.warn('[store] using offline data:', e.message);
        }
        applySiteSettings();
        renderAll();
        route();
    }

    // Settings that affect the rest of the portfolio page
    function applySiteSettings() {
        const s = S.settings;
        const badge = $('hero-badge-text');
        if (badge && s.hero_badge) badge.textContent = s.hero_badge;
        const dot = $('hero-badge-dot');
        if (dot) { dot.classList.toggle('bg-green-400', s.available !== false); dot.classList.toggle('bg-yellow-400', s.available === false); }
        if (s.itch_url) document.querySelectorAll('[data-itch]').forEach((a) => { a.href = s.itch_url; });
        document.querySelectorAll('[data-store-name]').forEach((el) => { el.textContent = s.store_name || 'STORE'; });
    }

    // ---------- Shell ----------
    function renderShell() {
        const root = $('store-root');
        if (!root || root.dataset.ready) return;
        root.dataset.ready = '1';
        root.innerHTML = `
        <div class="flex h-full pt-20 pb-6 px-4 md:px-8 max-w-[1600px] mx-auto gap-8 relative">
            <!-- Sidebar -->
            <aside class="w-60 hidden lg:flex flex-col border-r border-white/10 pr-5 overflow-y-auto no-scrollbar">
                <h3 class="text-xl font-black mb-6 flex items-center gap-2"><i class="fas fa-gamepad text-brand-purple"></i> <span data-store-name>${esc(S.settings.store_name || 'STORE')}</span></h3>
                <nav class="space-y-1 mb-6" id="store-tabs">
                    <button data-tab="store" class="store-tab w-full text-left py-2 px-4 rounded-lg flex items-center gap-3 transition-colors"><i class="fas fa-store w-4"></i>Store</button>
                    <button data-tab="wishlist" class="store-tab w-full text-left py-2 px-4 rounded-lg flex items-center gap-3 transition-colors"><i class="fas fa-heart w-4"></i>Wishlist <span id="wish-count" class="ml-auto text-xs bg-white/10 rounded-full px-2"></span></button>
                    <button data-tab="library" class="store-tab w-full text-left py-2 px-4 rounded-lg flex items-center gap-3 transition-colors"><i class="fas fa-download w-4"></i>Library <span id="lib-count" class="ml-auto text-xs bg-white/10 rounded-full px-2"></span></button>
                </nav>
                <p class="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider px-1">Genre</p>
                <div id="store-genres" class="space-y-1"></div>
                <p id="store-status" class="mt-auto pt-6 text-[10px] text-gray-600 px-1"></p>
            </aside>

            <!-- Main -->
            <div class="flex-1 min-w-0 relative overflow-y-auto pr-1" id="store-content-area">
                <div id="store-grid-view"></div>
                <div id="store-product-view" class="hidden"></div>
            </div>
        </div>

        <!-- Floating cart -->
        <button id="cart-btn" class="floating-cart fixed bottom-6 left-0 z-[110] bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-r-2xl p-4 flex items-center gap-4 group" aria-label="Open cart">
            <span class="relative"><i class="fas fa-shopping-cart text-xl"></i><span id="cart-count" class="absolute -top-2 -right-3 bg-brand-purple text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">0</span></span>
            <span class="hidden sm:block text-left whitespace-nowrap"><span id="cart-label" class="font-bold text-sm block">CART</span><span id="cart-sub" class="block text-xs text-gray-300">Empty</span></span>
        </button>

        <!-- Cart drawer -->
        <div id="cart-overlay" class="fixed inset-0 z-[120] bg-black/60 opacity-0 pointer-events-none transition-opacity duration-300"></div>
        <aside id="cart-drawer" class="fixed top-0 right-0 z-[130] h-full w-full max-w-md glass-dark translate-x-full transition-transform duration-500 flex flex-col" aria-label="Cart">
            <div class="flex items-center justify-between p-5 border-b border-white/10">
                <h3 class="font-bold text-lg flex items-center gap-2"><i class="fas fa-shopping-cart text-brand-purple"></i> Your Cart</h3>
                <button id="cart-close" class="w-9 h-9 rounded-full hover:bg-white/10" aria-label="Close cart"><i class="fas fa-times"></i></button>
            </div>
            <div id="cart-items" class="flex-1 overflow-y-auto p-5 space-y-3"></div>
            <div class="p-5 border-t border-white/10 space-y-3">
                <div class="flex justify-between text-sm text-gray-400"><span>Subtotal</span><span id="cart-subtotal">$0.00</span></div>
                <div class="flex justify-between font-bold text-lg"><span>Total</span><span id="cart-total">$0.00</span></div>
                <button id="cart-checkout" class="btn-main w-full py-3 rounded-xl font-bold disabled:opacity-40 disabled:pointer-events-none">Checkout</button>
                <p class="text-[10px] text-gray-500 text-center">Portfolio demo store — no payment is taken.</p>
            </div>
        </aside>

        <!-- Checkout modal -->
        <div id="checkout-modal" class="fixed inset-0 z-[140] hidden items-center justify-center p-4 bg-black/70">
            <div class="glass-dark rounded-3xl p-8 w-full max-w-md text-center animate-fade-in">
                <div id="checkout-body"></div>
            </div>
        </div>

        <!-- Downloads dock (Epic-style) -->
        <div id="dl-dock" class="fixed bottom-6 right-6 z-[110] w-[320px] max-w-[calc(100vw-3rem)] glass-dark rounded-2xl p-4 hidden"></div>

        <!-- In-browser game player -->
        <div id="game-player" class="fixed inset-0 z-[160] hidden flex-col bg-black/95" role="dialog" aria-modal="true" aria-label="Game player">
            <div class="relative z-10 flex items-center gap-3 px-3 sm:px-4 py-2.5 glass-dark border-x-0 border-t-0">
                <img id="gp-icon" alt="" class="w-9 h-9 rounded-lg object-cover">
                <div class="min-w-0"><p id="gp-title" class="font-bold text-sm truncate"></p><p class="text-[10px] text-green-400 tracking-widest uppercase"><span class="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1 align-middle"></span>Playing in your browser</p></div>
                <div class="ml-auto flex items-center gap-2">
                    <a id="gp-itch" target="_blank" rel="noopener" class="btn-glass rounded-lg px-3 py-1.5 text-xs !hidden sm:!inline-flex items-center gap-1.5"><i class="fab fa-itch-io"></i>itch.io</a>
                    <a id="gp-newtab" target="_blank" rel="noopener" class="btn-glass rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5" aria-label="Open in new tab"><i class="fas fa-up-right-from-square"></i><span class="hidden sm:inline">New tab</span></a>
                    <button id="gp-full" class="btn-glass rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5" aria-label="Fullscreen"><i class="fas fa-expand"></i><span class="hidden sm:inline">Fullscreen</span></button>
                    <button id="gp-close" class="btn-glass rounded-lg px-3 py-1.5 text-xs" aria-label="Close game"><i class="fas fa-xmark"></i></button>
                </div>
            </div>
            <div id="gp-stage" class="relative flex-1 bg-black">
                <iframe id="gp-frame" title="Game" class="absolute inset-0 w-full h-full border-0" allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope; xr-spatial-tracking" allowfullscreen></iframe>
                <div id="gp-loader" class="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-[radial-gradient(ellipse_at_center,#1b0b22_0%,#050505_70%)] transition-opacity duration-700">
                    <div class="relative w-28 h-28">
                        <span class="gp-ring absolute -inset-4 rounded-full"></span>
                        <img id="gp-loader-icon" alt="" class="gp-pulse relative w-28 h-28 rounded-[28px] object-cover">
                    </div>
                    <p id="gp-loader-title" class="font-black text-2xl tracking-tight text-center px-4"></p>
                    <div class="w-64 max-w-[70vw] h-1.5 bg-white/10 rounded-full overflow-hidden"><div class="gp-indeterminate h-full w-1/3 rounded-full bg-gradient-to-r from-brand-purple to-blue-400"></div></div>
                    <p id="gp-tip" class="text-xs text-gray-400 max-w-xs text-center px-4 transition-opacity duration-300"></p>
                </div>
            </div>
        </div>

        <!-- Toast -->
        <div id="store-toast" class="fixed top-6 left-1/2 -translate-x-1/2 z-[150] glass rounded-full px-5 py-2.5 text-sm flex items-center gap-3 opacity-0 translate-y-4 pointer-events-none transition-all duration-300"></div>`;

        root.querySelectorAll('.store-tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
        $('cart-btn').addEventListener('click', openCart);
        $('cart-close').addEventListener('click', closeCart);
        $('cart-overlay').addEventListener('click', closeCart);
        $('cart-checkout').addEventListener('click', checkout);
        $('gp-close').addEventListener('click', closePlayer);
        $('gp-full').addEventListener('click', () => {
            const P = $('game-player');
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
            else (P.requestFullscreen || P.webkitRequestFullscreen)?.call(P);
        });
    }

    function setTab(tab) {
        S.tab = tab;
        if (location.hash.startsWith('#store/')) location.hash = '#store';
        showGrid();
    }

    // ---------- Sidebar ----------
    function renderSidebar() {
        const genres = ['All', ...new Set(visibleGames().flatMap((g) => g.genres || []))];
        const box = $('store-genres');
        box.innerHTML = genres.map((g) => `<button data-genre="${esc(g)}" class="w-full text-left py-2 px-4 rounded-lg transition-colors ${g === S.genre ? 'bg-brand-purple text-white font-bold' : 'text-gray-300 hover:bg-white/5 hover:text-white'}">${esc(g)}</button>`).join('');
        box.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { S.genre = b.dataset.genre; S.tab = 'store'; showGrid(); }));
        document.querySelectorAll('.store-tab').forEach((b) => {
            const on = b.dataset.tab === S.tab;
            b.classList.toggle('bg-white/10', on); b.classList.toggle('text-white', on); b.classList.toggle('font-bold', on);
            b.classList.toggle('text-gray-300', !on);
        });
        $('wish-count').textContent = S.wish.length || '';
        $('lib-count').textContent = S.library.length || '';
        $('store-status').textContent = S.online ? '● Live data' : '○ Offline preview data';
    }

    // ---------- Grid ----------
    function filtered() {
        let list = visibleGames();
        if (S.tab === 'wishlist') list = list.filter((g) => S.wish.includes(g.slug));
        if (S.tab === 'library') list = list.filter((g) => S.library.includes(g.slug));
        if (S.genre !== 'All') list = list.filter((g) => (g.genres || []).includes(S.genre));
        const q = S.q.trim().toLowerCase();
        if (q) list = list.filter((g) => [g.title, g.subtitle, g.tagline, ...(g.tags || []), ...(g.genres || [])].join(' ').toLowerCase().includes(q));
        const sorters = {
            featured: (a, b) => (a.sort ?? 0) - (b.sort ?? 0),
            'price-asc': (a, b) => a.price - b.price,
            'price-desc': (a, b) => b.price - a.price,
            name: (a, b) => a.title.localeCompare(b.title),
            popular: (a, b) => (b.download_count || 0) - (a.download_count || 0),
        };
        return [...list].sort(sorters[S.sort] || sorters.featured);
    }

    function tagChip(t) {
        if (t === 'Playable') return `<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30 rounded px-2 py-0.5"><i class="fas fa-gamepad"></i> Playable</span>`;
        if (t === 'UI Concept') return `<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded px-2 py-0.5"><i class="fas fa-pen-ruler"></i> UI Concept</span>`;
        return `<span class="text-[10px] font-semibold text-gray-300 bg-white/5 border border-white/10 rounded px-2 py-0.5">${esc(t)}</span>`;
    }

    function heroGames() {
        const games = visibleGames().filter((g) => g.kind === 'game');
        const featured = bySlug(S.settings.featured_game);
        const list = featured ? [featured, ...games.filter((g) => g !== featured)] : games;
        return list.length ? list : visibleGames().slice(0, 1);
    }

    function renderHero() {
        if (S.tab !== 'store' || S.q || S.genre !== 'All') return '';
        const list = heroGames();
        if (!list.length) return '';
        S.heroIndex = Math.min(S.heroIndex, list.length - 1);
        return `
        <div id="store-hero" class="grid grid-cols-1 xl:grid-cols-[1fr_250px] gap-4 mb-8">
            <div class="relative rounded-3xl overflow-hidden aspect-[16/10] md:aspect-[21/9] border border-white/10 bg-black">
                ${list.map((g, i) => `
                <div class="hero-slide absolute inset-0 ${i === S.heroIndex ? 'is-on' : ''}" data-slide="${i}">
                    <img src="${esc(mediaUrl(g.banner_url))}" alt="" class="hero-kb absolute inset-0 w-full h-full object-cover">
                    <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-transparent"></div>
                    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                    <div class="hero-copy absolute inset-y-0 left-0 p-5 md:p-10 flex flex-col justify-end max-w-xl">
                        <span class="text-[10px] font-bold tracking-[0.3em] text-brand-purple mb-2">${i === 0 ? 'FEATURED' : 'ALSO BY GOJO STUDIO'} · ${i + 1}/${list.length}</span>
                        <h2 class="text-3xl md:text-5xl font-black tracking-tight">${esc(g.title)}</h2>
                        ${g.tagline ? `<p class="text-[11px] md:text-sm tracking-[0.3em] text-gray-300 mt-2">${esc(g.tagline)}</p>` : ''}
                        <p class="text-sm text-gray-300 mt-3 line-clamp-2 hidden md:block">${esc(g.short_description || '')}</p>
                        <div class="flex flex-wrap gap-2 mt-4">${(g.tags || []).slice(0, 4).map(tagChip).join('')}</div>
                        <div class="flex items-center gap-3 mt-5">
                            <button data-open="${esc(g.slug)}" data-autoplay="${hasPlay(g) ? '1' : ''}" class="btn-main rounded-xl px-6 py-3 text-sm font-bold">${primaryLabel(g)}</button>
                            <button data-wish="${esc(g.slug)}" class="btn-glass rounded-xl w-11 h-11 ${S.wish.includes(g.slug) ? '!text-pink-400' : ''}" aria-label="Toggle wishlist"><i class="${S.wish.includes(g.slug) ? 'fas' : 'far'} fa-heart"></i></button>
                            <span class="text-sm font-bold">${priceLabel(g)}</span>
                        </div>
                    </div>
                </div>`).join('')}
                ${list.length > 1 ? `<div class="absolute bottom-0 inset-x-0 h-1 bg-white/10 z-20"><div id="hero-progress" class="h-full w-full bg-gradient-to-r from-brand-purple to-blue-400 origin-left" style="transform:scaleX(0)"></div></div>` : ''}
            </div>
            ${list.length > 1 ? `<div class="hidden xl:flex flex-col gap-2">
                ${list.map((g, i) => `<button data-hero="${i}" class="hero-thumb relative flex items-center gap-3 p-2.5 rounded-xl text-left overflow-hidden transition-colors ${i === S.heroIndex ? 'bg-white/10' : 'hover:bg-white/5'}">
                    <span class="hero-thumb-fill absolute inset-0 bg-white/10 origin-left" style="transform:scaleX(0)"></span>
                    <img src="${esc(mediaUrl(g.icon_url || g.capsule_url || g.banner_url))}" alt="" class="relative w-12 h-12 rounded-lg object-cover">
                    <span class="relative text-sm font-bold leading-tight">${esc(g.title)}</span>
                </button>`).join('')}
            </div>` : ''}
        </div>`;
    }

    function setHero(i) {
        const slides = document.querySelectorAll('#store-hero .hero-slide');
        if (!slides.length) return;
        S.heroIndex = (i + slides.length) % slides.length;
        slides.forEach((el, idx) => el.classList.toggle('is-on', idx === S.heroIndex));
        document.querySelectorAll('#store-hero .hero-thumb').forEach((el, idx) => {
            el.classList.toggle('bg-white/10', idx === S.heroIndex);
            el.querySelector('.hero-thumb-fill').style.transform = 'scaleX(0)';
        });
        S.heroElapsed = 0;
    }

    function startHero() {
        cancelAnimationFrame(S.heroRaf);
        const hero = $('store-hero');
        const count = document.querySelectorAll('#store-hero .hero-slide').length;
        if (!hero || count < 2) return;
        const DUR = 7000;
        let last = performance.now(), paused = false;
        S.heroElapsed = 0;
        hero.addEventListener('pointerenter', () => { paused = true; });
        hero.addEventListener('pointerleave', () => { paused = false; });
        hero.querySelectorAll('[data-hero]').forEach((b) => b.addEventListener('click', () => setHero(+b.dataset.hero)));
        const step = (now) => {
            if (!document.body.contains(hero) || !$('desktop-detail')?.classList.contains('active')) { S.heroRaf = 0; return; }
            const dt = Math.min(100, now - last); last = now;
            if (!paused && !document.hidden) S.heroElapsed += dt;
            const p = Math.min(1, S.heroElapsed / DUR);
            const bar = $('hero-progress'); if (bar) bar.style.transform = `scaleX(${p})`;
            const fill = hero.querySelectorAll('.hero-thumb-fill')[S.heroIndex]; if (fill) fill.style.transform = `scaleX(${p})`;
            if (p >= 1) setHero(S.heroIndex + 1);
            S.heroRaf = requestAnimationFrame(step);
        };
        S.heroRaf = requestAnimationFrame(step);
    }

    function cardHtml(g, i = 0) {
        const inWish = S.wish.includes(g.slug);
        const img = g.capsule_url || g.banner_url || g.screenshots?.[0];
        const square = g.capsule_url && g.capsule_url === g.icon_url;
        const alt = (g.screenshots || []).find((x) => x !== img) || (g.banner_url !== img ? g.banner_url : null);
        return `
        <div class="store-card ${S.animateGrid ? 'card-in' : ''} bg-white/[0.04] rounded-2xl overflow-hidden cursor-pointer group border border-white/10 flex flex-col" style="--i:${i}" data-open="${esc(g.slug)}" tabindex="0" role="button" aria-label="${esc(g.title)}">
            <div class="h-56 overflow-hidden relative bg-black">
                <img src="${esc(mediaUrl(img))}" alt="" loading="lazy" decoding="async" class="absolute inset-0 w-full h-full ${square ? 'object-cover object-top' : 'object-cover'} transition duration-700 group-hover:scale-105 ${alt ? 'group-hover:opacity-0' : ''}">
                ${alt ? `<img src="${esc(mediaUrl(alt))}" alt="" loading="lazy" decoding="async" class="absolute inset-0 w-full h-full object-cover opacity-0 scale-110 transition duration-700 group-hover:opacity-100 group-hover:scale-100">` : ''}
                <span class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></span>
                <button data-wish="${esc(g.slug)}" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:scale-110 transition-transform ${inWish ? 'text-pink-500' : 'text-white'}" aria-label="Toggle wishlist"><i class="${inWish ? 'fas' : 'far'} fa-heart"></i></button>
                <div class="absolute bottom-2 left-2 flex gap-1">${(g.tags || []).filter((t) => t === 'Playable' || t === 'UI Concept').map(tagChip).join('')}</div>
                ${hasPlay(g) ? '<span class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500"><span class="w-14 h-14 rounded-full bg-green-500/90 flex items-center justify-center text-lg shadow-[0_0_30px_rgba(34,197,94,.6)] scale-75 group-hover:scale-100 transition duration-500"><i class="fas fa-play ml-0.5"></i></span></span>' : ''}
            </div>
            <div class="p-4 flex flex-col flex-1">
                <p class="text-[10px] uppercase tracking-widest text-gray-500">${esc((g.genres || []).join(' · '))}</p>
                <h3 class="font-bold text-lg truncate mt-1">${esc(g.title)}</h3>
                <div class="flex justify-between items-center mt-auto pt-3">
                    <span class="${Number(g.price) > 0 ? 'text-brand-purple' : 'text-green-400'} font-bold">${priceLabel(g)}</span>
                    ${Number(g.price) > 0
                        ? `<button data-cart="${esc(g.slug)}" class="w-9 h-9 rounded-full ${S.cart.includes(g.slug) ? 'bg-brand-purple text-white' : 'bg-white/10 text-gray-300 hover:bg-white hover:text-black'} transition-colors" aria-label="Add to cart"><i class="fas ${S.cart.includes(g.slug) ? 'fa-check' : 'fa-cart-plus'}"></i></button>`
                        : `<span class="text-xs ${hasPlay(g) ? 'text-green-400 font-bold' : 'text-gray-400'}">${hasPlay(g) ? '<i class="fas fa-play mr-1"></i>Play in browser' : hasBuild(g) ? '<i class="fas fa-download mr-1"></i>Download' : g.kind === 'game' ? 'Coming soon' : ''}</span>`}
                </div>
            </div>
        </div>`;
    }

    function showGrid(animate = true) {
        S.animateGrid = animate;
        S.current = null;
        $('store-product-view').classList.add('hidden');
        const view = $('store-grid-view');
        view.classList.remove('hidden');
        const list = filtered();
        const titles = { store: 'Top Sellers', wishlist: 'Your Wishlist', library: 'Your Library' };
        view.innerHTML = `
            ${renderHero()}
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 class="text-2xl font-bold">${titles[S.tab]} <span class="text-sm text-gray-500 font-normal">(${list.length})</span></h2>
                <div class="flex gap-3">
                    <label class="relative flex-1 md:w-64">
                        <span class="sr-only">Search store</span>
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
                        <input id="store-search" type="search" placeholder="Search store" value="${esc(S.q)}" class="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-brand-purple">
                    </label>
                    <label class="sr-only" for="store-sort">Sort by</label>
                    <select id="store-sort" class="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-purple">
                        ${[['featured', 'Featured'], ['popular', 'Most downloaded'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['name', 'Name A–Z']].map(([v, l]) => `<option value="${v}" ${S.sort === v ? 'selected' : ''} class="bg-[#111]">${l}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="lg:hidden flex gap-2 overflow-x-auto no-scrollbar mb-5 -mx-1 px-1">
                ${['store', 'wishlist', 'library'].map((t) => `<button data-tab-m="${t}" class="shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border ${S.tab === t ? 'bg-white text-black border-white' : 'border-white/15 text-gray-300'}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
                ${['All', ...new Set(visibleGames().flatMap((g) => g.genres || []))].map((g) => `<button data-genre-m="${esc(g)}" class="shrink-0 px-4 py-1.5 rounded-full text-xs border ${S.genre === g ? 'bg-brand-purple border-brand-purple' : 'border-white/15 text-gray-300'}">${esc(g)}</button>`).join('')}
            </div>
            ${list.length ? `<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pb-28">${list.map((g, i) => cardHtml(g, i)).join('')}</div>`
                : `<div class="text-center py-24 text-gray-500"><i class="fas ${S.tab === 'wishlist' ? 'fa-heart' : S.tab === 'library' ? 'fa-download' : 'fa-search'} text-4xl mb-4"></i><p>${S.tab === 'wishlist' ? 'Your wishlist is empty.' : S.tab === 'library' ? 'Games you download appear here.' : 'No games match your search.'}</p></div>`}`;

        const search = $('store-search');
        search.addEventListener('input', (e) => { S.q = e.target.value; const pos = e.target.selectionStart; showGrid(false); const s2 = $('store-search'); s2.focus(); s2.setSelectionRange(pos, pos); });
        $('store-sort').addEventListener('change', (e) => { S.sort = e.target.value; showGrid(); });
        view.querySelectorAll('[data-tab-m]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tabM)));
        view.querySelectorAll('[data-genre-m]').forEach((b) => b.addEventListener('click', () => { S.genre = b.dataset.genreM; showGrid(); }));
        bindCardActions(view);
        renderSidebar();
        startHero();
    }

    function bindCardActions(scope) {
        scope.querySelectorAll('[data-open]').forEach((el) => {
            el.addEventListener('click', (e) => { e.stopPropagation(); location.hash = `#store/${el.dataset.open}${el.dataset.autoplay ? '/play' : ''}`; });
            el.addEventListener('keydown', (e) => { if (e.key === 'Enter') location.hash = `#store/${el.dataset.open}`; });
        });
        scope.querySelectorAll('[data-wish]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); toggleWish(b.dataset.wish); }));
        scope.querySelectorAll('[data-cart]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); toggleCart(b.dataset.cart); }));
    }

    // ---------- Wishlist / cart ----------
    function toggleWish(slug) {
        const g = bySlug(slug);
        if (S.wish.includes(slug)) { S.wish = S.wish.filter((s) => s !== slug); toast(`Removed ${g.title} from wishlist`, 'fa-heart-crack'); }
        else { S.wish.push(slug); toast(`Added ${g.title} to wishlist`, 'fa-heart'); }
        save('pf_wish', S.wish);
        refreshView();
    }
    function toggleCart(slug, forceAdd) {
        const g = bySlug(slug);
        if (S.cart.includes(slug) && !forceAdd) { S.cart = S.cart.filter((s) => s !== slug); toast(`Removed ${g.title} from cart`, 'fa-trash'); }
        else if (!S.cart.includes(slug)) { S.cart.push(slug); toast(`Added ${g.title} to cart`, 'fa-cart-plus'); }
        save('pf_cart', S.cart);
        renderCart();
        refreshView();
    }
    function refreshView() { if (S.current) renderProduct(S.current.slug, true); else showGrid(false); }

    function renderCart() {
        const items = S.cart.map(bySlug).filter(Boolean);
        const total = items.reduce((a, g) => a + Number(g.price), 0);
        $('cart-count').textContent = items.length;
        $('cart-sub').textContent = items.length ? `${items.length} item${items.length > 1 ? 's' : ''} · $${total.toFixed(2)}` : 'Empty';
        $('cart-subtotal').textContent = `$${total.toFixed(2)}`;
        $('cart-total').textContent = `$${total.toFixed(2)}`;
        $('cart-checkout').disabled = !items.length;
        $('cart-items').innerHTML = items.length ? items.map((g) => `
            <div class="flex gap-3 items-center bg-white/5 rounded-xl p-3 border border-white/10">
                <img src="${esc(mediaUrl(g.capsule_url || g.banner_url))}" alt="" class="w-20 h-12 rounded-lg object-cover">
                <div class="flex-1 min-w-0"><p class="font-bold text-sm truncate">${esc(g.title)}</p><p class="text-xs text-brand-purple font-bold">${priceLabel(g)}</p></div>
                <button data-remove="${esc(g.slug)}" class="w-8 h-8 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-400" aria-label="Remove"><i class="fas fa-trash text-xs"></i></button>
            </div>`).join('')
            : '<div class="text-center text-gray-500 py-16"><i class="fas fa-shopping-cart text-3xl mb-3"></i><p class="text-sm">Your cart is empty.</p></div>';
        $('cart-items').querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => toggleCart(b.dataset.remove)));
    }
    function openCart() {
        $('cart-drawer').classList.remove('translate-x-full');
        $('cart-overlay').classList.remove('opacity-0', 'pointer-events-none');
    }
    function closeCart() {
        $('cart-drawer').classList.add('translate-x-full');
        $('cart-overlay').classList.add('opacity-0', 'pointer-events-none');
    }
    function checkout() {
        const items = S.cart.map(bySlug).filter(Boolean);
        const total = items.reduce((a, g) => a + Number(g.price), 0);
        const modal = $('checkout-modal');
        const body = $('checkout-body');
        body.innerHTML = `
            <div class="w-16 h-16 mx-auto mb-5 rounded-full bg-brand-purple/20 text-brand-purple flex items-center justify-center text-2xl"><i class="fas fa-receipt"></i></div>
            <h3 class="text-2xl font-bold mb-2">Confirm order</h3>
            <p class="text-gray-400 text-sm mb-6">${items.length} item${items.length > 1 ? 's' : ''} · <span class="text-white font-bold">$${total.toFixed(2)}</span><br>This is a portfolio demo — no payment is taken.</p>
            <div class="flex gap-3"><button id="co-cancel" class="btn-glass flex-1 py-3 rounded-xl font-bold">Cancel</button><button id="co-confirm" class="btn-main flex-1 py-3 rounded-xl font-bold">Place order</button></div>`;
        modal.classList.remove('hidden'); modal.classList.add('flex');
        const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };
        $('co-cancel').onclick = close;
        $('co-confirm').onclick = () => {
            const btn = $('co-confirm');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            setTimeout(() => {
                items.forEach((g) => { if (!S.library.includes(g.slug)) S.library.push(g.slug); });
                save('pf_library', S.library);
                S.cart = []; save('pf_cart', S.cart);
                renderCart(); closeCart(); refreshView();
                body.innerHTML = `
                    <div class="w-16 h-16 mx-auto mb-5 rounded-full bg-green-500 text-white flex items-center justify-center text-2xl animate-check"><i class="fas fa-check"></i></div>
                    <h3 class="text-2xl font-bold mb-2">Order placed!</h3>
                    <p class="text-gray-400 text-sm mb-6">Items were added to your Library (demo).</p>
                    <button id="co-done" class="btn-main w-full py-3 rounded-xl font-bold">Done</button>`;
                $('co-done').onclick = close;
            }, 900);
        };
    }

    // ---------- Product page (Steam-style) ----------
    function mediaItems(g) {
        const vids = (g.videos || []).map((v) => ({ type: 'video', ...v }));
        const shots = (g.screenshots || []).map((src) => ({ type: 'image', src }));
        const items = [...(hasPlay(g) ? [{ type: 'play', src: g.banner_url }] : []), ...vids, ...shots];
        if (!items.length && g.banner_url) items.push({ type: 'image', src: g.banner_url });
        return items;
    }

    function renderProduct(slug, keepMedia) {
        const g = bySlug(slug);
        if (!g) { location.hash = '#store'; return; }
        if (!keepMedia || S.current?.slug !== slug) S.mediaIndex = 0;
        S.current = g;
        $('store-grid-view').classList.add('hidden');
        const view = $('store-product-view');
        view.classList.remove('hidden');
        view.classList.toggle('sp-in', !keepMedia);
        const items = mediaItems(g);
        const inWish = S.wish.includes(g.slug);
        const owned = S.library.includes(g.slug);
        const req = g.sys_req?.minimum || {};
        const reqRows = [['OS', req.os], ['Processor', req.cpu], ['Memory', req.memory], ['Graphics', req.graphics], ['Storage', req.storage]].filter(([, v]) => v);
        const date = g.release_date ? new Date(g.release_date + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : (g.kind === 'game' ? 'Available now' : '—');

        view.innerHTML = `
            <button id="sp-back" class="mb-5 flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"><i class="fas fa-arrow-left"></i> Back to store</button>
            <div class="flex flex-wrap items-end justify-between gap-4 mb-5">
                <div class="flex items-center gap-4 min-w-0">
                    ${g.icon_url ? `<img src="${esc(mediaUrl(g.icon_url))}" alt="" class="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover border border-white/10 shrink-0">` : ''}
                    <div class="min-w-0">
                        <h1 class="text-3xl md:text-5xl font-black tracking-tight truncate">${esc(g.title)}</h1>
                        <p class="text-gray-400 text-sm mt-1">${esc([g.subtitle, g.tagline].filter(Boolean).join(' · '))}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button id="sp-wish" class="btn-glass rounded-xl px-4 py-2.5 text-sm font-bold ${inWish ? '!text-pink-400' : ''}"><i class="${inWish ? 'fas' : 'far'} fa-heart mr-2"></i>${inWish ? 'On wishlist' : 'Add to wishlist'}</button>
                    <button id="sp-share" class="btn-glass rounded-xl px-3 py-2.5 text-sm" aria-label="Copy link"><i class="fas fa-link"></i></button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2 min-w-0">
                    <div id="sp-stage" class="relative aspect-video rounded-xl overflow-hidden bg-black border border-white/10"></div>
                    <div class="relative mt-3 flex items-center gap-2">
                        <button id="sp-prev" class="shrink-0 w-8 h-16 rounded-lg bg-white/5 hover:bg-white/15" aria-label="Previous"><i class="fas fa-chevron-left"></i></button>
                        <div id="sp-thumbs" class="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1"></div>
                        <button id="sp-next" class="shrink-0 w-8 h-16 rounded-lg bg-white/5 hover:bg-white/15" aria-label="Next"><i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
                <aside class="space-y-4 min-w-0">
                    <img src="${esc(mediaUrl(g.banner_url || g.capsule_url))}" alt="" class="w-full aspect-[460/215] object-cover rounded-xl border border-white/10">
                    <p class="text-sm text-gray-300 leading-relaxed">${esc(g.short_description || '')}</p>
                    <dl class="text-xs grid grid-cols-[110px_1fr] gap-y-2">
                        <dt class="text-gray-500 uppercase tracking-wider">Reviews</dt><dd class="${g.rating ? 'text-blue-300' : 'text-gray-400'}">${g.rating ? `${'★'.repeat(Math.round(g.rating))} ${Number(g.rating).toFixed(1)}` : 'No reviews yet'}</dd>
                        <dt class="text-gray-500 uppercase tracking-wider">Release</dt><dd>${esc(date)}</dd>
                        ${g.developer ? `<dt class="text-gray-500 uppercase tracking-wider">Developer</dt><dd class="text-brand-purple">${esc(g.developer)}</dd>` : ''}
                        ${g.publisher ? `<dt class="text-gray-500 uppercase tracking-wider">Publisher</dt><dd class="text-brand-purple">${esc(g.publisher)}</dd>` : ''}
                        ${(g.platforms || []).length ? `<dt class="text-gray-500 uppercase tracking-wider">Platform</dt><dd>${(g.platforms || []).map((p) => `<span class="whitespace-nowrap"><i class="${platIcon(p)} mr-1"></i>${esc(p)}</span>`).join('<br>')}</dd>` : ''}
                        ${g.kind === 'game' ? `<dt class="text-gray-500 uppercase tracking-wider">${hasPlay(g) && !hasBuild(g) ? 'Plays' : 'Downloads'}</dt><dd>${Number(g.download_count || 0).toLocaleString()}</dd>` : ''}
                    </dl>
                    <div class="flex flex-wrap gap-1.5">${(g.tags || []).map(tagChip).join('')}${(g.genres || []).map((x) => `<span class="text-[10px] text-gray-400 bg-white/5 rounded px-2 py-0.5">${esc(x)}</span>`).join('')}</div>
                </aside>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 pb-28">
                <div class="lg:col-span-2 space-y-8 min-w-0">
                    <!-- Buy / download box -->
                    <div class="relative glass rounded-2xl p-5 md:p-6">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h3 class="text-lg md:text-xl font-bold">${g.kind === 'concept' || Number(g.price) > 0 ? 'Buy' : hasPlay(g) ? 'Play' : 'Download'} ${esc(g.title)}</h3>
                            <div class="flex items-stretch rounded-xl overflow-hidden border border-white/10 bg-black/40 self-start sm:self-auto" id="sp-action"></div>
                        </div>
                        <div id="sp-dl" class="mt-5 hidden"></div>
                        ${g.kind === 'concept' ? '<p class="text-xs text-gray-500 mt-4"><i class="fas fa-circle-info mr-1"></i>UI/UX concept piece from my portfolio — the cart and checkout are a working demo.</p>' : ''}
                    </div>

                    <section>
                        <h3 class="text-sm font-bold tracking-[0.2em] uppercase text-gray-400 border-b border-white/10 pb-2 mb-4">About this game</h3>
                        <div class="text-gray-300 leading-relaxed whitespace-pre-line text-sm md:text-base">${esc(g.description || g.short_description || '')}</div>
                    </section>

                    ${reqRows.length ? `
                    <section>
                        <h3 class="text-sm font-bold tracking-[0.2em] uppercase text-gray-400 border-b border-white/10 pb-2 mb-4">System requirements</h3>
                        <p class="text-xs font-bold text-gray-400 mb-2">MINIMUM</p>
                        <dl class="text-sm grid grid-cols-[110px_1fr] gap-y-1.5">${reqRows.map(([k, v]) => `<dt class="text-gray-500">${k}:</dt><dd class="text-gray-300">${esc(v)}</dd>`).join('')}</dl>
                    </section>` : ''}
                </div>
                <aside class="space-y-4">
                    <div class="glass rounded-2xl p-5 space-y-3 text-sm">
                        ${hasPlay(g) ? '<p class="flex items-center gap-3"><i class="fas fa-globe w-5 text-green-400"></i> Plays in your browser — no install</p>' : ''}
                        ${(g.tags || []).includes('Multiplayer') ? '<p class="flex items-center gap-3"><i class="fas fa-users w-5 text-blue-300"></i> Online multiplayer</p>' : ''}
                        ${g.playable ? '<p class="flex items-center gap-3"><i class="fas fa-gamepad w-5 text-green-400"></i> Playable build</p>' : ''}
                        ${(g.tags || []).includes('Singleplayer') ? '<p class="flex items-center gap-3"><i class="fas fa-user w-5 text-blue-300"></i> Single-player</p>' : ''}
                        ${Number(g.price) === 0 && g.kind === 'game' ? '<p class="flex items-center gap-3"><i class="fas fa-gift w-5 text-pink-400"></i> Free to play</p>' : ''}
                        ${g.download?.size ? `<p class="flex items-center gap-3"><i class="fas fa-hard-drive w-5 text-yellow-400"></i> ${fmtBytes(g.download.size)} download</p>` : ''}
                        ${g.download?.version ? `<p class="flex items-center gap-3"><i class="fas fa-code-branch w-5 text-gray-400"></i> Version ${esc(g.download.version)}</p>` : ''}
                        ${owned ? '<p class="flex items-center gap-3 text-green-400"><i class="fas fa-circle-check w-5"></i> In your library</p>' : ''}
                    </div>
                    ${g.kind === 'game' ? `<a ${g.play?.itch_url ? '' : 'data-itch'} href="${esc(g.play?.itch_url || S.settings.itch_url || 'https://gojo-studio.itch.io/')}" target="_blank" rel="noopener" class="glass rounded-2xl p-4 flex items-center gap-3 text-sm hover:bg-white/10 transition-colors"><i class="fab fa-itch-io text-[#fa5c5c] text-xl"></i><span class="flex-1">${g.play?.itch_url ? `${esc(g.title)} on itch.io` : 'More from Gojo Studio on itch.io'}</span><i class="fas fa-up-right-from-square text-xs text-gray-500"></i></a>` : ''}
                </aside>
            </div>`;

        $('sp-back').addEventListener('click', () => { location.hash = '#store'; });
        $('sp-wish').addEventListener('click', () => toggleWish(g.slug));
        $('sp-share').addEventListener('click', async () => {
            const url = `${location.origin}${location.pathname}#store/${g.slug}`;
            try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { prompt('Copy link', url); }
        });
        $('sp-prev').addEventListener('click', () => selectMedia(S.mediaIndex - 1));
        $('sp-next').addEventListener('click', () => selectMedia(S.mediaIndex + 1));

        $('sp-thumbs').innerHTML = items.map((m, i) => `
            <button data-media="${i}" class="relative shrink-0 w-28 h-16 rounded-lg overflow-hidden border-2 border-transparent opacity-60 hover:opacity-100 transition-all bg-black" aria-label="Media ${i + 1}">
                ${m.type === 'play' ? `<img src="${esc(mediaUrl(m.src))}" alt="" class="w-full h-full object-cover"><span class="absolute inset-0 bg-green-600/50 flex items-center justify-center gap-1.5 text-[10px] font-black tracking-widest"><i class="fas fa-play"></i>PLAY</span>`
                    : m.type === 'image' ? `<img src="${esc(mediaUrl(m.src))}" alt="" loading="lazy" class="w-full h-full object-cover">`
                    : `${m.poster ? `<img src="${esc(mediaUrl(m.poster))}" alt="" class="w-full h-full object-cover">` : `<span class="absolute inset-0 bg-gradient-to-br from-brand-purple/40 to-blue-500/30"></span>`}<span class="absolute inset-0 flex items-center justify-center"><i class="fas fa-play text-white drop-shadow"></i></span>`}
            </button>`).join('');
        $('sp-thumbs').querySelectorAll('[data-media]').forEach((b) => b.addEventListener('click', () => selectMedia(+b.dataset.media)));
        selectMedia(S.mediaIndex);
        renderAction();
        renderSidebar();
        $('store-content-area').scrollTop = 0;
    }

    // Media viewer
    const videoBlobCache = new Map();
    async function selectMedia(i) {
        const g = S.current; if (!g) return;
        const items = mediaItems(g);
        if (!items.length) return;
        S.mediaIndex = (i + items.length) % items.length;
        const m = items[S.mediaIndex];
        const stage = $('sp-stage');
        $('sp-thumbs').querySelectorAll('[data-media]').forEach((b, idx) => {
            const on = idx === S.mediaIndex;
            b.classList.toggle('border-brand-purple', on); b.classList.toggle('opacity-100', on); b.classList.toggle('opacity-60', !on);
            if (on) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
        if (m.type === 'play') {
            stage.innerHTML = `
                <button id="sp-play-tile" class="absolute inset-0 group" aria-label="Play ${esc(g.title)} in your browser">
                    <img src="${esc(mediaUrl(m.src))}" alt="" class="absolute inset-0 w-full h-full object-cover transition duration-[1.5s] group-hover:scale-105">
                    <span class="absolute inset-0 bg-black/45 group-hover:bg-black/25 transition duration-500"></span>
                    <span class="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <span class="play-orb w-20 h-20 md:w-24 md:h-24 rounded-full bg-green-500 flex items-center justify-center text-2xl md:text-3xl shadow-[0_0_50px_rgba(34,197,94,.65)] group-hover:scale-110 transition duration-500"><i class="fas fa-play ml-1"></i></span>
                        <span class="font-black tracking-[0.3em] text-xs md:text-sm">PLAY IN BROWSER</span>
                    </span>
                </button>`;
            $('sp-play-tile').addEventListener('click', () => openPlayer(g));
            return;
        }
        if (m.type === 'image') {
            stage.innerHTML = `<img src="${esc(mediaUrl(m.src))}" alt="${esc(g.title)} screenshot" class="w-full h-full object-cover animate-fade-in">`;
            return;
        }
        const yt = m.url && youTubeId(m.url);
        if (yt) {
            stage.innerHTML = `<iframe class="w-full h-full" src="https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&rel=0" title="Trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
            return;
        }
        const parts = m.parts || [];
        if (parts.length <= 1) {
            const src = m.url || mediaUrl(parts[0]?.path || parts[0]);
            stage.innerHTML = `<video src="${esc(src)}" ${m.poster ? `poster="${esc(mediaUrl(m.poster))}"` : ''} class="w-full h-full object-contain bg-black" controls autoplay muted playsinline preload="metadata"></video>`;
            return;
        }
        // Large video stored in parts: fetch with progress, then play from a blob
        const key = `${g.slug}:${S.mediaIndex}`;
        if (videoBlobCache.has(key)) {
            stage.innerHTML = `<video src="${videoBlobCache.get(key)}" class="w-full h-full object-contain bg-black" controls autoplay muted playsinline></video>`;
            return;
        }
        stage.innerHTML = `<div class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-sm text-gray-300"><i class="fas fa-film text-3xl text-brand-purple"></i><span>Loading trailer… <b id="vid-pct">0%</b></span><div class="w-56 h-1.5 bg-white/10 rounded-full overflow-hidden"><div id="vid-bar" class="h-full bg-brand-purple w-0"></div></div></div>`;
        const want = S.mediaIndex;
        try {
            const total = m.size || parts.reduce((a, p) => a + (p.size || 0), 0);
            let loaded = 0; const chunks = [];
            for (const p of parts) {
                const res = await fetch(mediaUrl(p.path || p));
                const reader = res.body.getReader();
                for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value); loaded += value.length;
                    if (S.mediaIndex === want && $('vid-pct')) { const pct = total ? Math.min(100, (loaded / total) * 100) : 0; $('vid-pct').textContent = `${pct.toFixed(0)}%`; $('vid-bar').style.width = `${pct}%`; }
                }
            }
            const url = URL.createObjectURL(new Blob(chunks, { type: m.mime || 'video/mp4' }));
            videoBlobCache.set(key, url);
            if (S.current === g && S.mediaIndex === want) stage.innerHTML = `<video src="${url}" class="w-full h-full object-contain bg-black" controls autoplay muted playsinline></video>`;
        } catch (e) {
            stage.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-sm text-red-300">Couldn't load video (${esc(e.message)})</div>`;
        }
    }

    // Buy / download button area
    function renderAction() {
        const g = S.current; const box = $('sp-action'); if (!g || !box) return;
        const priced = Number(g.price) > 0;
        if (priced) {
            const inCart = S.cart.includes(g.slug);
            const owned = S.library.includes(g.slug);
            box.innerHTML = `<span class="px-4 flex items-center font-bold">${priceLabel(g)}</span>
                <button id="sp-buy" class="${owned ? 'bg-green-600' : 'bg-brand-purple hover:brightness-110'} px-5 py-3 font-bold text-sm transition">${owned ? '<i class="fas fa-check mr-2"></i>In library' : inCart ? '<i class="fas fa-cart-shopping mr-2"></i>View cart' : '<i class="fas fa-cart-plus mr-2"></i>Add to cart'}</button>`;
            $('sp-buy').addEventListener('click', () => { if (owned) return; if (inCart) openCart(); else toggleCart(g.slug, true); });
            return;
        }
        const enabled = S.settings.downloads_enabled !== false;
        if (hasPlay(g)) {
            box.innerHTML = `<span class="px-4 flex items-center font-bold text-green-400">Free</span>
                <button id="sp-play-btn" class="bg-green-600 hover:bg-green-500 px-5 py-3 font-bold text-sm transition"><i class="fas fa-play mr-2"></i>Play now</button>
                ${hasBuild(g) && enabled ? '<button id="sp-dl-btn" class="bg-white/10 hover:bg-white/20 px-4 py-3 text-sm transition" aria-label="Download"><i class="fas fa-download"></i></button>' : ''}`;
            $('sp-play-btn').addEventListener('click', () => openPlayer(g));
            $('sp-dl-btn')?.addEventListener('click', () => startDownload(g));
            renderDlPanel();
            return;
        }
        if (!hasBuild(g) || !enabled) {
            box.innerHTML = `<span class="px-4 flex items-center font-bold text-green-400">Free</span>
                <a data-itch href="${esc(S.settings.itch_url || '#')}" target="_blank" rel="noopener" class="bg-white/10 hover:bg-white/20 px-5 py-3 font-bold text-sm transition flex items-center gap-2">${enabled ? '<i class="fas fa-clock"></i> Build coming soon · itch.io' : '<i class="fas fa-pause"></i> Downloads paused'}</a>`;
            return;
        }
        const d = S.dl && S.dl.slug === g.slug ? S.dl : null;
        let label = '<i class="fas fa-download mr-2"></i>Download';
        if (d?.state === 'downloading') label = '<i class="fas fa-pause mr-2"></i>Pause';
        else if (d?.state === 'paused') label = '<i class="fas fa-play mr-2"></i>Resume';
        else if (d?.state === 'done') label = '<i class="fas fa-rotate-right mr-2"></i>Download again';
        box.innerHTML = `<span class="px-4 flex items-center font-bold text-green-400">Free</span>
            <button id="sp-dl-btn" class="bg-green-600 hover:bg-green-500 px-5 py-3 font-bold text-sm transition">${label}</button>`;
        $('sp-dl-btn').addEventListener('click', () => {
            if (!d || d.state === 'done' || d.state === 'error' || d.state === 'canceled') startDownload(g);
            else if (d.state === 'downloading') d.pause();
            else if (d.state === 'paused') d.resume();
        });
        renderDlPanel();
    }

    // ---------- In-browser game player ----------
    function openPlayer(g) {
        if (!hasPlay(g)) return;
        const P = $('game-player');
        const icon = mediaUrl(g.icon_url || g.capsule_url);
        $('gp-icon').src = icon; $('gp-loader-icon').src = icon;
        $('gp-title').textContent = g.title; $('gp-loader-title').textContent = g.title;
        $('gp-newtab').href = g.play.url;
        const itch = $('gp-itch');
        if (g.play.itch_url) { itch.href = g.play.itch_url; itch.classList.remove('!hidden'); } else itch.classList.add('!hidden');
        const loader = $('gp-loader');
        loader.classList.remove('opacity-0', 'pointer-events-none');
        const tips = (g.play.tips && g.play.tips.length) ? g.play.tips : ['Fullscreen gives the best experience.', 'Press Esc or ✕ to leave the game.', 'Progress is saved in this browser.'];
        let t = 0; $('gp-tip').textContent = tips[0];
        clearInterval(S.tipTimer);
        S.tipTimer = setInterval(() => { t = (t + 1) % tips.length; const el = $('gp-tip'); el.classList.add('opacity-0'); setTimeout(() => { el.textContent = tips[t]; el.classList.remove('opacity-0'); }, 250); }, 2800);
        const frame = $('gp-frame'); const t0 = performance.now();
        frame.onload = () => {
            if (!S.playing) return;
            setTimeout(() => { loader.classList.add('opacity-0', 'pointer-events-none'); clearInterval(S.tipTimer); }, Math.max(0, 1600 - (performance.now() - t0)));
        };
        S.playing = g;
        frame.src = g.play.url;
        P.classList.remove('hidden'); P.classList.add('flex');
        requestAnimationFrame(() => P.classList.add('gp-open'));
        window.SFX?.play('whoosh');
        addToLibrary(g.slug);
        rest('rpc/portfolio_track_download', { method: 'POST', body: JSON.stringify({ p_slug: g.slug }) })
            .then((n) => { if (typeof n === 'number') g.download_count = n; }).catch(() => {});
        if (!location.hash.endsWith('/play')) history.replaceState(null, '', `#store/${g.slug}/play`);
    }
    function closePlayer() {
        const P = $('game-player');
        if (!S.playing) return;
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        const slug = S.playing.slug;
        S.playing = null; clearInterval(S.tipTimer);
        P.classList.remove('gp-open');
        setTimeout(() => { P.classList.add('hidden'); P.classList.remove('flex'); $('gp-frame').src = 'about:blank'; }, 350);
        if (location.hash.endsWith('/play')) history.replaceState(null, '', `#store/${slug}`);
    }
    // Esc closes the player before anything else (capture phase runs before the page's handler)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && S.playing && !document.fullscreenElement) { e.stopImmediatePropagation(); e.preventDefault(); closePlayer(); }
    }, true);

    // ---------- Download manager ----------
    class Download {
        constructor(g) {
            this.slug = g.slug; this.title = g.title; this.icon = g.icon_url || g.capsule_url;
            const dl = g.download;
            this.filename = dl.filename || `${g.slug}.zip`;
            this.parts = (dl.parts || []).map((p) => ({ url: mediaUrl(p.path || p), size: p.size || 0, chunks: [], got: 0 }));
            this.fixedTotal = !!dl.size;
            this.total = dl.size || this.parts.reduce((a, p) => a + p.size, 0);
            this.loaded = 0; this.partIndex = 0; this.state = 'idle'; this.speed = 0; this.samples = [];
        }
        emit() { renderDlPanel(); renderDock(); if (S.current?.slug === this.slug) renderAction(); }
        tick() { updateDlNumbers(this); }
        async run() {
            this.state = 'downloading'; this.ctrl = new AbortController(); this.emit();
            try {
                for (; this.partIndex < this.parts.length; this.partIndex++) {
                    const p = this.parts[this.partIndex];
                    const headers = p.got > 0 ? { Range: `bytes=${p.got}-` } : {};
                    const res = await fetch(p.url, { signal: this.ctrl.signal, headers, cache: 'no-store' });
                    if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
                    if (p.got > 0 && res.status !== 206) { this.loaded -= p.got; p.got = 0; p.chunks = []; } // server ignored Range: restart part
                    if (!p.size) { const len = +res.headers.get('content-length'); if (len) { p.size = len + p.got; if (!this.fixedTotal) this.total = this.parts.reduce((a, x) => a + x.size, 0); } }
                    const reader = res.body.getReader();
                    for (;;) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        p.chunks.push(value); p.got += value.length; this.loaded += value.length;
                        this.sample();
                    }
                }
                this.finish();
            } catch (e) {
                if (e.name === 'AbortError') return; // paused or canceled
                this.state = 'error'; this.error = e.message; this.emit();
            }
        }
        sample() {
            const now = performance.now();
            this.samples.push([now, this.loaded]);
            while (this.samples.length > 2 && now - this.samples[0][0] > 3000) this.samples.shift();
            const [t0, b0] = this.samples[0];
            if (now - t0 > 250) this.speed = ((this.loaded - b0) / (now - t0)) * 1000;
            if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = null; this.tick(); });
        }
        pause() { if (this.state !== 'downloading') return; this.state = 'paused'; this.ctrl.abort(); this.speed = 0; this.samples = []; this.emit(); }
        resume() { if (this.state === 'paused') this.run(); }
        cancel() { if (this.ctrl) this.ctrl.abort(); this.state = 'canceled'; this.parts.forEach((p) => { p.chunks = []; }); this.emit(); S.dl = null; this.emit(); }
        finish() {
            const blob = new Blob(this.parts.flatMap((p) => p.chunks), { type: 'application/octet-stream' });
            this.parts.forEach((p) => { p.chunks = []; });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = this.filename; document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
            this.state = 'done'; this.speed = 0; this.loaded = this.total || blob.size;
            addToLibrary(this.slug);
            toast(`${this.title} downloaded`, 'fa-circle-check');
            this.emit();
        }
    }
    function addToLibrary(slug) {
        if (!S.library.includes(slug)) { S.library.push(slug); save('pf_library', S.library); }
    }

    function startDownload(g) {
        if (S.dl && (S.dl.state === 'downloading' || S.dl.state === 'paused') && S.dl.slug !== g.slug) {
            toast('Finish or cancel the current download first', 'fa-circle-exclamation'); return;
        }
        rest('rpc/portfolio_track_download', { method: 'POST', body: JSON.stringify({ p_slug: g.slug }) })
            .then((n) => { if (typeof n === 'number') g.download_count = n; }).catch(() => {});
        if (g.download.mode === 'url') {
            // External host (e.g. GitHub Releases / itch.io): the browser handles the download itself
            const a = document.createElement('a'); a.href = g.download.url; a.target = '_blank'; a.rel = 'noopener'; a.click();
            addToLibrary(g.slug);
            S.dl = { slug: g.slug, title: g.title, icon: g.icon_url, state: 'external', total: g.download.size || 0, loaded: 0 };
            renderDlPanel(); renderDock(); renderAction();
            toast('Download started in your browser', 'fa-download');
            return;
        }
        S.dl = new Download(g);
        S.dl.run();
    }

    function dlStats(d) {
        const pct = d.total ? Math.min(100, (d.loaded / d.total) * 100) : 0;
        const eta = d.speed > 0 ? (d.total - d.loaded) / d.speed : Infinity;
        return { pct, eta };
    }

    function renderDlPanel() {
        const panel = $('sp-dl'); if (!panel) return;
        const d = S.dl && S.current && S.dl.slug === S.current.slug ? S.dl : null;
        if (!d || d.state === 'canceled') { panel.classList.add('hidden'); return; }
        panel.classList.remove('hidden');
        if (d.state === 'external') {
            panel.innerHTML = `<p class="text-sm text-gray-300"><i class="fas fa-circle-check text-green-400 mr-2"></i>Your browser is downloading the file${d.total ? ` (${fmtBytes(d.total)})` : ''}. Check your browser's downloads.</p>`;
            return;
        }
        const { pct, eta } = dlStats(d);
        const status = { downloading: 'Downloading', paused: 'Paused', done: 'Complete', error: 'Failed' }[d.state] || '';
        panel.innerHTML = `
            <div class="flex items-center justify-between text-xs mb-2">
                <span class="font-bold uppercase tracking-wider ${d.state === 'error' ? 'text-red-400' : d.state === 'done' ? 'text-green-400' : 'text-gray-300'}">${status}${d.state === 'error' ? ` — ${esc(d.error)}` : ''}</span>
                <span id="sp-dl-pct" class="font-mono text-gray-300">${pct.toFixed(1)}%</span>
            </div>
            <div class="h-2.5 bg-white/10 rounded-full overflow-hidden relative">
                <div id="sp-dl-bar" class="h-full rounded-full transition-[width] duration-200 ${d.state === 'paused' ? 'bg-yellow-500' : d.state === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-400'} ${d.state === 'downloading' ? 'dl-stripes' : ''}" style="width:${pct}%"></div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-gray-400 font-mono">
                <span id="sp-dl-bytes">${fmtBytes(d.loaded)} / ${fmtBytes(d.total)}</span>
                ${d.state === 'downloading' ? `<span id="sp-dl-speed">${fmtBytes(d.speed)}/s · ${fmtTime(eta)} left</span>` : ''}
                ${d.state === 'downloading' || d.state === 'paused' ? `<span class="flex gap-2 font-sans"><button id="dl-toggle" class="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white">${d.state === 'paused' ? '<i class="fas fa-play mr-1"></i>Resume' : '<i class="fas fa-pause mr-1"></i>Pause'}</button><button id="dl-cancel" class="px-3 py-1 rounded-lg bg-white/10 hover:bg-red-500/40 text-white"><i class="fas fa-xmark mr-1"></i>Cancel</button></span>` : ''}
                ${d.state === 'error' ? '<button id="dl-retry" class="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-sans">Retry</button>' : ''}
            </div>`;
        $('dl-toggle')?.addEventListener('click', () => (d.state === 'paused' ? d.resume() : d.pause()));
        $('dl-cancel')?.addEventListener('click', () => d.cancel());
        $('dl-retry')?.addEventListener('click', () => { d.state = 'paused'; d.resume(); });
    }

    // Cheap per-frame update: only numbers and bar widths (keeps buttons clickable)
    function updateDlNumbers(d) {
        const { pct, eta } = dlStats(d);
        const set = (id, fn) => { const el = $(id); if (el) fn(el); };
        set('sp-dl-pct', (el) => { el.textContent = `${pct.toFixed(1)}%`; });
        set('sp-dl-bar', (el) => { el.style.width = `${pct}%`; });
        set('sp-dl-bytes', (el) => { el.textContent = `${fmtBytes(d.loaded)} / ${fmtBytes(d.total)}`; });
        set('sp-dl-speed', (el) => { el.textContent = `${fmtBytes(d.speed)}/s · ${fmtTime(eta)} left`; });
        set('dock-bar', (el) => { el.style.width = `${pct}%`; });
        set('dock-pct', (el) => { el.textContent = `${pct.toFixed(0)}% · ${fmtBytes(d.loaded)}/${fmtBytes(d.total)}`; });
        set('dock-speed', (el) => { el.textContent = `${fmtBytes(d.speed)}/s · ${fmtTime(eta)}`; });
        if (S.current?.slug === d.slug && !$('sp-dl-pct')) renderDlPanel(); // panel appeared after navigation
    }

    function renderDock() {
        const dock = $('dl-dock'); if (!dock) return;
        const d = S.dl;
        if (!d || d.state === 'canceled' || d.state === 'external') { dock.classList.add('hidden'); return; }
        const { pct, eta } = dlStats(d);
        dock.classList.remove('hidden');
        dock.innerHTML = `
            <div class="flex items-center gap-3">
                ${d.icon ? `<img src="${esc(mediaUrl(d.icon))}" alt="" class="w-11 h-11 rounded-xl object-cover">` : ''}
                <div class="flex-1 min-w-0">
                    <p class="text-[10px] uppercase tracking-widest text-gray-400">${d.state === 'done' ? 'Downloaded' : d.state === 'paused' ? 'Paused' : d.state === 'error' ? 'Failed' : 'Downloading'}</p>
                    <p class="font-bold text-sm truncate">${esc(d.title)}</p>
                </div>
                <button id="dock-go" class="text-xs text-gray-400 hover:text-white" aria-label="Open game"><i class="fas fa-up-right-from-square"></i></button>
                ${d.state === 'done' || d.state === 'error' ? '<button id="dock-x" class="text-xs text-gray-400 hover:text-white ml-1" aria-label="Dismiss"><i class="fas fa-xmark"></i></button>' : ''}
            </div>
            <div class="h-1.5 bg-white/10 rounded-full overflow-hidden mt-3"><div id="dock-bar" class="h-full ${d.state === 'paused' ? 'bg-yellow-500' : 'bg-green-500'} transition-[width] duration-200" style="width:${pct}%"></div></div>
            <div class="flex justify-between text-[10px] text-gray-400 mt-1.5 font-mono"><span id="dock-pct">${pct.toFixed(0)}% · ${fmtBytes(d.loaded)}/${fmtBytes(d.total)}</span><span id="dock-speed">${d.state === 'downloading' ? `${fmtBytes(d.speed)}/s · ${fmtTime(eta)}` : ''}</span></div>`;
        $('dock-go').onclick = () => { location.hash = `#store/${d.slug}`; };
        if ($('dock-x')) $('dock-x').onclick = () => { S.dl = null; renderDock(); renderDlPanel(); };
    }

    // ---------- Routing ----------
    function route() {
        const m = location.hash.match(/^#store(?:\/([a-z0-9-]+))?(\/play)?$/);
        if (!m) return;
        const detail = $('desktop-detail');
        if (detail && !detail.classList.contains('active') && typeof window.openDetail === 'function') window.openDetail('desktop', true);
        if (m[1]) {
            if (S.current?.slug !== m[1]) renderProduct(m[1]);
            if (m[2] && !S.playing) { const g = bySlug(m[1]); if (hasPlay(g)) openPlayer(g); }
            else if (!m[2] && S.playing) closePlayer();
        } else showGrid();
    }
    window.addEventListener('hashchange', route);

    function renderAll() {
        renderShell();
        renderSidebar();
        renderCart();
        if (S.current) renderProduct(S.current.slug, true); else showGrid();
        renderDock();
    }

    // Warn before leaving while a download is running
    window.addEventListener('beforeunload', (e) => { if (S.dl?.state === 'downloading') { e.preventDefault(); e.returnValue = ''; } });

    // Public API used by index.html
    window.Store = {
        showGrid: () => { renderShell(); if (!location.hash.startsWith('#store/')) showGrid(); },
        closeCart,
        closePlayer,
        isPlaying: () => !!S.playing,
        open: (slug) => { location.hash = slug ? `#store/${slug}` : '#store'; },
    };

    renderShell();
    renderAll();
    loadData();
})();
