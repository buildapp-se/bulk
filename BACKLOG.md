# Backlog

## P1
- Priser, nästa steg: ICA:s vanliga priser om det finns en öppen väg utan bot-spärr. Jordnötspulver saknar pris (finns inte hos Willys eller Coop, kanske hälsokost eller nätbutik). Lidl-varor med styckpris räknas om med styckvikten `Ingr.st` sedan 2026-11-24 (gurka 280 g, aubergine 300 g); en vara utan styckvikt räknas fortfarande inte.
- Testa på riktig telefon (iPhone + Android): installera som PWA, aviseringar, larmljud och vibration när en timer är klar (även med skärmen låst), haptik (iOS switch-tricket), Wake Lock.

## P2
- Firebase Auth + synk av plan mellan enheter (familjehubbens mönster).
- [x] (2026-10-06) Stekpanna som tillagningsmetod (kyckling, nöt-, bland-, fläsk- och sojafärs).
- Fler sous vide-proteiner (fläskfilé, kalkon). Behöver Patrik: temperatur och tid (som laxens 52 °C) och vilka kit de ska höra till.
- [x] (2026-10-06) Fler `src: 'est'`: 15 av 19 uppskattningar ersatta med LV eller etikett via willys.se:s produkt-API (`/axfood/rest/p/<kod>`, `nutrientHeaders`).
- Fyra `src: 'est'` kvar, behöver Patrik: **Vitkålssallad** i BBQ-kitet (uppskattad 90 kcal, köps som coleslaw enligt `BUY`, men butikens coleslaw har 300–340 kcal och 30 g fett; LV 2075 hemlagad coleslaw 88 kcal: vilken är det?), **Lättkesella** (Willys säljer bara Kesella 7 %, 118 kcal; LV 75 kvarg 1 % har 75 kcal: byt produkt eller behåll?), **Frank's RedHot** och **jordnötspulver** (finns inte hos Willys, etikett från annan butik).
- Riktiga förpackningsstorlekar från ICA/Willys i stället för handskriven tabell.
- Engelska (`en.ts` + next-intl). Matnamnen i data.ts behöver också översättas.
- [x] (2026-10-06) Lådans ark på 390 px: kitbilden i hörnet sticker ut, sidan kan skrollas 32 px i sidled medan arket är öppet (finns även live före 2026-09-29; `BatchPanel.tsx:190`, `-right-2.5`). Valda Pill-knappar saknar `aria-pressed` (`ui.tsx:27`), valet syns bara i färg.


## P3
- Kalla lådor (yoghurtbaserade pastasallader ur FIH-boken) som eget spår.
- Airfryer som metod.
- Erbjudanden för fler städer än Umeå och storstadsregionerna (de finns sedan 2026-10-03), bara om någon hör av sig via "Säg till" (Patrik 2026-10-03: inga resurser innan dess). En ny region = en butik per kedja i prices.ts plus en rad i `REGIONS`. Mätt 2026-10-03: en stad med 16 butiker = 16 anrop, ca 11 MB, 3,9 s i följd eller cirka 1 s parallellt, 31 ms CPU för tolkningen. Två vägar: (a) fasta städer i `prices.yml`, +16 anrop och +11 MB per stad och körning, en fil per stad så att besökaren inte laddar alla; (b) sök på egen stad via Cloudflare Worker som hämtar och cachar till nästa körning, ca 2–5 s, men gratisnivåns 10 ms CPU kräver ett anrop per butik, och kvoten delas med Sipdeck. Overifierat: kedjornas butiks-API:er per ort, och om kedjorna blockerar Cloudflares IP-adresser. GitHub-jobb startat från sidan tar 1–2 min och kräver ändå en mellanhand för nyckeln.
- Rapportera Next 16-buggen upstream: `export/index.js` byter bara `/` mot `.` i segmentfilnamn, så på Windows hamnar prefetch-filerna i undermapp och ger 404 lokalt.
- Majoruppdatering (Uppdateringsrunda 2026-11-17): @types/node 24 till 26, först när Node och CI går på 26.

## Granskning 2026-10-06

Fynd från den automatiska sviten (aifabriken `tools/audit-suite.ts`: headers, npm audit, secrets, Actions, markup, axe). Mätvärdena står som `(automated)`-rader under `## Audits` i CONTEXT.md.

