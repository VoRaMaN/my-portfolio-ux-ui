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

### Hosting big files (e.g. the 142 MB EARTHFALL build)

| Option | Limits (free) | Download bar |
| --- | --- | --- |
| **Upload in admin** (Supabase Storage, split into parts) | 1 GB storage, 5 GB downloads/month (~35 downloads of 142 MB) | Real progress, pause/resume |
| **GitHub Release** (repo → Releases → attach the .zip, then paste its link in admin) | 2 GB per file, no bandwidth limit | Browser's own download (no in-page progress) |

Start with the admin upload; if downloads grow, upgrade Supabase or switch the game to a GitHub Release link.

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
