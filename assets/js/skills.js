/* =========================================================================
   Skills: a draggable 3D sphere of tool logos + filterable skill chips.
   Icons come from assets/img/skills-icons.svg (devicon / simple-icons /
   LobeHub, built into one sprite) and are injected inline once, so gradients
   and colours render correctly.
   ========================================================================= */
(() => {
    const root = document.getElementById('skills');
    if (!root) return;

    const CATS = [
        { id: 'all', label: 'All', icon: 'fa-layer-group' },
        { id: 'ai', label: 'AI & Dev Tools', icon: 'fa-robot' },
        { id: 'design', label: 'Design & UX', icon: 'fa-pen-ruler' },
        { id: 'code', label: 'Programming', icon: 'fa-code' },
        { id: 'game', label: 'Game Dev', icon: 'fa-gamepad' },
        { id: 'web', label: 'Web Dev', icon: 'fa-globe' },
        { id: 'av', label: '3D & Audio', icon: 'fa-cube' },
        { id: 'platform', label: 'Platforms', icon: 'fa-server' },
        { id: 'lead', label: 'Leadership', icon: 'fa-people-group' },
    ];

    // i = sprite icon, img = image file, fa = Font Awesome; c = brand / tint colour; u = where it's used
    const SKILLS = [
        // AI & development tools
        { n: 'ChatGPT', cat: 'ai', i: 'openai', c: '#10a37f' },
        { n: 'Claude', cat: 'ai', i: 'claude', c: '#d97757' },
        { n: 'Claude Code', cat: 'ai', i: 'claude', c: '#d97757', u: 'Built and shipped this portfolio' },
        { n: 'Gemini', cat: 'ai', i: 'gemini', c: '#4f8ef7' },
        { n: 'Gemini API', cat: 'ai', i: 'gemini', c: '#4f8ef7', u: 'BookWave — AI chapter recognition' },
        { n: 'MCP', full: 'Model Context Protocol', cat: 'ai', i: 'mcp', c: '#ffffff', u: 'Playwright & Context7 MCP in Stick Empire 3D' },
        { n: 'ElevenLabs', cat: ['ai', 'av'], i: 'elevenlabs', c: '#ffffff', u: 'Sound-effect pipeline for Stick Empire 3D' },
        { n: 'Git', cat: 'ai', i: 'git', c: '#f05032' },
        { n: 'GitHub', cat: 'ai', i: 'github', c: '#ffffff', u: 'All projects' },
        { n: 'GitHub Actions', cat: 'ai', i: 'ghactions', c: '#2088ff', u: 'Tests & deploys Stick Empire 3D' },
        { n: 'VS Code', cat: 'ai', i: 'vscode', c: '#2f9ee8' },
        { n: 'Replit', cat: ['ai', 'platform'], i: 'replit', c: '#f26207' },
        { n: 'Playwright', cat: 'ai', i: 'playwright', c: '#2ead33', u: 'Browser test suites' },
        // Design
        { n: 'Figma', cat: 'design', i: 'figma', c: '#a259ff', u: 'UI/UX work across every project' },
        { n: 'Adobe Photoshop', cat: 'design', i: 'photoshop', c: '#31a8ff' },
        { n: 'Adobe Illustrator', cat: 'design', i: 'illustrator', c: '#ff9a00' },
        { n: 'Framer', cat: 'design', i: 'framer', c: '#3b82f6' },
        { n: 'Balsamiq', cat: 'design', img: 'assets/img/tool-balsamiq.webp', c: '#cc0066' },
        { n: 'Mobbin', cat: 'design', img: 'assets/img/tool-mobbin.webp', c: '#ffffff' },
        { n: 'Trello', cat: 'design', i: 'trello', c: '#0079bf' },
        { n: 'CapCut', cat: 'design', fa: 'fa-scissors', c: '#ffffff' },
        { n: 'UI/UX Design', cat: 'design', fa: 'fa-pen-ruler', c: '#c63aeb' },
        { n: 'User Research', cat: 'design', fa: 'fa-magnifying-glass-chart', c: '#60a5fa' },
        { n: 'Wireframing', cat: 'design', fa: 'fa-vector-square', c: '#d4d4d8' },
        { n: 'Prototyping', cat: 'design', fa: 'fa-wand-magic-sparkles', c: '#f472b6' },
        { n: 'Design Systems', cat: 'design', fa: 'fa-swatchbook', c: '#facc15' },
        { n: 'Information Architecture', cat: 'design', fa: 'fa-sitemap', c: '#34d399' },
        { n: 'Usability Testing', cat: 'design', fa: 'fa-clipboard-check', c: '#4ade80' },
        { n: 'Interaction Design', cat: 'design', fa: 'fa-hand-pointer', c: '#fb923c' },
        { n: 'Responsive Design', cat: 'design', fa: 'fa-mobile-screen', c: '#38bdf8' },
        { n: 'Game UI & HUD', cat: ['design', 'game'], fa: 'fa-gamepad', c: '#facc15', u: 'EARTHFALL, Game UI Lab' },
        // Programming
        { n: 'JavaScript', cat: 'code', i: 'javascript', c: '#f7df1e' },
        { n: 'TypeScript', cat: 'code', i: 'typescript', c: '#3178c6', u: 'Angkor F Clinic' },
        { n: 'Python', cat: 'code', i: 'python', c: '#3776ab' },
        { n: 'C#', cat: 'code', i: 'csharp', c: '#9b4f96' },
        { n: 'Java', cat: 'code', i: 'java', c: '#e76f00' },
        { n: 'HTML5', cat: 'code', i: 'html5', c: '#e34f26' },
        { n: 'CSS3', cat: 'code', i: 'css3', c: '#1572b6' },
        { n: 'PHP', cat: 'code', i: 'php', c: '#8892bf', u: 'Angkor F Clinic (Laravel)' },
        // Game development
        { n: 'Unity 6', cat: 'game', i: 'unity', c: '#ffffff' },
        { n: 'Three.js', cat: 'game', i: 'threejs', c: '#ffffff', u: 'Stick Empire Conquest 3D' },
        { n: 'WebGL', cat: 'game', i: 'webgl', c: '#ff5a5a', u: 'Shaders in the UI Lab' },
        { n: 'Blender', cat: ['game', 'av'], i: 'blender', c: '#f5792a', u: 'Skinned creature models (Stick Empire 3D)' },
        { n: 'Game Systems Design', cat: 'game', fa: 'fa-diagram-project', c: '#c63aeb' },
        { n: '3D Animation', cat: 'game', fa: 'fa-person-running', c: '#60a5fa' },
        { n: 'Multiplayer Netcode', cat: 'game', fa: 'fa-tower-broadcast', c: '#22d3ee', u: '1v1 / 2v2 online in Stick Empire 3D' },
        { n: 'PWA', full: 'Progressive Web Apps', cat: 'game', i: 'pwa', c: '#a78bfa', u: 'Stick Empire 3D installs as an app' },
        // Web development
        { n: 'React', cat: 'web', i: 'react', c: '#61dafb', u: 'Khmer POS' },
        { n: 'Vue.js', cat: 'web', i: 'vue', c: '#42b883', u: 'Angkor F Clinic' },
        { n: 'Node.js', cat: 'web', i: 'nodejs', c: '#5fa04e', u: 'BookWave' },
        { n: 'Express.js', cat: 'web', i: 'express', c: '#ffffff', u: 'BookWave' },
        { n: 'Laravel', cat: 'web', i: 'laravel', c: '#ff2d20', u: 'Angkor F Clinic' },
        { n: 'Inertia.js', cat: 'web', i: 'inertia', c: '#9553e9', u: 'Angkor F Clinic' },
        { n: 'Tailwind CSS', cat: 'web', i: 'tailwind', c: '#38bdf8', u: 'Khmer POS, Angkor F Clinic, this site' },
        { n: 'Vite', cat: 'web', i: 'vite', c: '#bd34fe', u: 'Khmer POS' },
        { n: 'SQLite', cat: 'web', i: 'sqlite', c: '#44a1d8', u: 'BookWave' },
        { n: 'PostgreSQL', cat: 'web', i: 'postgresql', c: '#4169e1' },
        { n: 'Supabase', cat: 'web', i: 'supabase', c: '#3ecf8e', u: 'Khmer POS, Stick Empire 3D, this store' },
        { n: 'REST APIs', cat: 'web', fa: 'fa-plug', c: '#f472b6' },
        // 3D & audio
        { n: 'IK Animation', cat: 'av', fa: 'fa-bone', c: '#e5e7eb', u: '140 finishers in Stick Empire 3D' },
        { n: 'GLB / GLTF', cat: 'av', i: 'gltf', c: '#87c540' },
        { n: 'Sound Design', cat: 'av', fa: 'fa-wave-square', c: '#c63aeb' },
        { n: 'Audio Processing', cat: 'av', fa: 'fa-sliders', c: '#60a5fa' },
        // Platforms
        { n: 'Windows', cat: 'platform', i: 'windows', c: '#0078d4' },
        { n: 'Linux / Ubuntu', cat: 'platform', i: 'linux', c: '#fcc624' },
        { n: 'Vercel', cat: 'platform', i: 'vercel', c: '#ffffff' },
        { n: 'GitHub Pages', cat: 'platform', i: 'ghpages', c: '#ffffff', u: 'Hosts Stick Empire 3D' },
        { n: 'itch.io', cat: 'platform', i: 'itch', c: '#fa5c5c', u: 'Gojo Studio' },
        // Leadership & soft skills
        { n: 'Team Leadership', full: 'Led a 13-person cross-functional team', cat: 'lead', fa: 'fa-people-group', c: '#facc15', u: 'Project-K' },
        { n: 'Creative Direction', cat: 'lead', fa: 'fa-clapperboard', c: '#f472b6', u: 'Project-K' },
        { n: 'Stakeholder Communication', cat: 'lead', fa: 'fa-comments', c: '#60a5fa' },
        { n: 'Problem Solving', cat: 'lead', fa: 'fa-puzzle-piece', c: '#4ade80' },
        { n: 'Cross-functional Collaboration', cat: 'lead', fa: 'fa-handshake', c: '#fb923c' },
        { n: 'Agile', cat: 'lead', fa: 'fa-arrows-spin', c: '#a78bfa' },
    ].map((s) => ({ ...s, cats: Array.isArray(s.cat) ? s.cat : [s.cat] }));

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const iconHtml = (s, size) => {
        if (s.i) return `<svg class="sk-ic" width="${size}" height="${size}" style="color:${s.c}" aria-hidden="true"><use href="#ic-${s.i}"></use></svg>`;
        if (s.img) return `<img class="sk-ic rounded-md object-contain" src="${s.img}" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">`;
        return `<i class="fas ${s.fa} sk-ic" style="color:${s.c};font-size:${Math.round(size * 0.8)}px;width:${size}px;text-align:center" aria-hidden="true"></i>`;
    };

    // Inject the icon sprite once
    fetch('assets/img/skills-icons.svg').then((r) => r.text()).then((svg) => {
        const box = document.createElement('div');
        box.setAttribute('aria-hidden', 'true');
        box.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
        box.innerHTML = svg;
        document.body.prepend(box);
    }).catch(() => {});

    // ---------- Chips + tabs ----------
    const tabs = root.querySelector('#skill-tabs');
    const grid = root.querySelector('#skill-grid');
    const count = (id) => (id === 'all' ? SKILLS.length : SKILLS.filter((s) => s.cats.includes(id)).length);
    let current = 'all';
    tabs.innerHTML = CATS.map((c) => `
        <button data-cat="${c.id}" class="sk-tab shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all duration-300" data-sfx="tick">
            <i class="fas ${c.icon}"></i>${c.label}<span class="sk-count">${count(c.id)}</span>
        </button>`).join('');

    function renderChips(cat, flash) {
        current = cat;
        tabs.querySelectorAll('.sk-tab').forEach((b) => b.classList.toggle('is-on', b.dataset.cat === cat));
        const list = cat === 'all' ? SKILLS : SKILLS.filter((s) => s.cats.includes(cat));
        grid.innerHTML = list.map((s, i) => `
            <div class="sk-chip" style="--c:${s.c};--i:${i}" tabindex="0" data-name="${esc(s.n)}">
                <span class="sk-chip-ic">${iconHtml(s, 26)}</span>
                <span class="min-w-0">
                    <span class="block text-sm font-semibold leading-tight truncate">${esc(s.n)}</span>
                    ${s.u || s.full ? `<span class="block text-[10px] text-gray-400 leading-tight truncate">${esc(s.full || s.u)}</span>` : ''}
                </span>
            </div>`).join('');
        if (flash) {
            const el = grid.querySelector(`[data-name="${CSS.escape(flash)}"]`);
            if (el) { el.classList.add('sk-flash'); el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
        }
    }
    tabs.addEventListener('click', (e) => { const b = e.target.closest('.sk-tab'); if (b) renderChips(b.dataset.cat); });
    renderChips('all');

    // ---------- 3D sphere ----------
    const sphere = root.querySelector('#skill-sphere');
    const label = root.querySelector('#sphere-label');
    const seen = new Set();
    const items = SKILLS.filter((s) => (s.i || s.img) && !seen.has(s.i || s.img) && seen.add(s.i || s.img));
    const N = items.length;
    const nodes = items.map((s, k) => {
        const y = 1 - (k / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = k * Math.PI * (3 - Math.sqrt(5));
        const el = document.createElement('button');
        el.className = 'sk-node';
        el.style.setProperty('--c', s.c);
        el.setAttribute('aria-label', s.n);
        el.dataset.sfx = 'tick';
        el.innerHTML = iconHtml(s, 40);
        el.addEventListener('pointerenter', () => { label.textContent = s.n; label.classList.add('on'); });
        el.addEventListener('pointerleave', () => label.classList.remove('on'));
        el.addEventListener('click', () => renderChips(s.cats[0], s.n));
        sphere.appendChild(el);
        return { el, x: Math.cos(th) * r, y, z: Math.sin(th) * r };
    });

    let R = 160, ax = -0.25, ay = 0, vx = 0, vy = 0.0035, dragging = false, lx = 0, ly = 0, running = false, raf = 0, hover = false;
    const fit = () => { const w = sphere.clientWidth; R = w * 0.36; };
    new ResizeObserver(fit).observe(sphere); fit();

    function frame() {
        if (!dragging) {
            // ease back toward a gentle auto-spin
            vy += ((hover ? 0.0012 : 0.0035) - vy) * 0.02;
            vx += (0 - vx) * 0.03;
        }
        ay += vy; ax += vx;
        ax = Math.max(-1.2, Math.min(1.2, ax));
        const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
        for (const n of nodes) {
            const x1 = n.x * cy + n.z * sy, z1 = -n.x * sy + n.z * cy;
            const y2 = n.y * cx - z1 * sx, z2 = n.y * sx + z1 * cx;
            const depth = (z2 + 1) / 2;               // 0 back … 1 front
            const sc = 0.55 + depth * 0.75;
            n.el.style.transform = `translate3d(${(x1 * R).toFixed(1)}px, ${(y2 * R).toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
            n.el.style.opacity = (0.18 + depth * 0.82).toFixed(2);
            n.el.style.zIndex = String(Math.round(depth * 100));
            n.el.style.pointerEvents = depth > 0.45 ? 'auto' : 'none';
        }
        raf = running ? requestAnimationFrame(frame) : 0;
    }
    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { rootMargin: '100px' }).observe(sphere);

    sphere.addEventListener('pointerenter', () => { hover = true; });
    sphere.addEventListener('pointerleave', () => { hover = false; });
    // Drag starts only after a few pixels, so a plain click on an icon still works
    let down = null, moved = false;
    sphere.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, id: e.pointerId }; lx = e.clientX; ly = e.clientY; moved = false; });
    sphere.addEventListener('pointermove', (e) => {
        if (!down) return;
        if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) {
            dragging = true; moved = true; sphere.setPointerCapture(down.id); sphere.classList.add('grabbing');
        }
        if (!dragging) return;
        const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
        vy = dx * 0.006; vx = -dy * 0.006;
    });
    sphere.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    const end = () => { down = null; dragging = false; sphere.classList.remove('grabbing'); };
    sphere.addEventListener('pointerup', end); sphere.addEventListener('pointercancel', end);
    root.querySelector('#skill-total').textContent = SKILLS.length;
})();
