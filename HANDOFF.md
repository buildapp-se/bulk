---
reviewedAt: 2026-11-25
schemaVersion: 1
status: active
currentGoal: "Bulk är live på buildapp.se/bulk: matlådeplanering med smakkit, inköp, tillagning och veckans priser i Umeå."
nextAction: "BACKLOG P1, test på riktig telefon. Filips-kiten ska provlagas och behållas eller raderas."
blockers: []
---
# Handoff

## 2026-11-25, P3-pass (gren `p3/2026-11-25`, worktree `C:/dev/_wt/bulk-1125p`), klar

Öppna P3: bara service workerns cache gick att bygga utan Patrik. Kalla lådor och airfryer kräver recept- och schemabeslut, fler städer väntar på att någon hör av sig (Patriks beslut), Next-buggen upstream är publicering utanför egna projekt, @types/node 26 väntar på Node 26 i CI, tryckytor, CSP-meta och `immutable`-cache står som Patriks beslut.
1. `1289aa4` `sw.js` hade en cache (`bulk-v1`) som behöll varje deploys hashade filer. Nu en cache per deploy (`bulk-<tid>`): en sidladdning vars HTML nämner en fil som cachen saknar bygger om cachen som vid install (filer som redan finns kopieras) och raderar den gamla. Första besöket efter denna deploy raderar `bulk-v1` eftersom `sw.js` ändrats. Playwright-skript `aifabriken-lanes/p3-bulk/sw-prune.mjs` mot lokala byggen, gammalt bygge -> A -> B (samma sw.js, nya hashar) -> A: en cache, 0 skript från andra byggen, alla fyra sidor och länken till Tillagning offline efteråt, planen kvar. Samma byggen med gamla `sw.js`: `bulk-v1` kvar med 4 skript från andra byggen (FAIL 7).

Live efter deploy (körning 45575070869, första försöket föll på GitHubs artefakt-API som förut, omkörning grön): `buildapp.se/bulk/sw.js` är den nya filen, och `p3-bulk/live.mjs` på 390 och 1440 px ger en `bulk-<tid>`-cache med 21 poster, alla fyra sidor offline, inga sidfel. PASS. Byte mellan två deployer live är inte provat (kräver en ny deploy); det täcks av det lokala skriptet.
## 2026-11-25, scenariojakt (gren `scen/2026-11-25`, worktree `C:/dev/_wt/bulk-1125c`), klar

Sex flerstegsscenarier i Playwright (skript utanför repot, `aifabriken-lanes/scen-bulk/`, `s1-week` till `s6-overnight`) mot lokala byggen före och efter: en vecka hopträngd (planera, ändra, ångra kit, bocka, timer, en vecka senare, Rensa allt, bygg om), två flikar, 40 lådor med alla 32 kit och alla proteiner, gårdagens bygge med service worker till dagens, bredd 320 till 1920 px med arket, receptet och en timer öppna, flik öppen över natten. Inloggning, import och export finns inte i Bulk. Varje fix fälls av sitt skript på det gamla bygget och klarar det nya.
1. `6ab61d3` En timer som ringt ut och aldrig kvitterats ringde i dockan på alla sidor för alltid. Dockan släpper klockor som ringt ut för över 12 h sedan (`forgotten` i clock.ts, samma gräns som "Förra tillagningen"), även i en öppen flik utan omladdning. Kontroll i check.
2. `2f1e1d3` Inköpslistans rader har `role=checkbox` och `aria-checked`.
3. `039c89c` Stegflikarna fick 8 px sidledsscroll på 320 px på alla sidor; smalare utfyllnad under 360 px.
4. `f3154f5` Avbockade inköpsrader föll på kontrast (axe 3 noder när en rad är bockad, även före). `text-muted` i stället för `opacity-40`; axe 0 på alla fyra sidor i 320, 390 och 1440 px, ljust och mörkt.
5. `05e9f20` Live-kontrollen efter första deployen hittade React #418 på Tillagning vid varje besök, infört av `9f461a9` (fartpasset): den dolda klockpanelen formaterade now = 0 i byggarens tidszon (UTC på Actions) och webbläsarens. Syns bara när bygget görs i en annan tidszon än besökarens, så bygg med `TZ=UTC npm run build` när en ändring rör tider i exporten. Platshållartider tills klockan är känd.

