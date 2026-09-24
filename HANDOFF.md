---
reviewedAt: 2026-09-24
---
# Handoff

**Läge:** live på https://buildapp.se/bulk/. Tre vyer (Välj, Ingredienser, Tillagning), 32 smakkit varav 24 på en grundbas (tomat, asiatisk, krämig, rökig rub), 8 proteiner, mål med lösare, inköp i förpackningar, digitala timers med docka och larm.

**Verifierat 2026-09-24 (kväll, grundbaser + timers):** `npm run check` (plus basmängd för blandad batch, bas + twist summerar till lådan, klocklogik paus/±/ring), `npm run typecheck`, `npm run build`, samt i Chrome (DevTools MCP) på 1280 och 390 px: trädvy i Välj, baskort i Ingredienser, bas- och delningssteg i Tillagning, start/paus/fortsätt/±1, dockan följer med på Välj och länkar till steget, larm ringer (Web Audio + vibration var 2:a s) tills Kvittera, ingen horisontell scroll.

**Inte verifierat:** riktig telefon (PWA, aviseringar och larmljud med låst skärm, haptik, Wake Lock), drag-byte av lådor med touch. Bas-mängderna är inte provlagade.

**Lokalt på Windows:** `next build` skriver prefetch-filer fel (se BACKLOG P3), ger 404 i konsolen vid lokal test. Produktion byggs på Linux.

**Nästa:** BACKLOG P1, test på riktig telefon. Filips-kiten ska provlagas och behållas eller raderas.

**Kitbilder:** 32 illustrationer i `public/kits/`, URL:erna versioneras med `?v=<commit>` (Cloudflare cachar även 404 i 4 h). Nytt kit: `node scripts/kit-art.ts <id>`.
