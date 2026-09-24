# Backlog

## P1
- Testa på riktig telefon (iPhone + Android): installera som PWA, aviseringar i live-läget, haptik (iOS switch-tricket), Wake Lock.

## P2
- Firebase Auth + synk av plan mellan enheter (familjehubbens mönster).
- Stekpanna som tillagningsmetod. Fler sous vide-proteiner (fläskfilé, kalkon).
- Byt `src: 'est'` mot LV- eller etikettvärden: Philadelphia light, mini fraiche, Milda, BBQ-sås (LV "Grillsås" ser fel ut), ostronsås, matvete, bulgur.
- Riktiga förpackningsstorlekar från ICA/Willys i stället för handskriven tabell.
- Engelska (`en.ts` + next-intl). Matnamnen i data.ts behöver också översättas.
- Per-låda-ändringar försvinner när antal lådor, kit eller proteiner ändras (index flyttas). Stabila låd-id om det stör.

## P3
- Kalla lådor (yoghurtbaserade pastasallader ur FIH-boken) som eget spår.
- Airfryer som metod.
- Rapportera Next 16-buggen upstream: `export/index.js` byter bara `/` mot `.` i segmentfilnamn, så på Windows hamnar prefetch-filerna i undermapp och ger 404 lokalt.
