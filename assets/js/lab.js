/* =========================================================================
   UI Lab — 20 interactive experiments (lazy-loaded when the Lab is near).
   Each demo runs only while it is on screen (IntersectionObserver), shares
   one requestAnimationFrame ticker, and can open full screen ("focus").
   ========================================================================= */
(() => {
    const grid = document.getElementById('lab-grid');
    if (!grid || grid.dataset.ready) return;
    grid.dataset.ready = '1';
    const SFX = (n) => window.SFX?.play(n);

    // ---------- shared helpers ----------
    const T = {
        fns: new Set(), raf: 0, last: 0,
        add(fn) { this.fns.add(fn); if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(T.loop); } },
        remove(fn) { this.fns.delete(fn); },
        loop(now) {
            const dt = Math.min(0.05, (now - T.last) / 1000); T.last = now;
            T.fns.forEach((f) => { try { f(now / 1000, dt); } catch (e) { console.error(e); T.fns.delete(f); } });
            T.raf = T.fns.size ? requestAnimationFrame(T.loop) : 0;
        },
    };
    const pt = (e, el) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function canvas(stage, dprMax = 2) {
        const c = document.createElement('canvas');
        c.className = 'absolute inset-0 w-full h-full';
        stage.prepend(c);
        const o = { c, ctx: c.getContext('2d'), w: 1, h: 1, dpr: 1, onresize: null };
        const fit = () => {
            const r = stage.getBoundingClientRect();
            if (!r.width || !r.height) return;
            o.dpr = Math.min(dprMax, window.devicePixelRatio || 1);
            o.w = r.width; o.h = r.height;
            c.width = Math.round(o.w * o.dpr); c.height = Math.round(o.h * o.dpr);
            o.ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
            o.onresize?.();
        };
        new ResizeObserver(fit).observe(stage); fit();
        return o;
    }

    // ---------- styles for all demos ----------
    const css = `
    .lab-stage{position:relative;overflow:hidden;user-select:none;-webkit-user-select:none;isolation:isolate}
    .lab-stage.is-focus{aspect-ratio:auto!important;height:100%;width:100%}
    .lab-center{display:flex;align-items:center;justify-content:center}
    .lab-bg-violet{background:radial-gradient(ellipse at 50% 30%,#2a1140 0%,#0c0714 70%)}
    .lab-bg-deep{background:radial-gradient(ellipse at 50% 40%,#131a33 0%,#05060c 75%)}
    /* hint badge: solid background + transform-only ping, so it never forces the stage below to recomposite */
    .lab-hint{position:absolute;left:12px;top:12px;z-index:30;font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;padding:5px 10px 5px 22px;border-radius:999px;background:rgba(8,8,12,.78);border:1px solid rgba(255,255,255,.14);pointer-events:none}
    .lab-hint::before,.lab-hint::after{content:'';position:absolute;left:10px;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:#c63aeb}
    .lab-hint::after{animation:labPing 1.6s cubic-bezier(0,0,.2,1) infinite;will-change:transform,opacity}
    @keyframes labPing{from{transform:scale(1);opacity:.8}to{transform:scale(3);opacity:0}}
    .lab-num{font-family:ui-monospace,Menlo,monospace;font-size:11px;font-weight:700;color:#c63aeb;padding:3px 7px;border-radius:7px;background:rgba(198,58,235,.12);border:1px solid rgba(198,58,235,.3)}
    .lab-tag{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#a1a1aa;border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:2px 6px}
    .lab-card{transition:transform .5s cubic-bezier(.22,1,.36,1),box-shadow .4s,border-color .4s,opacity .4s}
    .lab-card:hover{transform:translateY(-4px);border-color:rgba(198,58,235,.35);box-shadow:0 30px 60px -30px rgba(198,58,235,.5)}
    .lab-card.is-hidden{display:none}
    .lab-card.pop{animation:labPop .55s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i)*40ms)}
    @keyframes labPop{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}
    .lab-expand{width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#d4d4d8;transition:all .25s;flex-shrink:0}
    .lab-expand:hover{background:#fff;color:#000;transform:scale(1.08)}
    .lab-err{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#a1a1aa;padding:20px;text-align:center}

    /* 01 liquid */
    .lq{position:relative;width:240px;height:120px;cursor:pointer;display:flex;align-items:center;justify-content:center}
    .lq-goo{position:absolute;inset:-40px;filter:url(#lab-goo);display:flex;align-items:center;justify-content:center}
    .lq-btn{width:190px;height:60px;border-radius:30px;background:linear-gradient(135deg,#c63aeb,#7c3aed);transition:width .5s cubic-bezier(.68,-.45,.27,1.45),background .4s}
    .lq-drop{position:absolute;width:24px;height:24px;border-radius:50%;background:#a855f7;transition:transform .55s cubic-bezier(.34,1.56,.64,1),background .4s}
    .lq:hover:not(.is-loading):not(.is-done) .lq-drop:nth-of-type(1){transform:translate(-104px,10px)}
    .lq:hover:not(.is-loading):not(.is-done) .lq-drop:nth-of-type(2){transform:translate(104px,-8px)}
    .lq:hover:not(.is-loading):not(.is-done) .lq-drop:nth-of-type(3){transform:translate(-30px,38px)}
    .lq:hover:not(.is-loading):not(.is-done) .lq-drop:nth-of-type(4){transform:translate(40px,-38px)}
    .lq.is-loading .lq-drop{transition:none}
    .lq-label{position:relative;font-weight:800;letter-spacing:.2em;font-size:13px;transition:opacity .25s,transform .3s;pointer-events:none}
    .lq.is-loading .lq-btn,.lq.is-done .lq-btn{width:62px}
    .lq.is-loading .lq-label,.lq.is-done .lq-label{opacity:0;transform:scale(.5)}
    .lq.is-done .lq-btn,.lq.is-done .lq-drop{background:#22c55e}
    .lq-check{position:absolute;width:30px;height:30px;fill:none;stroke:#fff;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:40;stroke-dashoffset:40;transition:stroke-dashoffset .45s .15s;pointer-events:none}
    .lq.is-done .lq-check{stroke-dashoffset:0}
    .lq-ring{position:absolute;width:62px;height:62px;border-radius:50%;border:3px solid #22c55e;opacity:0;pointer-events:none}
    .lq.is-done .lq-ring{animation:lqRing .9s ease-out}
    @keyframes lqRing{from{transform:scale(.8);opacity:1}to{transform:scale(2.8);opacity:0}}

    /* 02 particle text */
    .lab-input{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:6px;z-index:5;width:min(280px,80%)}
    .lab-input input{flex:1;min-width:0;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:7px 10px;font-size:12px;color:#fff;outline:none;backdrop-filter:blur(8px)}
    .lab-input input:focus{border-color:#c63aeb}
    .lab-input button{width:34px;border-radius:10px;background:linear-gradient(135deg,#c63aeb,#7c3aed);color:#fff}

    /* 03 holo card */
    .lab-bg-holo{background:radial-gradient(ellipse at 50% 50%,#1c1030 0%,#06040a 70%)}
    .hc-scene{perspective:900px}
    .hc-card{position:relative;width:190px;height:266px;transform-style:preserve-3d;cursor:pointer}
    .is-focus .hc-card{width:280px;height:392px}
    .hc-face{position:absolute;inset:0;border-radius:16px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 40px 60px -25px rgba(0,0,0,.85)}
    .hc-front{background:#120a1c;border:3px solid rgba(233,213,255,.35)}
    .hc-art{position:absolute;left:9px;right:9px;top:30px;height:56%;width:calc(100% - 18px);object-fit:cover;object-position:50% 8%;border-radius:8px;border:2px solid rgba(250,204,21,.55)}
    .hc-top{position:absolute;left:12px;right:12px;top:7px;display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:900;letter-spacing:.04em}
    .hc-top i{font-style:normal;color:#fca5a5;font-size:10px}
    .hc-holo{position:absolute;inset:0;mix-blend-mode:color-dodge;opacity:calc(.25 + var(--hyp,0)*.55);background:repeating-linear-gradient(115deg,#ff0080 0%,#ffcc00 7%,#33ff99 14%,#00ccff 21%,#cc33ff 28%,#ff0080 35%);background-size:400% 400%;background-position:var(--mx) var(--my);filter:saturate(1.3)}
    .hc-sparkle{position:absolute;inset:0;mix-blend-mode:color-dodge;opacity:.55;background-image:radial-gradient(circle at 20% 30%,#fff .8px,transparent 1.4px),radial-gradient(circle at 70% 60%,#fff .8px,transparent 1.4px),radial-gradient(circle at 40% 80%,#fff .6px,transparent 1.2px);background-size:38px 38px,53px 53px,29px 29px;background-position:calc(var(--mx)*.5) calc(var(--my)*.5),calc(var(--mx)*-.4) calc(var(--my)*.3),calc(var(--mx)*.2) calc(var(--my)*-.6)}
    .hc-glare{position:absolute;inset:0;background:radial-gradient(circle at var(--mx) var(--my),rgba(255,255,255,.6),transparent 45%);mix-blend-mode:overlay}
    .hc-info{position:absolute;left:9px;right:9px;bottom:9px;top:calc(56% + 38px);padding:8px 10px;border-radius:8px;background:rgba(10,6,18,.82);border:1px solid rgba(233,213,255,.2);display:flex;flex-direction:column;gap:3px}
    .hc-info b{font-size:12px;font-weight:800}
    .hc-info em{font-style:normal;font-size:10px;color:#d4d4d8;line-height:1.35}
    .hc-info span{font-size:9px;letter-spacing:.18em;color:#e9d5ff}
    .hc-info .hc-rarity{color:#facc15}
    .hc-back{transform:rotateY(180deg);background:conic-gradient(from 45deg,#c63aeb,#3b82f6,#ec4899,#c63aeb);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:3px solid rgba(255,255,255,.4)}
    .hc-back span{font-size:64px;font-weight:900;letter-spacing:-.05em;text-shadow:0 4px 24px rgba(0,0,0,.4)}
    .hc-back small{font-size:10px;letter-spacing:.4em;font-weight:800}

    /* 04 swipe deck */
    .sw-deck{position:absolute;inset:16px 16px 70px;display:flex;align-items:center;justify-content:center}
    .sw-card{position:absolute;width:min(78%,260px);aspect-ratio:4/3.3;border-radius:18px;overflow:hidden;background:#111;box-shadow:0 30px 50px -20px rgba(0,0,0,.8);cursor:grab;will-change:transform;touch-action:none}
    .is-focus .sw-card{width:min(60%,420px)}
    .sw-card img{width:100%;height:72%;object-fit:cover;pointer-events:none}
    .sw-meta{padding:8px 12px;display:flex;flex-direction:column}
    .sw-meta b{font-size:14px}.sw-meta span{font-size:10px;color:#a1a1aa}
    .sw-stamp{position:absolute;top:16px;font-size:20px;font-weight:900;letter-spacing:.1em;padding:2px 10px;border:3px solid;border-radius:8px;opacity:0;pointer-events:none}
    .sw-stamp.like{left:14px;color:#4ade80;border-color:#4ade80;transform:rotate(-14deg)}
    .sw-stamp.nope{right:14px;color:#f87171;border-color:#f87171;transform:rotate(14deg)}
    .sw-actions{position:absolute;bottom:14px;left:0;right:0;display:flex;justify-content:center;gap:18px;z-index:200}
    .sw-actions button{width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);font-size:18px;transition:transform .2s,background .2s}
    .sw-actions button:hover{transform:scale(1.12)}
    .sw-no{color:#f87171}.sw-yes{color:#4ade80}

    /* 05 gooey tab bar */
    .tb{position:relative;width:min(320px,88%);height:76px;margin-top:40px}
    .tb-goo{position:absolute;left:0;right:0;bottom:0;top:-34px;filter:url(#lab-goo)}
    .tb-bar{position:absolute;left:0;right:0;bottom:0;height:64px;border-radius:22px;background:#221a36}
    .tb-blob{position:absolute;left:0;top:28px;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#c63aeb,#7c3aed);will-change:transform}
    .tb-icons{position:absolute;left:0;right:0;bottom:0;height:64px;display:flex}
    .tb-item{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#8b8aa3;transition:color .3s}
    .tb-item i{font-size:17px;transition:transform .55s cubic-bezier(.34,1.7,.5,1)}
    .tb-item span{font-size:9px;font-weight:700;letter-spacing:.06em;transition:opacity .3s,transform .3s}
    .tb-item.on{color:#fff}
    .tb-item.on i{transform:translateY(-30px) scale(1.15)}
    .tb-item.on span{opacity:0;transform:translateY(6px)}
    .tb-title{position:absolute;top:22%;left:0;right:0;text-align:center;font-size:26px;font-weight:900;letter-spacing:-.02em}

    /* 06 day / night */
    .dn-stage{background:linear-gradient(#7dd3fc,#bae6fd 60%,#fef3c7);transition:background 1.2s}
    .dn-stage.night{background:linear-gradient(#020617,#1e1b4b 60%,#312e81)}
    .dn-stars i{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;opacity:0;transition:opacity 1s}
    .dn-stage.night .dn-stars i{opacity:1;animation:dnTw 2.4s ease-in-out infinite;animation-delay:var(--d)}
    @keyframes dnTw{50%{opacity:.25;transform:scale(.6)}}
    .dn-orb{position:absolute;top:12%;left:14%;width:58px;height:58px;border-radius:50%;background:radial-gradient(circle,#fde047,#f59e0b);box-shadow:0 0 60px 22px rgba(253,224,71,.55);transition:all 1.3s cubic-bezier(.68,-.3,.3,1.3)}
    .dn-stage.night .dn-orb{left:74%;background:radial-gradient(circle at 35% 35%,#f8fafc,#94a3b8);box-shadow:0 0 40px 8px rgba(226,232,240,.25)}
    .dn-hills{position:absolute;left:-10%;right:-10%;bottom:0;height:34%;background:radial-gradient(70% 110% at 25% 100%,#16a34a 60%,transparent 61%),radial-gradient(70% 100% at 78% 100%,#15803d 58%,transparent 59%);transition:filter 1.2s}
    .dn-stage.night .dn-hills{filter:brightness(.3) saturate(.5) hue-rotate(40deg)}
    .dn-toggle{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);width:176px;height:76px;border-radius:40px;background:linear-gradient(#38bdf8,#0284c7);box-shadow:inset 0 4px 12px rgba(0,0,0,.3),0 14px 30px rgba(0,0,0,.25);overflow:hidden;transition:background .9s}
    .night .dn-toggle{background:linear-gradient(#1e293b,#0b1120)}
    .dn-knob{position:absolute;top:6px;left:6px;width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fef08a,#facc15);box-shadow:0 0 0 7px rgba(255,255,255,.14),0 0 0 15px rgba(255,255,255,.07),0 4px 12px rgba(0,0,0,.3);transition:transform .8s cubic-bezier(.68,-.45,.27,1.45),background .8s}
    .night .dn-knob{transform:translateX(100px) rotate(360deg);background:radial-gradient(circle at 35% 35%,#f8fafc,#cbd5e1)}
    .dn-knob i{position:absolute;border-radius:50%;background:#94a3b8;opacity:0;transition:opacity .5s .35s}
    .night .dn-knob i{opacity:1}
    .dn-knob i:nth-child(1){width:15px;height:15px;top:12px;left:30px}.dn-knob i:nth-child(2){width:10px;height:10px;top:34px;left:14px}.dn-knob i:nth-child(3){width:8px;height:8px;top:40px;left:38px}
    .dn-clouds i{position:absolute;background:#fff;border-radius:999px;transition:transform .9s cubic-bezier(.68,-.45,.27,1.45)}
    .dn-clouds i:nth-child(1){width:74px;height:32px;right:-8px;bottom:-6px}.dn-clouds i:nth-child(2){width:52px;height:24px;right:34px;bottom:-12px;opacity:.9}.dn-clouds i:nth-child(3){width:40px;height:16px;right:10px;top:16px;opacity:.75}
    .night .dn-clouds i{transform:translateY(90px)}
    .dn-mini{position:absolute;inset:0;opacity:0;transition:opacity .8s}
    .night .dn-mini{opacity:1}
    .dn-mini b{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff}
    .dn-label{position:absolute;left:0;right:0;bottom:10%;text-align:center;font-weight:900;letter-spacing:.5em;font-size:13px;color:#064e3b;transition:color 1s}
    .night .dn-label{color:#e0e7ff}

    /* 08 like burst */
    .lk{display:flex;flex-direction:column;align-items:center;gap:16px}
    .lk-btn{position:relative;width:92px;height:92px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);font-size:38px;color:#52525b;transition:color .3s,background .3s,box-shadow .3s}
    .lk-btn.on{color:#ff3d71;background:rgba(255,61,113,.12);box-shadow:0 0 40px rgba(255,61,113,.35)}
    .lk-ring{position:absolute;inset:-2px;border-radius:50%;border:3px solid #ff3d71;opacity:0;pointer-events:none}
    .lk-p{position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-4.5px;border-radius:50%;pointer-events:none}
    .lk-count{display:flex;font-size:28px;font-weight:900;font-variant-numeric:tabular-nums;height:1.2em;line-height:1.2em;overflow:hidden}
    .od{display:inline-block;height:1.2em;overflow:hidden}
    .od-col{display:flex;flex-direction:column;transition:transform .7s cubic-bezier(.2,1.4,.4,1)}
    .od-col span{height:1.2em}
    .lk-sub{font-size:10px;letter-spacing:.3em;color:#71717a;font-weight:700;margin-top:-10px}

    /* 09 cyber glitch */
    .cy-stage{background:#020905;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .cy-term{position:absolute;inset:14px;border:1px solid rgba(34,197,94,.35);border-radius:14px;background:rgba(3,20,10,.75);box-shadow:inset 0 0 40px rgba(34,197,94,.12);display:flex;flex-direction:column;overflow:hidden}
    .cy-head{display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid rgba(34,197,94,.25);font-size:10px;color:#4ade80}
    .cy-head i{width:8px;height:8px;border-radius:50%;background:#22c55e;opacity:.55}
    .cy-body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:10px 16px;gap:10px;position:relative}
    .cy-text{position:relative;margin:0;font-size:23px;color:#86efac;font-weight:700;letter-spacing:.06em;text-shadow:0 0 14px rgba(74,222,128,.6);white-space:nowrap}
    .is-focus .cy-text{font-size:52px}
    .cy-text::before,.cy-text::after{content:attr(data-text);position:absolute;left:0;top:0;width:100%;overflow:hidden;pointer-events:none}
    .cy-text::before{color:#22d3ee;animation:cyA 2.6s infinite steps(1)}
    .cy-text::after{color:#f472b6;animation:cyB 2.1s infinite steps(1)}
    .cy-hot .cy-text::before,.cy-text:hover::before{animation-duration:.3s}
    .cy-hot .cy-text::after,.cy-text:hover::after{animation-duration:.24s}
    @keyframes cyA{0%,90%{clip-path:inset(0 0 100% 0)}91%{clip-path:inset(10% 0 60% 0);transform:translate(-4px,1px)}95%{clip-path:inset(45% 0 25% 0);transform:translate(3px,-1px)}100%{clip-path:inset(0 0 100% 0)}}
    @keyframes cyB{0%,88%{clip-path:inset(100% 0 0 0)}89%{clip-path:inset(62% 0 8% 0);transform:translate(4px,0)}94%{clip-path:inset(18% 0 58% 0);transform:translate(-3px,1px)}100%{clip-path:inset(100% 0 0 0)}}
    .cy-dud{color:#16a34a;opacity:.75}
    .cy-bar{height:3px;background:rgba(34,197,94,.15);border-radius:2px;overflow:hidden}
    .cy-bar span{display:block;height:100%;width:100%;background:#22c55e;box-shadow:0 0 10px #22c55e;transition:width .1s}
    .cy-hex{font-size:9px;line-height:1.35;color:rgba(74,222,128,.4);margin:0;white-space:pre;overflow:hidden;max-height:62px}
    .cy-btn{margin:0 16px 14px;align-self:flex-start;padding:8px 16px;border:1px solid #22c55e;border-radius:8px;color:#4ade80;font-weight:700;font-size:11px;letter-spacing:.25em;background:rgba(34,197,94,.08);transition:all .2s}
    .cy-btn:hover{background:#22c55e;color:#03140a;box-shadow:0 0 24px rgba(34,197,94,.6)}
    .cy-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(to bottom,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);animation:cyFl 5s infinite}
    @keyframes cyFl{0%,100%{opacity:.9}47%{opacity:.9}48%{opacity:.5}49%{opacity:1}}

    /* 10 coverflow */
    .cf-view{position:absolute;inset:0 0 40px;perspective:900px;display:flex;align-items:center;justify-content:center;cursor:grab}
    .cf-track{position:relative;width:1px;height:1px;transform-style:preserve-3d}
    .cf-view::after{content:'';position:absolute;left:15%;right:15%;top:calc(50% + 70px);height:60px;border-radius:50%;background:radial-gradient(closest-side,rgba(198,58,235,.28),transparent);pointer-events:none}
    .is-focus .cf-view::after{top:calc(50% + 140px);height:90px}
    .cf-item{position:absolute;left:0;top:0;width:210px;height:118px;margin:-59px 0 0 -105px;border-radius:12px;overflow:hidden;box-shadow:0 24px 40px -12px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.08);will-change:transform}
    .is-focus .cf-item{width:440px;height:248px;margin:-124px 0 0 -220px}
    .cf-item img{width:100%;height:100%;object-fit:cover;pointer-events:none}
    .cf-item::after{content:'';position:absolute;inset:0;background:#05060c;opacity:var(--dim,0);pointer-events:none}
    .cf-cap{position:absolute;bottom:14px;left:0;right:0;text-align:center;font-weight:800;letter-spacing:.25em;font-size:11px;text-transform:uppercase}

    /* 11 warp */
    .wp-stage{background:#02040c;cursor:pointer;touch-action:none}
    .wp-hud{position:absolute;right:14px;bottom:14px;z-index:5;display:flex;flex-direction:column;align-items:flex-end;gap:4px;font-family:ui-monospace,Menlo,monospace}
    .wp-l{font-size:9px;letter-spacing:.3em;color:#93c5fd}
    .wp-v{font-size:26px;color:#fff;line-height:1;text-shadow:0 0 14px #60a5fa}
    .wp-bar{width:110px;height:4px;border-radius:2px;background:rgba(96,165,250,.2);overflow:hidden}
    .wp-bar span{display:block;height:100%;width:0;background:linear-gradient(90deg,#60a5fa,#c63aeb)}
    .wp-h{font-size:9px;letter-spacing:.25em;color:#a1a1aa;margin-top:4px}
    .wp-flash{position:absolute;inset:0;background:radial-gradient(circle,rgba(191,219,254,.9),rgba(96,165,250,.3) 40%,transparent 70%);opacity:0;pointer-events:none;mix-blend-mode:screen}

    /* 12 radial menu */
    .rm{position:relative;width:260px;height:260px}
    .rm-goo{position:absolute;inset:0;filter:url(#lab-goo)}
    .rm-b,.rm-main-b,.rm-i,.rm-main{position:absolute;left:50%;top:50%;border-radius:50%}
    .rm-b,.rm-i{width:52px;height:52px;margin:-26px;transition:transform .6s cubic-bezier(.34,1.56,.64,1)}
    .rm-b{background:#a855f7}
    .rm-main-b,.rm-main{width:74px;height:74px;margin:-37px}
    .rm-main-b{background:linear-gradient(135deg,#c63aeb,#7c3aed)}
    .rm-i{display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;transition:transform .6s cubic-bezier(.34,1.56,.64,1),opacity .3s}
    .rm-i i{transition:transform .25s}
    .rm-i:hover i{transform:scale(1.3)}
    .rm:not(.open) .rm-i{opacity:0;pointer-events:none}
    .rm-main{font-size:24px;color:#fff;transition:transform .55s cubic-bezier(.34,1.56,.64,1)}
    .rm.open .rm-main{transform:rotate(135deg)}
    .rm-toast{position:absolute;left:0;right:0;bottom:-34px;text-align:center;font-size:11px;font-weight:800;letter-spacing:.3em;opacity:0;text-transform:uppercase}
    .rm-toast.show{animation:rmT 1.5s ease forwards}
    @keyframes rmT{0%{opacity:0;transform:translateY(8px)}15%,70%{opacity:1;transform:none}100%{opacity:0}}

    /* 13 dynamic island */
    .di-stage{background:radial-gradient(ellipse at 50% 0%,#1d2140 0%,#05060c 70%)}
    .di-phone{position:absolute;left:50%;top:14px;width:min(300px,86%);height:calc(100% - 74px);transform:translateX(-50%);border-radius:30px;border:3px solid #2a2a35;background:linear-gradient(160deg,#4c1d95,#0f172a 60%,#701a75);overflow:hidden;box-shadow:0 30px 60px -20px rgba(0,0,0,.8)}
    .di-wall{position:absolute;left:0;right:0;bottom:16px;text-align:center;display:flex;flex-direction:column;cursor:pointer}
    .di-time{font-size:44px;font-weight:300;letter-spacing:-.02em}
    .di-date{font-size:11px;color:#d4d4d8}
    .di-pill{position:absolute;left:50%;top:9px;transform:translateX(-50%);width:96px;height:28px;border-radius:20px;background:#000;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.5);transition:width .6s cubic-bezier(.3,1.5,.5,1),height .6s cubic-bezier(.3,1.5,.5,1),border-radius .6s}
    .di-pill[data-state=call]{width:92%;height:62px;border-radius:31px}
    .di-pill[data-state=music]{width:92%;height:136px;border-radius:32px}
    .di-pill[data-state=timer]{width:150px;height:34px}
    .di-pill[data-state=face]{width:112px;height:112px;border-radius:34px}
    .di-c{position:absolute;inset:0;opacity:0;transform:scale(.85);transition:opacity .2s,transform .3s;pointer-events:none;padding:10px 14px;display:flex;align-items:center;gap:10px}
    .di-pill[data-state=call] .di-call,.di-pill[data-state=music] .di-music,.di-pill[data-state=timer] .di-timer,.di-pill[data-state=face] .di-face{opacity:1;transform:none;transition-delay:.18s;pointer-events:auto}
    .di-call img{width:40px;height:40px;border-radius:50%}
    .di-call div{flex:1;display:flex;flex-direction:column;min-width:0}.di-call b{font-size:13px}.di-call span{font-size:10px;color:#a1a1aa}
    .di-call button{width:38px;height:38px;border-radius:50%;font-size:14px}.di-dec{background:#ef4444}.di-acc{background:#22c55e;animation:diRing 1s infinite}
    @keyframes diRing{0%,100%{transform:rotate(0)}20%{transform:rotate(-18deg)}40%{transform:rotate(18deg)}60%{transform:rotate(0)}}
    .di-music{flex-direction:column;align-items:stretch;justify-content:center;gap:8px}
    .di-row{display:flex;align-items:center;gap:10px}
    .di-row img{width:44px;height:44px;border-radius:10px;object-fit:cover}
    .di-row b{display:block;font-size:13px}.di-row span{display:block;font-size:10px;color:#a1a1aa}
    .di-wave{margin-left:auto;display:flex;gap:3px;align-items:center;height:24px}
    .di-wave i{width:3px;border-radius:2px;background:#c084fc;animation:diW .9s ease-in-out infinite}
    .di-wave i:nth-child(2){animation-delay:.15s}.di-wave i:nth-child(3){animation-delay:.3s}.di-wave i:nth-child(4){animation-delay:.45s}.di-wave i:nth-child(5){animation-delay:.6s}
    @keyframes diW{0%,100%{height:5px}50%{height:22px}}
    .di-prog{height:4px;background:rgba(255,255,255,.15);border-radius:2px;overflow:hidden}
    .di-prog span{display:block;height:100%;width:35%;background:#fff;animation:diP 12s linear infinite}
    @keyframes diP{from{width:5%}to{width:100%}}
    .di-ctrl{display:flex;justify-content:center;gap:26px;font-size:15px}
    .di-timer{justify-content:space-between;color:#fb923c;padding:0 14px}
    .di-timer b{font-variant-numeric:tabular-nums;font-size:14px}
    .di-face{justify-content:center}
    .di-fid{width:56px;height:56px;color:#fff;transition:opacity .3s}
    .di-fid path{fill:none;stroke:currentColor;stroke-width:3.5;stroke-linecap:round}
    .di-scan{animation:diScan 1.2s ease-in-out infinite}
    @keyframes diScan{50%{opacity:.35;transform:scale(.92)}}
    .di-ok{position:absolute;width:44px;height:44px;fill:none;stroke:#22c55e;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:40;stroke-dashoffset:40;transition:stroke-dashoffset .4s}
    .di-face.ok .di-fid{opacity:0}.di-face.ok .di-ok{stroke-dashoffset:0}
    .di-btns{position:absolute;left:0;right:0;bottom:14px;display:flex;justify-content:center;gap:6px;flex-wrap:wrap;padding:0 10px}
    .di-btns button{font-size:11px;font-weight:700;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);display:inline-flex;align-items:center;gap:6px;transition:background .2s}
    .di-btns button:hover,.di-btns button.on{background:#fff;color:#000}

    /* 15 beat lab */
    .bt-stage{background:radial-gradient(ellipse at 50% 35%,#1a0f2e 0%,#05040a 75%)}
    .bt-ui{position:absolute;left:0;right:0;bottom:12px;display:flex;align-items:center;justify-content:center;gap:10px;z-index:5}
    .bt-play{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#c63aeb,#7c3aed);font-size:14px;box-shadow:0 0 20px rgba(198,58,235,.45);flex-shrink:0}
    .bt-grid{display:grid;grid-template-columns:auto repeat(8,1fr);gap:3px;align-items:center}
    .bt-grid em{font-style:normal;font-size:8px;font-weight:800;letter-spacing:.1em;color:#a1a1aa;padding-right:4px;text-transform:uppercase}
    .bt-step{width:18px;height:18px;border-radius:5px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);transition:transform .1s,background .15s}
    .is-focus .bt-step{width:30px;height:30px}
    .bt-step.on{background:var(--c);box-shadow:0 0 10px var(--c)}
    .bt-step.now{transform:scale(1.18);border-color:#fff}
    .bt-bpm{position:absolute;right:12px;top:12px;font-size:10px;font-weight:800;letter-spacing:.2em;color:#a1a1aa;z-index:5}

    /* 16 game HUD */
    .hud-stage{background:#000}
    .hud-world{position:absolute;inset:0}
    .hud-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.55) saturate(1.1)}
    .hud-vig{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 0 rgba(239,68,68,0);transition:box-shadow .4s}
    .hud-vig.flash{animation:hudF .45s ease-out}
    @keyframes hudF{0%{box-shadow:inset 0 0 120px 40px rgba(239,68,68,.75)}100%{box-shadow:inset 0 0 0 0 rgba(239,68,68,0)}}
    .hud-stage.low .hud-vig{animation:hudLow 1s ease-in-out infinite}
    @keyframes hudLow{0%,100%{box-shadow:inset 0 0 60px 10px rgba(239,68,68,.35)}50%{box-shadow:inset 0 0 120px 30px rgba(239,68,68,.6)}}
    .hud-top{position:absolute;left:12px;top:46px;right:12px;display:flex;gap:10px;align-items:center}
    .hud-pt{width:48px;height:48px;border-radius:12px;border:2px solid rgba(255,255,255,.5);object-fit:cover}
    .hud-bars{flex:1;max-width:280px;display:flex;flex-direction:column;gap:4px}
    .hud-name{display:flex;justify-content:space-between;font-size:10px;letter-spacing:.15em}
    .hud-name span{color:#facc15;font-weight:800}
    .hud-hp{position:relative;height:16px;border-radius:4px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.25);overflow:hidden}
    .hud-hp .ghost,.hud-hp .fill,.hud-sh .fill{position:absolute;left:0;top:0;bottom:0}
    .hud-hp .ghost{background:#fff;opacity:.85}
    .hud-hp .fill{background:linear-gradient(#f87171,#b91c1c);box-shadow:inset 0 2px 0 rgba(255,255,255,.35)}
    .hud-stage.low .hud-hp .fill{animation:hudBl .5s steps(2) infinite}
    @keyframes hudBl{50%{filter:brightness(1.8)}}
    .hud-hp em{position:absolute;inset:0;font-style:normal;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;letter-spacing:.1em;text-shadow:0 1px 2px #000}
    .hud-sh{position:relative;height:6px;border-radius:3px;background:rgba(0,0,0,.5);overflow:hidden}
    .hud-sh .fill{background:linear-gradient(90deg,#38bdf8,#818cf8);transition:width .4s}
    .hud-fx{position:absolute;inset:0;pointer-events:none}
    .hud-float{position:absolute;font-weight:900;font-size:22px;text-shadow:0 2px 0 #000,0 0 14px currentColor;animation:hudUp 1.1s cubic-bezier(.2,.8,.3,1) forwards;white-space:nowrap}
    .hud-float.red{color:#fca5a5}.hud-float.crit{color:#fde047;font-size:30px}.hud-float.green{color:#86efac}.hud-float.blue{color:#93c5fd;font-size:16px}
    @keyframes hudUp{0%{transform:translateY(10px) scale(.6);opacity:0}15%{transform:translateY(0) scale(1.15);opacity:1}100%{transform:translateY(-60px) scale(1);opacity:0}}
    .hud-spark{position:absolute;width:6px;height:6px;border-radius:50%;background:#86efac;box-shadow:0 0 8px #4ade80}
    .hud-bubble{position:absolute;left:50%;top:55%;width:150px;height:150px;margin:-75px;border-radius:50%;border:2px solid rgba(125,211,252,.8);background:radial-gradient(circle,rgba(56,189,248,.05) 55%,rgba(56,189,248,.35));box-shadow:0 0 40px rgba(56,189,248,.5);opacity:0;transform:scale(.6);transition:all .5s cubic-bezier(.34,1.56,.64,1);pointer-events:none}
    .hud-stage.shielded .hud-bubble{opacity:1;transform:scale(1)}
    .hud-ko{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:64px;font-weight:900;color:#ef4444;letter-spacing:.1em;text-shadow:0 0 30px rgba(239,68,68,.8);opacity:0;transform:scale(2);transition:all .35s cubic-bezier(.34,1.56,.64,1);pointer-events:none}
    .hud-ko.on{opacity:1;transform:scale(1)}
    .hud-btns{position:absolute;left:0;right:0;bottom:12px;display:flex;justify-content:center;gap:6px;flex-wrap:wrap}
    .hud-btns button{font-size:11px;font-weight:800;letter-spacing:.08em;padding:7px 11px;border-radius:9px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.2);display:inline-flex;align-items:center;gap:6px;backdrop-filter:blur(6px);transition:transform .12s,background .2s}
    .hud-btns button:active{transform:scale(.92)}
    .hud-btns button[data-a=hit]:hover{background:#b91c1c}.hud-btns button[data-a=crit]:hover{background:#ca8a04}.hud-btns button[data-a=heal]:hover{background:#15803d}.hud-btns button[data-a=shield]:hover{background:#0369a1}

    /* 17 loot chest */
    .lt-stage{background:radial-gradient(ellipse at 50% 85%,#2a1636 0%,#0a0610 70%)}
    .lt-floor{position:absolute;left:50%;bottom:10%;width:240px;height:40px;margin-left:-120px;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--rc,#a855f7) 55%,transparent),transparent);opacity:.5;filter:blur(4px)}
    .lt-rays{position:absolute;left:50%;top:62%;width:640px;height:640px;margin:-320px;background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--rc,#fff) 38%,transparent) 0 7deg,transparent 7deg 22deg);-webkit-mask:radial-gradient(circle,#000 0,transparent 58%);mask:radial-gradient(circle,#000 0,transparent 58%);opacity:0;transform:scale(.3);transition:opacity .5s,transform .9s;pointer-events:none}
    .lt-open .lt-rays{opacity:1;transform:scale(1)}
    .lt-open .lt-rays{animation:ltSpin 10s linear infinite}
    @keyframes ltSpin{to{rotate:360deg}}
    .lt-chest{position:absolute;left:50%;bottom:16%;width:150px;height:112px;margin-left:-75px;perspective:520px;cursor:pointer}
    .lt-body{position:absolute;left:0;right:0;bottom:0;height:70px;border-radius:8px 8px 14px 14px;background:linear-gradient(#7c4a1e,#4a2a0e);border:4px solid #d4a034;box-shadow:inset 0 -12px 20px rgba(0,0,0,.45),0 20px 30px rgba(0,0,0,.6)}
    .lt-lock{position:absolute;left:50%;top:-6px;width:22px;height:26px;margin-left:-11px;border-radius:5px;background:#facc15;box-shadow:0 0 0 3px #8a5a12}
    .lt-lid{position:absolute;left:0;right:0;bottom:62px;height:48px;border-radius:44px 44px 6px 6px;background:linear-gradient(#8b5523,#5a3412);border:4px solid #d4a034;transform-origin:50% 100%;transition:transform .6s cubic-bezier(.34,1.56,.64,1);z-index:2}
    .lt-lid::after{content:'';position:absolute;left:50%;top:0;bottom:0;width:16px;margin-left:-8px;background:#d4a034}
    .lt-glow{position:absolute;left:8%;right:8%;bottom:60px;height:10px;background:var(--rc,#fff);filter:blur(6px);opacity:0;transition:opacity .3s;z-index:1}
    .lt-charge .lt-chest{animation:ltShake .7s cubic-bezier(.36,.07,.19,.97) both}
    .lt-charge .lt-glow,.lt-open .lt-glow{opacity:1}
    @keyframes ltShake{10%,90%{transform:translateX(-1px) rotate(-1deg)}20%,80%{transform:translateX(3px) rotate(2deg)}30%,50%,70%{transform:translateX(-5px) rotate(-3deg)}40%,60%{transform:translateX(5px) rotate(3deg)}}
    .lt-open .lt-lid{transform:rotateX(-118deg)}
    .lt-card{position:absolute;left:50%;bottom:30%;width:112px;height:152px;margin-left:-56px;perspective:700px;opacity:0;transform:translateY(50px) scale(.25);transition:transform .9s cubic-bezier(.34,1.56,.64,1),opacity .35s;pointer-events:none;z-index:3}
    .lt-open .lt-card{opacity:1;transform:translateY(-36px) scale(1)}
    .lt-inner{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.4,1.6,.5,1)}
    .lt-flip .lt-inner{transform:rotateY(180deg)}
    .lt-face{position:absolute;inset:0;border-radius:12px;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px;text-align:center}
    .lt-back{background:linear-gradient(135deg,#3b0764,#1e1b4b);border:2px solid #a855f7;font-size:44px;font-weight:900;color:#e9d5ff}
    .lt-front{transform:rotateY(180deg);background:linear-gradient(160deg,#18181b,#09090b);border:2px solid var(--rc);box-shadow:0 0 34px var(--rc),inset 0 0 22px color-mix(in srgb,var(--rc) 30%,transparent)}
    .lt-front i{font-size:36px;color:var(--rc);filter:drop-shadow(0 0 12px var(--rc))}
    .lt-front b{font-size:12px;line-height:1.15}
    .lt-rar{font-size:9px;letter-spacing:.25em;font-weight:800;color:var(--rc);text-transform:uppercase}
    .lt-legend .lt-front{background:linear-gradient(115deg,#1c1206 40%,#4a3608 50%,#1c1206 60%);background-size:260% 100%;animation:ltShine 1.8s linear infinite}
    @keyframes ltShine{from{background-position:120% 0}to{background-position:-120% 0}}
    .lt-hint{position:absolute;left:0;right:0;bottom:12px;text-align:center;font-size:10px;font-weight:800;letter-spacing:.3em;color:#a1a1aa;text-transform:uppercase}
    .lt-part{position:absolute;left:50%;bottom:30%;width:6px;height:6px;border-radius:50%;background:var(--rc);box-shadow:0 0 10px var(--rc);pointer-events:none}

    /* 18 x-ray */
    .xr-stage{background:#0b0b10;cursor:none}
    .xr-layer{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
    .xr-ui{width:min(250px,74%);border-radius:16px;padding:10px;display:flex;flex-direction:column;gap:8px}
    .is-focus .xr-ui{width:min(380px,60%)}
    .xr-final .xr-ui{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 60px -20px rgba(0,0,0,.8)}
    .xr-img{aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#222;display:flex;align-items:center;justify-content:center}
    .xr-img img{width:100%;height:100%;object-fit:cover}
    .xr-row{display:flex;justify-content:space-between;align-items:center}
    .xr-h{font-weight:800;font-size:15px}.xr-price{font-weight:800;color:#4ade80;font-size:13px}
    .xr-tags{display:flex;gap:4px}
    .xr-tags i{font-style:normal;font-size:9px;padding:2px 6px;border-radius:5px;background:rgba(255,255,255,.08);color:#d4d4d8}
    .xr-p{font-size:11px;color:#a1a1aa;line-height:1.4}
    .xr-cta{height:36px;border-radius:10px;background:linear-gradient(135deg,#16a34a,#22c55e);display:flex;align-items:center;justify-content:center;gap:8px;font-weight:800;font-size:12px}
    .xr-wire{background:#f4f4f5;color:#3f3f46}
    .xr-wire .xr-ui{border:2px dashed #a1a1aa;background:#fff;position:relative}
    .xr-wire .xr-img{background:repeating-linear-gradient(45deg,#e4e4e7 0 8px,#f4f4f5 8px 16px);border:2px solid #a1a1aa}
    .xr-wire span{font-family:ui-monospace,Menlo,monospace;font-size:9px;font-weight:700;color:#2563eb;background:#dbeafe;padding:2px 5px;border-radius:4px}
    .xr-wire .xr-h,.xr-wire .xr-price{display:flex}
    .xr-wire .xr-tags i{width:44px;height:14px;background:#e4e4e7;border:1px solid #a1a1aa}
    .xr-wire .xr-p{display:flex;flex-direction:column;gap:4px}.xr-wire .xr-p i{height:7px;border-radius:3px;background:#e4e4e7}.xr-wire .xr-p i:last-child{width:70%}
    .xr-wire .xr-cta{background:#fff;border:2px solid #3f3f46}
    .xr-note{position:absolute;font-style:normal;font-family:ui-monospace,Menlo,monospace;font-size:9px;font-weight:700;color:#e11d48}
    .xr-note.n1{left:-22px;top:42%}.xr-note.n2{right:-22px;top:20%}.xr-note.n3{left:50%;bottom:-18px;transform:translateX(-50%);white-space:nowrap}
    .xr-wire,.xr-final{transition:none}
    .xr-stage.swapped .xr-final{z-index:2}.xr-stage.swapped .xr-wire{z-index:1}
    .xr-lens{position:absolute;left:0;top:0;border-radius:50%;border:2px solid #c63aeb;box-shadow:0 0 0 4000px rgba(0,0,0,0),0 0 30px rgba(198,58,235,.6),inset 0 0 20px rgba(198,58,235,.35);pointer-events:none;z-index:5}
    .xr-lens::after{content:'X-RAY';position:absolute;left:50%;bottom:-20px;transform:translateX(-50%);font-size:8px;font-weight:900;letter-spacing:.3em;color:#c63aeb}
    .xr-hint{position:absolute;right:12px;bottom:10px;font-size:9px;letter-spacing:.2em;color:#71717a;text-transform:uppercase;z-index:6}

    /* 19 rubber slider */
    .rs{position:relative;width:min(320px,90%);height:180px}
    .rs-svg{position:absolute;inset:0;overflow:visible}
    .rs-bg,.rs-fg{fill:none;stroke-width:8;stroke-linecap:round}
    .rs-bg{stroke:rgba(255,255,255,.12)}.rs-fg{stroke:url(#rsg)}
    .rs-thumb{position:absolute;left:0;top:0;width:30px;height:30px;margin:-15px;border-radius:50%;background:#fff;box-shadow:0 0 0 6px rgba(198,58,235,.35),0 8px 20px rgba(0,0,0,.5);cursor:grab;touch-action:none}
    .rs-val{position:absolute;left:0;top:0;padding:4px 9px;border-radius:9px;background:linear-gradient(135deg,#c63aeb,#7c3aed);font-weight:900;font-size:13px;font-variant-numeric:tabular-nums;transform-origin:50% 120%;pointer-events:none;box-shadow:0 6px 18px rgba(198,58,235,.5)}
    .rs-ic{position:absolute;left:50%;top:14px;transform:translateX(-50%);font-size:20px;color:#d4d4d8}

    /* 12/05/01 shared goo note */
    `;
    const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
        <filter id="lab-goo"><feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b"/><feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop"/></filter>
    </defs></svg>`);

    // =====================================================================
    // DEMOS
    // =====================================================================

    // 01 ─ Liquid button
    function liquid(stage) {
        stage.classList.add('lab-center', 'lab-bg-violet');
        stage.insertAdjacentHTML('beforeend', `
            <div class="lq" role="button" tabindex="0" aria-label="Submit" data-sfx="pop">
                <div class="lq-goo"><div class="lq-btn"></div><span class="lq-drop"></span><span class="lq-drop"></span><span class="lq-drop"></span><span class="lq-drop"></span></div>
                <span class="lq-label">SUBMIT</span>
                <svg class="lq-check" viewBox="0 0 52 52"><path d="M14 27 l8 8 l16 -18"/></svg>
                <span class="lq-ring"></span>
            </div>`);
        const root = stage.querySelector('.lq'), drops = [...stage.querySelectorAll('.lq-drop')];
        let loading = false, busy = false, t0 = 0;
        const go = () => {
            if (busy) return; busy = true; loading = true; t0 = performance.now() / 1000;
            root.classList.add('is-loading');
            setTimeout(() => { loading = false; drops.forEach((d) => { d.style.transform = ''; }); root.classList.remove('is-loading'); root.classList.add('is-done'); SFX('success'); }, 2000);
            setTimeout(() => { root.classList.remove('is-done'); busy = false; }, 3800);
        };
        root.addEventListener('click', go);
        root.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        return {
            frame(t) {
                if (!loading) return;
                const e = t - t0;
                drops.forEach((d, i) => {
                    const a = e * 4.2 + (i * Math.PI) / 2, r = 36 + Math.sin(e * 6 + i * 1.7) * 14;
                    d.style.transform = `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px) scale(${1 + Math.sin(e * 5 + i) * 0.3})`;
                });
            },
        };
    }

    // 02 ─ Particle text
    function particles(stage) {
        stage.classList.add('lab-bg-deep'); stage.style.touchAction = 'none';
        const cv = canvas(stage, 2);
        stage.insertAdjacentHTML('beforeend', '<form class="lab-input"><input maxlength="12" placeholder="Type a word + Enter" aria-label="Word for the particles"><button type="submit" aria-label="Morph" data-sfx="whoosh"><i class="fas fa-wand-magic-sparkles"></i></button></form>');
        const form = stage.querySelector('form'), input = form.querySelector('input');
        let P = [], word = 'VORAMAN';
        const mouse = { x: -9999, y: -9999, down: false };
        const off = document.createElement('canvas'), octx = off.getContext('2d', { willReadFrequently: true });
        const COLORS = ['#e879f9', '#c63aeb', '#a855f7', '#8b5cf6', '#7c3aed', '#6366f1', '#3b82f6', '#60a5fa'];
        function targets() {
            const w = Math.max(1, Math.floor(cv.w)), h = Math.max(1, Math.floor(cv.h));
            off.width = w; off.height = h;
            octx.clearRect(0, 0, w, h); octx.fillStyle = '#fff';
            octx.font = `900 100px Inter, system-ui, sans-serif`;
            const fs = Math.min(h * 0.4, (100 * w * 0.86) / Math.max(1, octx.measureText(word).width));
            octx.font = `900 ${fs}px Inter, system-ui, sans-serif`; octx.textAlign = 'center'; octx.textBaseline = 'middle';
            octx.fillText(word, w / 2, h * 0.46);
            const data = octx.getImageData(0, 0, w, h).data;
            for (let step = 3; step < 12; step++) {
                const pts = [];
                for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (data[(y * w + x) * 4 + 3] > 128) pts.push(x, y);
                if (pts.length / 2 <= 2400) return pts;
            }
            return [];
        }
        function build() {
            const pts = targets(), n = pts.length / 2;
            const order = [...Array(n).keys()];
            for (let i = n - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
            while (P.length < n) P.push({ x: Math.random() * cv.w, y: Math.random() * cv.h, vx: 0, vy: 0 });
            P.length = n;
            P.forEach((p, i) => { const k = order[i]; p.hx = pts[k * 2]; p.hy = pts[k * 2 + 1]; p.b = Math.min(COLORS.length - 1, ((p.hx / cv.w) * COLORS.length) | 0); });
        }
        cv.onresize = build;
        (document.fonts?.ready || Promise.resolve()).then(build);
        build();
        stage.addEventListener('pointermove', (e) => { const p = pt(e, stage); mouse.x = p.x; mouse.y = p.y; });
        stage.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; mouse.down = false; });
        stage.addEventListener('pointerdown', (e) => {
            if (e.target.closest('form')) return;
            mouse.down = true;
            for (const p of P) { const a = Math.random() * Math.PI * 2, s = 6 + Math.random() * 14; p.vx += Math.cos(a) * s; p.vy += Math.sin(a) * s; }
            SFX('pop');
        });
        stage.addEventListener('pointerup', () => { mouse.down = false; });
        form.addEventListener('submit', (e) => { e.preventDefault(); word = (input.value.trim() || 'VORAMAN').toUpperCase().slice(0, 12); input.value = ''; build(); input.blur(); });
        return {
            frame() {
                const ctx = cv.ctx; ctx.clearRect(0, 0, cv.w, cv.h);
                const R = Math.min(110, cv.w * 0.2), R2 = R * R;
                for (const p of P) {
                    let ax = (p.hx - p.x) * 0.045, ay = (p.hy - p.y) * 0.045;
                    const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
                    if (d2 < R2) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) * (mouse.down ? 10 : 5); ax += (dx / d) * f; ay += (dy / d) * f; }
                    p.vx = (p.vx + ax) * 0.84; p.vy = (p.vy + ay) * 0.84; p.x += p.vx; p.y += p.vy;
                }
                for (let b = 0; b < COLORS.length; b++) {
                    ctx.fillStyle = COLORS[b];
                    for (const p of P) if (p.b === b) ctx.fillRect(p.x, p.y, 2.2, 2.2);
                }
            },
        };
    }

    // 03 ─ Holographic card
    function holo(stage) {
        stage.classList.add('lab-center', 'lab-bg-holo');
        stage.insertAdjacentHTML('beforeend', `
            <div class="hc-scene"><div class="hc-card" role="button" tabindex="0" aria-label="Flip the card" data-sfx="swipe">
                <div class="hc-face hc-front">
                    <div class="hc-top"><span>TRIPOD MK-II</span><i>HP 2000 ✦</i></div>
                    <img src="assets/img/earthfall-icon.webp" alt="" class="hc-art" draggable="false">
                    <div class="hc-info"><span class="hc-rarity">★★★★★ LEGENDARY · EARTHFALL</span><b>Heat Ray</b><em>Burns through any defence. Pair it with an Orbital Mark for a guaranteed crit.</em></div>
                    <div class="hc-holo"></div><div class="hc-sparkle"></div><div class="hc-glare"></div>
                </div>
                <div class="hc-face hc-back"><span>VV</span><small>GOJO STUDIO</small></div>
            </div></div>`);
        const card = stage.querySelector('.hc-card'), scene = stage.querySelector('.hc-scene');
        // scale the card to small stages (phones) so it never touches the edges
        new ResizeObserver(() => { const base = card.offsetHeight || 266; scene.style.transform = `scale(${Math.min(1, (stage.clientHeight - 40) / base).toFixed(3)})`; }).observe(stage);
        let tx = 0, ty = 0, rx = 0, ry = 0, mx = 50, my = 50, tmx = 50, tmy = 50, over = false, flip = 0, flipped = false;
        stage.addEventListener('pointermove', (e) => {
            const r = card.getBoundingClientRect();
            const px = clamp((e.clientX - r.left) / r.width, 0, 1), py = clamp((e.clientY - r.top) / r.height, 0, 1);
            over = true; ty = (px - 0.5) * 34; tx = (0.5 - py) * 34; tmx = px * 100; tmy = py * 100;
        });
        stage.addEventListener('pointerleave', () => { over = false; });
        const doFlip = () => { flipped = !flipped; };
        card.addEventListener('click', doFlip);
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doFlip(); } });
        return {
            frame(t) {
                if (!over) { ty = Math.sin(t * 0.8) * 14; tx = Math.cos(t * 0.6) * 9; tmx = 50 + Math.sin(t * 0.8) * 34; tmy = 50 + Math.cos(t * 0.6) * 30; }
                rx += (tx - rx) * 0.12; ry += (ty - ry) * 0.12; mx += (tmx - mx) * 0.12; my += (tmy - my) * 0.12;
                flip += ((flipped ? 180 : 0) - flip) * 0.12;
                card.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${(ry + flip).toFixed(2)}deg)`;
                card.style.setProperty('--mx', `${mx.toFixed(1)}%`); card.style.setProperty('--my', `${my.toFixed(1)}%`);
                card.style.setProperty('--hyp', Math.min(1, Math.hypot(mx - 50, my - 50) / 50).toFixed(2));
            },
        };
    }

    // 04 ─ Swipe deck
    function swipe(stage) {
        stage.classList.add('lab-bg-deep'); stage.style.touchAction = 'none';
        const CARDS = [
            ['assets/img/earthfall-banner-800.webp', 'EARTHFALL', 'Alien invasion action'],
            ['assets/img/stickempire-banner-800.webp', 'Stick Empire 3D', 'RTS that plays in your browser'],
            ['assets/img/game-fighting-800.webp', 'Fighting HUD', 'Game UI'],
            ['assets/img/desk-mainmenu-800.webp', 'Game Launcher', 'Desktop UI'],
            ['assets/img/desk-vinland-800.webp', 'Vinland Saga', 'Web storefront'],
        ];
        stage.insertAdjacentHTML('beforeend', `<div class="sw-deck">${CARDS.map(([img, t, s]) => `<div class="sw-card"><img src="${img}" alt="" draggable="false" loading="lazy"><div class="sw-meta"><b>${t}</b><span>${s}</span></div><span class="sw-stamp like">LIKE</span><span class="sw-stamp nope">NOPE</span></div>`).join('')}</div>
            <div class="sw-actions"><button class="sw-no" aria-label="Nope" data-sfx="none"><i class="fas fa-xmark"></i></button><button class="sw-yes" aria-label="Like" data-sfx="none"><i class="fas fa-heart"></i></button></div>`);
        const deck = stage.querySelector('.sw-deck');
        let order = [...deck.children];
        const S = new Map(order.map((el, i) => [el, { x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, mode: 'rest', vd: i, op: i > 3 ? 0 : 1 }]));
        let drag = null;
        deck.addEventListener('pointerdown', (e) => {
            const top = order[0]; if (!top.contains(e.target)) return;
            const s = S.get(top); if (s.mode === 'fly') return;
            drag = { el: top, sx: e.clientX - s.x, sy: e.clientY - s.y, lx: e.clientX, lt: performance.now(), v: 0 };
            s.mode = 'drag'; deck.setPointerCapture(e.pointerId); top.style.cursor = 'grabbing';
        });
        deck.addEventListener('pointermove', (e) => {
            if (!drag) return;
            const s = S.get(drag.el); s.x = e.clientX - drag.sx; s.y = e.clientY - drag.sy;
            const now = performance.now(); drag.v = (e.clientX - drag.lx) / Math.max(1, now - drag.lt); drag.lx = e.clientX; drag.lt = now;
        });
        const fly = (el, dir) => { const s = S.get(el); if (s.mode === 'fly') return; s.mode = 'fly'; s.vx = dir * 1500; s.vy = -200 + Math.random() * 150; s.vr = dir * 220; SFX('swipe'); };
        const release = () => {
            if (!drag) return;
            const s = S.get(drag.el); drag.el.style.cursor = '';
            if (Math.abs(s.x) > 100 || Math.abs(drag.v) > 0.7) fly(drag.el, Math.sign(s.x || drag.v)); else s.mode = 'spring';
            drag = null;
        };
        deck.addEventListener('pointerup', release); deck.addEventListener('pointercancel', release);
        stage.querySelector('.sw-yes').addEventListener('click', () => fly(order[0], 1));
        stage.querySelector('.sw-no').addEventListener('click', () => fly(order[0], -1));
        return {
            frame(t, dt) {
                const W = stage.clientWidth;
                for (const el of [...order]) {
                    const s = S.get(el);
                    if (s.mode === 'fly') {
                        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 1400 * dt; s.r += s.vr * dt;
                        if (Math.abs(s.x) > W * 0.9) { order.push(order.shift()); Object.assign(s, { x: 0, y: 0, r: 0, mode: 'rest', vd: order.length, op: 0 }); }
                    } else if (s.mode === 'spring') {
                        s.x += -s.x * 0.2; s.y += -s.y * 0.2;
                        if (Math.abs(s.x) < 0.5 && Math.abs(s.y) < 0.5) { s.x = s.y = 0; s.mode = 'rest'; }
                    }
                    if (s.mode !== 'fly') s.r = s.x * 0.08;
                }
                order.forEach((el, i) => {
                    const s = S.get(el);
                    s.vd += (i - s.vd) * 0.14;
                    s.op += ((i > 3 ? 0 : 1) - s.op) * 0.14;
                    const d = Math.min(s.vd, 3.4);
                    el.style.zIndex = String(100 - i);
                    el.style.transform = `translate(${s.x.toFixed(1)}px, ${(s.y + d * 13).toFixed(1)}px) rotate(${s.r.toFixed(2)}deg) scale(${(1 - d * 0.05).toFixed(3)})`;
                    el.style.opacity = s.op.toFixed(2);
                    el.children[2].style.opacity = clamp(s.x / 100, 0, 1).toFixed(2);
                    el.children[3].style.opacity = clamp(-s.x / 100, 0, 1).toFixed(2);
                });
            },
        };
    }

    // 05 ─ Gooey tab bar
    function tabbar(stage) {
        stage.classList.add('lab-center', 'lab-bg-violet');
        const ICONS = [['fa-house', 'Home'], ['fa-magnifying-glass', 'Search'], ['fa-gamepad', 'Play'], ['fa-heart', 'Saved'], ['fa-user', 'Profile']];
        stage.insertAdjacentHTML('beforeend', `<p class="tb-title">Home</p><div class="tb"><div class="tb-goo"><div class="tb-bar"></div><div class="tb-blob"></div></div>
            <div class="tb-icons">${ICONS.map(([ic, l], i) => `<button class="tb-item${i === 0 ? ' on' : ''}" data-i="${i}" aria-label="${l}" data-sfx="tick"><i class="fas ${ic}"></i><span>${l}</span></button>`).join('')}</div></div>`);
        const bar = stage.querySelector('.tb'), blob = stage.querySelector('.tb-blob'), title = stage.querySelector('.tb-title');
        const items = [...stage.querySelectorAll('.tb-item')];
        let idx = 0, x = 0, v = 0, target = 0, ready = false;
        const measure = () => { const slot = bar.clientWidth / ICONS.length; target = slot * idx + slot / 2; if (!ready) { x = target; ready = true; } };
        new ResizeObserver(() => { ready = false; measure(); }).observe(bar);
        items.forEach((b) => b.addEventListener('click', () => {
            idx = +b.dataset.i; measure();
            items.forEach((it, i) => it.classList.toggle('on', i === idx));
            title.textContent = ICONS[idx][1];
            title.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: 'cubic-bezier(.22,1,.36,1)' });
        }));
        return {
            frame(t, dt) {
                const a = 240 * (target - x) - 20 * v; v += a * dt; x += v * dt;
                const st = Math.min(0.55, Math.abs(v) / 1500);
                blob.style.transform = `translate(${(x - 29).toFixed(1)}px, ${(-20 + st * 18).toFixed(1)}px) scale(${(1 + st).toFixed(3)}, ${(1 - st * 0.45).toFixed(3)})`;
            },
        };
    }

    // 06 ─ Day / night toggle
    function daynight(stage) {
        stage.classList.add('dn-stage');
        let stars = '', mini = '';
        for (let i = 0; i < 26; i++) stars += `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 60).toFixed(1)}%;--d:${(Math.random() * 2.4).toFixed(2)}s"></i>`;
        for (let i = 0; i < 9; i++) mini += `<b style="left:${(10 + Math.random() * 45).toFixed(1)}%;top:${(15 + Math.random() * 70).toFixed(1)}%"></b>`;
        stage.insertAdjacentHTML('beforeend', `<div class="dn-stars">${stars}</div><div class="dn-orb"></div><div class="dn-hills"></div>
            <button class="dn-toggle" aria-label="Switch to night" data-sfx="toggle"><span class="dn-mini">${mini}</span><span class="dn-clouds"><i></i><i></i><i></i></span><span class="dn-knob"><i></i><i></i><i></i></span></button>
            <p class="dn-label">DAY</p>`);
        const btn = stage.querySelector('.dn-toggle'), label = stage.querySelector('.dn-label');
        btn.addEventListener('click', () => {
            const night = stage.classList.toggle('night');
            label.textContent = night ? 'NIGHT' : 'DAY';
            btn.setAttribute('aria-label', night ? 'Switch to day' : 'Switch to night');
        });
        return {};
    }

    // 07 ─ Water ripples (2D wave equation over an image)
    function ripples(stage) {
        stage.style.touchAction = 'pan-y'; stage.style.cursor = 'crosshair'; stage.style.background = '#05060c';
        const cv = canvas(stage, 1);
        const GW = 240, GH = 135;
        let cur = new Float32Array(GW * GH), prev = new Float32Array(GW * GH);
        const small = document.createElement('canvas'); small.width = GW; small.height = GH;
        const sctx = small.getContext('2d'); const out = sctx.createImageData(GW, GH);
        let src = null;
        const img = new Image(); img.decoding = 'async'; img.src = 'assets/img/earthfall-banner-800.webp';
        img.onload = () => {
            const t = document.createElement('canvas'); t.width = GW; t.height = GH;
            const tc = t.getContext('2d'); const r = Math.max(GW / img.width, GH / img.height);
            tc.drawImage(img, (GW - img.width * r) / 2, (GH - img.height * r) / 2, img.width * r, img.height * r);
            src = tc.getImageData(0, 0, GW, GH).data;
        };
        const drop = (gx, gy, r, s) => {
            for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
                const X = gx + x, Y = gy + y; if (X < 1 || Y < 1 || X >= GW - 1 || Y >= GH - 1) continue;
                const d = Math.sqrt(x * x + y * y); if (d <= r) cur[Y * GW + X] += s * (1 - d / r);
            }
        };
        const toGrid = (e) => { const p = pt(e, stage); return [((p.x / cv.w) * GW) | 0, ((p.y / cv.h) * GH) | 0]; };
        stage.addEventListener('pointermove', (e) => { const [x, y] = toGrid(e); drop(x, y, 2, 160); });
        stage.addEventListener('pointerdown', (e) => { const [x, y] = toGrid(e); drop(x, y, 6, 900); SFX('drop'); });
        let rain = 0;
        return {
            frame(t, dt) {
                rain -= dt; if (rain <= 0) { rain = 0.7 + Math.random() * 0.9; drop((Math.random() * GW) | 0, (Math.random() * GH) | 0, 3, 420); }
                for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
                    const i = y * GW + x;
                    prev[i] = ((cur[i - 1] + cur[i + 1] + cur[i - GW] + cur[i + GW]) * 0.5 - prev[i]) * 0.972;
                }
                const tmp = cur; cur = prev; prev = tmp;
                if (!src) return;
                const o = out.data;
                for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
                    const i = y * GW + x, k = i * 4;
                    let dx = 0, dy = 0;
                    if (x > 0 && x < GW - 1 && y > 0 && y < GH - 1) { dx = cur[i - 1] - cur[i + 1]; dy = cur[i - GW] - cur[i + GW]; }
                    const sx = clamp(x + ((dx * 0.025) | 0), 0, GW - 1), sy = clamp(y + ((dy * 0.025) | 0), 0, GH - 1);
                    const si = (sy * GW + sx) * 4, sh = dx * 0.18;
                    o[k] = src[si] + sh; o[k + 1] = src[si + 1] + sh; o[k + 2] = src[si + 2] + sh; o[k + 3] = 255;
                }
                sctx.putImageData(out, 0, 0);
                cv.ctx.imageSmoothingEnabled = true;
                cv.ctx.drawImage(small, 0, 0, cv.w, cv.h);
            },
        };
    }

    // 08 ─ Burst like button + odometer
    function like(stage) {
        stage.classList.add('lab-center', 'lab-bg-deep');
        stage.insertAdjacentHTML('beforeend', '<div class="lk"><button class="lk-btn" aria-label="Like" aria-pressed="false" data-sfx="none"><i class="fas fa-heart"></i><span class="lk-ring"></span></button><div class="lk-count" aria-live="polite"></div><p class="lk-sub">LIKES</p></div>');
        const btn = stage.querySelector('.lk-btn'), cnt = stage.querySelector('.lk-count'), ring = stage.querySelector('.lk-ring');
        let n = 1284, liked = false, shape = '';
        const COLORS = ['#ff3d71', '#c63aeb', '#facc15', '#60a5fa', '#4ade80'];
        function render() {
            const s = n.toLocaleString('en-US'), sh = s.replace(/\d/g, '0');
            if (sh !== shape) {
                shape = sh;
                cnt.innerHTML = [...s].map((ch) => (/\d/.test(ch) ? `<span class="od"><span class="od-col">${[...'0123456789'].map((d) => `<span>${d}</span>`).join('')}</span></span>` : `<span>${ch}</span>`)).join('');
                cnt.offsetWidth; // set start positions before animating
            }
            const cols = cnt.querySelectorAll('.od-col'); let j = 0;
            [...s].forEach((ch) => { if (/\d/.test(ch)) cols[j++].style.transform = `translateY(-${+ch * 10}%)`; });
        }
        render();
        btn.addEventListener('click', () => {
            liked = !liked; n += liked ? 1 : -1;
            btn.classList.toggle('on', liked); btn.setAttribute('aria-pressed', String(liked));
            btn.animate([{ transform: 'scale(1)' }, { transform: 'scale(.72)' }, { transform: 'scale(1.28)' }, { transform: 'scale(1)' }], { duration: 650, easing: 'cubic-bezier(.17,.89,.32,1.49)' });
            if (liked) {
                SFX('pop');
                ring.animate([{ transform: 'scale(.6)', opacity: 1, borderWidth: '8px' }, { transform: 'scale(2.1)', opacity: 0, borderWidth: '1px' }], { duration: 600, easing: 'ease-out' });
                for (let i = 0; i < 16; i++) {
                    const p = document.createElement('span'); p.className = 'lk-p'; p.style.background = COLORS[i % COLORS.length];
                    btn.appendChild(p);
                    const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3, d = 60 + Math.random() * 40;
                    p.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(0)`, opacity: 0 }], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.1,.8,.3,1)' }).onfinish = () => p.remove();
                }
            } else SFX('tick');
            render();
        });
        return {};
    }

    // 09 ─ Cyber glitch decoder
    function glitch(stage) {
        stage.classList.add('cy-stage');
        stage.insertAdjacentHTML('beforeend', `<div class="cy-term"><div class="cy-head"><i></i><i></i><i></i><span>gojo@studio:~$ ./decrypt --target=portfolio</span></div>
            <div class="cy-body"><p class="cy-text" data-text="ACCESS GRANTED">ACCESS GRANTED</p><div class="cy-bar"><span></span></div><pre class="cy-hex"></pre></div>
            <button class="cy-btn" data-sfx="glitch">DECRYPT <i class="fas fa-terminal ml-1"></i></button></div><div class="cy-scan"></div>`);
        const text = stage.querySelector('.cy-text'), bar = stage.querySelector('.cy-bar span'), hex = stage.querySelector('.cy-hex');
        const PHRASES = ['ACCESS GRANTED', 'WELCOME, PLAYER ONE', 'UX / UI DESIGNER', 'GAME DEVELOPER', 'EARTHFALL ONLINE', 'SYSTEM REBOOTED'];
        const CH = '!-_/[]{}=+*^?#%$01ABCDEF';
        let pi = 0, queue = null, frameN = 0, hexT = 0, acc = 0;
        function decode(to) {
            const from = text.textContent, len = Math.max(from.length, to.length);
            queue = [];
            for (let i = 0; i < len; i++) { const s = (Math.random() * 14) | 0; queue.push({ from: from[i] || '', to: to[i] || '', s, e: s + 8 + ((Math.random() * 20) | 0), ch: '' }); }
            frameN = 0; text.dataset.text = to; stage.classList.add('cy-hot');
        }
        stage.querySelector('.cy-btn').addEventListener('click', () => { pi = (pi + 1) % PHRASES.length; decode(PHRASES[pi]); });
        return {
            frame(t, dt) {
                acc += dt;
                if (queue && acc >= 1 / 40) {
                    acc = 0;
                    let html = '', done = 0;
                    for (const q of queue) {
                        if (frameN >= q.e) { done++; html += q.to; }
                        else if (frameN >= q.s) { if (!q.ch || Math.random() < 0.3) q.ch = CH[(Math.random() * CH.length) | 0]; html += `<span class="cy-dud">${q.ch}</span>`; }
                        else html += q.from;
                    }
                    text.innerHTML = html; bar.style.width = `${(done / queue.length) * 100}%`; frameN++;
                    if (done === queue.length) { queue = null; stage.classList.remove('cy-hot'); }
                }
                hexT -= dt;
                if (hexT <= 0) { hexT = 0.1; hex.textContent = Array.from({ length: 5 }, () => Array.from({ length: 10 }, () => ((Math.random() * 256) | 0).toString(16).padStart(2, '0')).join(' ')).join('\n'); }
            },
        };
    }

    // 10 ─ 3D coverflow
    function coverflow(stage) {
        stage.classList.add('lab-bg-deep'); stage.style.touchAction = 'pan-y';
        const ITEMS = [['assets/img/earthfall-banner-800.webp', 'EARTHFALL'], ['assets/img/stickempire-banner-800.webp', 'Stick Empire 3D'], ['assets/img/game-fighting-800.webp', 'Fighting HUD'], ['assets/img/desk-mainmenu-800.webp', 'Game Launcher'], ['assets/img/game-car-menu-800.webp', 'Car Select'], ['assets/img/desk-vinland-800.webp', 'Vinland Saga'], ['assets/img/game-loadout-800.webp', 'Loadout']];
        stage.insertAdjacentHTML('beforeend', `<div class="cf-view"><div class="cf-track">${ITEMS.map(([img, t], i) => `<button class="cf-item" data-i="${i}" aria-label="${t}" data-sfx="tick"><img src="${img}" alt="" draggable="false" loading="lazy"></button>`).join('')}</div></div><p class="cf-cap"></p>`);
        const view = stage.querySelector('.cf-view'), els = [...stage.querySelectorAll('.cf-item')], cap = stage.querySelector('.cf-cap');
        let pos = 3, target = 3, vel = 0, drag = null, last = -1, settled = false, lastW = 0;
        const spacing = () => Math.min(stage.classList.contains('is-focus') ? 360 : 170, stage.clientWidth * 0.3);
        view.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, p: pos, lx: e.clientX, lt: performance.now(), v: 0, moved: false }; });
        view.addEventListener('pointermove', (e) => {
            if (!drag) return;
            const dx = e.clientX - drag.x;
            if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; view.setPointerCapture(e.pointerId); }
            if (!drag.moved) return;
            pos = target = clamp(drag.p - dx / spacing(), -0.4, ITEMS.length - 0.6);
            const now = performance.now(); drag.v = (e.clientX - drag.lx) / Math.max(1, now - drag.lt); drag.lx = e.clientX; drag.lt = now;
        });
        view.addEventListener('pointerup', (e) => {
            if (!drag) return;
            if (drag.moved) { target = clamp(Math.round(pos - drag.v * 6), 0, ITEMS.length - 1); vel = 0; SFX('swipe'); }
            else { const b = e.target.closest('.cf-item'); if (b) target = +b.dataset.i; }
            drag = null;
        });
        stage.tabIndex = 0;
        stage.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') { target = Math.max(0, Math.round(target) - 1); e.preventDefault(); }
            if (e.key === 'ArrowRight') { target = Math.min(ITEMS.length - 1, Math.round(target) + 1); e.preventDefault(); }
        });
        return {
            frame(t, dt) {
                if (!drag || !drag.moved) { const a = 140 * (target - pos) - 18 * vel; vel += a * dt; pos += vel * dt; }
                // at rest: nothing changes, so skip all style writes (keeps the GPU idle)
                const atRest = !drag && Math.abs(target - pos) < 0.001 && Math.abs(vel) < 0.001 && stage.clientWidth === lastW;
                if (atRest && settled) return;
                settled = atRest; lastW = stage.clientWidth;
                const sp = spacing();
                els.forEach((el, i) => {
                    const off = i - pos, ao = Math.abs(off);
                    const k = ao < 1 ? ao * sp * 0.62 : sp * 0.62 + (ao - 1) * sp * 0.3;
                    const rot = clamp(off, -1, 1) * -55;
                    el.style.transform = `translateX(${(Math.sign(off) * k).toFixed(1)}px) translateZ(${(-ao * 150).toFixed(1)}px) rotateY(${rot.toFixed(1)}deg) scale(${ao < 0.5 ? (1 + (0.5 - ao) * 0.18).toFixed(3) : 1})`;
                    el.style.zIndex = String(100 - Math.round(ao * 10));
                    el.style.opacity = ao > 3.6 ? '0' : (1 - ao * 0.1).toFixed(2);
                    el.style.setProperty('--dim', Math.min(0.6, ao * 0.22).toFixed(2));
                });
                const idx = clamp(Math.round(pos), 0, ITEMS.length - 1);
                if (idx !== last) { last = idx; cap.textContent = ITEMS[idx][1]; cap.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 350 }); }
            },
        };
    }

    // 11 ─ Hyperspace warp (hold to accelerate, synth engine hum)
    function warp(stage) {
        stage.classList.add('wp-stage');
        const cv = canvas(stage, 1.5);
        stage.insertAdjacentHTML('beforeend', '<div class="wp-hud"><span class="wp-l">WARP FACTOR</span><b class="wp-v">0.3</b><div class="wp-bar"><span></span></div><span class="wp-h">HOLD TO JUMP</span></div><div class="wp-flash"></div>');
        const stars = Array.from({ length: 420 }, () => reset({}, true));
        function reset(s, init) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = init ? Math.random() : 1; s.pz = s.z; return s; }
        let speed = 0.08, target = 0.08, holding = false, eng = null;
        const vEl = stage.querySelector('.wp-v'), bar = stage.querySelector('.wp-bar span'), flash = stage.querySelector('.wp-flash');
        const engine = (on) => {
            const c = window.SFX?.enabled ? window.SFX.ctx() : null;
            if (on && c && !eng) {
                const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
                o.type = 'sawtooth'; o.frequency.value = 45; f.type = 'lowpass'; f.frequency.value = 300; g.gain.value = 0.0001;
                o.connect(f).connect(g).connect(window.SFX.out()); o.start();
                g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 0.3);
                eng = { o, f, g, c };
            } else if (!on && eng) {
                const { o, g, c: ac } = eng; g.gain.cancelScheduledValues(ac.currentTime);
                g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), ac.currentTime);
                g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.6); o.stop(ac.currentTime + 0.65); eng = null;
            }
        };
        const down = () => { holding = true; target = 2.4; SFX('whoosh'); engine(true); };
        const up = () => { if (!holding) return; holding = false; target = 0.08; engine(false); };
        stage.addEventListener('pointerdown', down);
        ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => stage.addEventListener(ev, up));
        return {
            frame(t, dt) {
                speed += (target - speed) * (holding ? 0.022 : 0.05);
                if (eng) { eng.o.frequency.value = 45 + speed * 55; eng.f.frequency.value = 260 + speed * 900; }
                const ctx = cv.ctx, w = cv.w, h = cv.h, cx = w / 2, cy = h / 2, f = Math.max(w, h) * 0.5;
                const k = Math.min(1, speed / 2.4);
                ctx.fillStyle = `rgba(2,4,12,${(0.75 - k * 0.5).toFixed(2)})`; ctx.fillRect(0, 0, w, h);
                ctx.lineCap = 'round';
                for (const s of stars) {
                    s.pz = s.z; s.z -= speed * dt * 0.6;
                    if (s.z <= 0.02) { reset(s); continue; }
                    const sx = cx + (s.x / s.z) * f * 0.5, sy = cy + (s.y / s.z) * f * 0.5;
                    if (sx < 0 || sx > w || sy < 0 || sy > h) { reset(s); continue; }
                    const px = cx + (s.x / s.pz) * f * 0.5, py = cy + (s.y / s.pz) * f * 0.5, b = 1 - s.z;
                    ctx.strokeStyle = `rgba(${(210 - k * 90) | 0},${(215 + k * 30) | 0},255,${Math.min(1, b * 1.5).toFixed(2)})`;
                    ctx.lineWidth = Math.max(0.6, b * 2.6);
                    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
                }
                vEl.textContent = (speed * 4).toFixed(1);
                bar.style.width = `${k * 100}%`;
                flash.style.opacity = k > 0.9 ? ((k - 0.9) * 5).toFixed(2) : '0';
            },
            stop() { up(); },
        };
    }

    // 12 ─ Radial gooey menu
    function radial(stage) {
        stage.classList.add('lab-center', 'lab-bg-violet');
        const IT = [['fa-camera', 'Camera'], ['fa-image', 'Gallery'], ['fa-music', 'Music'], ['fa-location-dot', 'Location'], ['fa-heart', 'Favorite'], ['fa-share-nodes', 'Share']];
        stage.insertAdjacentHTML('beforeend', `<div class="rm"><div class="rm-goo">${IT.map(() => '<span class="rm-b"></span>').join('')}<span class="rm-main-b"></span></div>
            ${IT.map(([ic, l], i) => `<button class="rm-i" data-i="${i}" aria-label="${l}" data-sfx="pop"><i class="fas ${ic}"></i></button>`).join('')}
            <button class="rm-main" aria-label="Open menu" aria-expanded="false" data-sfx="whoosh"><i class="fas fa-plus"></i></button><p class="rm-toast"></p></div>`);
        const rm = stage.querySelector('.rm'), blobs = [...stage.querySelectorAll('.rm-b')], icons = [...stage.querySelectorAll('.rm-i')], main = stage.querySelector('.rm-main'), toast = stage.querySelector('.rm-toast');
        const place = (open) => {
            rm.classList.toggle('open', open); main.setAttribute('aria-expanded', String(open));
            IT.forEach((_, i) => {
                const a = -Math.PI / 2 + (i * Math.PI * 2) / IT.length, R = 96;
                const x = open ? Math.cos(a) * R : 0, y = open ? Math.sin(a) * R : 0, d = (open ? i : IT.length - 1 - i) * 45;
                [blobs[i], icons[i]].forEach((el) => { el.style.transitionDelay = `${d}ms`; el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${open ? 1 : 0.4})`; });
            });
        };
        main.addEventListener('click', () => place(!rm.classList.contains('open')));
        icons.forEach((b) => b.addEventListener('click', () => {
            toast.textContent = IT[+b.dataset.i][1];
            toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
            place(false);
        }));
        place(false);
        return {};
    }

    // 13 ─ Dynamic Island
    function island(stage) {
        stage.classList.add('di-stage');
        stage.insertAdjacentHTML('beforeend', `
            <div class="di-phone"><div class="di-wall" title="Tap to collapse"><span class="di-time">9:41</span><span class="di-date">Gojo OS · Lock screen</span></div>
                <div class="di-pill" data-state="idle">
                    <div class="di-c di-call"><img src="assets/img/stickempire-icon-256.webp" alt=""><div><b>Gojo Studio</b><span>incoming call…</span></div><button class="di-dec" aria-label="Decline" data-sfx="tick"><i class="fas fa-phone-slash"></i></button><button class="di-acc" aria-label="Accept" data-sfx="success"><i class="fas fa-phone"></i></button></div>
                    <div class="di-c di-music"><div class="di-row"><img src="assets/img/earthfall-icon.webp" alt=""><div class="min-w-0"><b>Noble Order</b><span>Stick Empire 3D · Soundtrack</span></div><div class="di-wave"><i></i><i></i><i></i><i></i><i></i></div></div><div class="di-prog"><span></span></div><div class="di-ctrl"><i class="fas fa-backward-step"></i><i class="fas fa-pause"></i><i class="fas fa-forward-step"></i></div></div>
                    <div class="di-c di-timer"><i class="fas fa-stopwatch"></i><b class="di-tm">05:00</b></div>
                    <div class="di-c di-face"><svg class="di-fid" viewBox="0 0 60 60"><path d="M6 18V10a4 4 0 0 1 4-4h8M42 6h8a4 4 0 0 1 4 4v8M54 42v8a4 4 0 0 1-4 4h-8M18 54h-8a4 4 0 0 1-4-4v-8M20 22v5M40 22v5M30 22v13h-3M22 41c4 4 12 4 16 0"/></svg><svg class="di-ok" viewBox="0 0 52 52"><path d="M14 27 l8 8 l16 -18"/></svg></div>
                </div></div>
            <div class="di-btns">${[['call', 'fa-phone', 'Call'], ['music', 'fa-music', 'Music'], ['timer', 'fa-stopwatch', 'Timer'], ['face', 'fa-face-smile', 'Face ID']].map(([s, ic, l]) => `<button data-s="${s}" data-sfx="tick"><i class="fas ${ic}"></i>${l}</button>`).join('')}</div>`);
        const pill = stage.querySelector('.di-pill'), btns = [...stage.querySelectorAll('.di-btns button')], face = stage.querySelector('.di-face'), tm = stage.querySelector('.di-tm');
        let secs = 300, faceT = null;
        const set = (s) => {
            pill.dataset.state = s;
            btns.forEach((b) => b.classList.toggle('on', b.dataset.s === s));
            clearTimeout(faceT); face.classList.remove('ok'); stage.querySelector('.di-fid').classList.remove('di-scan');
            if (s === 'face') {
                stage.querySelector('.di-fid').classList.add('di-scan');
                faceT = setTimeout(() => { face.classList.add('ok'); SFX('success'); faceT = setTimeout(() => set('idle'), 1100); }, 1500);
            }
            if (s === 'timer') secs = 300;
        };
        btns.forEach((b) => b.addEventListener('click', () => set(pill.dataset.state === b.dataset.s ? 'idle' : b.dataset.s)));
        stage.querySelector('.di-wall').addEventListener('click', () => set('idle'));
        stage.querySelectorAll('.di-call button').forEach((b) => b.addEventListener('click', () => set('idle')));
        let acc = 0;
        return {
            frame(t, dt) {
                if (pill.dataset.state !== 'timer') return;
                acc += dt; if (acc < 1) return; acc = 0;
                secs = Math.max(0, secs - 1);
                tm.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
            },
        };
    }

    // 14 ─ WebGL plasma orb (real GLSL fragment shader)
    function plasma(stage) {
        stage.style.background = '#05040a'; stage.style.cursor = 'crosshair';
        const c = document.createElement('canvas'); c.className = 'absolute inset-0 w-full h-full'; stage.prepend(c);
        const gl = c.getContext('webgl', { antialias: false, premultipliedAlpha: false });
        if (!gl) { stage.insertAdjacentHTML('beforeend', '<p class="lab-err">WebGL is not available in this browser.</p>'); return {}; }
        const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
        const fs = `precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;uniform float pulse;
            float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
            float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
            float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
            void main(){vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;vec2 mm=(m-.5*r)/r.y;
              vec2 b1=vec2(sin(t*.7)*.38,cos(t*.5)*.24),b2=vec2(cos(t*.43)*.42,sin(t*.61)*.3);
              float f=.085/length(uv-b1)+.07/length(uv-b2)+.11/length(uv-mm);
              float nz=fbm(uv*3.2+vec2(t*.16,-t*.11)+f*.25);
              float d=f+nz*.65;
              vec3 c1=vec3(.78,.23,.92),c2=vec3(.23,.51,.97),c3=vec3(.98,.47,.72);
              vec3 col=mix(c2,c1,smoothstep(.7,1.5,d));col=mix(col,c3,smoothstep(1.6,2.6,d));
              float edge=smoothstep(1.02,1.14,d);
              vec3 bg=vec3(.02,.02,.05)+.06*fbm(uv*2.-t*.05)*vec3(.6,.3,1.);
              float ring=pulse>0.?smoothstep(.025,0.,abs(length(uv-mm)-pulse))*(1.-pulse/1.6):0.;
              vec3 o=mix(bg,col*(.55+.7*nz),edge)+col*.22*smoothstep(.6,1.05,d)+vec3(.85,.65,1.)*ring;
              gl_FragColor=vec4(o,1.);}`;
        const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
        const prog = gl.createProgram();
        gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.useProgram(prog);
        const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const U = { r: gl.getUniformLocation(prog, 'r'), t: gl.getUniformLocation(prog, 't'), m: gl.getUniformLocation(prog, 'm'), pulse: gl.getUniformLocation(prog, 'pulse') };
        const SCALE = 0.6;
        const fit = () => { const r = stage.getBoundingClientRect(); c.width = Math.max(1, Math.round(r.width * SCALE)); c.height = Math.max(1, Math.round(r.height * SCALE)); gl.viewport(0, 0, c.width, c.height); };
        new ResizeObserver(fit).observe(stage); fit();
        let mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5, over = false, pulse = 0;
        stage.addEventListener('pointermove', (e) => { const p = pt(e, stage); tmx = p.x / stage.clientWidth; tmy = 1 - p.y / stage.clientHeight; over = true; });
        stage.addEventListener('pointerleave', () => { over = false; });
        stage.addEventListener('pointerdown', () => { pulse = 0.001; SFX('drop'); });
        return {
            frame(t, dt) {
                if (!over) { tmx = 0.5 + Math.sin(t * 0.5) * 0.25; tmy = 0.5 + Math.cos(t * 0.7) * 0.2; }
                mx += (tmx - mx) * 0.08; my += (tmy - my) * 0.08;
                if (pulse > 0) { pulse += dt * 1.6; if (pulse > 1.6) pulse = 0; }
                gl.uniform2f(U.r, c.width, c.height); gl.uniform1f(U.t, t); gl.uniform2f(U.m, mx * c.width, my * c.height); gl.uniform1f(U.pulse, pulse);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            },
        };
    }

    // 15 ─ Beat lab: step sequencer + radial audio visualizer (Web Audio)
    function beats(stage) {
        stage.classList.add('bt-stage');
        const cv = canvas(stage, 2);
        const ROWS = [['Kick', '#c63aeb'], ['Clap', '#60a5fa'], ['Hat', '#facc15']];
        const pattern = [[1, 0, 0, 0, 1, 0, 1, 0], [0, 0, 1, 0, 0, 0, 1, 0], [1, 1, 1, 1, 1, 1, 1, 1]];
        stage.insertAdjacentHTML('beforeend', `<span class="bt-bpm">112 BPM</span><div class="bt-ui"><button class="bt-play" aria-label="Play beat" data-sfx="none"><i class="fas fa-play"></i></button>
            <div class="bt-grid">${ROWS.map(([l, col], r) => `<em>${l}</em>${pattern[r].map((on, s) => `<button class="bt-step${on ? ' on' : ''}" style="--c:${col}" data-r="${r}" data-s="${s}" aria-label="${l} step ${s + 1}" aria-pressed="${!!on}" data-sfx="none"></button>`).join('')}`).join('')}</div></div>`);
        const playBtn = stage.querySelector('.bt-play'), steps = [...stage.querySelectorAll('.bt-step')];
        steps.forEach((b) => b.addEventListener('click', () => { const r = +b.dataset.r, s = +b.dataset.s; pattern[r][s] ^= 1; b.classList.toggle('on', !!pattern[r][s]); b.setAttribute('aria-pressed', String(!!pattern[r][s])); }));
        let playing = false, step = 0, next = 0, timer = 0, bus = null, an = null, data = null, nbuf = null, current = -1;
        const queue = [];
        const SPB = 60 / 112 / 2;
        const audio = () => {
            const c = window.SFX?.ctx(); if (!c) return null;
            if (!bus) {
                bus = c.createGain(); bus.gain.value = 0.85; an = c.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.75;
                bus.connect(an); an.connect(window.SFX.out()); data = new Uint8Array(an.frequencyBinCount);
                nbuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            }
            return c;
        };
        const kick = (c, t) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.35); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45); o.connect(g).connect(bus); o.start(t); o.stop(t + 0.5); };
        const noise = (c, t, type, freq, dur, vol) => { const s = c.createBufferSource(); s.buffer = nbuf; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f).connect(g).connect(bus); s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.02); };
        const clap = (c, t) => { [0, 0.012, 0.024].forEach((o) => noise(c, t + o, 'bandpass', 1500, 0.16, 0.45)); };
        const hat = (c, t) => noise(c, t, 'highpass', 7500, 0.045, 0.22);
        const sched = () => {
            const c = audio(); if (!c) return;
            while (next < c.currentTime + 0.12) {
                if (pattern[0][step]) kick(c, next); if (pattern[1][step]) clap(c, next); if (pattern[2][step]) hat(c, next);
                queue.push({ step, time: next }); next += SPB; step = (step + 1) % 8;
            }
        };
        const start = () => {
            if (!window.SFX?.enabled) window.SFX?.setEnabled(true);
            const c = audio(); if (!c) return;
            c.resume(); playing = true; step = 0; next = c.currentTime + 0.06; queue.length = 0;
            timer = setInterval(sched, 25); sched();
            playBtn.innerHTML = '<i class="fas fa-stop"></i>'; playBtn.setAttribute('aria-label', 'Stop beat');
        };
        const stop = () => {
            playing = false; clearInterval(timer); current = -1;
            steps.forEach((b) => b.classList.remove('now'));
            playBtn.innerHTML = '<i class="fas fa-play"></i>'; playBtn.setAttribute('aria-label', 'Play beat');
        };
        playBtn.addEventListener('click', () => (playing ? stop() : start()));
        return {
            frame(t) {
                const ctx = cv.ctx, w = cv.w, h = cv.h; ctx.clearRect(0, 0, w, h);
                const c = window.SFX?.ctx && bus ? window.SFX.ctx() : null;
                if (playing && c) {
                    while (queue.length && queue[0].time <= c.currentTime) current = queue.shift().step;
                    steps.forEach((b) => b.classList.toggle('now', +b.dataset.s === current));
                }
                if (an && playing) an.getByteFrequencyData(data);
                const cx = w / 2, cy = h * 0.4, base = Math.min(w, h) * 0.16, N = 64;
                ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.15);
                for (let i = 0; i < N; i++) {
                    const v = an && playing ? data[(i * 1.6) | 0] / 255 : 0.12 + 0.08 * Math.sin(t * 2 + i * 0.4);
                    const len = 6 + v * base * 1.4, a = (i / N) * Math.PI * 2;
                    ctx.strokeStyle = `hsl(${280 - v * 120 + i},90%,${55 + v * 20}%)`; ctx.lineWidth = 3; ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(Math.cos(a) * base, Math.sin(a) * base); ctx.lineTo(Math.cos(a) * (base + len), Math.sin(a) * (base + len)); ctx.stroke();
                }
                ctx.restore();
                const lvl = an && playing ? data[2] / 255 : 0.15;
                const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * (0.9 + lvl * 0.5));
                g.addColorStop(0, `rgba(198,58,235,${0.35 + lvl * 0.5})`); g.addColorStop(1, 'rgba(198,58,235,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, base * (0.9 + lvl * 0.5), 0, Math.PI * 2); ctx.fill();
            },
            stop,
        };
    }

    // 16 ─ Game HUD: health, damage, crits, heal, shield
    function hud(stage) {
        stage.classList.add('hud-stage');
        stage.insertAdjacentHTML('beforeend', `<div class="hud-world"><img class="hud-bg" src="assets/img/game-background.webp" alt="" draggable="false"><div class="hud-bubble"></div><div class="hud-vig"></div>
            <div class="hud-top"><img src="assets/img/earthfall-icon.webp" alt="" class="hud-pt"><div class="hud-bars"><div class="hud-name"><b>TRIPOD MK-II</b><span>LV 12</span></div>
                <div class="hud-hp"><span class="ghost"></span><span class="fill"></span><em>1000 / 1000</em></div><div class="hud-sh"><span class="fill" style="width:0"></span></div></div></div>
            <div class="hud-fx"></div><div class="hud-ko">K.O.</div></div>
            <div class="hud-btns"><button data-a="hit" data-sfx="none"><i class="fas fa-hand-fist"></i>Hit</button><button data-a="crit" data-sfx="none"><i class="fas fa-burst"></i>Crit</button><button data-a="heal" data-sfx="none"><i class="fas fa-heart-pulse"></i>Heal</button><button data-a="shield" data-sfx="none"><i class="fas fa-shield-halved"></i>Shield</button></div>`);
        const world = stage.querySelector('.hud-world'), fill = stage.querySelector('.hud-hp .fill'), ghostEl = stage.querySelector('.hud-hp .ghost'), txt = stage.querySelector('.hud-hp em');
        const shFill = stage.querySelector('.hud-sh .fill'), fx = stage.querySelector('.hud-fx'), vig = stage.querySelector('.hud-vig'), ko = stage.querySelector('.hud-ko');
        const MAX = 1000; let hp = MAX, ghost = MAX, delay = 0, shield = 0, dead = false;
        const float = (s, cls) => {
            const el = document.createElement('span'); el.className = `hud-float ${cls}`; el.textContent = s;
            el.style.left = `${35 + Math.random() * 30}%`; el.style.top = `${42 + Math.random() * 16}%`;
            fx.appendChild(el); setTimeout(() => el.remove(), 1150);
        };
        const shake = (p) => world.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${-p}px,${p / 2}px)` }, { transform: `translate(${p}px,${-p / 2}px)` }, { transform: `translate(${-p / 2}px,${p}px)` }, { transform: 'translate(0,0)' }], { duration: 320, easing: 'ease-out' });
        const update = () => {
            fill.style.width = `${(hp / MAX) * 100}%`; txt.textContent = `${hp} / ${MAX}`;
            shFill.style.width = `${(shield / 300) * 100}%`;
            stage.classList.toggle('low', hp > 0 && hp / MAX < 0.25);
            stage.classList.toggle('shielded', shield > 0);
        };
        const damage = (crit) => {
            if (dead) return;
            let d = crit ? 220 + ((Math.random() * 80) | 0) : 60 + ((Math.random() * 60) | 0);
            if (shield > 0) { const ab = Math.min(shield, d); shield -= ab; d -= ab; float(`-${ab} ◈`, 'blue'); }
            if (d > 0) { hp = Math.max(0, hp - d); delay = 0.45; float(`${crit ? 'CRIT! ' : ''}-${d}`, crit ? 'crit' : 'red'); }
            shake(crit ? 14 : 6); vig.classList.remove('flash'); void vig.offsetWidth; vig.classList.add('flash');
            SFX(crit ? 'crit' : 'hit');
            if (hp === 0) {
                dead = true; ko.classList.add('on');
                setTimeout(() => { hp = MAX; ghost = MAX; dead = false; ko.classList.remove('on'); SFX('heal'); float('REVIVED', 'green'); update(); }, 1800);
            }
            update();
        };
        const heal = () => {
            if (dead) return;
            const amt = Math.min(MAX - hp, 180); hp += amt; ghost = Math.max(ghost, hp); float(`+${amt}`, 'green'); SFX('heal');
            for (let i = 0; i < 12; i++) {
                const s = document.createElement('span'); s.className = 'hud-spark'; s.style.left = `${40 + Math.random() * 20}%`; s.style.top = '70%';
                fx.appendChild(s);
                s.animate([{ transform: 'translateY(0) scale(1)', opacity: 1 }, { transform: `translate(${(Math.random() - 0.5) * 60}px, ${-80 - Math.random() * 60}px) scale(0)`, opacity: 0 }], { duration: 900 + Math.random() * 400, easing: 'ease-out' }).onfinish = () => s.remove();
            }
            update();
        };
        stage.querySelectorAll('.hud-btns button').forEach((b) => b.addEventListener('click', () => {
            const a = b.dataset.a;
            if (a === 'hit') damage(false); else if (a === 'crit') damage(true); else if (a === 'heal') heal();
            else { shield = 300; SFX('shield'); update(); }
        }));
        update();
        return {
            frame(t, dt) {
                if (delay > 0) delay -= dt; else if (ghost > hp) ghost = Math.max(hp, ghost - MAX * 0.9 * dt);
                if (ghost < hp) ghost = hp;
                ghostEl.style.width = `${(ghost / MAX) * 100}%`;
            },
        };
    }

    // 17 ─ Loot chest reveal
    function loot(stage) {
        stage.classList.add('lt-stage');
        stage.insertAdjacentHTML('beforeend', `<div class="lt-rays"></div><div class="lt-floor"></div>
            <div class="lt-card"><div class="lt-inner"><div class="lt-face lt-back">?</div><div class="lt-face lt-front"><i class="fas fa-star"></i><b></b><span class="lt-rar"></span></div></div></div>
            <button class="lt-chest" aria-label="Open the chest" data-sfx="none"><span class="lt-glow"></span><span class="lt-lid"></span><span class="lt-body"><i class="lt-lock"></i></span></button>
            <p class="lt-hint">Click the chest</p>`);
        const RAR = [['Common', '#a1a1aa', 50], ['Rare', '#60a5fa', 30], ['Epic', '#c084fc', 15], ['Legendary', '#facc15', 5]];
        const ITEMS = [['fa-sun', 'Heat Ray'], ['fa-bolt', 'Sunspear'], ['fa-circle-dot', 'Gravity Bomb'], ['fa-satellite-dish', 'Orbital Mark'], ['fa-meteor', "Wizard's Meteor"], ['fa-skull', "Reaper's Scythe"], ['fa-star', 'Ninja Shuriken'], ['fa-fire', "Hades' Bident"]];
        const chest = stage.querySelector('.lt-chest'), hint = stage.querySelector('.lt-hint'), front = stage.querySelector('.lt-front');
        let state = 'closed';
        const roll = () => { let r = Math.random() * 100; for (const x of RAR) { if ((r -= x[2]) < 0) return x; } return RAR[0]; };
        const open = () => {
            const [name, col] = roll(), [ic, item] = ITEMS[(Math.random() * ITEMS.length) | 0];
            stage.style.setProperty('--rc', col);
            front.querySelector('i').className = `fas ${ic}`; front.querySelector('b').textContent = item; front.querySelector('.lt-rar').textContent = name;
            stage.classList.toggle('lt-legend', name === 'Legendary');
            stage.classList.remove('lt-charge'); stage.classList.add('lt-open');
            SFX(name === 'Legendary' ? 'legendary' : 'open');
            for (let i = 0; i < 26; i++) {
                const p = document.createElement('span'); p.className = 'lt-part'; stage.appendChild(p);
                const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, d = 80 + Math.random() * 120;
                p.animate([{ transform: 'translate(-50%,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(0)`, opacity: 0 }], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.1,.8,.3,1)' }).onfinish = () => p.remove();
            }
            setTimeout(() => { stage.classList.add('lt-flip'); state = 'open'; hint.textContent = `${name.toUpperCase()} · click to close`; }, 950);
        };
        chest.addEventListener('click', () => {
            if (state === 'closed') { state = 'busy'; stage.classList.add('lt-charge'); hint.textContent = '…'; SFX('rumble'); setTimeout(open, 720); }
            else if (state === 'open') { state = 'busy'; stage.classList.remove('lt-open', 'lt-flip'); setTimeout(() => { state = 'closed'; hint.textContent = 'Click the chest'; }, 700); }
        });
        return {};
    }

    // 18 ─ Wireframe X-ray lens
    function xray(stage) {
        stage.classList.add('xr-stage');
        const ui = (wf) => `<div class="xr-ui">
            <div class="xr-img">${wf ? '<span>IMAGE · 16:9</span>' : '<img src="assets/img/stickempire-banner-800.webp" alt="" draggable="false">'}</div>
            <div class="xr-row"><div class="xr-h">${wf ? '<span>H3 · Inter 800 · 15</span>' : 'Stick Empire 3D'}</div><div class="xr-price">${wf ? '<span>PRICE</span>' : 'Free'}</div></div>
            <div class="xr-tags">${wf ? '<i></i><i></i><i></i>' : '<i>Strategy</i><i>Multiplayer</i><i>3D</i>'}</div>
            <div class="xr-p">${wf ? '<i></i><i></i>' : 'Pick the Order or the Chaos Empire and conquer — right in your browser.'}</div>
            <div class="xr-cta">${wf ? '<span>CTA · PRIMARY · 36PX</span>' : '<i class="fas fa-play"></i> Play now'}</div>
            ${wf ? '<em class="xr-note n1">16</em><em class="xr-note n2">24</em><em class="xr-note n3">8-PT GRID</em>' : ''}</div>`;
        stage.insertAdjacentHTML('beforeend', `<div class="xr-layer xr-final">${ui(false)}</div><div class="xr-layer xr-wire">${ui(true)}</div><div class="xr-lens"></div><p class="xr-hint">Move the lens · click to swap</p>`);
        const fin = stage.querySelector('.xr-final'), wire = stage.querySelector('.xr-wire'), lens = stage.querySelector('.xr-lens');
        let x = 0, y = 0, tx = 0, ty = 0, over = false, swapped = false, init = false;
        stage.addEventListener('pointermove', (e) => { const p = pt(e, stage); tx = p.x; ty = p.y; over = true; });
        stage.addEventListener('pointerleave', () => { over = false; });
        stage.addEventListener('click', () => { swapped = !swapped; stage.classList.toggle('swapped', swapped); SFX('swipe'); });
        return {
            frame(t) {
                const w = stage.clientWidth, h = stage.clientHeight;
                if (!over) { tx = w / 2 + Math.sin(t * 0.9) * w * 0.26; ty = h / 2 + Math.cos(t * 0.7) * h * 0.24; }
                if (!init) { x = tx; y = ty; init = true; }
                x += (tx - x) * 0.16; y += (ty - y) * 0.16;
                const r = Math.min(w, h) * 0.22;
                const top = swapped ? fin : wire, bottom = swapped ? wire : fin;
                top.style.clipPath = `circle(${r.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`; bottom.style.clipPath = 'none';
                lens.style.width = lens.style.height = `${(r * 2).toFixed(1)}px`;
                lens.style.transform = `translate(${(x - r).toFixed(1)}px, ${(y - r).toFixed(1)}px)`;
            },
        };
    }

    // 19 ─ Rubber-band slider (spring physics + pluck sound)
    function rubber(stage) {
        stage.classList.add('lab-center', 'lab-bg-deep');
        stage.insertAdjacentHTML('beforeend', `<div class="rs"><i class="fas fa-volume-low rs-ic"></i>
            <svg class="rs-svg"><defs><linearGradient id="rsg" x1="0" x2="1"><stop offset="0" stop-color="#c63aeb"/><stop offset="1" stop-color="#60a5fa"/></linearGradient></defs><path class="rs-bg"/><path class="rs-fg"/></svg>
            <div class="rs-thumb" role="slider" tabindex="0" aria-label="Volume" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></div><div class="rs-val">50</div></div>`);
        const wrap = stage.querySelector('.rs'), fg = stage.querySelector('.rs-fg'), bg = stage.querySelector('.rs-bg'), thumb = stage.querySelector('.rs-thumb'), val = stage.querySelector('.rs-val'), ic = stage.querySelector('.rs-ic');
        let W = 300, H = 180, value = 0.5, ty = 0, vy = 0, drag = false, lastX = 0, tilt = 0;
        const fit = () => { W = wrap.clientWidth; H = wrap.clientHeight; };
        new ResizeObserver(fit).observe(wrap); fit();
        const L = () => 22, Rr = () => W - 22, Y0 = () => H * 0.58;
        const set = (e) => { const p = pt(e, wrap); value = clamp((p.x - L()) / (Rr() - L()), 0, 1); ty = clamp((p.y - Y0()) * 0.7, -75, 75); };
        thumb.addEventListener('pointerdown', (e) => { drag = true; thumb.setPointerCapture(e.pointerId); thumb.style.cursor = 'grabbing'; set(e); });
        thumb.addEventListener('pointermove', (e) => { if (drag) set(e); });
        const release = () => {
            if (!drag) return; drag = false; thumb.style.cursor = '';
            if (Math.abs(ty) > 18 && window.SFX?.enabled) {
                const f = 180 + value * 520;
                window.SFX.tone(f, { type: 'triangle', dur: 0.6, vol: Math.min(0.2, Math.abs(ty) / 400) });
                window.SFX.tone(f * 2, { type: 'sine', dur: 0.4, vol: Math.min(0.06, Math.abs(ty) / 1200) });
            }
        };
        thumb.addEventListener('pointerup', release); thumb.addEventListener('pointercancel', release);
        thumb.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { value = clamp(value + 0.05, 0, 1); ty = -20; e.preventDefault(); }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { value = clamp(value - 0.05, 0, 1); ty = 20; e.preventDefault(); }
        });
        return {
            frame(t, dt) {
                if (!drag) { const a = -260 * ty - 7 * vy; vy += a * dt; ty += vy * dt; }
                const X = L() + value * (Rr() - L()), y0 = Y0(), Y = y0 + ty;
                const sag = ty * 0.22;
                fg.setAttribute('d', `M${L()} ${y0} Q${((L() + X) / 2).toFixed(1)} ${((y0 + Y) / 2 + sag).toFixed(1)} ${X.toFixed(1)} ${Y.toFixed(1)}`);
                bg.setAttribute('d', `M${X.toFixed(1)} ${Y.toFixed(1)} Q${((X + Rr()) / 2).toFixed(1)} ${((y0 + Y) / 2 + sag).toFixed(1)} ${Rr()} ${y0}`);
                thumb.style.transform = `translate(${X.toFixed(1)}px, ${Y.toFixed(1)}px) scale(${drag ? 1.15 : 1})`;
                tilt += (clamp((X - lastX) * 2.5, -25, 25) - tilt) * 0.2; lastX = X;
                const pct = Math.round(value * 100);
                val.textContent = pct;
                val.style.transform = `translate(${(X - val.offsetWidth / 2).toFixed(1)}px, ${(Y - 54).toFixed(1)}px) rotate(${tilt.toFixed(1)}deg) scale(${drag ? 1.1 : 1})`;
                thumb.setAttribute('aria-valuenow', String(pct));
                ic.className = `fas ${pct === 0 ? 'fa-volume-xmark' : pct < 50 ? 'fa-volume-low' : 'fa-volume-high'} rs-ic`;
            },
        };
    }

    // 20 ─ Gravity grid (spacetime well + click shockwaves)
    function gravity(stage) {
        stage.style.touchAction = 'pan-y'; stage.style.background = 'radial-gradient(ellipse at 50% 50%,#120a1f 0%,#040308 75%)';
        const cv = canvas(stage, 2);
        let dots = [], cols = 0, rows = 0, gap = 24;
        const mouse = { x: -9999, y: -9999, on: false }, waves = [];
        const build = () => {
            gap = clamp(cv.w / 20, 18, 34); cols = Math.ceil(cv.w / gap) + 1; rows = Math.ceil(cv.h / gap) + 1; dots = [];
            for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const x = i * gap, y = j * gap; dots.push({ rx: x, ry: y, x, y, vx: 0, vy: 0 }); }
        };
        cv.onresize = build; build();
        stage.addEventListener('pointermove', (e) => { const p = pt(e, stage); mouse.x = p.x; mouse.y = p.y; mouse.on = true; });
        stage.addEventListener('pointerleave', () => { mouse.on = false; });
        stage.addEventListener('pointerdown', (e) => { const p = pt(e, stage); waves.push({ x: p.x, y: p.y, r: 0 }); SFX('drop'); });
        return {
            frame(t, dt) {
                const ctx = cv.ctx, w = cv.w, h = cv.h;
                const mx = mouse.on ? mouse.x : w / 2 + Math.cos(t * 0.6) * w * 0.28, my = mouse.on ? mouse.y : h / 2 + Math.sin(t * 0.9) * h * 0.25;
                const sig2 = 2 * (gap * 4) ** 2;
                for (let k = waves.length - 1; k >= 0; k--) { waves[k].r += 420 * dt; if (waves[k].r > Math.max(w, h) * 1.2) waves.splice(k, 1); }
                for (const d of dots) {
                    const dx = mx - d.rx, dy = my - d.ry, d2 = dx * dx + dy * dy, dist = Math.sqrt(d2) || 1;
                    const amt = Math.min(gap * 2.4 * Math.exp(-d2 / sig2), dist * 0.85);
                    let tx = d.rx + (dx / dist) * amt, ty = d.ry + (dy / dist) * amt;
                    for (const wv of waves) {
                        const ex = d.rx - wv.x, ey = d.ry - wv.y, ed = Math.sqrt(ex * ex + ey * ey) || 1, band = ed - wv.r;
                        if (band > -36 && band < 36) { const push = (1 - Math.abs(band) / 36) * 26 * Math.max(0, 1 - wv.r / (Math.max(w, h) * 1.2)); tx += (ex / ed) * push; ty += (ey / ed) * push; }
                    }
                    d.vx = (d.vx + (tx - d.x) * 0.18) * 0.74; d.vy = (d.vy + (ty - d.y) * 0.18) * 0.74; d.x += d.vx; d.y += d.vy;
                }
                ctx.clearRect(0, 0, w, h);
                const g = ctx.createRadialGradient(mx, my, 0, mx, my, gap * 5);
                g.addColorStop(0, 'rgba(198,58,235,.35)'); g.addColorStop(1, 'rgba(198,58,235,0)');
                ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = 'rgba(167,139,250,.22)'; ctx.lineWidth = 1;
                ctx.beginPath();
                for (let j = 0; j < rows; j++) { for (let i = 0; i < cols; i++) { const d = dots[j * cols + i]; i ? ctx.lineTo(d.x, d.y) : ctx.moveTo(d.x, d.y); } }
                for (let i = 0; i < cols; i++) { for (let j = 0; j < rows; j++) { const d = dots[j * cols + i]; j ? ctx.lineTo(d.x, d.y) : ctx.moveTo(d.x, d.y); } }
                ctx.stroke();
                for (const d of dots) {
                    const disp = Math.min(1, Math.hypot(d.x - d.rx, d.y - d.ry) / (gap * 1.5));
                    ctx.fillStyle = `rgba(${(200 + disp * 55) | 0},${(160 + disp * 60) | 0},255,${(0.35 + disp * 0.65).toFixed(2)})`;
                    ctx.beginPath(); ctx.arc(d.x, d.y, 1.3 + disp * 2.2, 0, Math.PI * 2); ctx.fill();
                }
                for (const wv of waves) { ctx.strokeStyle = `rgba(96,165,250,${Math.max(0, 0.5 - wv.r / 900).toFixed(2)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(wv.x, wv.y, wv.r, 0, Math.PI * 2); ctx.stroke(); }
            },
        };
    }

    // ---------- catalogue ----------
    const CATS = { micro: 'Micro-interactions', physics: 'Physics', canvas: 'Canvas & WebGL', game: 'Game UI', three: '3D', audio: 'Audio', ux: 'UX' };
    const DEMOS = [
        { id: 'liquid', n: 'Liquid Button', cat: 'micro', tags: ['SVG goo', 'Morph'], hint: 'Hover · click', desc: 'A metaball button that melts into an orbiting loader, then pops into a success check.', init: liquid },
        { id: 'particles', n: 'Particle Typography', cat: 'canvas', tags: ['Canvas', 'Springs'], hint: 'Move · click · type', desc: '2,000 particles hold your word, scatter from the cursor and morph into any word you type.', init: particles },
        { id: 'holo', n: 'Holo Trading Card', cat: 'three', tags: ['3D tilt', 'Blend modes'], hint: 'Move · click to flip', desc: 'A foil card with rainbow refraction, sparkles and glare that follow your cursor.', init: holo },
        { id: 'swipe', n: 'Swipe Deck', cat: 'physics', tags: ['Drag', 'Inertia'], hint: 'Drag & fling', desc: 'Tinder-style card stack with velocity flings, LIKE / NOPE stamps and an infinite deck.', init: swipe },
        { id: 'tabbar', n: 'Gooey Tab Bar', cat: 'micro', tags: ['Spring', 'SVG goo'], hint: 'Tap the tabs', desc: 'A liquid indicator that stretches and drips between tabs, driven by spring physics.', init: tabbar },
        { id: 'daynight', n: 'Day / Night Switch', cat: 'micro', tags: ['CSS', 'Theme'], hint: 'Flip the switch', desc: 'The sun rolls into a moon, clouds sink, stars twinkle on and the whole scene changes time.', init: daynight },
        { id: 'ripples', n: 'Water Ripples', cat: 'canvas', tags: ['Wave equation', 'Refraction'], hint: 'Move · click', desc: 'A real-time 2D wave simulation that refracts the EARTHFALL key art like a water surface.', init: ripples },
        { id: 'like', n: 'Burst Like', cat: 'micro', tags: ['WAAPI', 'Odometer'], hint: 'Click the heart', desc: 'A heart that springs, fires a confetti shockwave and rolls the like counter like an odometer.', init: like },
        { id: 'glitch', n: 'Cyber Decoder', cat: 'game', tags: ['Text scramble', 'Glitch'], hint: 'Press decrypt', desc: 'Terminal text that decodes through random glyphs with RGB-split glitch slices.', init: glitch },
        { id: 'coverflow', n: '3D Coverflow', cat: 'three', tags: ['Perspective', 'Inertia'], hint: 'Drag · arrows', desc: 'My work on a 3D carousel with reflections, momentum and spring snapping.', init: coverflow },
        { id: 'warp', n: 'Hyperspace Warp', cat: 'canvas', tags: ['Canvas', 'Synth audio'], hint: 'Hold to jump', desc: 'Hold to punch it to warp speed: star streaks, blue-shift and a rising engine hum.', init: warp },
        { id: 'radial', n: 'Radial Goo Menu', cat: 'micro', tags: ['Stagger', 'SVG goo'], hint: 'Click +', desc: 'A floating action button that bursts into six liquid actions with staggered springs.', init: radial },
        { id: 'island', n: 'Dynamic Island', cat: 'ux', tags: ['Mobile', 'Morph'], hint: 'Try each state', desc: 'A pill that morphs into a call, music player, timer and Face ID scan.', init: island },
        { id: 'plasma', n: 'WebGL Plasma Orb', cat: 'canvas', tags: ['GLSL', 'Metaballs'], hint: 'Move · click', desc: 'A real fragment shader: fbm noise and metaballs, with one orb following your cursor.', init: plasma },
        { id: 'beats', n: 'Beat Lab', cat: 'audio', tags: ['Web Audio', 'Sequencer'], hint: 'Press play', desc: 'An 8-step drum machine synthesized live, with a radial spectrum visualizer.', init: beats },
        { id: 'hud', n: 'Game HUD: Damage', cat: 'game', tags: ['Game UI', 'Feedback'], hint: 'Hit · crit · heal', desc: 'Health bar with delayed ghost damage, crits, screen shake, shields and a K.O.', init: hud },
        { id: 'loot', n: 'Loot Chest', cat: 'game', tags: ['Reveal', 'Rarity'], hint: 'Open the chest', desc: 'Anticipation shake, god rays and a flipping reward card with weighted rarity.', init: loot },
        { id: 'xray', n: 'Wireframe X-Ray', cat: 'ux', tags: ['clip-path', 'Process'], hint: 'Move · click', desc: 'A lens that reveals the wireframe under the final UI — design process in one glance.', init: xray },
        { id: 'rubber', n: 'Rubber Slider', cat: 'physics', tags: ['SVG', 'Springs'], hint: 'Drag & let go', desc: 'A slider whose track stretches like a rubber band and twangs when you release it.', init: rubber },
        { id: 'gravity', n: 'Gravity Grid', cat: 'physics', tags: ['Canvas', 'Shockwaves'], hint: 'Move · click', desc: 'A spacetime mesh that bends into your cursor; clicks send out shockwaves.', init: gravity },
    ];

    // ---------- cards ----------
    grid.innerHTML = DEMOS.map((d, i) => `
        <article class="lab-card glass-dark rounded-3xl overflow-hidden flex flex-col" data-cat="${d.cat}" data-idx="${i}" style="--i:${i}">
            <div class="lab-stage aspect-[4/3]" data-stage="${d.id}"><span class="lab-hint">${d.hint}</span></div>
            <div class="p-5 flex items-start gap-3">
                <span class="lab-num">${String(i + 1).padStart(2, '0')}</span>
                <div class="flex-1 min-w-0">
                    <h3 class="font-bold leading-tight">${d.n}</h3>
                    <p class="text-xs text-gray-400 mt-1 leading-relaxed">${d.desc}</p>
                    <div class="flex flex-wrap gap-1 mt-2"><span class="lab-tag" style="color:#e9d5ff;border-color:rgba(198,58,235,.35)">${CATS[d.cat]}</span>${d.tags.map((t) => `<span class="lab-tag">${t}</span>`).join('')}</div>
                </div>
                <button class="lab-expand" data-expand="${i}" aria-label="Open ${d.n} full screen" data-sfx="whoosh"><i class="fas fa-expand"></i></button>
            </div>
        </article>`).join('');

    const cards = [...grid.querySelectorAll('.lab-card')];
    const state = DEMOS.map(() => ({ api: null, running: false, failed: false, visible: false }));
    let focusIdx = -1;

    function ensure(i) {
        const s = state[i]; if (s.api || s.failed) return s.api;
        const stage = document.querySelector(`.lab-stage[data-stage="${DEMOS[i].id}"]`);
        try { s.api = DEMOS[i].init(stage) || {}; }
        catch (e) { s.failed = true; console.error(`[lab] ${DEMOS[i].id}`, e); stage.insertAdjacentHTML('beforeend', '<p class="lab-err">This experiment needs a newer browser.</p>'); }
        return s.api;
    }
    function run(i) {
        const s = state[i]; if (s.running) return;
        const api = ensure(i); if (!api) return;
        s.running = true;
        if (api.frame) { s.fn = (t, dt) => api.frame(t, dt); T.add(s.fn); }
        api.start?.();
    }
    function pause(i) {
        const s = state[i]; if (!s.running) return;
        s.running = false;
        if (s.fn) T.remove(s.fn);
        s.api?.stop?.();
    }
    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            const i = +e.target.closest('.lab-card')?.dataset.idx;
            const idx = Number.isNaN(i) ? DEMOS.findIndex((d) => d.id === e.target.dataset.stage) : i;
            state[idx].visible = e.isIntersecting;
            if (focusIdx >= 0 && idx !== focusIdx) return;
            e.isIntersecting ? run(idx) : pause(idx);
        });
    }, { rootMargin: '120px 0px', threshold: 0.05 });
    cards.forEach((c) => io.observe(c.querySelector('.lab-stage')));

    // ---------- filters ----------
    const filters = document.getElementById('lab-filters');
    if (filters) {
        const counts = { all: DEMOS.length };
        DEMOS.forEach((d) => { counts[d.cat] = (counts[d.cat] || 0) + 1; });
        filters.innerHTML = [['all', 'All'], ...Object.entries(CATS)].map(([k, l]) => `<button data-f="${k}" class="lab-f shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all duration-300 ${k === 'all' ? 'is-on' : ''}" data-sfx="tick">${l} <span class="opacity-60">${counts[k] || 0}</span></button>`).join('');
        filters.addEventListener('click', (e) => {
            const b = e.target.closest('.lab-f'); if (!b) return;
            filters.querySelectorAll('.lab-f').forEach((x) => x.classList.toggle('is-on', x === b));
            let n = 0;
            cards.forEach((c) => {
                const show = b.dataset.f === 'all' || c.dataset.cat === b.dataset.f;
                c.classList.toggle('is-hidden', !show);
                c.classList.remove('pop');
                if (show) { c.style.setProperty('--i', n++); void c.offsetWidth; c.classList.add('pop'); }
            });
        });
    }

    // ---------- focus (full screen) ----------
    const F = document.getElementById('lab-focus');
    const slot = document.getElementById('lf-slot');
    function openFocus(i) {
        if (!F) return;
        if (focusIdx >= 0) returnStage();
        focusIdx = i;
        state.forEach((_, k) => { if (k !== i) pause(k); });
        const stage = document.querySelector(`.lab-stage[data-stage="${DEMOS[i].id}"]`);
        cards[i].querySelector('.p-5').insertAdjacentHTML('beforebegin', '<div class="lab-ph aspect-[4/3] bg-black/40"></div>');
        stage.classList.add('is-focus'); slot.appendChild(stage);
        document.getElementById('lf-num').textContent = String(i + 1).padStart(2, '0');
        document.getElementById('lf-title').textContent = DEMOS[i].n;
        document.getElementById('lf-desc').textContent = DEMOS[i].desc;
        if (F.classList.contains('hidden')) {
            F.classList.remove('hidden'); F.classList.add('flex');
            F.querySelector('.lab-focus-box').animate([{ opacity: 0, transform: 'scale(.94) translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' });
            document.body.style.overflow = 'hidden';
            document.body.classList.add('lab-focus-open');
        }
        run(i);
        stage.focus?.({ preventScroll: true });
    }
    function returnStage() {
        const i = focusIdx; if (i < 0) return;
        const stage = slot.querySelector('.lab-stage');
        const ph = cards[i].querySelector('.lab-ph');
        if (stage) { stage.classList.remove('is-focus'); ph ? ph.replaceWith(stage) : cards[i].prepend(stage); }
        pause(i);
    }
    function closeFocus() {
        if (focusIdx < 0) return;
        const i = focusIdx; returnStage(); focusIdx = -1;
        F.classList.add('hidden'); F.classList.remove('flex');
        document.body.style.overflow = '';
        document.body.classList.remove('lab-focus-open');
        state.forEach((s, k) => { if (s.visible) run(k); });
        cards[i].querySelector('.lab-expand')?.focus({ preventScroll: true });
    }
    const visibleIdx = () => cards.map((c, k) => (c.classList.contains('is-hidden') ? -1 : k)).filter((k) => k >= 0);
    const step = (dir) => { const list = visibleIdx(); const p = list.indexOf(focusIdx); openFocus(list[(p + dir + list.length) % list.length]); };
    grid.addEventListener('click', (e) => { const b = e.target.closest('[data-expand]'); if (b) openFocus(+b.dataset.expand); });
    document.getElementById('lf-close')?.addEventListener('click', closeFocus);
    document.getElementById('lf-prev')?.addEventListener('click', () => step(-1));
    document.getElementById('lf-next')?.addEventListener('click', () => step(1));
    F?.addEventListener('click', (e) => { if (e.target === F) closeFocus(); });
    window.addEventListener('keydown', (e) => {
        if (focusIdx < 0) return;
        if (e.key === 'Escape') { e.stopImmediatePropagation(); closeFocus(); }
        else if (e.key === 'ArrowRight' && !e.target.closest?.('.lab-stage')) step(1);
        else if (e.key === 'ArrowLeft' && !e.target.closest?.('.lab-stage')) step(-1);
    }, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden) state.forEach((_, k) => pause(k)); else state.forEach((s, k) => { if (s.visible && (focusIdx < 0 || k === focusIdx)) run(k); }); });

    window.Lab = { DEMOS, openFocus, closeFocus, state };
})();
