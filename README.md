# Justin Rain Tuazon — Portfolio

Static site, no build step. Open with any static server, e.g.:

    npx http-server site -p 5173

- `index.html` — page structure (sections in order: nav, hero, featured cuts, work, about, capabilities, toolkit, process, testimonials, contact, footer)
- `css/style.css` — navy design tokens on `:root`, all layout and motion
- `css/motion.css`, `js/motion.js` — intro loader, inertia scroll (Lenis, in `js/vendor/`), letter reveals, marquees, card tilt, text scramble
- `js/main.js` — project list (`WORKS`), featured reel order (`REEL`), cursor, gallery, modal, reel player
- `assets/full/` — 720p web versions of each video (H.264, fast-start)
- `assets/preview/` — 6-second muted loops used for hover/hero previews
- `assets/poster/` — poster frames

To add a project: drop `full/<id>.mp4`, `preview/<id>.mp4`, `poster/<id>.jpg`, then add an entry to `WORKS` in `js/main.js`.
