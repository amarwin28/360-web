# Nano Spark Website — PRD V3

This package is a PRD-aligned static website prototype using the supplied Nano Spark visual assets and the existing interactive 3D lab experience.

## Structure
- `index.html` — nine-section marketing site
- `site.css` / `site.js` — responsive site shell, navigation, form UI and interactions
- `world.html` / `world.js` / `world.css` — immersive 3D lab experience
- `assets/` — supplied Nano Spark assets
- `js/` — existing panorama viewer/config modules
- `panoramas/` — panorama assets/config

## Run locally
Because the 3D module uses ES modules, serve the folder with a local HTTP server rather than opening `index.html` directly.

### Python
```bash
python -m http.server 5500
```
Then open `http://localhost:5500`.

## Notes
- The lead form is frontend-only in this prototype. The PRD requires backend/CRM/email notification wiring and identifies `nanospark46@gmail.com` as the confirmed notification email, with the exact integration target still to be confirmed.
- Contact details in the site are limited to the confirmed PRD details: `8148774546`, `nanospark46@gmail.com`, and `NanoSpark.vercel.app`.
- Equipment and lab visuals are representative and do not assert a guaranteed package, brand, certification or exact specification.
- No fabricated statistics, testimonials, superlatives, pricing or certification claims are included.
- The PRD recommends Next.js + React Three Fiber for a production implementation; this V3 package remains dependency-light so it can be opened immediately with a simple local server.
