# Voraman Vuth — Portfolio

UX/UI designer & game developer portfolio. Static site: open `index.html` or host with GitHub Pages.

- Games: https://gojo-studio.itch.io/
- Images used by the page live in `assets/img/` (optimized WebP). The original PNG/JPG files are kept as source files.

## Game store & admin

The **Web Storefronts** case study is a working game store (`assets/js/store.js`): search, genre filter, sort, wishlist, cart with a demo checkout, a Steam-style product page with screenshot/video viewer, and an Epic-style download manager (real progress, speed, ETA, pause/resume/cancel).

- Direct link to a game: `index.html#store/earthfall`
- Data lives in Supabase (`portfolio_games`, `portfolio_settings`, storage bucket `portfolio-media`). If Supabase can't be reached, the store shows built-in preview data.

### Admin

Open **`admin.html`** (lock icon in the footer) and sign in with your Supabase account (`voramanvuth@gmail.com`). Only emails listed in `portfolio_admins` can change anything; this is enforced in the database (Row Level Security), not in the browser.

From the admin you can:
- create/edit/delete games and UI-concept items, publish or hide them
- upload icon, banner and store-card images (auto-converted to WebP), screenshots (drag & drop, reorder) and trailers (upload or YouTube link)
- upload the **game build of any size** — files over 45 MB are split into parts automatically, and the store reassembles them while showing the download progress bar
- or point the download at an external link (GitHub Releases, itch.io)
- change site settings: hero status badge, availability, store name, featured game, show/hide concepts, pause downloads, itch.io link
- browse and delete uploaded files and see storage usage
- **Analytics:** page views and visitors per day, sections seen, game plays and downloads, and top referrers. Tick "Don't count my own visits" on your own browser.
- **Leads:** requests from the "Start a project" form. Reply by email, then mark each one replied or archived.
- **Devlog:** write posts in Markdown, attach them to a game, add a cover, publish
- **Content:** testimonials, the availability calendar, metrics cards, Figma prototype links for the case studies, and before/after pairs
- **Community:** moderate the Beat Lab wall (hide or delete) and the Comet Dash leaderboard

### Hosting big files (e.g. the 142 MB EARTHFALL build)

| Option | Limits (free) | Download bar |
| --- | --- | --- |
| **Upload in admin** (Supabase Storage, split into parts) | 1 GB storage, 5 GB downloads/month (~35 downloads of 142 MB) | Real progress, pause/resume |
| **GitHub Release** (repo → Releases → attach the .zip, then paste its link in admin) | 2 GB per file, no bandwidth limit | Browser's own download (no in-page progress) |

Start with the admin upload; if downloads grow, upgrade Supabase or switch the game to a GitHub Release link.

## Portfolio features

Most text lives in **`assets/js/site-data.js`**: profile, CV, projects, process steps, case studies, HUD hotspots, cards and Khmer strings. Anything a visitor reads as a claim (testimonials, metrics, availability, Figma links, before/after pairs) is edited in **admin → Content**, and empty sections show an empty state instead of made-up content.

