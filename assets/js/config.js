// Public Supabase config. The anon key is meant to be public: every write is
// protected by Row Level Security (only the admin account can change data).
window.PORTFOLIO_CONFIG = {
    SUPABASE_URL: 'https://pcidpbykoylqbyxgwmyx.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaWRwYnlrb3lscWJ5eGd3bXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTU4MDQsImV4cCI6MjA5MjA5MTgwNH0.m_fuNlKvPApGLQZaPazClhV4OXLWluQVtacEIC6lWqk',
    BUCKET: 'portfolio-media',
    // Free plan max object size is 50 MB, so bigger files are stored as 45 MB parts.
    PART_SIZE: 45 * 1024 * 1024,
};

// Shared helpers (used by the store and the admin page)
window.PF = (() => {
    const C = window.PORTFOLIO_CONFIG;
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const publicUrl = (path) => `${C.SUPABASE_URL}/storage/v1/object/public/${C.BUCKET}/${String(path).split('/').map(encodeURIComponent).join('/')}`;
    // Media entries may be a bucket path ("games/x/a.webp"), a full URL, or a site-relative asset ("assets/img/...")
    const mediaUrl = (v) => {
        if (!v) return '';
        if (/^(https?:)?\/\//.test(v) || v.startsWith('assets/') || v.startsWith('data:') || v.startsWith('blob:')) return v;
        return publicUrl(v);
    };
    const fmtBytes = (n) => {
        if (!n && n !== 0) return '';
        const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0;
        while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
        return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${u[i]}`;
    };
    const fmtTime = (s) => {
        if (!isFinite(s) || s < 0) return '--';
        s = Math.round(s);
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
        return h ? `${h}h ${m}m` : m ? `${m}m ${sec}s` : `${sec}s`;
    };
    const youTubeId = (url) => {
        const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
        return m ? m[1] : null;
    };
    const rest = async (path, opts = {}) => {
        const res = await fetch(`${C.SUPABASE_URL}/rest/v1/${path}`, {
            ...opts,
            headers: { apikey: C.SUPABASE_ANON_KEY, Authorization: `Bearer ${C.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
        });
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        return res.status === 204 ? null : res.json();
    };
    return { C, esc, publicUrl, mediaUrl, fmtBytes, fmtTime, youTubeId, rest };
})();
