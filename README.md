# Voraman Vuth — Portfolio

UX/UI designer & game developer portfolio. Static site: open `index.html` or host with GitHub Pages.

- Games: https://gojo-studio.itch.io/
- Images used by the page live in `assets/img/` (optimized WebP). The original PNG/JPG files are kept as source files.

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
