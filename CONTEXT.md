# Bulk.

Modulär mealprep-planerare: laga neutrala baser (protein, kolhydrat, grönt) i bulk och byt smak per låda med ett smakkit. Live: https://buildapp.se/bulk/

Design från Claude Design-projektet "Mealprep" (ade1c1e3-d70f-4582-995b-bb751a52182b), filerna `Mealprep App.dc.html` och `Mealprep Översikt.dc.html`. Formen och tonen därifrån, logiken omskriven.

## Stack

- Next.js 16 (App Router), `output: 'export'`, `basePath: '/bulk'`, `trailingSlash: true`. Ingen server.
- React 19 `<ViewTransition>` för riktade sidbyten, Motion 13 (`motion/react`) för springs, layout-animationer, drag.
- Tailwind 4, tokens i `src/app/globals.css` (ljust + mörkt läge).
- TypeScript strict. `src/lib/*.ts` importerar med `.ts`-ändelse så att `node scripts/check.ts` kör samma kod som appen.
- PWA: `src/app/manifest.ts`, `public/sw.js` (network-first för sidor, cache-first för hashade assets), ikoner från `scripts/icons.mjs`.
- Deploy: `.github/workflows/deploy.yml` bygger på Ubuntu och publicerar `out/` till GitHub Pages. Repot är publikt av det skälet (Pages från privat repo kräver Pro). buildapp-se-orgens user-site gör att repot hamnar på buildapp.se/bulk.

## Filer

- `src/lib/data.ts`: all matdata. Näring per 100 g **rå** vikt, förpackningsstorlekar, metoder, smakkit.
- `src/lib/calc.ts`: ren motor. Plan in, lådor/näring/inköp/schema ut.
- `src/lib/store.ts`: localStorage + `useSyncExternalStore`. Nyckeln bär schemaversion (`bulk:plan:v1`).
- `src/i18n/sv.ts`: all UI-text. Matnamn ligger i data.ts.
- `scripts/check.ts`: handräknade förväntade värden + drift mot grammats `nutrients.json` (bara lokalt, där `../recept` finns).

## Beslut (grill 2026-09-24)

- **Modulsystem med snabba defaults.** Proteiner och kit fördelas jämnt, lådor tar det protein kitet föredrar. Varje låda kan ändras (tryck) eller bytas (håll inne och dra). Ofullständiga lådor är tillåtna: banner visar vad som saknas, inköpslistan räknar bara fyllda lådor.
- **Mjuka gränser.** Upp till 40 lådor. Fler än 3 kit eller proteiner, eller mer än ca 1,2 kg rått per plåt, ger varning, inte stopp.
- **Tillagningsmetod per protein:** ugn, sous vide (kyckling 64 °C, fläskkarré 74 °C), långkok i form (fläskkarré 150 °C), gryta (röda linser). Lax har inte sous vide: 50 °C pastöriserar inte och lådorna ska hålla 3–4 dagar.
- **Näring = rå vikt × Livsmedelsverket.** Värden från grammats `nutrients.json` (`gm`) eller LV:s API (`lv` = livsmedelsnummer). `src: 'est'` = etikett eller uppskattning. Olja ca 1 msk per 500 g rått på plåt räknas in. Utbytet används bara till "blir ca X g tillagat".
- **Mål:** standard Enkel + Behåll, 75 kg (Patrik 2026-09-24). Av / Enkel (Bulka, Behåll, Deffa + vikt) / Avancerad (Mifflin-St Jeor, aktivitet, lådor per dag). En låda = min(35 %, 60 %/lådor per dag) av dagsbehovet. Protein-reglaget styr proteinets gram, kcal-reglaget styr kolhydratens gram (löses iterativt eftersom de påverkar varandra).
- **Inköp avrundas till förpackningar**, minsta spill med högst två storlekar. Handskriven tabell i data.ts.
- **Svenska först**, engelska senare (text redan samlad i `sv.ts`).
- **Bilder:** en gouache-illustration per kit (transparent PNG, Codex imagegen på Patriks prenumeration), stil vald av Patrik bland 5 spår 2026-09-24. `node scripts/kit-art.ts [id]` genererar saknade, 640 px WebP i `public/kits/`. Råfiler i `design/art/` (ignoreras av git).
- **Grundbaser (2026-09-24).** `Kit.base` = `tomat` | `asia` | `kram` | `rub` (`BASES` i data.ts). Basen är ett fast recept per låda som kokas en gång för alla dess lådor och sedan delas; kitets `mix` är bara twisten. Tomatkiten har exakt en basportion (100 g krossade, 8 g puré, 30 g gul lök, ½ klyfta), inga egna tomater. Övriga kit fick basens mängd dragen från sin mix. Primär bas där kit passar två: Chili och Chipotle på tomat (båda har tomat och behöver kastrull). Krämig bas = 25 g Philadelphia light + vitlök; Toscansk gick från 60 till 40 g kvarg. Filips kebab och cheeseburger har ingen färskost och står utan bas. Rub: Rökiga kikärtor, Shawarma, BBQ.
- **Ingen inloggning ännu.** Firebase Auth kommer senare, samma mönster som familjehubben.

## Källor för smakkit

Kryddning kontrollerad mot högt betygsatta recept 2026-09-24: RecipeTin Eats (grekisk kyckling, chili, qeema, shepherd's pie, moussaka-pilaff, carnitas, teriyaki), ICA (köttfärssås, kålpudding, ugnslax soja/ingefära, pulled pork), Eating Thai Food (pad krapow), Anova/Serious Eats (sous vide carnitas och kyckling), Once Upon a Chef (rostade kikärtor). De lätta krämiga kiten är egna versioner på kvarg-, yoghurt- och kesellabaser (Patrik 2026-09-24: FIH-kokbokens kit var för nära originalen och ersattes). Källor: WellPlated (toscansk), Recipe Runner (paprikash), Skinnytaste (jordnöt-lime, tikka), Just One Cookbook (gochujang), Love and Lemons (chipotle-crema), ICA (dill och citron), RecipeTin Eats (shawarma). **Test (Patrik 2026-09-24):** FIH-kokbokens 8 kit ligger kvar som "Filips …" (id `filips-*`) för att provlagas; behålls eller raderas efter test. Stabilisering: majsstärkelse i yoghurt/kvarg (Ricardo), kalla såser i egen burk. Mängder per låda är egna nedskalningar, inte provlagade.

Livsmedelsverkets livsmedelsdatabas, CC BY 4.0. Källan visas i appen.
