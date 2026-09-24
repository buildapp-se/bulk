# Backlog

## P0 (godkänt av Patrik 2026-09-24, byggs i nästa session)

### Tillagning: digitala klockor och larm i stället för ugnsvyn
- Ta bort ugnsvyn med de randiga "virvlarna". Varje startad timer blir en stor animerad digital klocka (siffror som rullar, mm:ss eller h:mm:ss).
- Under varje klocka en kort text om vad den gäller, t.ex. "Kyckling i ugnen · 200 °C".
- Huvudtimers är protein-, kolhydrat- och grönsaksstegen som ska gå X minuter. Startade timers dyker upp i en snygg docka/rad högst upp (animerad in, sorterad på tid kvar) och går att nå medan man scrollar.
- Varje timer går att pausa och starta igen, och man kan lägga till eller dra bort minuter med plus och minus (t.ex. ±1 min). Timerstate måste då bära paustid och justering, inte bara starttid (`Cook.timers` i `store.ts`).
- Larm när en timer är klar: ljud (Web Audio, upprepas tills man kvitterar), vibration och avisering. Klockan pulserar och visar "Klar".

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