Live efter deploy (körning 45554887044 grön; 45553770608 för `1631ab9` föll först på GitHubs artefakt-API, omkörning grön): s1, s2, s3, s5 och s6 PASS mot buildapp.se/bulk, ingen #418 på någon sida i Stockholms, New Yorks och Tokyos tidszon, CLS Tillagning 0,0008 / 0,0006 / 0,0001 på 320 / 390 / 1440 px, axe 0 fel på alla fyra sidor i 320, 390 och 1440 px, ljust och mörkt. s4 (uppgradering med service worker) bara lokalt, den kräver en server som byter bygge.

Batch 8:s kodposter: typsnitten är redan självhostade via `next/font/google`, övriga parkerade poster (CSP-meta, `immutable`-cache, tryckytor) kräver Patriks beslut och är orörda. Ny P3: service workerns cache rensas aldrig.

## 2026-11-25, fart, tillgänglighet och metadata (gren `speed/2026-11-25`, worktree `C:/dev/_wt/bulk-1125s`), klar

Playwright-skript utanför repot (`aifabriken-lanes/speed-bulk/`), live före och efter, 390 px med 4x CPU och Slow 4G samt 1440 px, axe-core 4.14.0 från aifabriken.
1. `3e59a1e` Kitbilder i 256 px via `srcset` (640 px behålls för de stora i Ingredienser och lådans ark på telefon). Överfört live: Välj 1 760 -> 574 KB mobil, 4 024 -> 982 KB dator; Prepp 2 844 -> 757 och 3 457 -> 895 KB; Ingredienser dator 786 -> 436 KB. `scripts/kit-art.ts` skriver båda storlekarna.
2. `9f461a9` Tillagnings klockpanel renderas osynlig före hydreringen i stället för att saknas: CLS 0,055 -> 0,0006 (390 px), 0,025 -> 0,0001 (1440 px).
3. `ab7133e` Egen beskrivning, canonical och og:url per sida (`src/app/meta.ts`).

LCP mobil 2,2–2,4 -> 2,1–2,3 s (texten, nätet är golvet), dator under 0,3 s. axe 0 fel på alla fyra sidor i båda bredderna, före och efter. Deploy körning 45522546331, försök 4 grönt (1–3 föll på GitHubs artefakt-API som förut). Kvar: hashade filer har `max-age=14400`, inte `immutable` (Cloudflare-regel, Patriks beslut, BACKLOG P3).

## 2026-11-24, buggjakt 2 (gren `hunt2/2026-11-24`, worktree `C:/dev/_wt/bulk-1124k`)

Det buggjakt 1 inte gick: andra besöket med sparad plan efter att datat ändrats, två flikar samtidigt, 404, sällsynta flöden (målläge Av/Avancerad, Frysta, alla fyra regioner, Kopiera lista, Klart kl, Förra tillagningen, Rensa allt och sidorna efteråt), länkar, bilder, titlar, decimalpunkt och engelska i texten. Playwright-skript utanför repot (`aifabriken-lanes/hunt2-bulk/`), 390 och 1440 px.
1. `3f9342b` En sparad plan som nämner ett kit, protein, metod, val per kit eller låda eller region som datat inte längre har kraschade alla fyra sidor (`byId` kastar) tills webbplatsdata rensades. Återskapat live med sju seedade planer (21 av 28 sidvisningar föll). `migratePlan` rensar okända id, en borttagen metod blir proteinets standard. Samma commit: planen och tillagningen följer andra flikar via `storage`-händelsen (P3 från buggjakt 1; live visade flik två fel kcal efter en ändring i flik ett). Lokalt bygge: 28 av 28 sidvisningar utan fel, två flikar visar samma header. Check fäller den gamla koden.
2. `0314a26` Tillagning gav React-fel #418 (hydrering) vid varje besök en annan dag än bygget: etiketternas "Lagad … · ät senast …" räknades med `new Date()` vid exporten. Nu från `useNow` (0 på servern). Lokalt bygge i New Yorks tidszon (där det redan var 24 nov): inget fel, etiketten visar besökarens datum.

Live efter deploy (körning 45518774403; fyra försök före den föll på GitHubs artefakt-API, "No artifacts named github-pages", fast githubstatus var grön): de sju seedade planerna 28 av 28 sidvisningar utan fel, två flikar visar samma header, Tillagning utan #418 i Stockholms och New Yorks tidszon. PASS.