- [x] (2026-10-06) `[P2]` npm audit: 2 high i produktionsberoenden (sharp <0.35.5, source-map-js). `npm audit fix` löser båda.
- [x] (2026-10-06) `[P2]` Actions: `.github/workflows/prices.yml:22` checkar ut utan `persist-credentials: false` (zizmor artipacked, medium). Pushen går nu via `gh auth setup-git`; mergat till `main` 2026-10-07, pushen overifierad tills `prices.yml` körts på GitHub nästa gång (schemalagt, eller kör workflow_dispatch en gång).
- [x] (2026-10-06) `[P2]` WCAG: kontrast 4,35:1 (#6f6a62 på #ebe7e0) på 10 element: navlänkarna Ingredienser och Tillagning samt radiogruppen. Kravet är 4,5:1. Dessutom `nested-interactive`: ett `[role=checkbox]`-kort har fokuserbara barn.
- [x] (2026-10-06) `[P3]` Markup: `<div>` inuti `<button>` på 6 ställen (html-validate `element-permitted-content`). Byt inre `div` mot `span`.
- [x] (2026-10-06) `[P2]` WCAG, Tillagning (hittat 2026-10-06 med axe 4.13 lokalt på 390 px, sviten mätte bara startsidan): kontrast 3,48:1 på 26 element (`text-muted` med `opacity-80` i stegens listor, `Cook.tsx` `Lines`) och `nested-interactive` på 5 rader i live-läget (rad med ▶-knapp inuti). Välj, Ingredienser och Prepp har 0 fel. Dessutom spårbrickorna (vit text på spårfärgen, 2,71–3,53:1), som axe först såg när de andra felen var borta.

## Förbättringsrunda 2026-11-04

PR #1 (`claude/forbattringar-2026-11-04`), väntar på Patriks genomklickning.

- [x] (2026-11-04) `[P2]` WCAG: Prepps två `aside` utan namn (`landmark-unique` på 1280 px), klockans `aria-label` på `span`.
- [x] (2026-11-04) `[P2]` UX: små länkar och textknappar under 44 px fick osynlig träffyta (`.hit`).
- [x] (2026-11-04) `[P2]` WCAG: pausade timersiffror 2,42:1 (opacity-40), nu `text-muted`.
- [x] (2026-11-04) `[P3]` 404-sidan var Nexts engelska standard, nu svensk.
- `[P3]` Tryckytor kvar under 44 px (klarar 24 px): segmentväljarna (Börja nu/Klart kl 27 px, målväljaren 36 px, metodväljaren 27 px), live-radernas titlar och ▶ (24 px), Tillagnings stegrubriker (38 px) och delrader (30 px), proteinkort och dropdowns i Din batch (42 px), Ingrediensers rader (43 px). Kräver att layouten ändras (raderna står tätt, en osynlig yta skulle täcka grannen), därför inte gjort. Kopiera lista, Rensa allt, Utforska preppträdet och målreglagen fick 44 px 2026-11-24 (`6f14601`, `f2845f6`).
- `[P3]` CSP via `<meta http-equiv>`: inte infört, Nexts export har inline-skript (kräver `unsafe-inline` eller hashar per bygge).

## Buggjakt 2026-11-24

- [x] (2026-11-24) `[P2]` Tangentbord: lådrutorna gick inte att öppna, arket tog inte fokus, proteinkorten hade dubbla tabbstopp (`6a8b229`, Playwright 390 och 1440 px).
- [x] (2026-11-24) `[P2]` Tillagning med tom plan visade ett schema för ingenting; ofullständiga lådor syntes inte där. Plural för 1 låda, smak och plåt (`c9f7e2a`, check + Playwright).
- [x] (2026-11-24) `[P2]` Offline: bara besökta sidor öppnades, djuplänk och appens länkar till Tillagning visade Välj (`d8dbd11`, Playwright offline lokalt).
- [x] (2026-11-24) `[P3]` Planen synkades inte mellan två flikar (eller PWA och flik): den flik som skrev sist skrev över den andras ändringar. `store.ts` lyssnar nu på `storage`-händelsen (`3f9342b`, check + Playwright två flikar).

## Fart, tillgänglighet och metadata 2026-11-25

Mätt live i headless Chromium, 390 px med 4x CPU och Slow 4G samt 1440 px, före och efter deploy. axe 4.14.0: 0 fel på alla fyra sidor i båda bredderna, före och efter.

- [x] (2026-11-25) `[P2]` Kitbilderna var 640 px (ca 140 KB) överallt men visas mest i 34–72 px. 256 px-varianter i `public/kits/256/` via `srcset` (`3e59a1e`): överfört Välj 1 760 -> 574 KB på mobil, 4 024 -> 982 KB på dator; Prepp 2 844 -> 757 och 3 457 -> 895 KB.
- [x] (2026-11-25) `[P2]` Layoutskifte i Tillagning: klockpanelen monterades efter hydreringen och flyttade sidan 121 px (`9f461a9`): CLS 0,055 -> 0,0006 på 390 px, 0,025 -> 0,0001 på 1440 px.
- [x] (2026-11-25) `[P3]` Metadata: alla sidor delade beskrivning och og:url, ingen hade canonical (`ab7133e`): nu egna per sida, kontrollerat live.
- `[P3]` Hashade filer (`_next/static`) får `max-age=14400` från GitHub Pages och Cloudflare, inte `immutable`. Kräver en cacheregel i Cloudflare-zonen (inställningsändring, Patriks beslut). Återbesök går ändå via service workerns cache.

## Buggjakt 2, 2026-11-24

- [x] (2026-11-24) `[P1]` En sparad plan som nämner ett kit, protein, metod, kolhydrat, grönsak eller region som en senare deploy tagit bort kraschade alla fyra sidor tills webbplatsdata rensades (återskapat live med sju seedade planer). `migratePlan` rensar okända id, en borttagen metod blir standardmetoden (`3f9342b`, check fäller den gamla koden).
- [x] (2026-11-24) `[P2]` Tillagning gav React-fel #418 (hydrering) vid varje besök en annan dag än bygget: etiketternas datum räknades vid exporten (`0314a26`, Playwright i Stockholms och New Yorks tidszon).

## Scenariojakt 2026-11-25

Flerstegsscenarier i Playwright mot lokalt bygge (skript utanför repot, `aifabriken-lanes/scen-bulk/`): vecka hopträngd, två flikar, 40 lådor med alla 32 kit, gårdagens bygge och service worker till dagens, bredd 320 till 1920 px mitt i flödet, flik öppen över natten. Varje fix fälls av sitt skript på det gamla bygget.

- [x] (2026-11-25) `[P2]` En timer som ringt ut och aldrig kvitterats ringde i dockan på alla sidor i all evighet (även en vecka senare). Dockan släpper klockor som ringt ut för mer än 12 h sedan, samma gräns som "Förra tillagningen", även i en flik som står öppen (`6ab61d3`).
- [x] (2026-11-25) `[P2]` Inköpslistans rader var vanliga knappar: avbockat syntes bara visuellt, inte för skärmläsare. Nu `role=checkbox` med `aria-checked` (`2f1e1d3`).
- [x] (2026-11-25) `[P2]` På 320 px gick sidan att skrolla 8 px i sidled på alla sidor: stegflikarna var för breda (`039c89c`).
- [x] (2026-11-25) `[P2]` Avbockade inköpsrader (`opacity-40`) föll på kontrast, axe 3 noder så fort en rad bockats (tidigare axe-körningar bockade aldrig någon). Nu `text-muted`, axe 0 på alla fyra sidor i 320, 390 och 1440 px, ljust och mörkt (`f3154f5`).
- [x] (2026-11-25) `[P1]` Tillagning gav React-fel #418 (hydrering) vid varje besök live sedan `9f461a9` (fartpasset samma natt): den dolda klockpanelen formaterade now = 0 i byggarens tidszon (UTC på Actions) och i webbläsarens vid hydreringen. Lokala byggen i svensk tid visade det inte. Platshållartider tills klockan är känd (`05e9f20`); återskapat med `TZ=UTC`-bygge, efter: inget fel i Stockholm, New York och Tokyo, CLS 0,0008 / 0,0006 / 0,0001 på 320 / 390 / 1440 px.
- [x] (2026-11-25) `[P3]` Service workerns cache (`bulk-v1`) rensades aldrig: gamla hashade filer låg kvar efter varje deploy (49 -> 52 poster över en deploy i scenariot). Nu en cache per deploy (`bulk-<tid>`), den gamla raderas (`1289aa4`). Playwright mot lokala byggen, gammalt bygge -> A -> B -> A: en cache, 0 skript från andra byggen, alla fyra sidor och länken till Tillagning offline efteråt, planen kvar; samma byggen med gamla sw.js: 4 skript från andra byggen.
- Inga fynd: två flikar (ändring, timer, kvittering och Rensa allt följer med), 40 lådor och 32 kit (Välj laddar på 0,7 s med 0,6 s långa uppgifter på 390 px utan CPU-strypning, 139 inköpsrader bockade och kvar efter omladdning), uppgradering med gammal service worker (plan och timer kvar, nya skript, alla fyra sidor offline efteråt). Typsnitten är redan självhostade (`next/font/google` lägger dem i `_next/static/media`), så batch 8:s förslag om Google Fonts gäller inte Bulk.

## Webbläsarpass 2026-11-25

WebKit (Playwright 1.64.1, webkit-2370, iPhone 13-profil: 390 px, touch, mobil UA), Firefox 1440 px (firefox-1555) och Chromium på samma flöden. Skript utanför repot (`aifabriken-lanes/xb-bulk/`). Inte en riktig iPhone.

- [x] (2026-11-25) `[P1]` Ett tryck på en lådruta med finger öppnade arket och stängde det direkt: arket öppnades på `pointerup`, och tryckets `click` kom efteråt och landade på bakgrunden. Återskapat live i WebKit och Chromium med iPhone 13-profil; mus och tangentbord påverkades inte. Dessutom gick det inte att byta lådor med långtryck och drag med finger: sidan skrollade i stället (`pointercancel`, `touch-action` byttes för sent). Arket öppnas nu på `click`, och ett lyft drag avbryter `touchmove` (`b1ce4c0`). Drag med finger är provat i Chromium (CDP-touch); Playwright WebKit kan inte dra med finger.
- Inga skillnader: Intl (`sv-SE`-tal, tider, datum, veckodag lika i alla tre), CSS (`dvh`, `:has`, `backdrop-filter` stöds, sticky header på plats efter skroll), sidledsscroll 0 på alla fyra sidor, inga sidfel eller hydreringsfel, plan och tillagning i localStorage överlever omladdning, Kopiera lista ger "Kopierad", timer och dockan efter omladdning, regionval, service worker och tre sidor offline. Appen har inga textfält för tal (bara reglage), inga `new Date(sträng)`, ingen lookbehind och ingen `structuredClone`. `input type=time` blir textfält i Playwrights WebKit på Windows (den porten saknar tidsväljare), värdet sparas ändå; på riktig iOS är det overifierat.

## Preferens- och språkpass 2026-11-25

Headless Chromium (playwright-core) mot lokalt bygge, skript i `aifabriken-lanes/prefs-bulk/`. Sidorna Välj, Ingredienser, Tillagning (en gående och en ringande timer) och Prepp.

- [x] (2026-11-25) Svensk text: "macros" blev "makros" (hero, metabeskrivning, og-bildens alt), kitnamnen "Filips Kebabgryta" och "Filips Cheeseburger" fick gemen efter genitiv som de andra Filips-kiten, "Pickles, hackad" blev "hackade", lådrutans tomma protein visar "Saknas" i stället för ett tankstreck. Tal går genom `sv-SE` (decimalkomma, mellanslag som tusentalsavgränsare), inga tankstreck i UI-text.
- [x] (2026-11-25) Mörkt läge: före CSS var duken vit (`canvas.mjs` mot buildapp.se/bulk: rgb(255, 255, 255)). Nu `<meta name="color-scheme" content="light dark">` via `viewport.colorScheme`: rgb(18, 18, 18). axe color-contrast 0 fel i mörkt läge; ljusa ytor i mörkt läge är bara de avsiktligt inverterade `bg-ink`-knapparna.
- [x] (2026-11-25) Reducerad rörelse: Motion följde inte systeminställningen (standard "never"). `MotionConfig reducedMotion="user"` i `Providers.tsx`, CSS-animationer och övergångar till 0,01 ms, hopp i tidslinjen utan mjuk skroll, blinkande "Klar" och de rullande siffrorna stilla (MotionConfig ensam lämnade sex opacitetsanimationer på siffrorna, nu 0 löpande animationer). Kvar efter klick: lägen som hoppar direkt, tidslinjens klocka som följer tiden och en opacitetstoning när en rad fälls ihop.
- [x] (2026-11-25) 200 % text: fynden från 155 till 101. Rubrikraden i Veckans priser, stegnavigeringen, segmentknapparna och receptraderna i Tillagning radbryts i stället för att krocka, `overflow-wrap: break-word` på body. Kvar är avsiktlig trunkering med ellips, de rullande siffrornas klippta ruta och tidslinjens etiketter på 390 px. Ingen sidledsscroll på någon sida. Stegnavigeringen fick 2 px mindre sidmarginal under 360 px: med radbrytning tillåten hamnade den annars på två rader vid 320 px och 100 % text (0,47 px för bred). "Sous vide" bryts på två rader vid 320 px, före sprack texten 11 px utanför knappen (56 px text i 45 px).
- [x] (2026-11-25) Forced colors: vald knapp (`aria-checked`, `aria-pressed`, `aria-current`) och fokusring försvann (bakgrund och box-shadow tas bort). Nu kontur i `Highlight`; målknapparna och antal lådor fick `aria-pressed`. 0 fynd i ljust och mörkt. Kvittera- och Starta-knappen fick mörkare bakgrund (`--p` blandat med 20 % svart) för vit text.
