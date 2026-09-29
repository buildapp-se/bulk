# Backlog

## P1
- Priser, nästa steg: ICA:s vanliga priser om det finns en öppen väg utan bot-spärr. Jordnötspulver saknar pris (finns inte hos Willys eller Coop, kanske hälsokost eller nätbutik). Lidl-varor som bara har styckpris (gurka, avokado) räknas inte, de saknar kg-pris.
- Testa på riktig telefon (iPhone + Android): installera som PWA, aviseringar, larmljud och vibration när en timer är klar (även med skärmen låst), haptik (iOS switch-tricket), Wake Lock.

## P2
- Firebase Auth + synk av plan mellan enheter (familjehubbens mönster).
- Stekpanna som tillagningsmetod. Fler sous vide-proteiner (fläskfilé, kalkon).
- Fler `src: 'est'` kvar (grekisk yoghurt, kesella, gochujang, sriracha, chipotle, jordnötspulver, Filips-ingredienser m.fl.): samma väg, LV eller etikett via willys.se:s produkt-API (`/axfood/rest/p/<kod>`, `nutrientHeaders`).
- Riktiga förpackningsstorlekar från ICA/Willys i stället för handskriven tabell.
- Engelska (`en.ts` + next-intl). Matnamnen i data.ts behöver också översättas.
- Per-låda-ändringar försvinner när antal lådor, kit eller proteiner ändras (index flyttas). Stabila låd-id om det stör.


## P3
- Kalla lådor (yoghurtbaserade pastasallader ur FIH-boken) som eget spår.
- Airfryer som metod.
- Rapportera Next 16-buggen upstream: `export/index.js` byter bara `/` mot `.` i segmentfilnamn, så på Windows hamnar prefetch-filerna i undermapp och ger 404 lokalt.