| Feature | Where it is | Where to edit |
| --- | --- | --- |
| Case studies (problem → research → wireframe → decisions), with a blueprint ↔ final slider | `#case/game`, `#case/store`, `#case/mobile` ("Read the case study" under the Work cards) | `CASES` in site-data.js. Figma embeds: admin → Content |
| Before / after redesigns (fighting HUD v1 → v3, portfolio v1 → v2) | "How I think" section | `BEFORE_AFTER`, or admin → Content |
| "How I think" process timeline (fills as you scroll) | after Work | `PROCESS` |
| Metrics cards | under the Work cards | `METRICS`, or admin → Content |
| Fighting HUD anatomy (numbered hotspots) | Games section and the game case study | `HUD` |
| Comet Dash, a 30-second mini-game with a Top 10 (Supabase `portfolio_scores`) | Games section (`#arcade`) | `assets/js/arcade.js` |
| Devlog (from the admin; linked from each game's store page) | Games section, `#devlog`, `#devlog/game/<slug>` | admin → Devlog |
| Press kit per game (factsheet, screenshots, logos, contact) | `#press/<slug>` and the store page | game data in the admin |
| Live GitHub and store stats | Games section | automatic |
| Card collection: one free booster a day plus one per trophy, saved in the browser | bottom-right button, `#binder` | `CARDS` |
| Achievements (22 trophies) | trophy icon in the nav, or Settings | `ACH` in features.js |
| Beat Lab song mode (chain patterns A–D, song WAV export, song share links) and community wall | Beat Lab → **Song**, **Wall** | `assets/js/beatlab.js` |
| UI Lab hearts with live counts (Supabase `portfolio_votes`) | heart under each experiment | automatic |
| 3D room: objects open sections | "Enter my room" in the hero, `#room` | `ROOM` in showcase.js |
| Terminal mode: `help`, `ls projects`, `play earthfall`, `open beatlab`, `theme retro` … | press <kbd>~</kbd>, or `#terminal` | `CMDS` in features.js |
| Themes (Aurora, Cyber, Retro pixel, Minimal), cursor companion, reduce motion | Settings (sliders icon in the nav) | `assets/css/features.css` |
| Sound-reactive hero: the aurora pulses to Beat Lab | automatic while a beat plays | features.js |
| "Start a project" 3-step form (Supabase `portfolio_leads`) and availability calendar | Contact section, `#hire` | admin → Leads / Content |
| Testimonials carousel | before Contact | admin → Content |
| Skills with proof: click a skill to see the projects that use it | Skills section | `PROJECTS[].skills` |
| CV page generated from site data, saved as PDF with the browser's print dialog | `cv.html` | `CV` and `PROFILE` |
| Khmer / English | Settings → Language | `KM` in site-data.js, `data-i18n` attributes |
| SEO: social card, JSON-LD, sitemap, robots | `<head>`, `sitemap.xml`, `robots.txt`, `assets/img/og-card.jpg` | index.html |
| Design system page and accessibility statement | `design-system.html`, `accessibility.html` | those files |

Analytics are cookie-free and store no IP address. A random id per browser tab is the only identifier, and visitors with Do Not Track or Global Privacy Control are not counted. Visitors can only insert small, validated rows into the new tables. Leads and analytics are readable only by the admin, enforced by Row Level Security (`supabase/migrations/20261105_portfolio_features.sql`).

## Skills, UI Lab and sounds

- **Skills** (`assets/js/skills.js`): edit the `SKILLS` list to add or change a skill. Each entry has a name, a category and an icon. Logos come from `assets/img/skills-icons.svg`, a sprite built from devicon, simple-icons and LobeHub. Font Awesome or a local image can be used instead.
- **UI Lab** (`assets/js/lab.js`): 20 interactive experiments. The file loads only when a visitor scrolls near the Lab. Each experiment runs only while it's on screen, and each can open full screen.
- **Beat Lab 808** (`assets/js/beatlab.js`, loaded the first time its card is seen): a full drum machine. Every sound is synthesized with Web Audio, so there are no samples.
  - **Sounds:** 18 rows. The 16 classic 808 voices are kick, snare, clap, rim shot, closed and open hat (the closed hat chokes the open one), cymbal, cowbell, low/mid/hi tom, low/mid/hi conga, claves and maracas. Add a tuned 808 bass whose notes can glide, plus an accent track.
  - **Patterns:** 8, 16, 32, 64 or 128 steps (½ to 8 bars of 16th notes), with bar pages. Making a pattern longer repeats your loop into the new bars.
  - **Tempo and feel:** 40–240 BPM. Drag the number, scroll, use the arrow keys, ± or TAP. Swing goes from 50 to 75 %.
  - **Per step:** right-click or long-press a step to set velocity, roll (2–4 hits), chance, nudge and, on the 808 row, the note. There's mute/solo on every row, and each voice has Level, Tune, Decay, Tone and Pan knobs. Master knobs are Volume, Boom (low-end drive) and Space (reverb).
  - **Presets and generator:** ten presets (Trap, UK Drill, Jersey Club, Boom Bap, Electro, Miami Bass, House, Dembow, Afrobeats, Lo-Fi). **Generate** writes a fresh groove in the current style.
  - **Nudge:** shift any step early or late by ⅙, ⅓ or ½ of a step. ±⅓ places true triplets on the 16th grid; Jersey Club uses this for its kick bounce (two straight kicks, then a quarter-note-triplet trio).
  - **Keys and recording:** Space plays/stops. A–M play the drums and Q–P play 808 notes. Turn on **REC** to record what you play into the grid.
  - **Undo, save, export, share:** undo (⌘/Ctrl Z) and an automatic save in the browser. **WAV** renders the beat offline into a file that loops seamlessly. **Share** copies a link (`?beat=…`) that opens the same beat.
  - **Song mode:** press **Song** to get four pattern slots (A–D). Edit each one, then build a chain such as `AABA` with **+A … +D**; click a block in the chain to remove it. Playback follows the chain, **WAV** exports the whole song, and **Share** links open the full song.
  - **Community wall:** **Wall** lists beats other visitors posted. Press play to load one, heart it, or post your own beat or song with a title and name.
- **Sounds** (`assets/js/sfx.js`): every button plays a click synthesized with Web Audio, so there are no audio files. Visitors can mute it with the speaker icon in the nav, the sidebar or the footer.

## Play in browser

A store game can run in a full-screen player instead of being downloaded. In the admin, open the game, go to **Play in browser** and paste an embeddable URL, such as GitHub Pages or an itch.io HTML5 embed link. Stick Empire Conquest 3D uses `https://voraman.github.io/Stick-Empire-Conquest-3D/`. Direct link: `index.html#store/stick-empire-conquest-3d/play`.

## Python (pygame) games in the browser

Python games run on real Python 3.14 with pygame-ce inside the visitor's browser ([Pyodide](https://pyodide.org), WebAssembly). The player page is `play/python.html` and the runtime helper is `play/pyrun.py`.

1. Zip the game folder with its modules and assets. The player finds the start file itself. That's the script no other file imports, which opens the window (`pygame.display.set_mode`) and runs the game, such as `PyFighter.py` next to a `fighter.py` that holds the `Fighter` class. PyCharm's sample `main.py`, `venv/`, `.idea/` and tests are ignored. To choose it yourself, type the name in **Start file** in the admin. The case and the `.py` don't matter.
2. In the admin, open the game, then **Play in browser → Python (pygame) .zip**. Upload the .zip and press **Test it**.
3. Publish the game. The store shows **Play now**. Direct link: `play/python.html?game=<slug>`.

Normal desktop pygame code works unchanged. When the game loads, `pyrun.py` rewrites blocking loops in memory: functions that contain a `while running:` game loop become async, and `Clock.tick()`, `time.sleep()`, `pygame.time.wait()` and `pygame.event.wait()` stop blocking. Your files are not modified, and error messages keep your real line numbers. Loops without a Clock are capped at 60 fps.

What works:
- the standard library
- pure-Python code and modules spread across folders or packages
- images, fonts and sounds (if audio isn't available, sounds are muted instead of crashing)
- paths written on Windows: any capitalisation (`assets/` finds a folder called `Assets`) and backslashes (`Assets\\images\\hero.png`)
- `sys.exit()`

Limits:
- pip packages other than pygame-ce, and native code
- a packaged `.exe` (PyInstaller build) or files packed in a `.rar` inside the zip: upload a zip of the source folder (the `.py` files and Assets). The admin refuses a zip with no `.py` files.
- threads and subprocesses
- saved files reset when the page reloads
- keyboard and mouse games suit desktop browsers best

The first visit downloads about 12 MB of Python runtime from jsDelivr; after that the browser caches it.

## Editing styles

The page uses a **pre-built** Tailwind CSS file (`assets/css/tailwind.css`) instead of the Tailwind CDN script, which is much faster to load.
If you add or change Tailwind classes in `index.html`, rebuild the CSS:

```bash
npm install
npm run build:css      # or: npm run watch:css while editing
```

## Showing playable itch.io games on the page

In `index.html`, find `const ITCH_GAMES = [` and add your games:

```js
const ITCH_GAMES = [
  { id: '1234567', title: 'Comet Game', uploadId: '7654321' },
];
```

- `id` — itch.io → Edit game → Distribute → **Embed game** (the number in `https://itch.io/embed/1234567`).
- `uploadId` — optional, for HTML5 games: the number in the embed code `https://itch.io/embed-upload/7654321`. Adds a **Play here** button that runs the game in a popup.