Inga fynd: titlar på alla sidor och 404 rätt, 0 trasiga bilder, 0 sidledsscroll, interna länkar och manifestets ikoner svarar 200, enda externa länken är mailto. Decimalpunkten i "CC BY 4.0" är licensnamnet. Inte testat: riktig telefon, service worker-uppdatering mellan två deployer, långsamt nät (sidorna är network-first utan tidsgräns, så ett nät som hänger väntar innan cachen används).

## 2026-11-24, buggjakt (gren `hunt/2026-11-24`, worktree `C:/dev/_wt/bulk-1124h`)

Användarflöden genomgångna i Playwright (egen headless Chromium) på 390 och 1440 px: alla fyra sidor, tangentbord, tom och halvfylld plan, timer + omladdning, bakåtknapp, offline. Tre fixar, alla buggar återskapade live före fixen och verifierade på ett lokalt bygge efter:
1. `6a8b229` Lådrutorna i Din batch gick inte att öppna med tangentbordet (bara `pointerup` öppnade arket; Enter och mellanslag ger `click` med `detail` 0). Arket tar nu fokus när det öppnas och lämnar tillbaka det till rutan när det stängs. Proteinkorten hade två tabbstopp var (Motion gör ett `whileTap`-element fokuserbart), nu ett.
2. `c9f7e2a` Tillagning utan någon komplett låda (efter Rensa allt) visade ett låtsasschema: "0 plåtar", Förbered allt, Ta ut allt. Nu en rad om att inget finns att laga och länk till Välj. Med några ofullständiga lådor visar Tillagning samma "N lådor saknar något"-länk som Ingredienser. Plural: "1 låda", "1 smak", "1 plåt" (headern visade "1 lådor · 1 smaker"); kontroll i check.
3. `d8dbd11` Offline: efter första besöket fungerade bara redan besökta sidor, en djuplänk till Tillagning offline visade Välj, och en länk i appen offline skickade tillbaka till Välj (RSC-anropet fick Välj-HTML som svar). `sw.js` cachar nu de fyra sidorna och deras assets vid install och faller bara tillbaka på Välj för navigering. Playwright offline: 4 av 4 sidor plus länken till Tillagning.

Live efter deploy (körning 45490929717, första försöket föll på GitHubs artefakt-API, omkörning grön): tangentbord, tom plan och plural PASS på buildapp.se/bulk i 390 och 1440 px. Cloudflare cachar `sw.js` 4 h (`max-age=14400`), så den nya service workern når besökare först när kantcachen gått ut; offline-testet live med origins färska `sw.js` (cache-brytande query) gav 4 av 4 sidor plus länken.

check, typecheck och build gröna. Inga UI-tester i check (den täcker `src/lib` och texterna); UI-verifieringen är Playwright-skript utanför repot. Inte testat: riktig telefon, skärmläsare.

## 2026-11-24, funktionspass (gren `feat/2026-11-24`, worktree `C:/dev/_wt/bulk-1124f`)

Klart:
1. `914f130` Bugg: Lidl-erbjudandena var borta sedan körningen 2026-11-04 (sista 2026-10-26). Lidl tog bort veckosidorna `/c/<slug>/a<id>`; erbjudandena ligger nu på matkategorisidorna under menyns Mat & dryck, som prices.ts läser. Styckpris ("/st") räknas om med ny styckvikt `Ingr.st` (gurka 280 g, aubergine 300 g, från Willys och Coops hyllrader). Lokal körning av prices.ts: 0 -> 4 Lidl-erbjudanden, Lidls gurka 9,90 kr/st = 35,36 kr/kg syns i Prepps prisöversikt (lokalt bygge, Playwright). Den lokala prices.json committades inte.
2. `6afc0d7` Matchning: "Gul lök" och "Röd paprika" (Lidl, ICA "Gul lök i nät") matchade inte, BUY krävde Willys ordföljd. Lokal körning: Lidl 4 -> 6 erbjudanden, hyllpriserna för lök och paprika oförändrade hos Willys och Coop.

check, typecheck och build gröna. prices.yml körd med workflow_dispatch (körning 45487637905, grön, commit `b17b108` Priser 2026-11-24): runnern får 6 Lidl-erbjudanden (gurka 35,36 kr/kg, röd paprika, gul lök, kycklingfilé, Kesella, apelsinjuice), ICA fortfarande 403. Deployad; live på https://buildapp.se/bulk/prepp/ visar Lidls gurka, lök och paprika i Veckans priser (Playwright, 1280 px).

