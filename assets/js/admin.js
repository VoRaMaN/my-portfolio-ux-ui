/* =========================================================================
   Portfolio admin: sign in (Supabase Auth) and manage games, media & settings.
   All writes are enforced server-side by RLS (portfolio_is_admin()).
   Files bigger than 45 MB are uploaded as parts (free-plan object limit is 50 MB).
   ========================================================================= */
(() => {
    const { C, esc, mediaUrl, fmtBytes, fmtTime } = window.PF;
    const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
    const $ = (id) => document.getElementById(id);
    const views = ['login', 'recovery', 'denied', 'app'];
    const show = (v) => views.forEach((x) => $(`view-${x}`).classList.toggle('hidden', x !== v));

    const A = { user: null, games: [], settings: {}, editing: null, tab: 'games', optimize: true };
    const STORAGE_QUOTA = 1024 ** 3; // Supabase free plan: 1 GB storage

    function toast(msg, isError) {
        const t = $('toast');
        t.innerHTML = `<i class="fas ${isError ? 'fa-circle-exclamation text-red-400' : 'fa-check text-green-400'} mr-2"></i>${esc(msg)}`;
        t.classList.remove('opacity-0', 'translate-y-4');
        clearTimeout(t._h); t._h = setTimeout(() => t.classList.add('opacity-0', 'translate-y-4'), isError ? 5000 : 2500);
    }

    // ---------- Auth ----------
    async function boot() {
        sb.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') show('recovery'); });
        const { data: { session } } = await sb.auth.getSession();
        if (location.hash.includes('type=recovery')) return show('recovery');
        if (!session) return show('login');
        await enter(session.user);
    }

    async function enter(user) {
        A.user = user;
        const { data: isAdmin, error } = await sb.rpc('portfolio_is_admin');
        if (error || !isAdmin) return show('denied');
        $('who').textContent = user.email;
        show('app');
        await Promise.all([loadGames(), loadSettings()]);
        setTab(A.tab);
        updateLeadBadge().catch(() => {});
    }

    $('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = $('login-btn'); const err = $('login-error');
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; err.classList.add('hidden');
        const { data, error } = await sb.auth.signInWithPassword({ email: $('login-email').value.trim(), password: $('login-pass').value });
        btn.disabled = false; btn.textContent = 'Sign in';
        if (error) { err.textContent = error.message; err.classList.remove('hidden'); return; }
        $('login-pass').value = '';
        await enter(data.user);
    });
    $('forgot-btn').addEventListener('click', async () => {
        const email = $('login-email').value.trim();
        if (!email) { toast('Enter your email first', true); return; }
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] });
        toast(error ? error.message : 'Password reset email sent', !!error);
    });
    $('recovery-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data, error } = await sb.auth.updateUser({ password: $('new-pass').value });
        if (error) return toast(error.message, true);
        toast('Password updated');
        history.replaceState(null, '', location.pathname);
        await enter(data.user);
    });
    document.querySelectorAll('[data-signout]').forEach((b) => b.addEventListener('click', async () => { await sb.auth.signOut(); show('login'); }));

    // ---------- Tabs ----------
    document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
    function setTab(tab) {
        A.tab = tab;
        document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
        ['games', 'settings', 'content', 'media', 'analytics', 'leads', 'devlog', 'community'].forEach((t) => $(`tab-${t}`)?.classList.toggle('hidden', t !== tab));
        if (tab === 'games') renderGames();
        if (tab === 'settings') renderSettings();
        if (tab === 'media') renderMedia();
        if (tab === 'analytics') renderAnalytics();
        if (tab === 'leads') renderLeads();
        if (tab === 'devlog') renderDevlog();
        if (tab === 'community') renderCommunity();
        if (tab === 'content') renderContent();
    }

    // ---------- Data ----------
    async function loadGames() {
        const { data, error } = await sb.from('portfolio_games').select('*').order('sort').order('created_at');
        if (error) return toast(error.message, true);
        A.games = data;
    }
    async function loadSettings() {
        const { data } = await sb.from('portfolio_settings').select('value').eq('key', 'site').maybeSingle();
        A.settings = data?.value || {};
    }
    async function persist(fields) {
        // Save part of the game being edited (used right after uploads)
        const g = A.editing; if (!g?.id) return;
        const { data, error } = await sb.from('portfolio_games').update(fields).eq('id', g.id).select().single();
        if (error) { toast(error.message, true); throw error; }
        Object.assign(g, data);
        const i = A.games.findIndex((x) => x.id === g.id); if (i >= 0) A.games[i] = { ...data };
    }

    // ---------- Uploads ----------
    const safeName = (n) => n.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-80);
    const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');
    const isBucketPath = (v) => v && !/^(https?:)?\/\//.test(v) && !v.startsWith('assets/') && !v.startsWith('data:');

    async function uploadBlob(path, blob, onProgress) {
        const { data: { session } } = await sb.auth.getSession(); // refreshes the token if needed
        if (!session) throw new Error('Session expired — sign in again');
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${C.SUPABASE_URL}/storage/v1/object/${C.BUCKET}/${encPath(path)}`);
            xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
            xhr.setRequestHeader('apikey', C.SUPABASE_ANON_KEY);
            xhr.setRequestHeader('x-upsert', 'true');
            xhr.setRequestHeader('cache-control', 'max-age=31536000');
            xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
            xhr.upload.onprogress = (e) => onProgress?.(e.loaded);
            xhr.onload = () => (xhr.status < 300 ? resolve(path) : reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText.slice(0, 200)}`)));
            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(blob);
        });
    }

    // Uploads any size by splitting into PART_SIZE pieces. onProgress(loadedBytes, totalBytes, partNo, partCount)
    async function uploadLarge(prefix, file, onProgress) {
        const stamp = Date.now();
        const name = safeName(file.name);
        const count = Math.max(1, Math.ceil(file.size / C.PART_SIZE));
        const parts = [];
        let done = 0;
        for (let i = 0; i < count; i++) {
            const slice = file.slice(i * C.PART_SIZE, Math.min(file.size, (i + 1) * C.PART_SIZE), file.type);
            const path = count === 1 ? `${prefix}/${stamp}-${name}` : `${prefix}/${stamp}-${name}.part${String(i + 1).padStart(3, '0')}`;
            await uploadBlob(path, slice, (l) => onProgress?.(done + l, file.size, i + 1, count));
            done += slice.size;
            parts.push({ path, size: slice.size });
        }
        return { parts, size: file.size, filename: file.name, mime: file.type || 'application/octet-stream' };
    }

    async function removePaths(paths) {
        const list = paths.filter(isBucketPath);
        if (!list.length) return;
        const { error } = await sb.storage.from(C.BUCKET).remove(list);
        if (error) toast(`Couldn't delete old file: ${error.message}`, true);
    }

    // Convert large images to WebP (max width) before upload, for faster pages
    async function optimizeImage(file, maxW) {
        if (!A.optimize || !/^image\/(png|jpe?g|webp|bmp)$/.test(file.type)) return file;
        try {
            const bmp = await createImageBitmap(file);
            const scale = Math.min(1, maxW / bmp.width);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
            canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.85));
            if (!blob || blob.size >= file.size) return file;
            return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
        } catch { return file; }
    }

    // Progress UI helper
    function progressUI(el) {
        const t0 = performance.now();
        el.classList.remove('hidden');
        return (loaded, total, part, count) => {
            const pct = total ? (loaded / total) * 100 : 0;
            const secs = (performance.now() - t0) / 1000;
            const speed = loaded / Math.max(secs, 0.001);
            el.innerHTML = `
                <div class="flex justify-between text-[11px] text-gray-400 mb-1 font-mono"><span>${count > 1 ? `Part ${part}/${count} · ` : ''}${fmtBytes(loaded)} / ${fmtBytes(total)}</span><span>${pct.toFixed(1)}% · ${fmtBytes(speed)}/s · ${fmtTime((total - loaded) / speed)} left</span></div>
                <div class="h-2 bg-white/10 rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-brand-purple to-blue-400 stripes" style="width:${pct}%"></div></div>`;
        };
    }

    function dropZone(el, onFiles) {
        el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('over'); });
        el.addEventListener('dragleave', () => el.classList.remove('over'));
        el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('over'); if (e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]); });
    }

    // ---------- Games tab ----------
    const blankGame = () => ({
        slug: '', kind: 'game', title: '', subtitle: '', tagline: '', short_description: '', description: '', developer: 'Gojo Studio', publisher: 'Gojo Studio',
        release_date: null, price: 0, genres: [], tags: ['Playable'], platforms: ['Windows'], playable: true, icon_url: '', banner_url: '', capsule_url: '',
        screenshots: [], videos: [], download: { mode: 'none' }, play: {}, sys_req: { minimum: {} }, rating: null, sort: (A.games.at(-1)?.sort ?? 0) + 1, published: false,
    });

    function renderGames() {
        const box = $('tab-games');
        box.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
                <aside class="space-y-3">
                    <button id="new-game" class="btn-main w-full rounded-xl py-3 font-bold"><i class="fas fa-plus mr-2"></i>New game</button>
                    <div class="space-y-2">${A.games.map((g) => `
                        <button data-edit="${esc(g.id)}" class="w-full text-left glass rounded-xl p-3 flex items-center gap-3 hover:bg-white/10 transition ${A.editing?.id === g.id ? 'ring-2 ring-brand-purple' : ''}">
                            ${g.icon_url || g.capsule_url ? `<img src="${esc(mediaUrl(g.icon_url || g.capsule_url))}" alt="" class="w-11 h-11 rounded-lg object-cover">` : '<span class="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center"><i class="fas fa-gamepad text-gray-500"></i></span>'}
                            <span class="flex-1 min-w-0">
                                <span class="block font-bold text-sm truncate">${esc(g.title)}</span>
                                <span class="block text-[10px] text-gray-400">${g.kind === 'concept' ? 'UI concept' : 'Game'} · ${g.download_count || 0} downloads</span>
                            </span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full ${g.published ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-gray-400'}">${g.published ? 'Live' : 'Draft'}</span>
                        </button>`).join('')}
                    </div>
                </aside>
                <section id="editor">${A.editing ? '' : '<div class="glass rounded-2xl p-10 text-center text-gray-400"><i class="fas fa-hand-pointer text-3xl mb-3"></i><p>Select a game to edit, or create a new one.</p></div>'}</section>
            </div>`;
        $('new-game').addEventListener('click', () => { A.editing = blankGame(); renderGames(); });
        box.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => { A.editing = structuredClone(A.games.find((g) => g.id === b.dataset.edit)); renderGames(); }));
        if (A.editing) renderEditor();
    }

    function field(id, label, value, type = 'text', extra = '') {
        return `<div><label class="lbl" for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value ?? '')}" class="inp" ${extra}></div>`;
    }

    function renderEditor() {
        const g = A.editing; const saved = !!g.id;
        const req = g.sys_req?.minimum || {};
        const dl = g.download || { mode: 'none' };
        $('editor').innerHTML = `
        <div class="space-y-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-2xl font-black">${saved ? esc(g.title) : 'New game'}</h2>
                <div class="flex gap-2">
                    ${saved ? `<a href="index.html#store/${esc(g.slug)}" target="_blank" class="btn-ghost rounded-xl px-4 py-2 text-sm"><i class="fas fa-eye mr-1"></i>Preview</a>
                    <button id="del-game" class="btn-ghost rounded-xl px-4 py-2 text-sm text-red-300"><i class="fas fa-trash mr-1"></i>Delete</button>` : ''}
                    <button id="save-game" class="btn-main rounded-xl px-5 py-2 text-sm font-bold"><i class="fas fa-floppy-disk mr-1"></i>Save</button>
                </div>
            </div>

            <!-- Details -->
            <div class="glass rounded-2xl p-5 space-y-4">
                <h3 class="font-bold">Details</h3>
                <div class="grid sm:grid-cols-2 gap-4">
                    ${field('f-title', 'Title *', g.title, 'text', 'required')}
                    ${field('f-slug', 'URL slug * (a-z, 0-9, -)', g.slug, 'text', 'pattern="[a-z0-9-]+" required')}
                    ${field('f-subtitle', 'Subtitle', g.subtitle)}
                    ${field('f-tagline', 'Tagline', g.tagline)}
                    <div><label class="lbl" for="f-kind">Type</label><select id="f-kind" class="inp"><option value="game" ${g.kind === 'game' ? 'selected' : ''}>Game (downloadable)</option><option value="concept" ${g.kind === 'concept' ? 'selected' : ''}>UI concept</option></select></div>
                    ${field('f-price', 'Price USD (0 = free)', g.price, 'number', 'min="0" step="0.01"')}
                    ${field('f-dev', 'Developer', g.developer)}
                    ${field('f-pub', 'Publisher', g.publisher)}
                    ${field('f-date', 'Release date', g.release_date, 'date')}
                    ${field('f-rating', 'Rating (0–5, optional)', g.rating, 'number', 'min="0" max="5" step="0.1"')}
                    ${field('f-genres', 'Genres (comma separated)', (g.genres || []).join(', '))}
                    ${field('f-tags', 'Tags (comma separated)', (g.tags || []).join(', '))}
                    ${field('f-platforms', 'Platforms (comma separated)', (g.platforms || []).join(', '))}
                    ${field('f-sort', 'Sort order', g.sort, 'number')}
                </div>
                <div><label class="lbl" for="f-short">Short description</label><textarea id="f-short" rows="2" class="inp">${esc(g.short_description || '')}</textarea></div>
                <div><label class="lbl" for="f-desc">About this game</label><textarea id="f-desc" rows="8" class="inp">${esc(g.description || '')}</textarea></div>
                <div class="flex flex-wrap gap-6 text-sm">
                    <label class="flex items-center gap-2"><input id="f-playable" type="checkbox" class="accent-brand-purple w-4 h-4" ${g.playable ? 'checked' : ''}> Playable build</label>
                    <label class="flex items-center gap-2"><input id="f-published" type="checkbox" class="accent-brand-purple w-4 h-4" ${g.published ? 'checked' : ''}> Published (visible in store)</label>
                </div>
            </div>

            <!-- System requirements -->
            <div class="glass rounded-2xl p-5 space-y-4">
                <h3 class="font-bold">Minimum system requirements</h3>
                <div class="grid sm:grid-cols-2 gap-4">
                    ${field('r-os', 'OS', req.os)}${field('r-cpu', 'Processor', req.cpu)}${field('r-mem', 'Memory', req.memory)}${field('r-gpu', 'Graphics', req.graphics)}${field('r-sto', 'Storage', req.storage)}
                </div>
            </div>

            ${saved ? mediaSections(g, dl) : '<div class="glass rounded-2xl p-5 text-sm text-gray-400"><i class="fas fa-circle-info mr-2"></i>Save the game first, then you can upload images, screenshots, videos and the game build.</div>'}
        </div>`;

        $('save-game').addEventListener('click', saveGame);
        $('del-game')?.addEventListener('click', deleteGame);
        if (saved) bindMedia(g);
    }

    function readForm() {
        const g = A.editing;
        const list = (id) => $(id).value.split(',').map((x) => x.trim()).filter(Boolean);
        const num = (id) => ($(id).value === '' ? null : Number($(id).value));
        return {
            title: $('f-title').value.trim(), slug: $('f-slug').value.trim().toLowerCase(), subtitle: $('f-subtitle').value.trim() || null,
            tagline: $('f-tagline').value.trim() || null, kind: $('f-kind').value, price: Number($('f-price').value || 0),
            developer: $('f-dev').value.trim() || null, publisher: $('f-pub').value.trim() || null, release_date: $('f-date').value || null,
            rating: num('f-rating'), genres: list('f-genres'), tags: list('f-tags'), platforms: list('f-platforms'), sort: Number($('f-sort').value || 0),
            short_description: $('f-short').value.trim() || null, description: $('f-desc').value.trim() || null,
            playable: $('f-playable').checked, published: $('f-published').checked,
            sys_req: { ...(g.sys_req || {}), minimum: { os: $('r-os').value.trim(), cpu: $('r-cpu').value.trim(), memory: $('r-mem').value.trim(), graphics: $('r-gpu').value.trim(), storage: $('r-sto').value.trim() } },
        };
    }

    async function saveGame() {
        const g = A.editing; const f = readForm();
        if (!f.title || !/^[a-z0-9-]{1,60}$/.test(f.slug)) return toast('Title and a valid slug (a-z, 0-9, -) are required', true);
        const btn = $('save-game'); btn.disabled = true;
        let res;
        if (g.id) res = await sb.from('portfolio_games').update(f).eq('id', g.id).select().single();
        else res = await sb.from('portfolio_games').insert({ ...g, ...f }).select().single();
        btn.disabled = false;
        if (res.error) return toast(res.error.message, true);
        A.editing = res.data;
        await loadGames();
        toast('Saved');
        renderGames();
    }

    async function deleteGame() {
        const g = A.editing;
        if (!confirm(`Delete "${g.title}" and all its uploaded files? This can't be undone.`)) return;
        const paths = [g.icon_url, g.banner_url, g.capsule_url, ...(g.screenshots || []),
            ...(g.videos || []).flatMap((v) => (v.parts || []).map((p) => p.path)), ...((g.download?.parts) || []).map((p) => p.path)];
        const { error } = await sb.from('portfolio_games').delete().eq('id', g.id);
        if (error) return toast(error.message, true);
        await removePaths([...new Set(paths)]);
        A.editing = null; await loadGames(); renderGames(); toast('Deleted');
    }

    // ----- Media sections -----
    function imageSlot(key, label, hint, url) {
        return `
            <div class="space-y-2">
                <span class="lbl">${label}</span>
                <div class="drop rounded-xl aspect-video bg-black/30 overflow-hidden relative flex items-center justify-center" id="drop-${key}">
                    ${url ? `<img src="${esc(mediaUrl(url))}" alt="" class="absolute inset-0 w-full h-full object-cover">` : `<span class="text-xs text-gray-500 text-center px-3">${hint}<br>Drop image or click Upload</span>`}
                </div>
                <div class="flex gap-2">
                    <label class="btn-ghost rounded-lg px-3 py-1.5 text-xs cursor-pointer"><i class="fas fa-upload mr-1"></i>Upload<input type="file" accept="image/*" class="hidden" data-img="${key}"></label>
                    <button class="btn-ghost rounded-lg px-3 py-1.5 text-xs" data-img-url="${key}"><i class="fas fa-link mr-1"></i>URL</button>
                    ${url ? `<button class="btn-ghost rounded-lg px-3 py-1.5 text-xs text-red-300" data-img-clear="${key}"><i class="fas fa-xmark"></i></button>` : ''}
                </div>
                <div class="hidden" id="prog-${key}"></div>
            </div>`;
    }

    // Lists the files in a .zip from its central directory (no unzipping)
    async function zipNames(file) {
        const tail = Math.min(file.size, 65557);
        const t = new DataView(await file.slice(file.size - tail).arrayBuffer());
        let e = -1;
        for (let i = t.byteLength - 22; i >= 0; i--) if (t.getUint32(i, true) === 0x06054b50) { e = i; break; }
        if (e < 0) return [];
        const count = t.getUint16(e + 10, true), size = t.getUint32(e + 12, true), off = t.getUint32(e + 16, true);
        if (count === 0xffff || off === 0xffffffff || off + size > file.size) return [];
        const cd = new DataView(await file.slice(off, off + size).arrayBuffer()), utf8 = new TextDecoder(), names = [];
        for (let k = 0, p = 0; k < count && p + 46 <= cd.byteLength && cd.getUint32(p, true) === 0x02014b50; k++) {
            const n = cd.getUint16(p + 28, true), raw = new Uint8Array(cd.buffer, p + 46, n);
            names.push(cd.getUint16(p + 8, true) & 0x800 ? utf8.decode(raw) : String.fromCharCode(...raw));
            p += 46 + n + cd.getUint16(p + 30, true) + cd.getUint16(p + 32, true);
        }
        return names.map((n) => n.replace(/\\/g, '/'));
    }
    // the .py files the player will look at: venvs, caches, builds and IDE folders are skipped
    const pyFilesIn = (names) => {
        const skip = /^(__MACOSX|__pycache__|venv|env|site-packages|build|dist|\..*)$/;
        return names.filter((n) => /\.py$/i.test(n) && !n.split('/').pop().startsWith('._') && !n.split('/').slice(0, -1).some((d) => skip.test(d)));
    };

    const playKind = (g) => { const p = g.play || {}; return p.kind === 'python' ? 'python' : p.url ? 'url' : 'none'; };
    // The test link plays the uploaded files directly, so it also works for unpublished drafts
    const testUrl = (g) => {
        const p = g.play || {};
        if (p.kind === 'python' && (p.zip_parts || []).length) {
            const q = new URLSearchParams({ src: p.zip_parts.map((x) => mediaUrl(x.path)).join(','), entry: p.entry || '', title: g.title || 'Python game', file: p.filename || '' });
            if (g.icon_url) q.set('icon', g.icon_url.startsWith('assets/') ? `../${g.icon_url}` : mediaUrl(g.icon_url));
            return `play/python.html?${q}`;
        }
        return p.url || '';
    };

    function mediaSections(g, dl) {
        const shots = g.screenshots || [];
        const vids = g.videos || [];
        return `
            <!-- Images -->
            <div class="glass rounded-2xl p-5 space-y-4">
                <div class="flex items-center justify-between"><h3 class="font-bold">Store images</h3>
                    <label class="text-xs flex items-center gap-2 text-gray-400"><input type="checkbox" id="opt-toggle" class="accent-brand-purple" ${A.optimize ? 'checked' : ''}> Optimize images (WebP)</label></div>
                <div class="grid sm:grid-cols-3 gap-4">
                    ${imageSlot('icon_url', 'Icon (square)', '512×512', g.icon_url)}
                    ${imageSlot('banner_url', 'Banner (16:9)', '1920×1080', g.banner_url)}
                    ${imageSlot('capsule_url', 'Store card image', 'Shown on store cards', g.capsule_url)}
                </div>
            </div>

            <!-- Screenshots -->
            <div class="glass rounded-2xl p-5 space-y-4">
                <div class="flex items-center justify-between"><h3 class="font-bold">Screenshots <span class="text-gray-500 font-normal text-sm">(${shots.length})</span></h3>
                    <label class="btn-ghost rounded-lg px-3 py-1.5 text-xs cursor-pointer"><i class="fas fa-upload mr-1"></i>Add screenshots<input type="file" accept="image/*" multiple class="hidden" id="shots-input"></label></div>
                <div id="shots-drop" class="drop rounded-xl p-3 min-h-[120px]">
                    ${shots.length ? `<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">${shots.map((s, i) => `
                        <div class="relative group rounded-lg overflow-hidden aspect-video bg-black">
                            <img src="${esc(mediaUrl(s))}" alt="" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                                <button data-shot-move="${i}:-1" class="w-7 h-7 rounded bg-white/15 text-xs" aria-label="Move left"><i class="fas fa-arrow-left"></i></button>
                                <button data-shot-del="${i}" class="w-7 h-7 rounded bg-red-500/60 text-xs" aria-label="Delete"><i class="fas fa-trash"></i></button>
                                <button data-shot-move="${i}:1" class="w-7 h-7 rounded bg-white/15 text-xs" aria-label="Move right"><i class="fas fa-arrow-right"></i></button>
                            </div>
                        </div>`).join('')}</div>`
                        : '<p class="text-xs text-gray-500 text-center py-8">Drop screenshots here</p>'}
                </div>
                <div class="hidden" id="prog-shots"></div>
            </div>

            <!-- Videos -->
            <div class="glass rounded-2xl p-5 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="font-bold">Trailers &amp; videos <span class="text-gray-500 font-normal text-sm">(${vids.length})</span></h3>
                    <div class="flex gap-2">
                        <label class="btn-ghost rounded-lg px-3 py-1.5 text-xs cursor-pointer"><i class="fas fa-upload mr-1"></i>Upload video (any size)<input type="file" accept="video/*" class="hidden" id="video-input"></label>
                        <button id="video-url" class="btn-ghost rounded-lg px-3 py-1.5 text-xs"><i class="fab fa-youtube mr-1"></i>Add YouTube / URL</button>
                    </div></div>
                <div id="video-drop" class="drop rounded-xl p-3 space-y-2">
                    ${vids.length ? vids.map((v, i) => `
                        <div class="flex items-center gap-3 bg-white/5 rounded-lg p-2.5">
                            <i class="${v.kind === 'youtube' ? 'fab fa-youtube text-red-500' : v.kind === 'url' ? 'fas fa-link text-blue-300' : 'fas fa-film text-brand-purple'} w-5 text-center"></i>
                            <span class="flex-1 min-w-0 text-sm truncate">${esc(v.name || v.url || 'Video')}</span>
                            <span class="text-[10px] text-gray-500">${v.size ? fmtBytes(v.size) : ''}${v.parts?.length > 1 ? ` · ${v.parts.length} parts` : ''}</span>
                            <button data-vid-move="${i}:-1" class="w-7 h-7 rounded bg-white/10 text-xs" aria-label="Move up"><i class="fas fa-arrow-up"></i></button>
                            <button data-vid-move="${i}:1" class="w-7 h-7 rounded bg-white/10 text-xs" aria-label="Move down"><i class="fas fa-arrow-down"></i></button>
                            <button data-vid-del="${i}" class="w-7 h-7 rounded bg-red-500/40 text-xs" aria-label="Delete"><i class="fas fa-trash"></i></button>
                        </div>`).join('') : '<p class="text-xs text-gray-500 text-center py-6">Drop a trailer here. Videos over 45 MB are stored in parts automatically.</p>'}
                </div>
                <div class="hidden" id="prog-video"></div>
            </div>

            <!-- Download build -->
            <div class="glass rounded-2xl p-5 space-y-4">
                <h3 class="font-bold">Game download</h3>
                <div class="grid sm:grid-cols-3 gap-4">
                    <div><label class="lbl" for="dl-mode">Source</label><select id="dl-mode" class="inp">
                        <option value="none" ${dl.mode === 'none' ? 'selected' : ''}>No download yet</option>
                        <option value="parts" ${dl.mode === 'parts' ? 'selected' : ''}>Uploaded file (progress bar)</option>
                        <option value="url" ${dl.mode === 'url' ? 'selected' : ''}>External link (GitHub Release, itch.io…)</option></select></div>
                    ${field('dl-version', 'Version', dl.version || '')}
                    ${field('dl-filename', 'Download file name', dl.filename || '')}
                </div>
                <div id="dl-parts-box" class="${dl.mode === 'parts' ? '' : 'hidden'} space-y-3">
                    ${dl.parts?.length ? `<p class="text-sm"><i class="fas fa-box-archive text-brand-purple mr-2"></i><b>${esc(dl.filename || '')}</b> · ${fmtBytes(dl.size)} · ${dl.parts.length} part${dl.parts.length > 1 ? 's' : ''}${dl.uploaded_at ? ` · uploaded ${new Date(dl.uploaded_at).toLocaleString()}` : ''}</p>` : '<p class="text-sm text-gray-400">No build uploaded yet.</p>'}
                    <div id="build-drop" class="drop rounded-xl p-6 text-center">
                        <i class="fas fa-file-zipper text-3xl text-gray-500 mb-2"></i>
                        <p class="text-sm text-gray-300">Drop the game build (.zip / .exe / .rar) — any size</p>
                        <label class="btn-main inline-block rounded-lg px-4 py-2 text-xs font-bold mt-3 cursor-pointer"><i class="fas fa-upload mr-1"></i>Choose file<input type="file" class="hidden" id="build-input"></label>
                    </div>
                    <div class="hidden" id="prog-build"></div>
                </div>
                <div id="dl-url-box" class="${dl.mode === 'url' ? '' : 'hidden'} grid sm:grid-cols-[1fr_160px] gap-4">
                    ${field('dl-url', 'Download URL', dl.url || '', 'url', 'placeholder="https://github.com/VoRaMaN/.../releases/download/v1.0/EARTHFALL.zip"')}
                    ${field('dl-size', 'Size in MB (optional)', dl.size ? (dl.size / 1048576).toFixed(0) : '', 'number', 'min="0"')}
                </div>
                <button id="dl-save" class="btn-ghost rounded-lg px-4 py-2 text-sm"><i class="fas fa-floppy-disk mr-1"></i>Save download settings</button>
            </div>

            <!-- Play in browser -->
            <div class="glass rounded-2xl p-5 space-y-4">
                <h3 class="font-bold">Play in browser</h3>
                <div class="flex flex-wrap gap-2 text-sm" role="radiogroup" aria-label="How this game plays">
                    ${[['none', 'fa-ban', 'Off'], ['url', 'fa-globe', 'Web build URL'], ['python', 'fa-brands fa-python', 'Python (pygame) .zip']].map(([v, ic, l]) => `<label class="btn-ghost rounded-lg px-3 py-2 cursor-pointer flex items-center gap-2"><input type="radio" name="pl-kind" value="${v}" class="accent-brand-purple" ${playKind(g) === v ? 'checked' : ''}><i class="${ic.startsWith('fa-brands') ? ic : 'fas ' + ic}"></i>${l}</label>`).join('')}
                </div>
                <div id="pl-url-box" class="${playKind(g) === 'url' ? '' : 'hidden'} space-y-2">
                    <p class="text-xs text-gray-400">Paste the address of a web build (GitHub Pages, Vercel, an itch.io HTML5 embed link…). The store runs it in a full-screen player.</p>
                    ${field('pl-url', 'Game URL (embeddable)', (g.play || {}).url || '', 'url', 'placeholder="https://voraman.github.io/My-Game/"')}
                </div>
                <div id="pl-py-box" class="${playKind(g) === 'python' ? '' : 'hidden'} space-y-3">
                    <p class="text-xs text-gray-400 leading-relaxed">Zip your pygame project folder (the script that starts the game, its modules and assets) and upload it. The start file is found automatically — e.g. <code>PyFighter.py</code> next to a <code>fighter.py</code> class file; PyCharm's sample <code>main.py</code>, <code>venv</code> and <code>.idea</code> are ignored. It runs on real Python 3.14 + pygame-ce in the visitor's browser (Pyodide/WebAssembly) — no build step. Normal <code>while running:</code> loops, <code>Clock.tick()</code>, <code>time.sleep()</code> and <code>event.wait()</code> are converted automatically. Pure-Python code and the standard library work; other pip packages and native code don't.</p>
                    ${(g.play || {}).kind === 'python' && (g.play.zip_parts || []).length ? `<p class="text-sm"><i class="fab fa-python text-yellow-300 mr-2"></i><b>${esc(g.play.filename || 'game.zip')}</b> · ${fmtBytes(g.play.size)}${g.play.uploaded_at ? ` · uploaded ${new Date(g.play.uploaded_at).toLocaleString()}` : ''}</p>` : '<p class="text-sm text-gray-400">No Python build uploaded yet.</p>'}
                    <div id="py-drop" class="drop rounded-xl p-6 text-center">
                        <i class="fab fa-python text-3xl text-yellow-300 mb-2"></i>
                        <p class="text-sm text-gray-300">Drop the game's .zip here</p>
                        <label class="btn-main inline-block rounded-lg px-4 py-2 text-xs font-bold mt-3 cursor-pointer"><i class="fas fa-upload mr-1"></i>Choose .zip<input type="file" accept=".zip,application/zip" class="hidden" id="py-input"></label>
                    </div>
                    <div class="hidden" id="prog-py"></div>
                    ${field('pl-entry', 'Start file (optional — leave empty to detect it)', (g.play || {}).entry || '', 'text', 'placeholder="e.g. PyFighter.py" list="pl-entry-list" autocomplete="off"')}
                    <datalist id="pl-entry-list">${[...new Set(((g.play || {}).py_files || []).map((f) => f.split('/').pop()))].map((f) => `<option value="${esc(f)}">`).join('')}</datalist>
                    ${((g.play || {}).py_files || []).length ? `<p class="text-xs text-gray-500 -mt-2">Python files in the zip: ${((g.play || {}).py_files).slice(0, 12).map((f) => `<code>${esc(f.split('/').pop())}</code>`).join(' ')}</p>` : ''}
                </div>
                <div class="grid sm:grid-cols-2 gap-4">
                    ${field('pl-itch', 'itch.io page (optional)', (g.play || {}).itch_url || '', 'url', 'placeholder="https://gojo-studio.itch.io/my-game"')}
                    <div><label class="lbl" for="pl-tips">Loading-screen tips (one per line)</label><textarea id="pl-tips" rows="2" class="inp">${esc(((g.play || {}).tips || []).join('\n'))}</textarea></div>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button id="pl-save" class="btn-ghost rounded-lg px-4 py-2 text-sm"><i class="fas fa-floppy-disk mr-1"></i>Save play settings</button>
                    ${testUrl(g) ? `<a href="${esc(testUrl(g))}" target="_blank" rel="noopener" class="btn-ghost rounded-lg px-4 py-2 text-sm"><i class="fas fa-play mr-1"></i>Test it</a>` : ''}
                </div>
            </div>`;
    }

    function bindMedia(g) {
        $('opt-toggle').addEventListener('change', (e) => { A.optimize = e.target.checked; });

        // Single images
        const setImage = async (key, file) => {
            const prog = progressUI($(`prog-${key}`));
            try {
                const f = await optimizeImage(file, key === 'icon_url' ? 512 : 1920);
                const old = g[key];
                const { parts } = await uploadLarge(`games/${g.slug}/images`, f, prog);
                await persist({ [key]: parts[0].path });
                if (old && old !== parts[0].path && ![g.icon_url, g.banner_url, g.capsule_url].includes(old) && !(g.screenshots || []).includes(old)) await removePaths([old]);
                toast('Image updated'); renderEditor();
            } catch (e) { toast(e.message, true); $(`prog-${key}`).classList.add('hidden'); }
        };
        document.querySelectorAll('[data-img]').forEach((inp) => inp.addEventListener('change', () => inp.files[0] && setImage(inp.dataset.img, inp.files[0])));
        ['icon_url', 'banner_url', 'capsule_url'].forEach((k) => dropZone($(`drop-${k}`), (files) => setImage(k, files[0])));
        document.querySelectorAll('[data-img-url]').forEach((b) => b.addEventListener('click', async () => {
            const url = prompt('Image URL (https://… or assets/img/…)', g[b.dataset.imgUrl] || '');
            if (url === null) return;
            await persist({ [b.dataset.imgUrl]: url.trim() || null }); renderEditor();
        }));
        document.querySelectorAll('[data-img-clear]').forEach((b) => b.addEventListener('click', async () => {
            const k = b.dataset.imgClear; const old = g[k];
            await persist({ [k]: null });
            if (![g.icon_url, g.banner_url, g.capsule_url].includes(old)) await removePaths([old]);
            renderEditor();
        }));

        // Screenshots
        const addShots = async (files) => {
            const prog = progressUI($('prog-shots'));
            const added = [];
            try {
                for (const [i, file] of files.filter((f) => f.type.startsWith('image/')).entries()) {
                    const f = await optimizeImage(file, 1920);
                    const { parts } = await uploadLarge(`games/${g.slug}/screens`, f, (l, t) => prog(l, t, i + 1, files.length));
                    added.push(parts[0].path);
                }
                await persist({ screenshots: [...(g.screenshots || []), ...added] });
                toast(`${added.length} screenshot${added.length > 1 ? 's' : ''} added`);
            } catch (e) {
                toast(e.message, true);
                if (added.length) await persist({ screenshots: [...(g.screenshots || []), ...added] });
            }
            renderEditor();
        };
        $('shots-input').addEventListener('change', (e) => addShots([...e.target.files]));
        dropZone($('shots-drop'), addShots);
        document.querySelectorAll('[data-shot-del]').forEach((b) => b.addEventListener('click', async () => {
            const i = +b.dataset.shotDel; const list = [...g.screenshots]; const [old] = list.splice(i, 1);
            await persist({ screenshots: list });
            if (![g.icon_url, g.banner_url, g.capsule_url].includes(old)) await removePaths([old]);
            renderEditor();
        }));
        document.querySelectorAll('[data-shot-move]').forEach((b) => b.addEventListener('click', async () => {
            const [i, d] = b.dataset.shotMove.split(':').map(Number); const list = [...g.screenshots]; const j = i + d;
            if (j < 0 || j >= list.length) return;
            [list[i], list[j]] = [list[j], list[i]];
            await persist({ screenshots: list }); renderEditor();
        }));

        // Videos
        const addVideo = async (file) => {
            if (!file?.type.startsWith('video/')) return toast('Choose a video file', true);
            const prog = progressUI($('prog-video'));
            try {
                const up = await uploadLarge(`games/${g.slug}/videos`, file, prog);
                await persist({ videos: [...(g.videos || []), { kind: 'file', name: file.name, ...up }] });
                toast('Video uploaded');
            } catch (e) { toast(e.message, true); }
            renderEditor();
        };
        $('video-input').addEventListener('change', (e) => addVideo(e.target.files[0]));
        dropZone($('video-drop'), (files) => addVideo(files[0]));
        $('video-url').addEventListener('click', async () => {
            const url = prompt('YouTube link or direct video URL (.mp4 / .webm)');
            if (!url) return;
            const kind = window.PF.youTubeId(url) ? 'youtube' : 'url';
            await persist({ videos: [...(g.videos || []), { kind, url: url.trim(), name: url.trim() }] }); renderEditor();
        });
        document.querySelectorAll('[data-vid-del]').forEach((b) => b.addEventListener('click', async () => {
            const list = [...g.videos]; const [old] = list.splice(+b.dataset.vidDel, 1);
            await persist({ videos: list });
            await removePaths((old.parts || []).map((p) => p.path));
            renderEditor();
        }));
        document.querySelectorAll('[data-vid-move]').forEach((b) => b.addEventListener('click', async () => {
            const [i, d] = b.dataset.vidMove.split(':').map(Number); const list = [...g.videos]; const j = i + d;
            if (j < 0 || j >= list.length) return;
            [list[i], list[j]] = [list[j], list[i]];
            await persist({ videos: list }); renderEditor();
        }));

        // Download build
        $('dl-mode').addEventListener('change', (e) => {
            $('dl-parts-box').classList.toggle('hidden', e.target.value !== 'parts');
            $('dl-url-box').classList.toggle('hidden', e.target.value !== 'url');
        });
        const uploadBuild = async (file) => {
            if (!file) return;
            if (!confirm(`Upload ${file.name} (${fmtBytes(file.size)})? It will be stored as ${Math.ceil(file.size / C.PART_SIZE)} part(s).`)) return;
            const prog = progressUI($('prog-build'));
            const oldParts = (g.download?.parts || []).map((p) => p.path);
            window.onbeforeunload = () => 'Upload in progress';
            try {
                const up = await uploadLarge(`games/${g.slug}/builds`, file, prog);
                await persist({ download: { mode: 'parts', parts: up.parts, size: up.size, filename: $('dl-filename').value.trim() || file.name, version: $('dl-version').value.trim() || null, uploaded_at: new Date().toISOString() } });
                await removePaths(oldParts);
                toast('Build uploaded — downloads are live');
            } catch (e) { toast(e.message, true); }
            window.onbeforeunload = null;
            renderEditor();
        };
        $('build-input').addEventListener('change', (e) => uploadBuild(e.target.files[0]));
        dropZone($('build-drop'), (files) => uploadBuild(files[0]));
        $('dl-save').addEventListener('click', async () => {
            const mode = $('dl-mode').value;
            const cur = g.download || {};
            let next = { ...cur, mode, version: $('dl-version').value.trim() || null, filename: $('dl-filename').value.trim() || cur.filename || null };
            if (mode === 'url') {
                const url = $('dl-url').value.trim();
                if (!/^https?:\/\//.test(url)) return toast('Enter a full https:// download URL', true);
                const mb = Number($('dl-size').value);
                next = { ...next, url, size: mb ? Math.round(mb * 1048576) : null };
            }
            if (mode === 'parts' && !cur.parts?.length) return toast('Upload a build file first', true);
            await persist({ download: next }); toast('Download settings saved'); renderEditor();
        });

        // Play in browser
        document.querySelectorAll('input[name="pl-kind"]').forEach((r) => r.addEventListener('change', () => {
            $('pl-url-box').classList.toggle('hidden', r.value !== 'url' || !r.checked);
            $('pl-py-box').classList.toggle('hidden', r.value !== 'python' || !r.checked);
        }));
        const shared = () => ({
            itch_url: $('pl-itch').value.trim() || null,
            tips: $('pl-tips').value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12),
        });
        const uploadPython = async (file) => {
            if (!file) return;
            const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
            if (!/\.zip$/i.test(file.name) || head[0] !== 0x50 || head[1] !== 0x4b) return toast('Choose a .zip of your game folder', true);
            const names = await zipNames(file).catch(() => null), pyFiles = names ? pyFilesIn(names) : [];
            const base = (n) => n.split('/').pop(), exe = names?.find((n) => /\.exe$/i.test(n)), pack = names?.find((n) => /\.(rar|7z|zip)$/i.test(n));
            if (names && names.length && !pyFiles.length) {
                // e.g. the packaged PyInstaller build: a browser can only run the .py source
                return toast(exe ? `This .zip has no .py files, only a packaged build (${base(exe)}) — browsers can't run .exe files. Zip the game's source folder instead: its .py files and the Assets folder.`
                    : pack ? `This .zip has no .py files, only another archive (${base(pack)}). Unpack it, then zip the game's source folder (its .py files and Assets).`
                        : 'This .zip has no .py files. Zip the game\'s source folder (its .py files and Assets).', true);
            }
            const prog = progressUI($('prog-py'));
            const old = ((g.play || {}).zip_parts || []).map((p) => p.path);
            try {
                const up = await uploadLarge(`games/${g.slug}/python`, file, prog);
                await persist({ play: { kind: 'python', zip_parts: up.parts, size: up.size, filename: file.name, entry: $('pl-entry').value.trim() || null, py_files: pyFiles.slice(0, 200), uploaded_at: new Date().toISOString(), ...shared() } });
                await removePaths(old);
                toast(pack ? `Uploaded — note: ${base(pack)} inside the .zip can't be opened by the player; unpack it if the game needs its files` : 'Python game uploaded — press "Test it"');
            } catch (e) { toast(e.message, true); }
            renderEditor();
        };
        $('py-input').addEventListener('change', (e) => uploadPython(e.target.files[0]));
        dropZone($('py-drop'), (files) => uploadPython(files[0]));
        $('pl-save').addEventListener('click', async () => {
            const kind = document.querySelector('input[name="pl-kind"]:checked')?.value || 'none';
            const cur = g.play || {};
            let play = {};
            if (kind === 'url') {
                const url = $('pl-url').value.trim();
                if (!/^https:\/\//.test(url)) return toast('The game URL must start with https://', true);
                play = { url, ...shared() };
            } else if (kind === 'python') {
                if (!(cur.kind === 'python' && (cur.zip_parts || []).length)) return toast('Upload the game .zip first', true);
                play = { ...cur, entry: $('pl-entry').value.trim() || null, ...shared() };
            }
            if (shared().itch_url && !/^https:\/\//.test(shared().itch_url)) return toast('The itch.io URL must start with https://', true);
            if (kind !== 'python' && cur.kind === 'python') await removePaths((cur.zip_parts || []).map((p) => p.path));
            await persist({ play });
            toast(kind === 'none' ? 'Play turned off' : 'Play settings saved'); renderEditor();
        });
    }

    // ---------- Settings tab ----------
    function renderSettings() {
        const s = A.settings;
        const games = A.games.filter((g) => g.published);
        $('tab-settings').innerHTML = `
            <div class="max-w-2xl space-y-6">
                <h2 class="text-2xl font-black">Site settings</h2>
                <div class="glass rounded-2xl p-5 space-y-4">
                    <h3 class="font-bold">Hero</h3>
                    ${field('s-badge', 'Status badge text', s.hero_badge || '')}
                    <label class="flex items-center gap-2 text-sm"><input id="s-available" type="checkbox" class="accent-brand-purple w-4 h-4" ${s.available !== false ? 'checked' : ''}> Available for work (green dot — yellow when off)</label>
                </div>
                <div class="glass rounded-2xl p-5 space-y-4">
                    <h3 class="font-bold">Store</h3>
                    ${field('s-store', 'Store name', s.store_name || '')}
                    <div><label class="lbl" for="s-featured">Featured game (store hero)</label><select id="s-featured" class="inp">${games.map((g) => `<option value="${esc(g.slug)}" ${s.featured_game === g.slug ? 'selected' : ''}>${esc(g.title)}</option>`).join('')}</select></div>
                    <label class="flex items-center gap-2 text-sm"><input id="s-concepts" type="checkbox" class="accent-brand-purple w-4 h-4" ${s.show_concepts !== false ? 'checked' : ''}> Show UI concept items in the store</label>
                    <label class="flex items-center gap-2 text-sm"><input id="s-downloads" type="checkbox" class="accent-brand-purple w-4 h-4" ${s.downloads_enabled !== false ? 'checked' : ''}> Downloads enabled</label>
                </div>
                <div class="glass rounded-2xl p-5 space-y-4">
                    <h3 class="font-bold">Links</h3>
                    ${field('s-itch', 'itch.io page', s.itch_url || '', 'url')}
                </div>
                <button id="s-save" class="btn-main rounded-xl px-6 py-3 font-bold"><i class="fas fa-floppy-disk mr-2"></i>Save settings</button>
            </div>`;
        $('s-save').addEventListener('click', async () => {
            const value = {
                ...A.settings, hero_badge: $('s-badge').value.trim(), available: $('s-available').checked, store_name: $('s-store').value.trim(),
                featured_game: $('s-featured').value, show_concepts: $('s-concepts').checked, downloads_enabled: $('s-downloads').checked, itch_url: $('s-itch').value.trim(),
            };
            const { error } = await sb.from('portfolio_settings').upsert({ key: 'site', value });
            if (error) return toast(error.message, true);
            A.settings = value; toast('Settings saved');
        });
    }

    // ---------- Media tab ----------
    async function listAll(prefix) {
        const out = [];
        const { data, error } = await sb.storage.from(C.BUCKET).list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
        if (error) throw error;
        for (const item of data) {
            const path = prefix ? `${prefix}/${item.name}` : item.name;
            if (item.id === null) out.push(...(await listAll(path))); // folder
            else out.push({ path, size: item.metadata?.size || 0, type: item.metadata?.mimetype || '', updated: item.updated_at });
        }
        return out;
    }

    async function renderMedia() {
        const box = $('tab-media');
        box.innerHTML = '<p class="text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Loading files…</p>';
        let files = [];
        try { files = await listAll(''); } catch (e) { box.innerHTML = `<p class="text-red-400">${esc(e.message)}</p>`; return; }
        const used = files.reduce((a, f) => a + f.size, 0);
        const usedBy = new Set(A.games.flatMap((g) => [g.icon_url, g.banner_url, g.capsule_url, ...(g.screenshots || []), ...(g.videos || []).flatMap((v) => (v.parts || []).map((p) => p.path)), ...((g.download?.parts) || []).map((p) => p.path), ...((g.play?.zip_parts) || []).map((p) => p.path)]));
        // devlog covers + content images (testimonial avatars, before/after pairs) count as in use too
        (A.settings.before_after || []).forEach((b) => { usedBy.add(b.before); usedBy.add(b.after); });
        (A.settings.testimonials || []).forEach((t) => usedBy.add(t.avatar));
        try { const { data: posts } = await sb.from('portfolio_devlog').select('cover_url'); (posts || []).forEach((p) => usedBy.add(p.cover_url)); } catch { /* table missing */ }
        const pct = Math.min(100, (used / STORAGE_QUOTA) * 100);
        box.innerHTML = `
            <div class="space-y-6">
                <h2 class="text-2xl font-black">Media library</h2>
                <div class="glass rounded-2xl p-5">
                    <div class="flex justify-between text-sm mb-2"><span>Storage used</span><span class="font-mono">${fmtBytes(used)} / ${fmtBytes(STORAGE_QUOTA)}</span></div>
                    <div class="h-2 bg-white/10 rounded-full overflow-hidden"><div class="h-full ${pct > 85 ? 'bg-red-500' : 'bg-brand-purple'}" style="width:${pct}%"></div></div>
                    <p class="text-xs text-gray-500 mt-3">Supabase free plan: 1 GB storage and 5 GB download bandwidth per month (about 35 downloads of a 142 MB game). Upgrade the Supabase plan, or use an external link (GitHub Releases) for the game file, if you need more.</p>
                </div>
                <div class="glass rounded-2xl overflow-hidden">
                    <table class="w-full text-sm">
                        <thead class="text-left text-[10px] uppercase tracking-widest text-gray-400 bg-white/5"><tr><th class="p-3">File</th><th class="p-3 hidden sm:table-cell">Size</th><th class="p-3 hidden md:table-cell">In use</th><th class="p-3"></th></tr></thead>
                        <tbody>${files.length ? files.map((f) => `
                            <tr class="border-t border-white/5">
                                <td class="p-3 max-w-[260px] truncate font-mono text-xs"><a href="${esc(mediaUrl(f.path))}" target="_blank" class="hover:text-brand-purple">${esc(f.path)}</a></td>
                                <td class="p-3 hidden sm:table-cell text-gray-400">${fmtBytes(f.size)}</td>
                                <td class="p-3 hidden md:table-cell">${usedBy.has(f.path) ? '<span class="text-green-400 text-xs">Yes</span>' : '<span class="text-yellow-400 text-xs">Unused</span>'}</td>
                                <td class="p-3 text-right whitespace-nowrap">
                                    <button data-copy="${esc(f.path)}" class="w-8 h-8 rounded bg-white/10 text-xs" aria-label="Copy URL"><i class="fas fa-link"></i></button>
                                    <button data-rm="${esc(f.path)}" class="w-8 h-8 rounded bg-red-500/30 text-xs" aria-label="Delete"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>`).join('') : '<tr><td class="p-6 text-center text-gray-500" colspan="4">No files uploaded yet.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>`;
        box.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(mediaUrl(b.dataset.copy)); toast('URL copied'); } catch { prompt('URL', mediaUrl(b.dataset.copy)); } }));
        box.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', async () => {
            const p = b.dataset.rm;
            if (!confirm(usedBy.has(p) ? `${p} is used by a game. Delete anyway?` : `Delete ${p}?`)) return;
            await removePaths([p]); renderMedia();
        }));
    }


    // =====================================================================
    // Analytics · Leads · Devlog · Community · Content tabs
    // =====================================================================
    const loadingHtml = (msg = 'Loading…') => `<p class="text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>${esc(msg)}</p>`;
    const when = (d) => new Date(d).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });
    const nfmt = (n) => Number(n || 0).toLocaleString('en');

    // ---------- Analytics ----------
    function niceMax(v) { if (v <= 5) return 5; const p = Math.pow(10, Math.floor(Math.log10(v))); const m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
    function dayChart(rows, days) {
        const map = Object.fromEntries((rows || []).map((r) => [r.day, r]));
        const list = [];
        for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); list.push({ day: d, views: map[d]?.views || 0, sessions: map[d]?.sessions || 0 }); }
        const max = niceMax(Math.max(1, ...list.map((x) => x.views)));
        const W = 720, H = 200, padL = 36, padB = 22, padT = 14, cw = (W - padL) / list.length, bw = Math.min(24, Math.max(2, cw - 2));
        const y = (v) => padT + (H - padT - padB) * (1 - v / max);
        const ticks = [0, max / 2, max];
        const peak = list.reduce((a, b) => (b.views > a.views ? b : a), list[0]);
        const bars = list.map((x, i) => {
            const bx = padL + i * cw + (cw - bw) / 2, by = y(x.views), bh = H - padB - by, r = Math.min(4, bw / 2, bh);
            const path = bh > 0 ? `M${bx},${H - padB} V${by + r} Q${bx},${by} ${bx + r},${by} H${bx + bw - r} Q${bx + bw},${by} ${bx + bw},${by + r} V${H - padB} Z` : '';
            return `<g class="an-bar"><rect x="${padL + i * cw}" y="${padT}" width="${cw}" height="${H - padT - padB}" fill="transparent"><title>${x.day}: ${nfmt(x.views)} views · ${nfmt(x.sessions)} sessions</title></rect>${path ? `<path d="${path}" fill="#C63AEB" pointer-events="none"/>` : ''}</g>`;
        }).join('');
        const grid = ticks.map((t) => `<line x1="${padL}" x2="${W}" y1="${y(t)}" y2="${y(t)}" stroke="rgba(255,255,255,.08)" stroke-width="1"/><text x="${padL - 6}" y="${y(t) + 4}" text-anchor="end" font-size="10" fill="#9ca3af">${nfmt(t)}</text>`).join('');
        const lbl = (i) => list[i].day.slice(5);
        const xl = [0, Math.floor(list.length / 2), list.length - 1].map((i) => `<text x="${padL + i * cw + cw / 2}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#9ca3af">${lbl(i)}</text>`).join('');
        const pi = list.indexOf(peak);
        const peakLbl = peak.views ? `<text x="${padL + pi * cw + cw / 2}" y="${y(peak.views) - 5}" text-anchor="middle" font-size="10" font-weight="700" fill="#e5e7eb">${nfmt(peak.views)}</text>` : '';
        return { svg: `<svg viewBox="0 0 ${W} ${H}" class="w-full h-auto" role="img" aria-label="Page views per day, last ${days} days">${grid}${bars}${peakLbl}${xl}</svg>`, list };
    }
    const barList = (obj, label) => {
        const e = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
        if (!e.length) return '<p class="text-sm text-gray-500">No data yet.</p>';
        const max = e[0][1];
        return `<div class="space-y-2">${e.slice(0, 12).map(([k, v]) => `<div><div class="flex justify-between text-xs mb-1"><span class="truncate">${esc(label ? label(k) : k)}</span><span class="font-mono text-gray-300">${nfmt(v)}</span></div><div class="h-1.5 rounded bg-white/5"><div class="h-full rounded bg-brand-purple" style="width:${(v / max) * 100}%"></div></div></div>`).join('')}</div>`;
    };
    async function renderAnalytics() {
        const box = $('tab-analytics');
        A.days = A.days || 30;
        box.innerHTML = loadingHtml('Loading analytics…');
        const { data, error } = await sb.rpc('portfolio_stats', { p_days: A.days });
        if (error) { box.innerHTML = `<p class="text-red-400">${esc(error.message)}</p>`; return; }
        const s = data || {};
        const plays = Object.values(s.plays || {}).reduce((a, b) => a + b, 0);
        const ch = dayChart(s.by_day, A.days);
        const titleOf = (slug) => A.games.find((g) => g.slug === slug)?.title || slug;
        let noTrack = false; try { noTrack = JSON.parse(localStorage.getItem('pf_notrack') || 'false'); } catch { /* */ }
        box.innerHTML = `
            <div class="space-y-6">
                <div class="flex flex-wrap items-center gap-3"><h2 class="text-2xl font-black mr-auto">Analytics</h2>
                    <div class="flex gap-1 text-xs">${[7, 30, 90].map((d) => `<button class="tab px-3 py-1.5 rounded-lg ${A.days === d ? 'on' : 'text-gray-300'}" data-days="${d}">${d} days</button>`).join('')}</div></div>
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    ${[['Page views', s.views, 'fa-eye'], ['Visitors (sessions)', s.sessions, 'fa-user'], ['Game plays + downloads', plays, 'fa-gamepad'], ['New leads', s.leads_new, 'fa-handshake']].map(([l, v, i]) => `<div class="glass rounded-2xl p-5"><i class="fas ${i} text-brand-purple mb-2"></i><p class="text-3xl font-black">${nfmt(v)}</p><p class="text-xs text-gray-400 mt-1">${l}</p></div>`).join('')}
                </div>
                <div class="glass rounded-2xl p-5">
                    <div class="flex items-center justify-between mb-3"><h3 class="font-bold">Page views per day</h3><button class="btn-ghost rounded-lg px-3 py-1 text-xs" id="an-table-btn">Table</button></div>
                    ${ch.svg}
                    <div id="an-table" class="hidden mt-4 max-h-64 overflow-auto"><table class="w-full text-xs"><thead class="text-gray-400 text-left"><tr><th class="p-1.5">Day</th><th class="p-1.5 text-right">Views</th><th class="p-1.5 text-right">Sessions</th></tr></thead><tbody>${ch.list.slice().reverse().map((x) => `<tr class="border-t border-white/5"><td class="p-1.5 font-mono">${x.day}</td><td class="p-1.5 text-right">${nfmt(x.views)}</td><td class="p-1.5 text-right">${nfmt(x.sessions)}</td></tr>`).join('')}</tbody></table></div>
                </div>
                <div class="grid md:grid-cols-3 gap-4">
                    <div class="glass rounded-2xl p-5"><h3 class="font-bold mb-4">Sections seen</h3>${barList(s.sections)}</div>
                    <div class="glass rounded-2xl p-5"><h3 class="font-bold mb-4">Game plays &amp; downloads</h3>${barList(s.plays, titleOf)}</div>
                    <div class="glass rounded-2xl p-5"><h3 class="font-bold mb-4">Top referrers</h3>${(s.refs || []).length ? `<div class="space-y-2 text-sm">${s.refs.map((r) => `<div class="flex justify-between gap-2"><span class="truncate">${esc(r.ref)}</span><span class="font-mono text-gray-300">${nfmt(r.n)}</span></div>`).join('')}</div>` : '<p class="text-sm text-gray-500">No referrers yet.</p>'}</div>
                </div>
                <div class="glass rounded-2xl p-5"><h3 class="font-bold mb-4">All events</h3>${barList(s.by_name)}</div>
                <div class="glass rounded-2xl p-5 text-sm text-gray-400 space-y-3">
                    <label class="flex items-center gap-2 text-white"><input type="checkbox" id="an-notrack" class="accent-brand-purple w-4 h-4" ${noTrack ? 'checked' : ''}> Don't count my own visits on this browser</label>
                    <p>Privacy: no cookies, no IP address, no fingerprinting. Each browser tab gets a random session id. Visitors with Do Not Track or Global Privacy Control are never counted. Events are stored in <code>portfolio_events</code>, which only the admin can read.</p>
                    <button class="btn-ghost rounded-lg px-3 py-1.5 text-xs" id="an-purge"><i class="fas fa-broom mr-1"></i>Delete events older than 180 days</button>
                </div>
            </div>`;
        box.querySelectorAll('[data-days]').forEach((b) => b.addEventListener('click', () => { A.days = +b.dataset.days; renderAnalytics(); }));
        $('an-table-btn').addEventListener('click', () => $('an-table').classList.toggle('hidden'));
        $('an-notrack').addEventListener('change', (e) => { try { localStorage.setItem('pf_notrack', JSON.stringify(e.target.checked)); } catch { /* */ } toast(e.target.checked ? 'Your visits on this browser won’t be counted' : 'Your visits will be counted'); });
        $('an-purge').addEventListener('click', async () => {
            if (!confirm('Delete analytics events older than 180 days?')) return;
            const { error: e2 } = await sb.from('portfolio_events').delete().lt('created_at', new Date(Date.now() - 180 * 86400000).toISOString());
            toast(e2 ? e2.message : 'Old events deleted', !!e2);
        });
    }

    // ---------- Leads ----------
    async function renderLeads() {
        const box = $('tab-leads');
        A.leadFilter = A.leadFilter || 'new';
        box.innerHTML = loadingHtml('Loading leads…');
        let q = sb.from('portfolio_leads').select('*').order('created_at', { ascending: false }).limit(200);
        if (A.leadFilter !== 'all') q = q.eq('status', A.leadFilter);
        const { data, error } = await q;
        if (error) { box.innerHTML = `<p class="text-red-400">${esc(error.message)}</p>`; return; }
        box.innerHTML = `
            <div class="space-y-5">
                <div class="flex flex-wrap items-center gap-3"><h2 class="text-2xl font-black mr-auto">Leads</h2>
                    <div class="flex gap-1 text-xs">${['new', 'replied', 'archived', 'all'].map((f) => `<button class="tab px-3 py-1.5 rounded-lg capitalize ${A.leadFilter === f ? 'on' : 'text-gray-300'}" data-lf="${f}">${f}</button>`).join('')}</div></div>
                <p class="text-sm text-gray-400">Requests from the “Start a project” form on the portfolio.</p>
                ${data.length ? data.map((l) => `
                    <article class="glass rounded-2xl p-5">
                        <div class="flex flex-wrap items-start gap-3">
                            <div class="flex-1 min-w-0"><h3 class="font-bold">${esc(l.name)} <span class="text-gray-400 font-normal text-sm">· ${esc(l.email)}</span></h3>
                                <p class="text-xs text-gray-400 mt-1">${esc(when(l.created_at))}${l.lang ? ` · ${esc(l.lang)}` : ''}</p></div>
                            <select class="inp !w-auto !py-1.5 text-xs" data-ls="${l.id}">${['new', 'replied', 'archived'].map((s) => `<option value="${s}" ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
                            <a class="btn-main rounded-lg px-3 py-1.5 text-xs font-bold" href="mailto:${esc(l.email)}?subject=${encodeURIComponent(`Re: your ${l.project_type} project`)}"><i class="fas fa-reply mr-1"></i>Reply</a>
                            <button class="w-8 h-8 rounded bg-red-500/30 text-xs" data-ld="${l.id}" aria-label="Delete lead"><i class="fas fa-trash"></i></button>
                        </div>
                        <div class="flex flex-wrap gap-2 mt-3 text-xs">${[l.project_type, l.budget, l.timeline].filter(Boolean).map((x) => `<span class="px-2 py-1 rounded-full bg-white/5 border border-white/10">${esc(x)}</span>`).join('')}</div>
                        ${l.message ? `<p class="text-sm text-gray-200 mt-3 whitespace-pre-wrap">${esc(l.message)}</p>` : ''}
                    </article>`).join('') : '<p class="text-gray-500">No leads here.</p>'}
            </div>`;
        box.querySelectorAll('[data-lf]').forEach((b) => b.addEventListener('click', () => { A.leadFilter = b.dataset.lf; renderLeads(); }));
        box.querySelectorAll('[data-ls]').forEach((s) => s.addEventListener('change', async () => {
            const { error: e2 } = await sb.from('portfolio_leads').update({ status: s.value }).eq('id', s.dataset.ls);
            toast(e2 ? e2.message : `Marked ${s.value}`, !!e2); updateLeadBadge();
        }));
        box.querySelectorAll('[data-ld]').forEach((b) => b.addEventListener('click', async () => {
            if (!confirm('Delete this lead?')) return;
            const { error: e2 } = await sb.from('portfolio_leads').delete().eq('id', b.dataset.ld);
            if (e2) return toast(e2.message, true);
            toast('Lead deleted'); renderLeads(); updateLeadBadge();
        }));
    }
    async function updateLeadBadge() {
        const { count } = await sb.from('portfolio_leads').select('id', { count: 'exact', head: true }).eq('status', 'new');
        const b = $('leads-badge'); if (!b) return;
        b.textContent = count || ''; b.classList.toggle('hidden', !count);
    }

    // ---------- Devlog ----------
    async function renderDevlog() {
        const box = $('tab-devlog');
        box.innerHTML = loadingHtml('Loading posts…');
        const { data, error } = await sb.from('portfolio_devlog').select('*').order('created_at', { ascending: false });
        if (error) { box.innerHTML = `<p class="text-red-400">${esc(error.message)}</p>`; return; }
        A.posts = data;
        const ed = A.post;
        const games = A.games.filter((g) => g.kind === 'game');
        box.innerHTML = `
            <div class="grid lg:grid-cols-[300px_1fr] gap-6">
                <div class="space-y-3">
                    <div class="flex items-center justify-between"><h2 class="text-2xl font-black">Devlog</h2><button class="btn-main rounded-lg px-3 py-2 text-xs font-bold" id="dv-new"><i class="fas fa-plus mr-1"></i>New post</button></div>
                    ${data.length ? data.map((p) => `<button class="w-full text-left glass rounded-xl p-3 ${ed?.id === p.id ? 'ring-2 ring-brand-purple' : ''}" data-pe="${p.id}"><b class="block text-sm truncate">${esc(p.title)}</b><span class="text-[11px] ${p.published ? 'text-green-400' : 'text-yellow-400'}">${p.published ? 'Published' : 'Draft'}</span><span class="text-[11px] text-gray-500"> · ${esc(new Date(p.created_at).toLocaleDateString())}${p.game_slug ? ` · ${esc(p.game_slug)}` : ''}</span></button>`).join('') : '<p class="text-sm text-gray-500">No posts yet. Posts appear in the Games section and on each game’s store page.</p>'}
                </div>
                <div>${ed ? `
                    <div class="glass rounded-2xl p-5 space-y-4">
                        ${field('dv-title', 'Title', ed.title)}
                        <div class="grid sm:grid-cols-2 gap-4">
                            <div><label class="lbl" for="dv-game">Game</label><select id="dv-game" class="inp"><option value="">Studio (no game)</option>${games.map((g) => `<option value="${esc(g.slug)}" ${ed.game_slug === g.slug ? 'selected' : ''}>${esc(g.title)}</option>`).join('')}</select></div>
                            <div><label class="lbl" for="dv-cover">Cover image</label><div class="flex gap-2"><input id="dv-cover" class="inp" value="${esc(ed.cover_url || '')}" placeholder="URL or upload"><label class="btn-ghost rounded-lg px-3 flex items-center cursor-pointer text-xs"><i class="fas fa-upload"></i><input type="file" accept="image/*" id="dv-up" class="hidden"></label></div></div>
                        </div>
                        <div><label class="lbl" for="dv-body">Post (Markdown: # heading, **bold**, _italic_, - list, [link](url), ![image](url))</label><textarea id="dv-body" rows="14" class="inp font-mono text-xs">${esc(ed.body || '')}</textarea></div>
                        <label class="flex items-center gap-2 text-sm"><input id="dv-pub" type="checkbox" class="accent-brand-purple w-4 h-4" ${ed.published ? 'checked' : ''}> Published</label>
                        <div class="flex flex-wrap gap-2"><button class="btn-main rounded-xl px-5 py-2.5 font-bold text-sm" id="dv-save"><i class="fas fa-floppy-disk mr-2"></i>Save</button>${ed.id ? `<a class="btn-ghost rounded-xl px-4 py-2.5 text-sm" target="_blank" href="index.html#devlog/${esc(ed.id)}"><i class="fas fa-eye mr-1"></i>View</a><button class="rounded-xl px-4 py-2.5 text-sm bg-red-500/20 text-red-300 ml-auto" id="dv-del"><i class="fas fa-trash mr-1"></i>Delete</button>` : ''}</div>
                    </div>` : '<div class="glass rounded-2xl p-8 text-center text-gray-400">Pick a post or create a new one.</div>'}</div>
            </div>`;
        $('dv-new').addEventListener('click', () => { A.post = { title: '', body: '', game_slug: '', cover_url: '', published: false }; renderDevlog(); });
        box.querySelectorAll('[data-pe]').forEach((b) => b.addEventListener('click', () => { A.post = { ...A.posts.find((p) => p.id === b.dataset.pe) }; renderDevlog(); }));
        if (!ed) return;
        $('dv-up').addEventListener('change', async (e) => {
            const f = e.target.files[0]; if (!f) return;
            try { const img = await optimizeImage(f, 1600); const path = await uploadBlob(`devlog/${Date.now()}-${safeName(img.name)}`, img); $('dv-cover').value = path; toast('Cover uploaded'); } catch (err) { toast(err.message, true); }
        });
        $('dv-save').addEventListener('click', async () => {
            const row = { title: $('dv-title').value.trim(), game_slug: $('dv-game').value || null, cover_url: $('dv-cover').value.trim() || null, body: $('dv-body').value, published: $('dv-pub').checked };
            if (!row.title) return toast('Add a title', true);
            const q = ed.id ? sb.from('portfolio_devlog').update(row).eq('id', ed.id).select().single() : sb.from('portfolio_devlog').insert(row).select().single();
            const { data: saved, error: e2 } = await q;
            if (e2) return toast(e2.message, true);
            A.post = saved; toast('Post saved'); renderDevlog();
        });
        $('dv-del')?.addEventListener('click', async () => {
            if (!confirm('Delete this post?')) return;
            const { error: e2 } = await sb.from('portfolio_devlog').delete().eq('id', ed.id);
            if (e2) return toast(e2.message, true);
            A.post = null; toast('Post deleted'); renderDevlog();
        });
    }

    // ---------- Community (beats wall + leaderboard) ----------
    async function renderCommunity() {
        const box = $('tab-community');
        box.innerHTML = loadingHtml('Loading community…');
        const [beats, scores] = await Promise.all([
            sb.from('portfolio_beats').select('id,title,author,code,bpm,style,likes,hidden,created_at').order('created_at', { ascending: false }).limit(200),
            sb.from('portfolio_scores').select('id,game,name,score,created_at').order('score', { ascending: false }).limit(100),
        ]);
        if (beats.error || scores.error) { box.innerHTML = `<p class="text-red-400">${esc((beats.error || scores.error).message)}</p>`; return; }
        box.innerHTML = `
            <div class="grid lg:grid-cols-2 gap-6">
                <div class="glass rounded-2xl p-5"><h2 class="text-xl font-black mb-4">Beat Lab wall <span class="text-sm text-gray-400 font-normal">${beats.data.length}</span></h2>
                    ${beats.data.length ? `<div class="space-y-2">${beats.data.map((b) => `<div class="flex items-center gap-3 p-2 rounded-lg ${b.hidden ? 'opacity-50' : ''} bg-white/5"><div class="flex-1 min-w-0"><b class="block text-sm truncate">${esc(b.title)}</b><span class="text-[11px] text-gray-400">${esc(b.author)} · ${b.bpm || '?'} BPM · ♥ ${b.likes} · ${esc(new Date(b.created_at).toLocaleDateString())}</span></div>
                        <a class="w-8 h-8 rounded bg-white/10 text-xs flex items-center justify-center" target="_blank" href="index.html?beat=${encodeURIComponent(b.code)}#playground" aria-label="Open"><i class="fas fa-play"></i></a>
                        <button class="w-8 h-8 rounded bg-white/10 text-xs" data-bh="${b.id}" data-v="${b.hidden ? 0 : 1}" aria-label="${b.hidden ? 'Show' : 'Hide'}"><i class="fas ${b.hidden ? 'fa-eye' : 'fa-eye-slash'}"></i></button>
                        <button class="w-8 h-8 rounded bg-red-500/30 text-xs" data-bd="${b.id}" aria-label="Delete"><i class="fas fa-trash"></i></button></div>`).join('')}</div>` : '<p class="text-sm text-gray-500">No beats posted yet.</p>'}
                </div>
                <div class="glass rounded-2xl p-5"><h2 class="text-xl font-black mb-4">Comet Dash scores</h2>
                    ${scores.data.length ? `<div class="space-y-1">${scores.data.map((s, i) => `<div class="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-sm"><span class="w-6 text-gray-500 font-mono">${i + 1}</span><span class="flex-1 truncate">${esc(s.name)}</span><b class="font-mono">${nfmt(s.score)}</b><button class="w-7 h-7 rounded bg-red-500/30 text-xs" data-sd="${s.id}" aria-label="Delete score"><i class="fas fa-trash"></i></button></div>`).join('')}</div>` : '<p class="text-sm text-gray-500">No scores yet.</p>'}
                </div>
            </div>`;
        box.querySelectorAll('[data-bh]').forEach((b) => b.addEventListener('click', async () => { const { error } = await sb.from('portfolio_beats').update({ hidden: b.dataset.v === '1' }).eq('id', b.dataset.bh); toast(error ? error.message : 'Updated', !!error); renderCommunity(); }));
        box.querySelectorAll('[data-bd]').forEach((b) => b.addEventListener('click', async () => { if (!confirm('Delete this beat?')) return; const { error } = await sb.from('portfolio_beats').delete().eq('id', b.dataset.bd); toast(error ? error.message : 'Beat deleted', !!error); renderCommunity(); }));
        box.querySelectorAll('[data-sd]').forEach((b) => b.addEventListener('click', async () => { if (!confirm('Delete this score?')) return; const { error } = await sb.from('portfolio_scores').delete().eq('id', b.dataset.sd); toast(error ? error.message : 'Score deleted', !!error); renderCommunity(); }));
    }

    // ---------- Content (testimonials, availability, metrics, Figma, before/after) ----------
    function renderContent() {
        const s = A.settings;
        const T = Array.isArray(s.testimonials) ? s.testimonials : [];
        const M = Array.isArray(s.metrics) ? s.metrics : [];
        const BA = Array.isArray(s.before_after) ? s.before_after : [];
        const months = s.availability?.months || {};
        const next = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
        const rowT = (t = {}) => `<div class="ct-t grid sm:grid-cols-2 gap-2 p-3 rounded-xl bg-white/5"><textarea class="inp sm:col-span-2" rows="2" placeholder="Quote (their real words)" data-k="quote">${esc(t.quote || '')}</textarea><input class="inp" placeholder="Name" data-k="name" value="${esc(t.name || '')}"><input class="inp" placeholder="Role" data-k="role" value="${esc(t.role || '')}"><input class="inp" placeholder="Company" data-k="company" value="${esc(t.company || '')}"><input class="inp" placeholder="Link (LinkedIn, site)" data-k="link" value="${esc(t.link || '')}"><input class="inp sm:col-span-2" placeholder="Avatar URL (optional)" data-k="avatar" value="${esc(t.avatar || '')}"><button class="text-xs text-red-300 text-left" data-rm-row>Remove</button></div>`;
        const rowM = (m = {}) => `<div class="ct-m grid grid-cols-[90px_1fr_120px_auto] gap-2 items-center"><input class="inp" placeholder="13" data-k="value" value="${esc(m.value || '')}"><input class="inp" placeholder="people led on Project-K" data-k="label" value="${esc(m.label || '')}"><input class="inp" placeholder="fa-star" data-k="icon" value="${esc(m.icon || '')}"><button class="text-xs text-red-300" data-rm-row aria-label="Remove"><i class="fas fa-xmark"></i></button></div>`;
        const rowB = (b = {}) => `<div class="ct-b grid sm:grid-cols-2 gap-2 p-3 rounded-xl bg-white/5"><input class="inp" placeholder="Title" data-k="title" value="${esc(b.title || '')}"><input class="inp" placeholder="Note" data-k="note" value="${esc(b.note || '')}"><input class="inp" placeholder="Before image URL or path" data-k="before" value="${esc(b.before || '')}"><input class="inp" placeholder="After image URL or path" data-k="after" value="${esc(b.after || '')}"><label class="text-xs text-gray-400 flex items-center gap-2 cursor-pointer"><i class="fas fa-upload"></i>Upload before<input type="file" accept="image/*" class="hidden" data-up="before"></label><label class="text-xs text-gray-400 flex items-center gap-2 cursor-pointer"><i class="fas fa-upload"></i>Upload after<input type="file" accept="image/*" class="hidden" data-up="after"></label><button class="text-xs text-red-300 text-left" data-rm-row>Remove</button></div>`;
        $('tab-content').innerHTML = `
            <div class="max-w-3xl space-y-6">
                <h2 class="text-2xl font-black">Portfolio content</h2>
                <p class="text-sm text-gray-400">Things visitors read as claims live here, so they stay true. Empty sections show a friendly empty state (or the built-in defaults from <code>assets/js/site-data.js</code>).</p>
                <div class="glass rounded-2xl p-5 space-y-3"><h3 class="font-bold">Testimonials</h3><p class="text-xs text-gray-400">Only add real quotes from people you worked with, with their permission.</p><div id="ct-tl" class="space-y-3">${T.map(rowT).join('')}</div><button class="btn-ghost rounded-lg px-3 py-1.5 text-xs" id="ct-ta"><i class="fas fa-plus mr-1"></i>Add testimonial</button></div>
                <div class="glass rounded-2xl p-5 space-y-3"><h3 class="font-bold">Availability</h3>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${next.map((k) => `<div><label class="lbl" for="av-${k}">${k}</label><select id="av-${k}" class="inp" data-month="${k}"><option value="">Auto (${s.available === false ? 'limited' : 'open'})</option>${['open', 'limited', 'booked'].map((v) => `<option value="${v}" ${months[k] === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>`).join('')}</div>
                    ${field('ct-avnote', 'Note under the calendar (optional)', s.availability?.note || '')}</div>
                <div class="glass rounded-2xl p-5 space-y-3"><h3 class="font-bold">Metrics cards</h3><p class="text-xs text-gray-400">Leave empty to use the defaults (facts from the site). Icons are Font Awesome names, e.g. fa-users.</p><div id="ct-ml" class="space-y-2">${M.map(rowM).join('')}</div><button class="btn-ghost rounded-lg px-3 py-1.5 text-xs" id="ct-ma"><i class="fas fa-plus mr-1"></i>Add metric</button></div>
                <div class="glass rounded-2xl p-5 space-y-3"><h3 class="font-bold">Figma prototypes in case studies</h3><p class="text-xs text-gray-400">Paste a Figma prototype or file link (Share → Copy link). It appears as an embedded prototype in that case study.</p>
                    ${['game', 'store', 'mobile'].map((k) => field(`ct-fig-${k}`, `Case study: ${k}`, s.figma?.[k] || '', 'url', 'placeholder="https://www.figma.com/proto/…"')).join('')}</div>
                <div class="glass rounded-2xl p-5 space-y-3"><h3 class="font-bold">Before / after pairs</h3><p class="text-xs text-gray-400">Leave empty to use the built-in pairs (HUD v1 → v3, portfolio v1 → v2).</p><div id="ct-bl" class="space-y-3">${BA.map(rowB).join('')}</div><button class="btn-ghost rounded-lg px-3 py-1.5 text-xs" id="ct-ba"><i class="fas fa-plus mr-1"></i>Add pair</button></div>
                <button id="ct-save" class="btn-main rounded-xl px-6 py-3 font-bold"><i class="fas fa-floppy-disk mr-2"></i>Save content</button>
            </div>`;
        const box = $('tab-content');
        $('ct-ta').addEventListener('click', () => $('ct-tl').insertAdjacentHTML('beforeend', rowT()));
        $('ct-ma').addEventListener('click', () => $('ct-ml').insertAdjacentHTML('beforeend', rowM()));
        $('ct-ba').addEventListener('click', () => $('ct-bl').insertAdjacentHTML('beforeend', rowB()));
        if (!box.dataset.bound) {
            box.dataset.bound = '1';
            box.addEventListener('click', (e) => { const r = e.target.closest('[data-rm-row]'); if (r && r.parentElement) r.parentElement.remove(); });
            box.addEventListener('change', onContentUpload);
        }
        async function onContentUpload(e) {
            const up = e.target.closest('[data-up]'); if (!up || !up.files[0]) return;
            try {
                const img = await optimizeImage(up.files[0], 1600);
                const path = await uploadBlob(`content/${Date.now()}-${safeName(img.name)}`, img);
                up.closest('.ct-b').querySelector(`[data-k="${up.dataset.up}"]`).value = path; toast('Image uploaded');
            } catch (err) { toast(err.message, true); }
        }
        const rows = (sel) => [...box.querySelectorAll(sel)].map((r) => Object.fromEntries([...r.querySelectorAll('[data-k]')].map((i) => [i.dataset.k, i.value.trim()])));
        $('ct-save').addEventListener('click', async () => {
            const am = {}; box.querySelectorAll('[data-month]').forEach((sel) => { if (sel.value) am[sel.dataset.month] = sel.value; });
            const value = {
                ...A.settings,
                testimonials: rows('.ct-t').filter((t) => t.quote && t.name),
                metrics: rows('.ct-m').filter((m) => m.value && m.label),
                before_after: rows('.ct-b').filter((b) => b.before && b.after),
                availability: { months: am, note: $('ct-avnote').value.trim() },
                figma: Object.fromEntries(['game', 'store', 'mobile'].map((k) => [k, $(`ct-fig-${k}`).value.trim()]).filter(([, v]) => v)),
            };
            const { error } = await sb.from('portfolio_settings').upsert({ key: 'site', value });
            if (error) return toast(error.message, true);
            A.settings = value; toast('Content saved');
        });
    }

    boot();
})();
