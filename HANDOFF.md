---
reviewedAt: 2026-09-24
---
# Handoff

**Läge:** v1 byggd och deployad till https://buildapp.se/bulk/. Tre vyer (Välj, Ingredienser, Tillagning), 24 smakkit, 8 proteiner, mål med lösare, inköp i förpackningar, live-läge med parallella timers.

**Verifierat 2026-09-24:** `npm run check` (handräknad näring, lösare, förpackningar, schema), `npm run typecheck`, `npm run build`, samt i Chromium via Playwright på 1280 och 390 px: ingen horisontell scroll, låd-sheet, töm-slot ger banner, sous vide-schema, timer startar.

**Inte verifierat:** riktig telefon (PWA-installation, aviseringar, haptik, Wake Lock), drag-byte av lådor med touch.

**Lokalt på Windows:** `next build` skriver prefetch-filer fel (se BACKLOG P3), ger 404 i konsolen vid lokal test. Produktion byggs på Linux.

**Sedan v1 (2026-09-24 kväll):** hela kort klickbara, kitens innehåll syns före val, standard Behåll, 8 egna lätta krämiga kit, 8 Filips-testkit, illustration per kit.

**Nästa (godkänt 2026-09-24):** BACKLOG P0, grundbaser och digitala klockor med larm i Tillagning. Specen står där. Sedan P1, test på riktig telefon.

**Kitbilder:** 32 illustrationer i `public/kits/`, URL:erna versioneras med `?v=<commit>` (Cloudflare cachar även 404 i 4 h). Nytt kit: `node scripts/kit-art.ts <id>`.
