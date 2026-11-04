/* =========================================================================
   Site content shared by the feature modules, the CV page and the terminal.
   Edit the text here. Anything visitors would read as a claim (testimonials,
   metrics, availability, Figma links, before/after pairs) can also be set in
   the admin (Content tab); admin values win over the defaults below.
   ========================================================================= */
window.SITE = (() => {
    const PROFILE = {
        name: 'Voraman Vuth',
        title: 'UX/UI Designer & Game Developer',
        studio: 'Gojo Studio',
        email: 'voramanvuth@gmail.com',
        phone: '+855 95 908 373',
        location: 'Phnom Penh, Cambodia',
        site: 'https://voraman.github.io/my-portfolio-ux-ui/',
        github: 'https://github.com/VoRaMaN',
        githubUser: 'VoRaMaN',
        itch: 'https://gojo-studio.itch.io/',
        telegram: 'https://t.me/voraman9966',
        summary: 'Product-focused UX/UI designer with experience leading cross-functional teams and delivering end-to-end digital solutions across mobile and web. Skilled in UX research, journey mapping and scalable design systems. I also design and build indie games under Gojo Studio.',
    };

    // From the CV (CV UX UI.pdf)
    const CV = {
        education: [{ when: '2021 – 2026', org: 'Norton University', what: 'Bachelor of Software Development' }],
        experience: [
            { org: 'NEAK Corporation', role: 'Game Designer', points: ['Designed and balanced gameplay mechanics for various game genres, ensuring an immersive player experience.'] },
            {
                org: 'Project-K', role: 'Team Manager & Creative Director', points: [
                    'Led and managed a 13-member cross-functional team: planning, task delegation and performance tracking.',
                    'Established creative direction, workflow structure and quality standards.',
                    'Managed project timelines and resolved team conflicts to deliver on time.',
                    'Acted as the communication bridge between production stakeholders and the creative team.',
                ],
            },
            { org: 'Infinity Game Glyph', role: 'UX/UI Designer', points: ['Designed user-centred interfaces for gaming platforms, focused on immersive and intuitive experiences across mobile and desktop.'] },
            { org: 'Angkor F Hospital', role: 'Developer', points: ['Built a digital hospital management system to automate operations, reduce paperwork, improve workflow efficiency and give real-time data for better decisions.'] },
        ],
        skillGroups: [
            { name: 'Design & UX', items: ['User Research', 'Wireframing', 'Hi-Fi Prototyping', 'Design Systems', 'Information Architecture', 'Usability Testing', 'Interaction Design', 'Responsive Design', 'Game UI & HUD'] },
            { name: 'Tools', items: ['Figma', 'Photoshop', 'Illustrator', 'Framer', 'Balsamiq', 'Mobbin', 'Trello', 'Claude Code'] },
            { name: 'Build', items: ['JavaScript', 'TypeScript', 'Python', 'C#', 'HTML/CSS', 'Tailwind CSS', 'React', 'Vue.js', 'Laravel', 'Supabase', 'Three.js', 'Unity'] },
            { name: 'Soft skills', items: ['Stakeholder Communication', 'Problem Solving', 'Cross-functional Collaboration', 'Agile'] },
        ],
    };

    // Projects: used by "skills with proof", the CV, the terminal and the 3D room.
    // `skills` must match skill names in assets/js/skills.js.
    const PROJECTS = [
        { id: 'earthfall', title: 'EARTHFALL', kind: 'Game', year: '', link: '#store/earthfall', blurb: 'Alien-invasion action strategy: pilot Tripods, raze a destructible city, 20-objective campaign.', skills: ['Game UI & HUD', 'Game Systems Design'] },
        { id: 'stick-empire-conquest-3d', title: 'Stick Empire Conquest 3D', kind: 'Game', link: '#store/stick-empire-conquest-3d', blurb: '3D real-time strategy in the browser with online 1v1 / 2v2, a 49-region campaign and procedural IK animation.', skills: ['Three.js', 'WebGL', 'Blender', 'Multiplayer Netcode', 'PWA', 'Supabase', 'IK Animation', 'GLB / GLTF', 'ElevenLabs', 'MCP', 'GitHub Actions', 'GitHub Pages', 'Playwright', 'JavaScript', 'Sound Design', 'itch.io', 'Claude Code'] },
        { id: 'game-ui', title: 'Game UI Lab', kind: 'Case study', link: '#case/game', blurb: 'Fighting HUD, car select, loadout and main menu — with a live UI style switcher.', skills: ['Figma', 'Game UI & HUD', 'Adobe Photoshop', 'Prototyping', 'Interaction Design', 'UI/UX Design'] },
        { id: 'store', title: 'Web Storefronts', kind: 'Case study', link: '#case/store', blurb: 'A working game store: search, wishlist, cart, Steam-style product pages and a real download manager.', skills: ['UI/UX Design', 'Information Architecture', 'Design Systems', 'JavaScript', 'Supabase', 'PostgreSQL', 'REST APIs', 'Tailwind CSS', 'Figma', 'Responsive Design'] },
        { id: 'mobile', title: 'Mobile UI/UX', kind: 'Case study', link: '#case/mobile', blurb: 'Banking, smart-home and e-commerce apps with a clickable phone simulator.', skills: ['Figma', 'Prototyping', 'UI/UX Design', 'Interaction Design', 'Responsive Design', 'Wireframing', 'Mobbin', 'Balsamiq'] },
        { id: 'ui-lab', title: 'UI Lab', kind: 'Experiments', link: '#playground', blurb: '20 live experiments: physics, shaders, sound and game UI.', skills: ['JavaScript', 'WebGL', 'CSS3', 'HTML5', 'Interaction Design', 'Sound Design', 'Audio Processing'] },
        { id: 'beatlab', title: 'Beat Lab 808', kind: 'Experiment', link: '#lab/beats', blurb: 'A full 808 drum machine synthesized with Web Audio: 18 voices, song mode, WAV export.', skills: ['JavaScript', 'Sound Design', 'Audio Processing'] },
        { id: 'python-player', title: 'Python games in the browser', kind: 'Tool', link: '#store', blurb: 'Runs desktop pygame projects in the browser with Pyodide and an AST loop rewriter.', skills: ['Python', 'JavaScript', 'WebGL'] },
        { id: 'portfolio', title: 'This portfolio', kind: 'Website', link: '#home', blurb: 'Designed and built with Claude Code, Tailwind and Supabase. Admin, analytics, store and games.', skills: ['Claude Code', 'Tailwind CSS', 'Supabase', 'JavaScript', 'HTML5', 'CSS3', 'Figma', 'GitHub', 'Git', 'UI/UX Design', 'Design Systems', 'PostgreSQL', 'Responsive Design', 'VS Code'] },
        { id: 'project-k', title: 'Project-K', kind: 'Team', link: 'cv.html', blurb: 'Team manager and creative director of a 13-member cross-functional team.', skills: ['Team Leadership', 'Creative Direction', 'Stakeholder Communication', 'Agile', 'Cross-functional Collaboration', 'Problem Solving', 'Trello'] },
        { id: 'angkor-f', title: 'Angkor F Clinic / Hospital', kind: 'Web app', link: 'cv.html', blurb: 'Hospital management system to automate operations and cut paperwork.', skills: ['TypeScript', 'PHP', 'Vue.js', 'Laravel', 'Inertia.js', 'Tailwind CSS', 'PostgreSQL', 'REST APIs'] },
        { id: 'khmer-pos', title: 'Khmer POS', kind: 'Web app', link: 'cv.html', blurb: 'Point-of-sale web app.', skills: ['React', 'Vite', 'Tailwind CSS', 'Supabase'] },
        { id: 'bookwave', title: 'BookWave', kind: 'Web app', link: 'cv.html', blurb: 'Book reader that uses the Gemini API to recognise chapter structure, with OCR for scanned PDFs.', skills: ['Gemini API', 'Node.js', 'Express.js', 'SQLite', 'JavaScript'] },
    ];

    // "How I think" — process steps, each tied to something on this site.
    const PROCESS = [
        { icon: 'fa-magnifying-glass', title: 'Discover', text: 'Start with the player or user: what are they trying to do, and what gets in the way? I collect references (Mobbin, games I play) and map the journey.', proof: 'Mobile case study', link: '#case/mobile' },
        { icon: 'fa-bullseye', title: 'Define', text: 'Turn findings into one clear problem and a few measurable goals, like "start a game in one click from the store card".', proof: 'Store case study', link: '#case/store' },
        { icon: 'fa-vector-square', title: 'Wireframe', text: 'Low-fidelity structure first: hierarchy, spacing on an 8-pt grid, where the eye lands. Cheap to change, fast to argue about.', proof: 'Wireframe X-Ray experiment', link: '#lab/xray' },
        { icon: 'fa-wand-magic-sparkles', title: 'Prototype', text: 'Make it clickable: Figma for flows, real code when motion or feel matters. Every card on this page opens a working prototype.', proof: 'Game UI Lab', link: '#case/game' },
        { icon: 'fa-clipboard-check', title: 'Test & iterate', text: 'Watch people use it, then fix what they trip on. The fighting HUD went through three frames before the controls felt right.', proof: 'HUD v1 → v3', link: '#case/game' },
        { icon: 'fa-rocket', title: 'Ship', text: 'Hand off clean tokens and components, or ship it myself. Games go out on itch.io; this site deploys from GitHub.', proof: 'Design system', link: 'design-system.html' },
    ];

    // Default metrics: facts taken from this site's own content (edit in admin → Content).
    const METRICS = [
        { value: '13', label: 'people led on Project-K', icon: 'fa-people-group' },
        { value: '20', label: 'live UI Lab experiments', icon: 'fa-flask' },
        { value: '49', label: 'campaign regions in Stick Empire 3D', icon: 'fa-map' },
        { value: '18', label: 'synthesized 808 voices', icon: 'fa-drum' },
    ];

    // Before / after pairs (real iterations). Admin → Content can replace these.
    const BEFORE_AFTER = [
        { title: 'Fighting HUD', before: 'assets/img/game-fighting-v1-1600.webp', after: 'assets/img/game-fighting-v3-1600.webp', note: 'v1 → v3: a wider 20:9 phone canvas, two action buttons (punch and slash), a compact D-pad lifted off the screen edge, and slimmer health bars so the stage stays visible.' },
        { title: 'Portfolio home', before: 'assets/img/v1-home-1600.webp', after: 'assets/img/v2-home-1600.webp', note: 'v1 was a flat black page with one button. v2 adds a status badge, a typed role line, two clear calls to action and an ambient background.' },
        { title: 'Portfolio work grid', before: 'assets/img/v1-work-1600.webp', after: 'assets/img/v2-work-1600.webp', note: 'Static 3D renders became live cards: hover slideshows, a tilt effect and a labelled call to action that opens a playable prototype.' },
    ];

    // Case studies (#case/<id>). Copy describes goals and decisions visible in the work.
    const CASES = {
        game: {
            title: 'Game UI: HUD & menus', kicker: 'Game UI case study', detail: 'game', cover: 'assets/img/game-fighting-v3-1600.webp',
            role: 'UI/UX designer', tools: ['Figma', 'Photoshop'], platform: 'Mobile & desktop games',
            problem: 'In a fighting game the player looks at the HUD for a fraction of a second between hits. Health, who is who and how to attack must read instantly, and on phones the touch controls must never cover the fighters.',
            research: ['Compared health-bar layouts, round counters and touch controls in mobile fighting games.', 'Listed what a player needs per glance: my health, their health, my next move.', 'Checked thumb reach on a landscape phone to place movement and attack controls.'],
            decisions: ['Mirrored health bars anchored by portraits, so both fighters read the same way.', 'Move hints (R light, T heavy) sit next to each fighter instead of a pause menu.', 'Translucent D-pad bottom-left, large attack buttons bottom-right: big targets, no hidden action.', 'A strong VS mark in the centre anchors the eye between the bars.'],
            blueprint: 'assets/img/game-fighting-v3-1600.webp', final: 'assets/img/game-fighting-v3-1600.webp',
            gallery: ['assets/img/game-car-menu-1600.webp', 'assets/img/game-loadout-1600.webp', 'assets/img/game-main-menu-1600.webp'],
            hud: true,
        },
        store: {
            title: 'Web Storefronts', kicker: 'Desktop case study', detail: 'desktop', cover: 'assets/img/desk-vinland-1600.webp',
            role: 'UI/UX designer & developer', tools: ['Figma', 'JavaScript', 'Supabase'], platform: 'Desktop web',
            problem: 'Game stores bury the one thing players came for. The goal: from a store card to playing (or downloading) in one click, with clear progress for big downloads.',
            research: ['Walked through Steam and Epic product pages and noted where the play/download action lives.', 'Mapped the path: browse → product page → library → play.', 'Listed what a download needs to feel trustworthy: size, speed, time left, pause.'],
            decisions: ['Primary action label changes with what the game supports: Play free, Download free or View details.', 'Product page leads with media (trailer and screenshots) and keeps the action in a sticky column.', 'A real download manager with speed, ETA, pause/resume and cancel.', 'Admin-managed data in Supabase, with built-in preview data if the database is down.'],
            blueprint: 'assets/img/desk-vinland-1600.webp', final: 'assets/img/desk-vinland-1600.webp',
            gallery: ['assets/img/desk-mainmenu-1600.webp', 'assets/img/desk-iggsite-1600.webp', 'assets/img/desk-dashboard-1600.webp'],
        },
        mobile: {
            title: 'Mobile banking app', kicker: 'Mobile case study', detail: 'mobile', cover: 'assets/img/mob-bank-prototype.webp',
            role: 'UI/UX designer', tools: ['Figma', 'Mobbin', 'Balsamiq'], platform: 'iOS & Android',
            problem: 'Sending money should take seconds and never feel risky. Balance, recent activity and the send action need to be one tap away, and the card number private by default.',
            research: ['Studied banking app patterns on Mobbin: balance cards, quick actions, keypads.', 'Mapped the core task: open → check balance → send → confirm.', 'Sketched low-fidelity flows in Balsamiq before visual design.'],
            decisions: ['The card number is hidden until the eye icon is tapped.', 'A large custom keypad for amounts, with instant feedback.', 'A clear success screen so the user knows the money went through.', 'A light and dark theme toggle.'],
            blueprint: 'assets/img/mob-bankapp.webp', final: 'assets/img/mob-bankapp.webp',
            gallery: ['assets/img/mob-smarthome.webp', 'assets/img/mob-ecommerce.webp', 'assets/img/mob-bank-prototype.webp'],
        },
    };

    // Fighting HUD anatomy: hotspots in % of assets/img/game-fighting-v1-1600.webp
    const HUD = {
        image: 'assets/img/game-fighting-v1-1600.webp',
        spots: [
            { x: 3.5, y: 2, w: 10, h: 19, t: 'Portrait', d: 'Who is who at a glance. Each portrait sits at the outer end of its own health bar.' },
            { x: 12.5, y: 6.5, w: 28, h: 7, t: 'Health bar', d: 'Long, mirrored bars are easy to compare. Green fill on a dark track keeps contrast high on a busy stage.' },
            { x: 45.5, y: 8.5, w: 9, h: 12, t: 'VS anchor', d: 'Centres the eye between both bars, and leaves room for a round timer.' },
            { x: 1.5, y: 27.5, w: 18, h: 13, t: 'Move hints', d: 'Key bindings next to each fighter, so new players learn the controls without opening a menu.' },
            { x: 5.5, y: 67, w: 20, h: 22, t: 'D-pad', d: 'Translucent movement pad in the left-thumb zone. It never hides the fighters.' },
            { x: 80.5, y: 67, w: 13, h: 23, t: 'Attack button', d: 'A big target in the right-thumb zone: the most-used action gets the easiest reach.' },
        ],
    };

    // Collectible cards (one booster per day). r = rarity: c, r, e, l
    const CARDS = [
        { id: 'tripod', n: 'Assault Tripod', r: 'r', img: 'assets/img/earthfall-shot-2-800.webp', set: 'EARTHFALL' },
        { id: 'leviathan', n: 'Leviathan', r: 'e', img: 'assets/img/earthfall-shot-1-800.webp', set: 'EARTHFALL' },
        { id: 'city', n: 'Ruined City', r: 'c', img: 'assets/img/earthfall-shot-3-800.webp', set: 'EARTHFALL' },
        { id: 'earthfall', n: 'Earthfall', r: 'r', img: 'assets/img/earthfall-banner-800.webp', set: 'EARTHFALL' },
        { id: 'aetherion', n: 'Aetherion', r: 'l', img: 'assets/img/aetherion-art.webp', set: 'EARTHFALL' },
        { id: 'stick', n: 'Stick Empire', r: 'e', img: 'assets/img/stickempire-banner-800.webp', set: 'Stick Empire' },
        { id: 'emblems', n: 'Order & Chaos', r: 'r', img: 'assets/img/stickempire-emblems.webp', set: 'Stick Empire' },
        { id: 'gojo', n: 'Gojo Studio', r: 'l', img: 'assets/img/gojo-logo.webp', set: 'Studio' },
        { id: 'fighter', n: 'Lord Nobu', r: 'c', img: 'assets/img/game-fighting-800.webp', set: 'Game UI' },
        { id: 'garage', n: 'Garage', r: 'c', img: 'assets/img/game-car-menu-800.webp', set: 'Game UI' },
        { id: 'loadout', n: 'Loadout', r: 'c', img: 'assets/img/game-loadout-800.webp', set: 'Game UI' },
        { id: 'menu', n: 'Main Menu', r: 'c', img: 'assets/img/game-main-menu-800.webp', set: 'Game UI' },
        { id: 'neon', n: 'Neon District', r: 'r', img: 'assets/img/game-map.webp', set: 'Game UI' },
        { id: 'bank', n: 'Bank App', r: 'c', img: 'assets/img/mob-bankapp.webp', set: 'Mobile' },
        { id: 'home', n: 'Smart Home', r: 'c', img: 'assets/img/mob-smarthome.webp', set: 'Mobile' },
        { id: 'shop', n: 'Shop App', r: 'c', img: 'assets/img/mob-ecommerce.webp', set: 'Mobile' },
        { id: 'vinland', n: 'Vinland Store', r: 'c', img: 'assets/img/desk-vinland-800.webp', set: 'Desktop' },
        { id: 'studio', n: 'Studio Site', r: 'c', img: 'assets/img/desk-iggsite-800.webp', set: 'Desktop' },
    ];
    const RARITY = {
        c: { name: 'Common', color: '#9ca3af', w: 60 },
        r: { name: 'Rare', color: '#60a5fa', w: 27 },
        e: { name: 'Epic', color: '#c63aeb', w: 10 },
        l: { name: 'Legendary', color: '#facc15', w: 3 },
    };

    // Khmer translations. Keys are used by data-i18n="key" in index.html and by t() in the modules.
    const KM = {
        'nav.work': 'ស្នាដៃ', 'nav.skills': 'ជំនាញ', 'nav.games': 'ហ្គេម', 'nav.lab': 'ពិសោធន៍', 'nav.contact': 'ទំនាក់ទំនង',
        'hero.iam': 'ខ្ញុំគឺ', 'hero.lede': 'ខ្ញុំរចនាចំណុចប្រទាក់ដែលមនុស្សចូលចិត្តប្រើ — និងបង្កើតហ្គេមដែលមនុស្សចូលចិត្តលេង។',
        'hero.explore': 'មើលស្នាដៃ', 'hero.games': 'ហ្គេមរបស់ខ្ញុំ', 'hero.room': 'ចូលបន្ទប់របស់ខ្ញុំ', 'hero.scroll': 'រំកិល',
        'work.kicker': 'ស្នាដៃជ្រើសរើស', 'work.title': 'ករណីសិក្សាអន្តរកម្ម', 'work.sub': 'ចុចលើកាតដើម្បីបើកគំរូដែលអាចលេងបាន។', 'work.case': 'អានករណីសិក្សា',
        'process.kicker': 'ដំណើរការ', 'process.title': 'របៀបដែលខ្ញុំគិត',
        'ba.title': 'មុន និងក្រោយ', 'ba.before': 'មុន', 'ba.after': 'ក្រោយ',
        'metrics.title': 'តួលេខ',
        'skills.kicker': 'ឧបករណ៍', 'skills.title': 'ជំនាញ និងឧបករណ៍', 'skills.proof': 'ប្រើក្នុង',
        'games.kicker': 'លើសពី UI / UX', 'games.title': 'ខ្ញុំក៏បង្កើតហ្គេមផងដែរ។', 'games.mine': 'ហ្គេមរបស់ខ្ញុំ', 'games.store': 'បើកហាង',
        'mini.title': 'ការប្រកួត ៣០ វិនាទី', 'mini.play': 'លេង', 'mini.again': 'លេងម្តងទៀត', 'mini.top': '១០ កំពូល', 'mini.save': 'រក្សាពិន្ទុ', 'mini.name': 'ឈ្មោះរបស់អ្នក',
        'devlog.title': 'កំណត់ហេតុអភិវឌ្ឍន៍', 'devlog.empty': 'កំណត់ហេតុដំបូងនឹងមកដល់ឆាប់ៗនេះ។', 'devlog.read': 'អាន',
        'lab.kicker': 'កន្លែងលេង', 'lab.title': 'មន្ទីរពិសោធន៍ UI',
        'stats.title': 'ស្ថិតិផ្ទាល់',
        'testi.title': 'មតិពីអ្នកសហការ', 'testi.empty': 'ធ្លាប់ធ្វើការជាមួយខ្ញុំ? សូមចែករំលែកមតិរបស់អ្នក។', 'testi.leave': 'ផ្ញើមតិ',
        'avail.title': 'ភាពទំនេរ', 'avail.open': 'ទំនេរ', 'avail.limited': 'មានកំណត់', 'avail.booked': 'ពេញ',
        'contact.kicker': 'សួស្តី', 'contact.title': 'តោះធ្វើការជាមួយគ្នា', 'contact.lede': 'ខ្ញុំទទួលការងារ UX/UI ការងារឯករាជ្យ UI ហ្គេម និងការសហការ។ សូមទាក់ទងមកខ្ញុំតាមវេទិកាខាងក្រោម។',
        'contact.form': 'ទម្រង់ទំនាក់ទំនង', 'contact.send': 'ផ្ញើសារ', 'contact.name': 'ឈ្មោះរបស់អ្នក', 'contact.email': 'អ៊ីមែលរបស់អ្នក', 'contact.message': 'សារ',
        'hire.start': 'ចាប់ផ្តើមគម្រោង', 'hire.type': 'តើអ្នកត្រូវការអ្វី?', 'hire.budget': 'ថវិកា', 'hire.timeline': 'រយៈពេល', 'hire.details': 'ព័ត៌មានលម្អិត', 'hire.next': 'បន្ទាប់', 'hire.back': 'ថយក្រោយ', 'hire.send': 'ផ្ញើសំណើ', 'hire.thanks': 'អរគុណ! ខ្ញុំនឹងឆ្លើយតបក្នុងរយៈពេល ២ ថ្ងៃ។',
        'cv.download': 'ទាញយក CV',
        'footer.a11y': 'ភាពងាយស្រួលប្រើ', 'footer.ds': 'ប្រព័ន្ធរចនា',
        'ui.trophies': 'ពានរង្វាន់', 'ui.theme': 'រូបរាង', 'ui.close': 'បិទ', 'ui.lang': 'English',
        'cards.binder': 'សៀវភៅកាត', 'cards.daily': 'កញ្ចប់ប្រចាំថ្ងៃ', 'cards.open': 'បើកកញ្ចប់',
    };

    return { PROFILE, CV, PROJECTS, PROCESS, METRICS, BEFORE_AFTER, CASES, HUD, CARDS, RARITY, KM };
})();
