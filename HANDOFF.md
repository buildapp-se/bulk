---
reviewedAt: 2026-09-26
---
# Handoff

**2026-09-26, priser:** Prepp visar veckans priser i Umeå (vanliga priser Willys och Coop, erbjudanden från 4 Willys, 8 ICA och 4 Coop) i en egen kolumn till vänster om sidans vanliga bredd från 1500 px (trädet behåller sina 672 px, mätt vid 1920, 1600 och 1280), annars under trädet och längst ner på mobil, med förklaring av grönt och grått och hopfällbara grupper. Varje rätt räknas i den billigaste enskilda butiken; proteinkorten visar spannet per låda; listen visar förbrukat i en butik plus skafferivaror. `prices.yml` hämtar måndag och torsdag och deployar. Verifierat med check (fast pristabell: en butik vinner med 25,07 kr, ICA:s 5-kronorsbroccoli används inte, komplett butik slår billigare med lucka, skafferi 25,80 kr, grönt mot billigaste vanliga), typecheck, build, playwright-cli på 1280 (tre kolumner, receptkort "billigast på Willys Ersboda", 2 kit: 8 lådor 95 kr, allt på Willys Ersboda, +46 kr skafferi, grupper fälls ut och ihop) och 390 px (priser sist, ingen horisontell scroll). `prices.yml` körd på GitHub efter butiksmodellen: Willys 80, Coop 55 av 84 vanliga priser, 78 erbjudanden, check ok, botcommit `Priser 2026-09-26` och startad deploy som gick igenom. Hela kedjan är alltså verifierad.

**2026-09-26:** Prepp, fristående utforskare (✂ Utforska i headern, inte ett steg): ett infällt preppträd per protein (gemensamma knivjobb som stam, grenar där kiten börjar behöva olika), receptkort till höger på dator och utfällt på mobil, markera kit × protein, live-mätning av knivjobb, ingredienser och kastruller, "Skicka till 01 Välj" som lägger till i batchen. Ny kycklingmetod Hel (hela filéer i ugn). Knivjobb taggade på kitens rader. Verifierat med check (protein-kostnad, lax-trädet, varje kit i exakt ett löv per protein, kostnad för delad bas, hel-steget i schemat och på plåtarna), typecheck, build och playwright-cli på 1280 (receptruta, markering) och 390 px (inline-recept, header på två rader); Skicka gav teriyaki, grekisk, texmex + pesto låst till lax. Ingen horisontell scroll, inga konsolfel.

**Läge:** live på https://buildapp.se/bulk/. Tre vyer (Välj, Ingredienser, Tillagning) plus utforskaren Prepp, 32 smakkit varav 24 på en grundbas (tomat, asiatisk, krämig, rökig rub), 10 proteiner (plus halloumi och sojafärs), mål med lösare, inköp i förpackningar, digitala timers med docka och larm.

**Kvällen 2026-09-24, efter P0 (alla live-kollade):** protein/kolhydrat/grönt per kit som dropdowns och Rensa allt i Din batch; valda proteiner fetade på kitkorten; live-läget en rad per steg med nedräkning och bleknande förfluten tid; förberedelselista och portionering per lådtyp i tillagad vikt; delbockar per listrad och hopfällning av klara steg; skärmen vaken i hela Tillagning. Senaste commit `511facf`.

**Sent 2026-09-24:** klockslag i Tillagning (klocka överst, Börja nu / Klart kl, schemat följer startad timer, dagord för kvällen före), långa steg som egen rad i live-läget, förberedelsen flyttad till före ugnspasset, fläskkarréns kryddor i mått per förpackning, lax i sous vide 52 °C. Verifierat: check (klart 18:00 med karré i form ger form 13:15, förberedelse 16:15, potatis 17:00; sous vide i kväll 23:00; kryddor för 1,5 kg), typecheck, build, playwright-cli på 390 och 1280 px med och utan karré (form, sous vide), lax + hinner inte, timer som ankare, ingen horisontell scroll.

**Därefter:** ▶ per rad i live-läget, nu-linjen borttagen, neutrala lådrutor med kitbild i Din batch, rubriken på Välj borttagen. Verifierat med check, typecheck, build och playwright-cli på 390 och 1280.

**Sist:** Rensa allt tömmer även tillagning och inköpsbockar, Börja om-rad efter 12 h, större kitbilder i Din batch, dagord relativt ugnspassets dag. Verifierat med check (ny kontroll över midnatt), typecheck, build och playwright-cli.

**Besvarat 2026-09-24:** protein låst per kit bockas i steg 2 och sprids inte; aubergine, champinjoner och vitkål rostas alltid. Se CONTEXT.

**Verifierat 2026-09-24 (kväll, grundbaser + timers):** `npm run check` (plus basmängd för blandad batch, bas + twist summerar till lådan, klocklogik paus/±/ring), `npm run typecheck`, `npm run build`, samt i Chrome (DevTools MCP) på 1280 och 390 px: trädvy i Välj, baskort i Ingredienser, bas- och delningssteg i Tillagning, start/paus/fortsätt/±1, dockan följer med på Välj och länkar till steget, larm ringer (Web Audio + vibration var 2:a s) tills Kvittera, ingen horisontell scroll.

**Inte verifierat:** riktig telefon (PWA, aviseringar och larmljud med låst skärm, haptik, Wake Lock), drag-byte av lådor med touch. Bas-mängderna är inte provlagade.

**Lokalt på Windows:** `next build` skriver prefetch-filer fel (se BACKLOG P3), ger 404 i konsolen vid lokal test. Produktion byggs på Linux.

**Nästa:** BACKLOG P1, test på riktig telefon. Filips-kiten ska provlagas och behållas eller raderas.

**Kitbilder:** 32 illustrationer i `public/kits/`, URL:erna versioneras med `?v=<commit>` (Cloudflare cachar även 404 i 4 h). Nytt kit: `node scripts/kit-art.ts <id>`.