## 2026-11-24, djuppass (gren `deep/2026-11-24`, worktree `C:/dev/bulk-deep-1124`)

Klart, pushat till main:
1. `4ca382f` Bugg: frysta grönsaker fick rostningens utbyte i portionering och recept (broccoli 140 g som "ca 100 g"). Frysta läggs i lådan som de är, så de saknar nu tillagad vikt. Check fäller den gamla koden.
2. `6f14601`, `f2845f6` Träffytor: Kopiera lista, Rensa allt och Utforska preppträdet fick `.hit`, målreglagen (protein och kcal per låda) är 44 px höga utan att layouten flyttas. Kontrollerat i Playwright på 390 och 1280 px på alla fyra sidor: ingen knapps mitt täcks av en annan yta, ingen sidledsscroll.
3. `f78c554` Uppräkningar i Tillagning med gemener och "och" ("Spenat, haricots verts och broccoli läggs frysta").
4. `22a69e2`, `75a78c1` Mutationstest: Stryker muterar nu även `actions.ts` och `store.ts`. 79,06 % -> 96,16 % (1 847 mutanter). Nytt i check: knapparnas plan-ändringar och lagringen mot en localStorage i minnet, ett gyllene schema för två planer (`scripts/check-schedule.txt`, uppdateras med `node scripts/check.ts --golden`), prepträdets giriga delning (första grenen = jobbet flest kit behöver, unika syskon-id) och ingrediensräkningen ("Torkad oregano" = "Oregano"). De 71 som överlever är likvärdiga med datat.

UX-granskning (ux-audit, lokalt bygge, 390 px, `--interact`): 6 av 7 skriptkontroller gröna, Fitts varnar. Skriptet läser bara elementets ruta och ser inte `.hit`; räknat med `.hit` är 63 mål under 44 px kvar (67 före), alla tätt staplade rader och segmentväljare (BACKLOG P3). Skärmbildsgenomgång av Välj och Tillagning: inga andra fynd. Inte gjort: riktig telefon, skärmläsare.

**Beroenden 2026-11-17:** next 16.4.2 till 16.4.6 (två moderata cacheläckor, GHSA-mfr8-8qww-v76h och GHSA-vc7v-qv4w-wrv8) plus `npm update` inom intervallen. typecheck, check och build gröna. @types/node 26 ligger som P3.

