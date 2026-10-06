# Backlog

## P1
- Priser, nästa steg: ICA:s vanliga priser om det finns en öppen väg utan bot-spärr. Jordnötspulver saknar pris (finns inte hos Willys eller Coop, kanske hälsokost eller nätbutik). Lidl-varor som bara har styckpris (gurka, avokado) räknas inte, de saknar kg-pris.
- Testa på riktig telefon (iPhone + Android): installera som PWA, aviseringar, larmljud och vibration när en timer är klar (även med skärmen låst), haptik (iOS switch-tricket), Wake Lock.

## P2
- Firebase Auth + synk av plan mellan enheter (familjehubbens mönster).
- Stekpanna som tillagningsmetod. Fler sous vide-proteiner (fläskfilé, kalkon).
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

## Granskning 2026-10-06

Fynd från den automatiska sviten (aifabriken `tools/audit-suite.ts`: headers, npm audit, secrets, Actions, markup, axe). Mätvärdena står som `(automated)`-rader under `## Audits` i CONTEXT.md.

- [x] (2026-10-06) `[P2]` npm audit: 2 high i produktionsberoenden (sharp <0.35.5, source-map-js). `npm audit fix` löser båda.
- [x] (2026-10-06) `[P2]` Actions: `.github/workflows/prices.yml:22` checkar ut utan `persist-credentials: false` (zizmor artipacked, medium). Pushen går nu via `gh auth setup-git`; overifierat tills `prices.yml` körts på GitHub efter merge (kör workflow_dispatch en gång).
- [x] (2026-10-06) `[P2]` WCAG: kontrast 4,35:1 (#6f6a62 på #ebe7e0) på 10 element: navlänkarna Ingredienser och Tillagning samt radiogruppen. Kravet är 4,5:1. Dessutom `nested-interactive`: ett `[role=checkbox]`-kort har fokuserbara barn.
- [x] (2026-10-06) `[P3]` Markup: `<div>` inuti `<button>` på 6 ställen (html-validate `element-permitted-content`). Byt inre `div` mot `span`.
- [x] (2026-10-06) `[P2]` WCAG, Tillagning (hittat 2026-10-06 med axe 4.13 lokalt på 390 px, sviten mätte bara startsidan): kontrast 3,48:1 på 26 element (`text-muted` med `opacity-80` i stegens listor, `Cook.tsx` `Lines`) och `nested-interactive` på 5 rader i live-läget (rad med ▶-knapp inuti). Välj, Ingredienser och Prepp har 0 fel. Dessutom spårbrickorna (vit text på spårfärgen, 2,71–3,53:1), som axe först såg när de andra felen var borta.
