# Backlog

## P0 (godkänt av Patrik 2026-09-24, byggs i nästa session)

### Grundbaser: kit som twist på en gemensam bas
Överlapp i dag (räknat 2026-09-24): krossade tomater i 8 kit, ingefära 7, tomatpuré 7, spiskummin 7, soja 5, rökt paprika 5.
- `Kit.base`: `tomat` | `asia` | `kram` | `rub` | ingen. En bas är ett fast recept per låda, t.ex. tomatbas = 100 g krossade + 8 g tomatpuré + 30 g gul lök + ½ vitlöksklyfta, puttra 15 min. Kitets `mix` blir bara twisten ovanpå (Chili: + kidneybönor, spiskummin, cayenne). Jämna ut tomatkitens mängder (60–160 g i dag) till en basportion; Patrik har godkänt att siffrorna ändras.
  - Tomat: Köttfärssås, Chili, Moussaka, Keema, Dahl, Paprikash, Chipotle, Tikka, Shepherd's.
  - Asiatisk (soja, ingefära, vitlök): Teriyaki, Sweet chili, Krapow, Jordnöt-lime, Gochujang.
  - Krämig (kvarg/Philadelphia, vitlök): Toscansk + Filips-kiten.
  - Rökig rub (spiskummin, rökt paprika): Chili, Chipotle, Kikärtor, Shawarma, BBQ. Chili hör till både tomat och rub: välj en primär bas.
- Välj: kiten grupperade som ett träd under sin bas, med tips som "3 kit på tomatbas = 1 gryta".
- Tillagning: steget "Koka tomatbasen för N lådor" och sedan "Dela i K: Chili + …, Keema + …".
- Ingredienser: basen som eget kort överst ("Tomatbas × 8").
- check.ts: handräknad basmängd för en blandad batch, och att basens och twistens näring summerar till lådan.

### Tillagning: digitala klockor och larm i stället för ugnsvyn
- Ta bort ugnsvyn med de randiga "virvlarna". Varje startad timer blir en stor animerad digital klocka (siffror som rullar, mm:ss eller h:mm:ss).
- Under varje klocka en kort text om vad den gäller, t.ex. "Kyckling i ugnen · 200 °C".
- Huvudtimers är protein-, kolhydrat- och grönsaksstegen som ska gå X minuter. Startade timers dyker upp i en snygg docka/rad högst upp (animerad in, sorterad på tid kvar) och går att nå medan man scrollar.
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