**2026-11-04, förbättringsrunda (gren `claude/forbattringar-2026-11-04`, PR #1, mergad 2026-11-04):** bara förbättringar, inga nya funktioner.
1. `5243081` Prepps två `aside` har namn (Veckans priser, Recept): axe `landmark-unique` på 1280 px 1 -> 0. Klockan i Tillagning hade `aria-label` på en `span` (axe `aria-prohibited-attr`, nämnt 2026-10-06 som "kan inte avgöras"), nu en `sr-only`-etikett före tiden.
2. `3496830` Klassen `.hit` i globals.css: osynlig 44 px träffyta runt små länkar och textknappar utan att något flyttas (loggan, Utforska, stegflikarna, Gör N lådor, Aviseringar, Nollställ, visa alla/färre, Säg till, Prepps markeringsknappar). Kontrollerat med `elementFromPoint` på 390 och 1280 px: ingen annan knapps mitt hamnar under en utökad yta, ingen horisontell scroll.
3. `859ef91` Pausade timersiffror (docka, klockpanel, Tillagnings lista) `text-muted` i stället för `opacity-40`: 2,42:1 -> minst 4,5:1 i ljust läge (3,45:1 i mörkt före). Skärmbild: pausad grå, gående svart.
4. `123676d` `src/app/not-found.tsx`: 404 på svenska. GitHub Pages visade Nexts engelska standardsida för alla saknade adresser under /bulk/ (kontrollerat live).

Verifierat: check, typecheck och build gröna efter varje steg; axe-core 4.10.3 via Playwright på alla fyra sidor plus 404, 390 och 1280 px, ljust och mörkt, med gående och pausad timer och markerat kit i Prepp: 0 fel. Tab genom alla sidor: fokusring vid varje stopp. **Inte verifierat:** riktig skärmläsare, riktig telefon. **Inte gjort:** CSP (Next lägger inline-skript i exporten, kräver `unsafe-inline` eller hashar per bygge; inte värt risken utan att kunna prova på Pages), segmentväljarna (27 till 36 px höga) och live-radernas knappar (24 px, tätt staplade) är kvar under 44 px eftersom de inte kan växa utan att layouten ändras; de klarar WCAG 2.5.8 (24 px).

**2026-11-04, mutationstest (gren `claude/mutation-2026-11-04`, PR #2, mergad 2026-11-04):** Stryker 9 med command runner mot `node scripts/check.ts` på `src/lib/calc.ts`, `prep.ts`, `price.ts` och `clock.ts` (UI muteras inte): 65,56 % före, 79,06 % efter (1 652 mutanter). clock och price 100 %, prep 89,70 %, calc 72,12 %. Nya kontroller i `scripts/check.ts`: gränser och tie-breaks i klockorna, `regular`/`unit`/`atStore`, korgen (färst luckor före pris, lika pris behåller första butiken, kedja utan hyllpriser), skafferikostnaden, `noun` och prep-jobben, `nearZero` (billigaste protein, ordning), Mifflin-St Jeor i avancerat läge, förpackningar vid lika total, formateringens gränser, inköpslistan, överblivet protein och schemats varningar (6 lådor = 3 plåtar utan varning, standardplanens 8 lådor = 4 plåtar med varning). `near()` släppte igenom NaN och fäller nu. Av de 346 kvar sitter 232 i `schedule`/`recipes`, mest stegtexter (107 strängmutanter totalt); resten är likvärdiga eller träffar bara ordning som datat aldrig ger. Ingen bugg, ingen produktionskod ändrad. TypeScript 7 saknar API:t Stryker skriver om tsconfig med: `tsconfigFile` pekar på en fil som inte finns. Kör: `npm i --no-save @stryker-mutator/core@9 && npx stryker run` (cirka 7 min).

**2026-10-18, mängder i Tillagning (Patrik lagade 3 kg karré delat på svampsås och Marry me):** Smaksätt/Dela-stegets kitrader visade bara namnen på twistens ingredienser. Nu mängd × kitets lådor, och vid delning hur stor del av basen kitet tar ("10 av 20 lådors bas"). Ny sektion "Recept för hela batchen" längst ner: varje rätt (kit + protein) med alla delar uppräknade till dess lådor, rå vikt plus tillagad där utbyte finns (`recipes` i calc.ts). Verifierat: check (svampsåsens rad för 10 av 20 lådor, Philadelphia 250 g per rätt), typecheck, build, och sidan i Chromium med den planen. Inte sett på telefon.
Samma dag: lådväljaren (`BoxCount`) även överst på Ingredienser och Tillagning, så batchen kan skalas från alla tre sidor. Under den en rad per protein som köps i hela förpackningar och räcker till fler lådor: "du köper 2,5 kg, lådorna tar 2,4 kg, ca 1 låda till" plus en knapp som sätter antalet (`spare` i calc.ts; per protein, så med flera proteiner är det en riktlinje). Appen vet inte vad man redan har hemma, bara vad den själv köper. Check: knappens antal kräver ingen ny förpackning. Sett i Chromium på 390, ingen sidledsscroll.

**2026-10-17, beroenden (pushade och deployade):** next 16.3.6 -> 16.4.2 (sex high-advisories, `npm audit fix` utan `--force` nådde inte den exakta pinnen), react och react-dom 19.3.1, motion 14 (tar bara bort interna API:er), `@types/node` 24 (matchar Node 24 i Actions, inte senaste 26), TypeScript 7 (Next 16.4 typkontrollerar med den; ett inlagt typfel fälldes av både `tsc` och `next build`). `npm audit` 1 high -> 0. check, typecheck och build gröna före och efter; de fyra byggda sidorna laddar i Chromium utan sidfel (404:orna på `__next.*.txt` är den kända Windows-buggen). Åtta knappar per sida klickade utan sidfel efter motion 14; inte provat på telefon.

**2026-10-06, nattbatch på grenen `batch/2026-10-06` (mergad till `main` och deployad 2026-10-07 på Patriks order):** åtta backlogposter i två rundor, en commit var.
1. `b09bc02` Lådans ark på 390 px: sidan gick att skrolla 32 px i sidled eftersom den dolda brickan sträcks över arkets huvud (delat `layoutId`) och dess kitbild stack ut. Brickan ritar inte bilden medan dess ark är öppet. `Pill` har `aria-pressed`. Mätt i playwright-cli på 390: scrollWidth 422 -> 390 med arket öppet, 4 valda av 62 knappar bär `aria-pressed=true`.
2. `0363f5a` `npm audit fix` (sharp 0.35.5, source-map-js): `npm audit` 0 sårbarheter.
3. `cf1a083` `prices.yml` checkar ut med `persist-credentials: false` och pushar via `gh auth setup-git`. zizmor artipacked 2 -> 0. **Inte verifierat:** själva pushen på GitHub. Ändringen ligger i `main` sedan 2026-10-07, men pushen i Actions är overifierad tills `prices.yml` körts nästa gång (schemalagt, eller en gång med workflow_dispatch); misslyckas den uteblir bara prisuppdateringen.
4. `73ef174` `--muted` #6f6a62 -> #6a655d (4,69:1 på `--sunken`). Proteinkortets kryssruta är en knapp överst i kortet, syskon till metodväljaren; hela kortet är fortfarande klickyta. axe 4.13 på 390 px: Välj, Ingredienser och Prepp 0 fel; mellanslag, Enter och klick på kortet växlar en gång, metodväljaren växlar inte kortet.
5. `8cf6968` `span` i stället för `div` i målknapparna: html-validate `element-permitted-content` 0 på alla fyra byggda sidor.

6. `dd2d0ce` WCAG på Tillagning: stegens anteckningar utan `opacity-80`, live-radens titel är knappen (raden är fortfarande klickyta, ▶ ligger bredvid i stället för inuti), spårbrickorna 20 % mörkare så att vit text når minst 4,70:1 i ljust och mörkt läge (staplarna har kvar sin färg). axe 4.13 på 390 px: Tillagning 27 kontrastfel och 5 `nested-interactive` -> 0, övriga tre sidor 0. Enter på titeln och klick på raden hoppar till steget, ▶ startar klockan utan att hoppa.
7. `eec9c07` 15 av 19 `src: 'est'` ersatta: nio från LV:s API, sex från etiketter på willys.se (lista i CONTEXT). De fem etiketterna från 2026-09-29 saknade var de lästes (`'…, '`), nu `willys.se 2026-09-29`. Check räknar andelen per låda för 13 av dem och håller en fast lista över de fyra som är kvar.
8. `aebe3f9` Stekpanna (`panna`) för kyckling och de fyra färserna: eget steg på spisen som slutar med ugnen, ingen plåt, olja räknas. Kycklingens fyra metoder står i två kolumner (i en rad blev väljaren 30 px för bred på 390). Check: steget börjar minut 25 och varar 10, inget ugnssteg, olja 4,55 g per 175 g, panna är aldrig standard. Sett i playwright-cli på 390: valet sparas, Tillagning visar "Stek nötfärs", ingen sidledsscroll, axe 0 på Välj och Tillagning.

Check, typecheck och build gröna efter sista ändringen. **Inte provlagat:** pannans tider (mitt val: kyckling 15 min, färs 10, sojafärs 8).

**Väntar på Patrik** (hoppat över i batchen, står i BACKLOG): vitkålssallad eller coleslaw i BBQ-kitet (90 mot 300 kcal per 100 g), Lättkesella finns inte hos Willys, etikett för Frank's RedHot och jordnötspulver; temperatur, tid och kit för fläskfilé och kalkon i sous vide; vilken butiks förpackningar som ska styra inköpslistan; engelska (next-intl ändrar adresserna på en statisk sajt); airfryer (korgen rymmer en bråkdel av en plåt, schemat behöver ett beslut); ICA:s vanliga priser (WAF-spärren rundar vi inte) och pris på jordnötspulver (ny butik); telefontestet; Next-buggen upstream (publicering utanför egna projekt).

Sett men inte åtgärdat: axe markerar två saker som "kan inte avgöras" på Tillagning (`aria-label` på klockans `span`, paus-knappen i timerdockan med `opacity-70`), inga fel. zizmor 1.x klagar också på att actions inte är pinnade till hash (7 st, `unpinned-uses`), inte infört i BACKLOG som krav.

**2026-10-03, regioner (`0bb7855`):** Veckans priser har ett regionval (Umeå, Stockholm, Göteborg, Malmö) som styr vilka butiker och erbjudanden som räknas; vanliga priser är nationella. Storstäderna har en Willys, en Maxi och en Stora Coop var, alla gav erbjudanden i första körningen (prices.json 46 -> 57 KB). Raden "Bor du någon annanstans? Säg till" mejlar kontakt@buildapp.se. Verifierat: check (Umeå ser aldrig Stockholms butiker, Stockholms butik vinner där med 20,12 kr, gammal fil = Umeå), typecheck, build, playwright-cli 1280 (Stockholm och Malmö visar bara egna butiker, valet överlever omladdning) och 390 (44 px select, ingen horisontell scroll).

**2026-09-29, batch i fyra delar (alla pushade, check + typecheck + build gröna):**
1. `1c584c6` Förbered allt tar med kitens knivjobb, ihopslagna per jobb med basernas (vitlök från asiatisk bas + grekisk = en rad, 3 st), underrad med vilka baser och kit, tiden följer raderna. Sett i playwright-cli på 390 och 1280, ingen horisontell scroll.
2. `4c28e18` Bulgur och mini fraiche från LV (829, 2046); Philadelphia light, BBQ-sås, ostronsås, matvete och Milda (nu Flora Matlagning 4 %) från etiketter på willys.se, `src: 'etikett'` + `label`. Handräknade andelar per låda i check.
3. `5e02039` Lidls nationella erbjudanden i prices.ts (i dag: paprikamix, lax, fläskfärs), syns i översikten men räknas aldrig som hel butik (check). Chipotlepasta som ersättare för chipotle i adobo, Flora 4 % matchas. Buggfix: Coops literpriser föll bort (enheten heter `liter`), Coop 56 -> 71 vanliga priser. Kvar utan pris: jordnötspulver. Sett i Prepp på 390 och 1600.
4. `59f17dd` Stabila låd-id (`teriyaki:0`), `Plan.v` 2, migrering av v1-planer vid inläsning. Testat i check (flytt vid 10 lådor, 4:e kit, nytt protein, rensning, migrering) och i webbläsaren: en seedad v1-plan med pasta på låda 4 migrerades, +2 lådor flyttade pastan till låda 5.

**Inte verifierat:** prices.yml-körningen på GitHub med Lidl-koden (körd lokalt, samma kod).

**2026-09-26, makron per ingrediens:** lådkorten på 02 Ingredienser visar kcal, protein, kolhydrat och fett under varje ingrediens, basen som en rad och oljan till plåten som egen rad så att raderna summerar till lådan (`partMacro` i calc.ts, check: raderna summerar till lådans fyra värden, kyckling 175 g = 182 kcal). Sett i playwright-cli på 390 px, ingen horisontell scroll på 390 och 1280.

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

## Automated audit batch, 2026-10-06

Cross-project run from elwyn-dash with aifabriken `tools/audit-suite.ts` (headers, npm audit, secrets, Actions, markup, axe at one mobile viewport; TLS and Lighthouse not run). Results are the `(automated)` lines under `## Audits` in CONTEXT.md, findings under `## Granskning 2026-10-06` in BACKLOG.md. Markup fail (div inside button), axe fail (contrast on 10 nodes, one nested-interactive), npm audit fail (2 high in production dependencies), Actions fail (one medium). Headers fail is the shared buildapp.se CSP without `script-src` (zone Transform Rule, owned by elwyn-dash `docs/security.md` §Open 11), not something this repository can fix. No application code or deployment changed. `reviewedAt` was left alone: the goal and next action above were not reviewed.

## 2026-11-04: prisjobbet föll på ICA 403

`prices.yml` föll 2026-10-29 och 2026-11-02: ICA:s erbjudandesidor svarar 403 mot GitHubs runners (bot-spärr, kringgås inte enligt repots regel). En butik som svarar fel hoppas nu över med en loggrad (`b1937c4`), så Willys och Coop uppdateras ändå. Körning 41911189784 grön: ICA 0 erbjudanden, 117 totalt. Hemifrån svarar ICA fortfarande till Nodes `fetch` (30 erbjudanden 2026-11-04), så spärren gäller runnerns IP. ICA-erbjudanden saknas därför i veckokörningarna tills vidare.
