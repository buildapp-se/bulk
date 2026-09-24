// All food data in one place. Nutrition is per 100 g RAW (as bought).
// src: 'lv' = Livsmedelsverket, via grammat's nutrients.json (`gm`, drift-checked by scripts/check.ts) or the LV API (`lv` = food number),
//      'est' = estimate (label/typical value), replace when a real source is found.
// Livsmedelsverkets livsmedelsdatabas, CC BY 4.0.

export type Macro = readonly [kcal: number, protein: number, carbs: number, fat: number];
export type Cat = 'kött' | 'grönt' | 'fryst' | 'skafferi' | 'mejeri';

export interface Ingr {
  name: string;
  n: Macro;
  src: 'lv' | 'est';
  gm?: string; // grammat nutrients.json key
  lv?: number; // Livsmedelsverket food number (dataportal.livsmedelsverket.se)
  cat: Cat;
  packs?: readonly number[]; // typical Swedish package sizes in g (ml ≈ g)
  y?: number; // cooked/raw yield, only for "blir ca X g tillagat"
}

const INGR_ = {
  kycklingfile: { name: 'Kycklingfilé', n: [104, 23.1, 0, 1.2], src: 'lv', gm: 'kycklingfilé', cat: 'kött', packs: [500, 900, 1500], y: 0.75 },
  notfars: { name: 'Nötfärs 10 %', n: [182, 20.1, 0, 11.3], src: 'lv', gm: 'nötfärs', cat: 'kött', packs: [500, 1000], y: 0.75 },
  blandfars: { name: 'Blandfärs', n: [201, 18.8, 0, 14.1], src: 'lv', gm: 'köttfärs', cat: 'kött', packs: [500, 1000], y: 0.75 },
  flaskfars: { name: 'Fläskfärs', n: [202, 16.8, 0, 15.1], src: 'lv', lv: 4583, cat: 'kött', packs: [500, 1000], y: 0.75 },
  flaskkarre: { name: 'Fläskkarré', n: [171, 17.8, 0, 11.2], src: 'lv', lv: 978, cat: 'kött', packs: [1000, 1500], y: 0.7 },
  lax: { name: 'Laxfilé', n: [203, 20, 0.7, 13.4], src: 'lv', lv: 3800, cat: 'kött', packs: [250, 500, 1000], y: 0.85 },
  kikartor: { name: 'Kikärtor (avrunna)', n: [128, 7.5, 15.7, 2.5], src: 'lv', lv: 3815, cat: 'skafferi', packs: [230, 460], y: 0.85 },
  linser: { name: 'Röda linser', n: [339, 24.4, 52.5, 0.8], src: 'lv', gm: 'röda linser (torkade)', cat: 'skafferi', packs: [500, 1000], y: 2.5 },

  ris: { name: 'Ris', n: [354, 7.5, 78.2, 0.7], src: 'lv', gm: 'ris (gärna jasmin)', cat: 'skafferi', packs: [1000, 2000], y: 2.8 },
  pasta: { name: 'Pasta', n: [358, 11.9, 71.5, 1.3], src: 'lv', gm: 'spagetti', cat: 'skafferi', packs: [500, 1000], y: 2.3 },
  bulgur: { name: 'Bulgur', n: [342, 12.3, 68, 1.3], src: 'est', cat: 'skafferi', packs: [500, 1000], y: 2.8 },
  matvete: { name: 'Matvete', n: [350, 12.5, 69, 2], src: 'est', cat: 'skafferi', packs: [500, 1000], y: 2.5 },
  couscous: { name: 'Couscous', n: [361, 12.8, 72.4, 0.6], src: 'lv', lv: 831, cat: 'skafferi', packs: [500, 1000], y: 2.5 },
  potatis: { name: 'Potatis', n: [79, 1.7, 16.4, 0.1], src: 'lv', lv: 4457, cat: 'grönt', packs: [1000, 2000], y: 0.8 },
  sotpotatis: { name: 'Sötpotatis', n: [71, 1.6, 12.9, 0.4], src: 'lv', gm: 'sötpotatis', cat: 'grönt', packs: [500, 1000], y: 0.8 },

  broccoli: { name: 'Broccoli', n: [36, 2.9, 3.5, 0.6], src: 'lv', gm: 'broccoli', cat: 'grönt', packs: [400, 750], y: 0.7 },
  paprika: { name: 'Paprika', n: [22, 0.5, 4.1, 0.2], src: 'lv', gm: 'röd paprika', cat: 'grönt', packs: [500], y: 0.7 },
  haricots: { name: 'Haricots verts', n: [29, 2.2, 3.1, 0], src: 'lv', lv: 332, cat: 'fryst', packs: [250, 750], y: 0.85 },
  vitkal: { name: 'Vitkål', n: [32, 1.2, 5.7, 0], src: 'lv', lv: 370, cat: 'grönt', packs: [1000], y: 0.7 },
  aubergine: { name: 'Aubergine', n: [19, 1.1, 2.2, 0.1], src: 'lv', lv: 372, cat: 'grönt', packs: [350], y: 0.6 },
  wokmix: { name: 'Wokgrönsaker', n: [47, 1.8, 4.9, 1.6], src: 'lv', lv: 425, cat: 'fryst', packs: [500, 1000] },
  artmorot: { name: 'Ärtor och morötter', n: [45, 3, 6.5, 0.4], src: 'est', cat: 'fryst', packs: [750] },
  spenat: { name: 'Spenat', n: [20, 2.2, 0.5, 0.6], src: 'lv', lv: 361, cat: 'fryst', packs: [450, 750] },
  artor: { name: 'Gröna ärtor', n: [69, 5.2, 8.9, 0.4], src: 'lv', lv: 374, cat: 'fryst', packs: [500, 1000] },
  edamame: { name: 'Edamame', n: [130, 10.9, 4.9, 6.4], src: 'lv', lv: 5860, cat: 'fryst', packs: [400, 500] },
  majs: { name: 'Majs', n: [81, 3.2, 10.1, 1.9], src: 'lv', gm: 'majs (fryst, tinad)', cat: 'fryst', packs: [400, 750] },

  olja: { name: 'Olja', n: [884, 0, 0, 100], src: 'lv', gm: 'olja', cat: 'skafferi' },
  olivolja: { name: 'Olivolja', n: [884, 0, 0, 100], src: 'lv', gm: 'olivolja', cat: 'skafferi', packs: [500] },
  svartabonor: { name: 'Svarta bönor', n: [111, 8.1, 13.8, 1], src: 'lv', gm: 'svarta bönor (kokta)', cat: 'skafferi', packs: [230, 380] },
  kidney: { name: 'Kidneybönor', n: [110, 8.8, 13.4, 0.7], src: 'lv', gm: 'kidneybönor (avrunna)', cat: 'skafferi', packs: [230, 380] },
  salsa: { name: 'Salsa', n: [30, 1.2, 6, 0.2], src: 'lv', gm: 'salsa (texmex)', cat: 'skafferi', packs: [230, 500] },
  tacokrydda: { name: 'Tacokrydda', n: [300, 10, 50, 10], src: 'lv', gm: 'texmexkrydda', cat: 'skafferi', packs: [28] },
  teriyaki: { name: 'Teriyakisås', n: [110, 3.2, 22.2, 0.8], src: 'lv', gm: 'teriyakisås', cat: 'skafferi', packs: [250, 500] },
  bbq: { name: 'BBQ-sås', n: [150, 1, 35, 0.5], src: 'lv', gm: 'bbq-sås', cat: 'skafferi', packs: [500] },
  krossade: { name: 'Krossade tomater', n: [22, 0.8, 3.7, 0.2], src: 'lv', gm: 'krossade tomater', cat: 'skafferi', packs: [400, 500] },
  passerade: { name: 'Passerade tomater', n: [24, 1.2, 4, 0.2], src: 'est', cat: 'skafferi', packs: [500] },
  tomatpure: { name: 'Tomatpuré', n: [84, 4.4, 13.5, 0.2], src: 'lv', gm: 'tomatpuré', cat: 'skafferi', packs: [70, 200] },
  kokosmjolk: { name: 'Kokosmjölk', n: [168, 1.2, 0, 18.3], src: 'lv', gm: 'kokosmjölk', cat: 'skafferi', packs: [400] },
  grädde: { name: 'Matlagningsgrädde 15 %', n: [162, 3, 4.2, 15], src: 'lv', gm: 'grädde (kokbar)', cat: 'mejeri', packs: [250, 500] },
  graddfil: { name: 'Gräddfil', n: [128, 2.5, 4, 11.5], src: 'lv', gm: 'gräddfil', cat: 'mejeri', packs: [300] },
  rivenost: { name: 'Riven ost', n: [337, 24.9, 1.4, 26], src: 'lv', gm: 'riven ost', cat: 'mejeri', packs: [150, 300] },
  parmesan: { name: 'Parmesan', n: [428, 31.1, 4.2, 32.2], src: 'lv', gm: 'parmesanost', cat: 'mejeri', packs: [100, 200] },
  feta: { name: 'Fetaost', n: [272, 16.7, 2.1, 22.1], src: 'lv', lv: 94, cat: 'mejeri', packs: [150, 200] },
  tzatziki: { name: 'Tzatziki', n: [75, 2.4, 4.2, 5.5], src: 'lv', lv: 2144, cat: 'mejeri', packs: [200, 500] },
  yoghurt: { name: 'Turkisk yoghurt', n: [95, 3.5, 4, 7.5], src: 'est', cat: 'mejeri', packs: [500, 1000] },
  sesam: { name: 'Sesamfrön', n: [573, 17.7, 23.4, 49.7], src: 'lv', gm: 'sesamfrön', cat: 'skafferi', packs: [100] },
  soja: { name: 'Japansk soja', n: [72, 7.7, 10.1, 0], src: 'lv', gm: 'japansk soja', cat: 'skafferi', packs: [150, 500] },
  ostronsas: { name: 'Ostronsås', n: [110, 2, 25, 0], src: 'est', cat: 'skafferi', packs: [150, 255] },
  sweetchili: { name: 'Sweet chilisås', n: [207, 0.8, 43.4, 2.9], src: 'lv', lv: 2007, cat: 'skafferi', packs: [250, 500] },
  pesto: { name: 'Grön pesto', n: [581, 4.2, 12.6, 57.1], src: 'lv', lv: 2004, cat: 'skafferi', packs: [140, 190] },
  soltorkade: { name: 'Soltorkade tomater', n: [200, 4, 12, 15], src: 'est', cat: 'skafferi', packs: [180, 280] },
  coleslaw: { name: 'Vitkålssallad', n: [90, 1, 9, 5.5], src: 'est', cat: 'mejeri', packs: [250, 500] },
  sirap: { name: 'Ljus sirap', n: [300, 0, 75, 0], src: 'est', cat: 'skafferi', packs: [500] },
  lingon: { name: 'Lingonsylt', n: [180, 0.3, 45, 0.2], src: 'est', cat: 'skafferi', packs: [400] },
  worcester: { name: 'Worcestershiresås', n: [78, 0.9, 19.5, 0], src: 'lv', gm: 'worcestersås', cat: 'skafferi', packs: [150] },
  apelsin: { name: 'Apelsinjuice', n: [45, 0.7, 10, 0.2], src: 'est', cat: 'mejeri', packs: [1000] },
  gurka: { name: 'Gurka', n: [13, 0.8, 2.3, 0], src: 'lv', gm: 'gurka', cat: 'grönt', packs: [350] },
  champinjoner: { name: 'Champinjoner', n: [27, 2.4, 2.7, 0.2], src: 'lv', gm: 'champinjoner', cat: 'grönt', packs: [250, 500], y: 0.6 },
  // Light creamy bases and new kit ingredients (LV API 2026-09-24, else label values = 'est').
  kvarg: { name: 'Kvarg 0,2 %', n: [64, 10, 5.2, 0.2], src: 'lv', lv: 3243, cat: 'mejeri', packs: [500, 1000] },
  grekisk: { name: 'Grekisk yoghurt 0,2 %', n: [57, 10, 4, 0.2], src: 'est', cat: 'mejeri', packs: [500, 1000] },
  yoghurt3: { name: 'Yoghurt naturell 3 %', n: [56, 3.4, 4.5, 2.7], src: 'lv', lv: 124, cat: 'mejeri', packs: [1000] },
  kesella: { name: 'Lättkesella', n: [70, 12, 4, 0.3], src: 'est', cat: 'mejeri', packs: [250, 500] },
  lattcreme: { name: 'Lätt crème fraiche', n: [138, 2.9, 5.2, 11.9], src: 'lv', lv: 7139, cat: 'mejeri', packs: [200, 500] },
  kokoslatt: { name: 'Lätt kokosmjölk', n: [80, 0.6, 3, 7.1], src: 'lv', lv: 1566, cat: 'skafferi', packs: [400] },
  tahini: { name: 'Tahini', n: [625, 20.4, 3.6, 57.2], src: 'lv', lv: 3602, cat: 'skafferi', packs: [300] },
  pbpulver: { name: 'Jordnötspulver', n: [500, 50, 42, 12.5], src: 'est', cat: 'skafferi', packs: [180, 454] },
  jordnotter: { name: 'Rostade jordnötter', n: [605, 22.4, 9.3, 51.3], src: 'lv', lv: 1561, cat: 'skafferi', packs: [200] },
  gochujang: { name: 'Gochujang', n: [215, 4, 48, 1], src: 'est', cat: 'skafferi', packs: [170, 500] },
  chipotle: { name: 'Chipotle i adobo', n: [60, 2, 10, 2], src: 'est', cat: 'skafferi', packs: [200] },
  sriracha: { name: 'Sriracha', n: [100, 2, 20, 1], src: 'est', cat: 'skafferi', packs: [435] },
  honung: { name: 'Honung', n: [332, 0.3, 81.5, 0], src: 'lv', gm: 'honung', cat: 'skafferi', packs: [350] },
  senap: { name: 'Senap', n: [173, 4.5, 23.1, 6.8], src: 'lv', lv: 1972, cat: 'skafferi', packs: [300] },
  majsstarkelse: { name: 'Majsstärkelse', n: [362, 0, 87.5, 0.7], src: 'lv', lv: 1945, cat: 'skafferi', packs: [400] },
  // Trial: ingredients for Filips kits (FIH cookbook), label values.
  philadelphia: { name: 'Philadelphia light', n: [145, 7.4, 4.9, 11], src: 'est', cat: 'mejeri', packs: [200, 300] },
  minifraiche: { name: 'Mini fraiche', n: [70, 3.2, 3.8, 5], src: 'est', cat: 'mejeri', packs: [200, 500] },
  mildamat: { name: 'Milda Mat Lätt', n: [62, 3, 4.5, 3.5], src: 'est', cat: 'mejeri', packs: [250, 500] },
  lattmjolk: { name: 'Lättmjölk', n: [38, 3.5, 5, 0.5], src: 'est', cat: 'mejeri', packs: [1000] },
  ajvar: { name: 'Ajvar', n: [70, 1.3, 8, 3.5], src: 'est', cat: 'skafferi', packs: [350] },
  kebabsas: { name: 'Röd kebabsås', n: [120, 1, 25, 1.5], src: 'est', cat: 'skafferi', packs: [300] },
  hotsauce: { name: "Frank's RedHot", n: [10, 0.5, 1, 0.5], src: 'est', cat: 'skafferi', packs: [148] },
  ost: { name: 'Mager ost', n: [270, 30, 0, 17], src: 'est', cat: 'mejeri', packs: [150, 500] },
} as const satisfies Record<string, Ingr>;

export type IngrId = keyof typeof INGR_;
export const INGR: Record<IngrId, Ingr> = INGR_;

// ---------- Cooking ----------

export type MethodId = 'ugn' | 'sousvide' | 'form' | 'gryta';
export interface Method { temp: number; min: number; note: string; sear?: string }

export interface Protein {
  id: string;
  name: string;
  ingr: IngrId;
  raw: number; // default raw grams per box
  methods: Partial<Record<MethodId, Method>>;
}

export const PROTEINS: readonly Protein[] = [
  { id: 'kyckling', name: 'Kyckling', ingr: 'kycklingfile', raw: 175, methods: {
    ugn: { temp: 200, min: 20, note: 'Filé i 2–3 cm bitar, ca 18–20 min. Ska vara genomstekt.' },
    sousvide: { temp: 64, min: 120, note: 'Hela filéer i påse med salt, 64 °C i 1,5–4 h (+1 h direkt ur kylen).', sear: 'Bryn 1 min per sida i het panna.' },
  } },
  { id: 'notfars', name: 'Nötfärs', ingr: 'notfars', raw: 175, methods: {
    ugn: { temp: 200, min: 15, note: 'Smula ut tunt på plåt, bryt isär efter 8 min. Minst 70 °C.' },
  } },
  { id: 'blandfars', name: 'Blandfärs', ingr: 'blandfars', raw: 175, methods: {
    ugn: { temp: 200, min: 15, note: 'Smula ut tunt på plåt, bryt isär efter 8 min. Minst 70 °C.' },
  } },
  { id: 'flaskfars', name: 'Fläskfärs', ingr: 'flaskfars', raw: 175, methods: {
    ugn: { temp: 200, min: 15, note: 'Smula ut tunt på plåt, bryt isär efter 8 min. Minst 70 °C.' },
  } },
  { id: 'flaskkarre', name: 'Pulled fläskkarré', ingr: 'flaskkarre', raw: 190, methods: {
    form: { temp: 150, min: 210, note: 'Per kg: 1 tsk spiskummin, ½ msk oregano, 2 vitlöksklyftor, 1¼ tsk salt, 90 ml apelsinjuice. Form med folie 3 h, sedan 30 min utan. Dra isär med gafflar.' },
    sousvide: { temp: 74, min: 1080, note: 'Kryddad karré i påse med apelsinjuicen, 74 °C i 12–24 h. Starta kvällen före.', sear: 'Dra isär och stek i het panna.' },
  } },
  { id: 'lax', name: 'Lax', ingr: 'lax', raw: 150, methods: {
    ugn: { temp: 200, min: 12, note: 'Bitar med skinnet nedåt, ca 12 min till 56 °C. Ät inom 2 dagar eller frys.' },
  } },
  { id: 'kikartor', name: 'Rostade kikärtor', ingr: 'kikartor', raw: 180, methods: {
    ugn: { temp: 200, min: 25, note: 'Avrunna och torkade, 25 min. Skaka plåten halvvägs.' },
  } },
  { id: 'linser', name: 'Röda linser', ingr: 'linser', raw: 50, methods: {
    gryta: { temp: 100, min: 15, note: 'Skölj, koka i kitets sås 15 min tills de faller sönder.' },
  } },
];

export const DEFAULT_METHOD = (p: Protein): MethodId => (Object.keys(p.methods)[0] as MethodId);

export interface Carb { id: string; name: string; short?: string; ingr: IngrId; raw: number; oven?: number; stove?: string; stoveMin?: number }
export const CARBS: readonly Carb[] = [
  { id: 'ris', name: 'Ris', ingr: 'ris', raw: 60, stove: 'Ris ca 15 min', stoveMin: 15 },
  { id: 'pasta', name: 'Pasta', ingr: 'pasta', raw: 70, stove: 'Pasta ca 10 min, spola kallt', stoveMin: 10 },
  { id: 'bulgur', name: 'Bulgur', ingr: 'bulgur', raw: 60, stove: 'Bulgur ca 12 min', stoveMin: 12 },
  { id: 'matvete', name: 'Matvete', ingr: 'matvete', raw: 60, stove: 'Matvete ca 12 min', stoveMin: 12 },
  { id: 'couscous', name: 'Couscous', ingr: 'couscous', raw: 60, stove: 'Couscous: häll över kokande vatten, 5 min', stoveMin: 5 },
  { id: 'potatis', name: 'Potatisklyftor', short: 'Potatis', ingr: 'potatis', raw: 225, oven: 35 },
  { id: 'mos', name: 'Potatismos', short: 'Mos', ingr: 'potatis', raw: 225, stove: 'Potatis till mos ca 20 min', stoveMin: 20 },
  { id: 'sotpotatis', name: 'Sötpotatis', ingr: 'sotpotatis', raw: 220, oven: 30 },
];

export interface Veg { id: string; name: string; ingr: IngrId; raw: number; oven?: number; frozenOnly?: boolean }
export const VEGS: readonly Veg[] = [
  { id: 'broccoli', name: 'Broccoli', ingr: 'broccoli', raw: 140, oven: 20 },
  { id: 'paprika', name: 'Paprikamix', ingr: 'paprika', raw: 140, oven: 20 },
  { id: 'haricots', name: 'Haricots verts', ingr: 'haricots', raw: 110, oven: 15 },
  { id: 'vitkal', name: 'Vitkål', ingr: 'vitkal', raw: 125, oven: 25 },
  { id: 'aubergine', name: 'Aubergine', ingr: 'aubergine', raw: 150, oven: 25 },
  { id: 'champinjoner', name: 'Champinjoner', ingr: 'champinjoner', raw: 120, oven: 20 },
  { id: 'wokmix', name: 'Wokgrönsaker', ingr: 'wokmix', raw: 90, frozenOnly: true },
  { id: 'artmorot', name: 'Ärtor och morötter', ingr: 'artmorot', raw: 75, frozenOnly: true },
  { id: 'spenat', name: 'Spenat', ingr: 'spenat', raw: 50, frozenOnly: true },
  { id: 'edamame', name: 'Edamame', ingr: 'edamame', raw: 60, frozenOnly: true },
  { id: 'artor', name: 'Gröna ärtor', ingr: 'artor', raw: 60, frozenOnly: true },
  { id: 'majs', name: 'Majs', ingr: 'majs', raw: 60, frozenOnly: true },
];

// ---------- Flavour kits ----------
// Amounts are per box. Unit '' = efter smak. g/ml items with an ingr id count in nutrition.
export type Unit = 'g' | 'ml' | 'krm' | 'tsk' | 'msk' | 'st' | '';
export interface KitItem { name: string; ingr?: IngrId; q: number; u: Unit }
export interface Kit {
  id: string;
  name: string;
  hue: number; // oklch hue, assigned by list position
  tagline: string;
  protein: readonly string[]; // pairs well with, first = default
  carb: string;
  veg: string;
  sauce?: boolean; // simmer 10 min
  mix: readonly KitItem[];
  top: readonly KitItem[];
  tip: string;
  heat: string; // reheat instruction
}

const g = (name: string, ingr: IngrId, q: number, u: Unit = 'g'): KitItem => ({ name, ingr, q, u });
const s = (name: string, q = 0, u: Unit = ''): KitItem => ({ name, q, u });
const MICRO = 'Mikro 800 W 2,5–3 min, rör om halvvägs.';

const KIT_LIST: readonly Omit<Kit, 'hue'>[] = [
  // Sources per kit in CONTEXT.md (RecipeTin Eats, ICA, Eating Thai Food, Anova/Serious Eats).
  { id: 'texmex', name: 'Tex-mex', tagline: 'Salsa, bönor, majs', protein: ['notfars', 'kyckling', 'blandfars'], carb: 'ris', veg: 'paprika',
    mix: [g('Salsa', 'salsa', 50), g('Svarta bönor', 'svartabonor', 60), g('Majs', 'majs', 40), g('Tacokrydda', 'tacokrydda', 7)],
    top: [g('Gräddfil', 'graddfil', 30), s('Lime', 0.25, 'st'), s('Koriander')], tip: 'Fräs tacokryddan 30 s i lite olja och en skvätt vatten innan den blandas i.', heat: MICRO },
  { id: 'teriyaki', name: 'Teriyaki', tagline: 'Sött, salt, ingefära', protein: ['kyckling', 'lax'], carb: 'ris', veg: 'broccoli',
    mix: [g('Teriyakisås', 'teriyaki', 30), g('Edamame', 'edamame', 40), s('Riven ingefära', 0.5, 'tsk')],
    top: [g('Sesamfrön', 'sesam', 3), s('Salladslök', 1, 'st')], tip: 'Värm såsen med ingefäran 1 min så tjocknar den och fastnar.', heat: MICRO },
  { id: 'grekisk', name: 'Grekisk citron', tagline: 'Citron, oregano, feta', protein: ['kyckling', 'kikartor'], carb: 'potatis', veg: 'haricots',
    mix: [s('Citronsaft', 1, 'msk'), g('Olivolja', 'olivolja', 5), s('Torkad oregano', 0.5, 'tsk'), s('Vitlöksklyfta', 0.5, 'st')],
    top: [g('Fetaost', 'feta', 30), g('Tzatziki', 'tzatziki', 40), g('Gurka', 'gurka', 50), s('Rödlök')], tip: 'Citron och oregano på medan kycklingen är varm. Pressa färsk citron över efter uppvärmning.', heat: MICRO },
  { id: 'kottfarssas', name: 'Köttfärssås', tagline: 'Tomat, timjan, balsamico', protein: ['notfars', 'blandfars'], carb: 'pasta', veg: 'broccoli', sauce: true,
    mix: [g('Krossade tomater', 'krossade', 125), g('Tomatpuré', 'tomatpure', 8), s('Buljongtärning', 0.25, 'st'), s('Timjan', 0.5, 'tsk'), s('Balsamvinäger', 1, 'tsk')],
    top: [g('Riven ost', 'rivenost', 15), s('Basilika')], tip: 'Fräs purén 1 min i färsen tills den mörknar.', heat: MICRO },
  { id: 'chili', name: 'Chili con carne', tagline: 'Spiskummin, bönor, värme', protein: ['notfars', 'blandfars'], carb: 'ris', veg: 'paprika', sauce: true,
    mix: [g('Krossade tomater', 'krossade', 160), g('Kidneybönor', 'kidney', 50), s('Paprikapulver', 0.75, 'tsk'), s('Spiskummin', 0.5, 'tsk'), s('Oregano', 0.25, 'tsk'), s('Cayennepeppar', 1, 'krm'), s('Buljongtärning', 0.33, 'st')],
    top: [g('Gräddfil', 'graddfil', 30), s('Koriander')], tip: 'Rosta kryddorna i fettet 30 s innan tomaterna går i.', heat: MICRO },
  { id: 'krapow', name: 'Pad krapow', tagline: 'Ostronsås, vitlök, chili', protein: ['flaskfars', 'notfars', 'kyckling'], carb: 'ris', veg: 'edamame',
    mix: [g('Ostronsås', 'ostronsas', 9), g('Japansk soja', 'soja', 3), s('Socker', 0.5, 'tsk'), s('Vitlöksklyftor', 2, 'st'), s('Färsk chili', 1, 'st')],
    top: [s('Basilika, en näve')], tip: 'Fräs vitlök och chili hett 20 s, basilikan allra sist.', heat: MICRO },
  { id: 'kalpudding', name: 'Fuskkålpudding', tagline: 'Sirap, kalvfond, lingon', protein: ['blandfars', 'notfars'], carb: 'potatis', veg: 'vitkal',
    mix: [g('Ljus sirap', 'sirap', 10), g('Japansk soja', 'soja', 8), s('Kalvfond', 0.75, 'tsk'), s('Vitpeppar', 1, 'krm')],
    top: [g('Lingonsylt', 'lingon', 20)], tip: 'Bryn kålen hårt i omgångar och karamellisera sirapen på kålen.', heat: MICRO },
  { id: 'shepherd', name: "Shepherd's pie", tagline: 'Worcester, mos, ärtor', protein: ['notfars'], carb: 'mos', veg: 'artmorot', sauce: true,
    mix: [g('Tomatpuré', 'tomatpure', 10), g('Worcestershiresås', 'worcester', 5), s('Oxbuljongtärning', 0.25, 'st'), s('Timjan', 1, 'krm')],
    top: [], tip: 'Reducera buljongen tills den är tjock innan färsen blandas i. Moset överst i lådan.', heat: MICRO },
  { id: 'moussaka', name: 'Moussaka', tagline: 'Tomat, kanel, feta', protein: ['notfars', 'blandfars'], carb: 'potatis', veg: 'aubergine', sauce: true,
    mix: [g('Krossade tomater', 'krossade', 80), g('Tomatpuré', 'tomatpure', 6), s('Torkad oregano', 1, 'tsk'), s('Kanel', 1, 'krm')],
    top: [g('Fetaost', 'feta', 20)], tip: 'Kanelen ska anas, inte smakas. Rosta auberginen hett så den får färg.', heat: MICRO },
  { id: 'keema', name: 'Keema matar', tagline: 'Garam masala, grädde, ärtor', protein: ['notfars', 'kyckling'], carb: 'ris', veg: 'artor', sauce: true,
    mix: [g('Krossade tomater', 'krossade', 80), g('Matlagningsgrädde', 'grädde', 40, 'ml'), s('Garam masala', 0.5, 'tsk'), s('Spiskummin', 0.25, 'tsk'), s('Gurkmeja', 1, 'krm'), s('Riven ingefära', 0.5, 'tsk'), s('Vitlök', 0.5, 'tsk')],
    top: [g('Turkisk yoghurt', 'yoghurt', 30), s('Koriander')], tip: 'Fräs ingefära och vitlök 30 s, sedan kryddorna 30 s, sist tomat och grädde.', heat: MICRO },
  { id: 'bbq', name: 'BBQ', tagline: 'Rökigt, sött, coleslaw', protein: ['kyckling', 'flaskkarre'], carb: 'potatis', veg: 'broccoli',
    mix: [g('BBQ-sås', 'bbq', 30), s('Rökt paprikapulver', 0.5, 'tsk')],
    top: [g('Vitkålssallad', 'coleslaw', 50), s('Inlagd rödlök')], tip: 'Blanda såsen med det varma proteinet, inte kallt.', heat: MICRO },
  { id: 'carnitas', name: 'Carnitas', tagline: 'Apelsin, spiskummin, lime', protein: ['flaskkarre', 'kyckling'], carb: 'ris', veg: 'majs',
    mix: [g('Svarta bönor', 'svartabonor', 60), g('Salsa', 'salsa', 25), s('Sky från karrén', 1, 'msk')],
    top: [s('Lime', 0.25, 'st'), s('Rödlök'), s('Koriander')], tip: 'Stek strimlorna i het panna och ringla över skyn, bättre än grill.', heat: MICRO },
  { id: 'pesto', name: 'Pesto', tagline: 'Basilika, soltorkat, parmesan', protein: ['kyckling', 'lax'], carb: 'pasta', veg: 'artor',
    mix: [g('Soltorkade tomater', 'soltorkade', 15)],
    top: [g('Grön pesto', 'pesto', 25), g('Parmesan', 'parmesan', 10), s('Rucola')], tip: 'Peston efter uppvärmning, värme gör basilikan brun och bitter.', heat: MICRO },
  { id: 'sweetchili', name: 'Sweet chili', tagline: 'Sött, starkt, ingefära', protein: ['lax', 'kyckling'], carb: 'ris', veg: 'edamame',
    mix: [g('Sweet chilisås', 'sweetchili', 15), g('Japansk soja', 'soja', 12), s('Riven ingefära', 0.75, 'tsk')],
    top: [g('Sesamfrön', 'sesam', 4), s('Salladslök', 1, 'st')], tip: 'Halva glasyren före ugnen, resten efter.', heat: MICRO },
  { id: 'dahl', name: 'Röd linsdahl', tagline: 'Kokos, curry, spenat', protein: ['linser'], carb: 'ris', veg: 'spenat', sauce: true,
    mix: [g('Kokosmjölk', 'kokosmjolk', 100, 'ml'), g('Krossade tomater', 'krossade', 100), s('Curry', 1, 'tsk'), s('Buljong', 125, 'ml'), s('Riven ingefära', 0.25, 'tsk')],
    top: [g('Turkisk yoghurt', 'yoghurt', 30), s('Citron')], tip: 'Rosta curryn i olja 30 s innan linserna läggs i. Lätt kokosmjölk halverar fettet.', heat: MICRO },
  { id: 'kryddbonor', name: 'Rökiga kikärtor', tagline: 'Spiskummin, rökt paprika', protein: ['kikartor'], carb: 'matvete', veg: 'broccoli',
    mix: [s('Spiskummin', 0.5, 'tsk'), s('Rökt paprikapulver', 0.5, 'tsk'), s('Vitlökspulver', 0.25, 'tsk')],
    top: [g('Turkisk yoghurt', 'yoghurt', 30), s('Citron')], tip: 'Torka kikärtorna ordentligt och krydda efter rostningen. Egen burk om du vill ha dem krispiga.', heat: MICRO },
  // Light creamy kits: own versions (kvarg/yoghurt/kesella bases), sources in CONTEXT.md.
  { id: 'toscansk', name: 'Toscansk kvarg', tagline: 'Soltorkat, vitlök, parmesan', protein: ['kyckling'], carb: 'pasta', veg: 'spenat',
    mix: [g('Kvarg', 'kvarg', 60), g('Soltorkade tomater', 'soltorkade', 15), g('Tomatpuré', 'tomatpure', 10), g('Parmesan', 'parmesan', 8), g('Majsstärkelse', 'majsstarkelse', 1), s('Italienska örter', 0.5, 'tsk'), s('Vitlökspulver', 1, 'krm'), s('Chiliflakes', 1, 'krm')],
    top: [s('Färsk basilika')], tip: 'Rör ut kvargen med majsstärkelsen först, då skär den sig inte i mikron. Rör om halvvägs.', heat: MICRO },
  { id: 'paprikash', name: 'Paprikash', tagline: 'Rökig paprika, tomat, yoghurt', protein: ['kyckling', 'flaskkarre'], carb: 'potatis', veg: 'paprika', sauce: true,
    mix: [g('Krossade tomater', 'krossade', 80), g('Grekisk yoghurt', 'grekisk', 50), g('Tomatpuré', 'tomatpure', 10), g('Majsstärkelse', 'majsstarkelse', 1.5), s('Sött paprikapulver', 1.5, 'tsk'), s('Rökt paprikapulver', 0.5, 'tsk'), s('Vitlökspulver', 1, 'krm')],
    top: [s('Persilja')], tip: 'Låt paprikapulvret fräsa 30 s i tomatpurén. Yoghurten i sist, från värmen.', heat: MICRO },
  { id: 'jordnot', name: 'Thai jordnöt-lime', tagline: 'Jordnöt, lime, ingefära, sting', protein: ['kyckling', 'kikartor'], carb: 'ris', veg: 'broccoli',
    mix: [g('Jordnötspulver', 'pbpulver', 12), g('Lätt kokosmjölk', 'kokoslatt', 40, 'ml'), g('Japansk soja', 'soja', 10), g('Honung', 'honung', 4), g('Sriracha', 'sriracha', 5), s('Limejuice', 2, 'tsk'), s('Riven ingefära', 1, 'tsk')],
    top: [g('Rostade jordnötter', 'jordnotter', 5), s('Koriander'), s('Lime', 0.25, 'st')], tip: 'Rör pulvret med lime och soja till slät pasta innan kokosmjölken. Späd med en skvätt vatten efter uppvärmning.', heat: MICRO },
  { id: 'gochujang', name: 'Gochujang', tagline: 'Söt hetta, sesam, kall yoghurt', protein: ['kyckling', 'notfars', 'flaskfars'], carb: 'ris', veg: 'broccoli',
    mix: [g('Gochujang', 'gochujang', 15), g('Japansk soja', 'soja', 8), g('Honung', 'honung', 5), g('Majsstärkelse', 'majsstarkelse', 1), s('Risvinäger', 1, 'tsk'), s('Sesamolja', 0.5, 'tsk'), s('Riven ingefära', 0.5, 'tsk')],
    top: [g('Grekisk yoghurt', 'grekisk', 20), g('Sesamfrön', 'sesam', 2), s('Salladslök', 1, 'st'), s('Snabbpicklad gurka')], tip: 'Kall gochujang-yoghurt på den varma glaseringen är hela poängen. Egen burk.', heat: MICRO },
  { id: 'chipotle', name: 'Chipotle-lime', tagline: 'Rökig chili, lime, crema', protein: ['kyckling', 'notfars', 'kikartor'], carb: 'ris', veg: 'paprika',
    mix: [g('Krossade tomater', 'krossade', 60), g('Chipotle i adobo', 'chipotle', 8), s('Limejuice', 2, 'tsk'), s('Spiskummin', 0.5, 'tsk'), s('Rökt paprikapulver', 0.5, 'tsk'), s('Oregano', 1, 'krm')],
    top: [g('Grekisk yoghurt', 'grekisk', 40), g('Majs', 'majs', 15), s('Limezest'), s('Koriander'), s('Rödlök')], tip: 'Limezest i cremat, inte bara juice: limesmak utan att yoghurten blir vattnig.', heat: MICRO },
  { id: 'dill', name: 'Dill och citron', tagline: 'Dill, citron, senap, kall sås', protein: ['lax', 'kyckling'], carb: 'potatis', veg: 'haricots',
    mix: [],
    top: [g('Lättkesella', 'kesella', 50), g('Lätt crème fraiche', 'lattcreme', 20), g('Senap', 'senap', 5), s('Citron, saft och zest', 0.5, 'st'), s('Färsk dill', 1, 'msk'), s('Riven pepparrot', 1, 'tsk'), s('Rödlök')], tip: 'Såsen värms aldrig: kall sås på varm lax och potatis, så kan den inte skära sig.', heat: MICRO },
  { id: 'shawarma', name: 'Shawarma', tagline: 'Kardemumma, spiskummin, tahini', protein: ['kyckling', 'kikartor'], carb: 'bulgur', veg: 'paprika',
    mix: [s('Citronsaft', 2, 'tsk'), g('Olivolja', 'olivolja', 3), s('Mald koriander', 0.5, 'tsk'), s('Spiskummin', 0.5, 'tsk'), s('Rökt paprikapulver', 0.5, 'tsk'), s('Kardemumma', 1, 'krm'), s('Cayennepeppar', 0.5, 'krm')],
    top: [g('Grekisk yoghurt', 'grekisk', 40), g('Tahini', 'tahini', 8), g('Gurka', 'gurka', 15), s('Persilja')], tip: 'Tahini och citron stelnar först, rör i en tesked vatten tills det blir slätt och vänd sist ner yoghurten.', heat: MICRO },
  { id: 'tikka', name: 'Tikka', tagline: 'Garam masala, ingefära, yoghurt', protein: ['kyckling', 'kikartor', 'linser'], carb: 'ris', veg: 'spenat', sauce: true,
    mix: [g('Krossade tomater', 'krossade', 70), g('Yoghurt 3 %', 'yoghurt3', 50), g('Tomatpuré', 'tomatpure', 10), g('Majsstärkelse', 'majsstarkelse', 1.5), s('Garam masala', 0.5, 'tsk'), s('Spiskummin', 0.5, 'tsk'), s('Gurkmeja', 1, 'krm'), s('Riven ingefära', 0.5, 'tsk')],
    top: [s('Koriander'), s('Mynta')], tip: 'Rosta kryddorna 30 s i tomatpurén innan yoghurten går i.', heat: MICRO },
  // TRIAL (Patrik 2026-09-24): FIH cookbook kits, near-verbatim. Keep or delete after testing.
  { id: 'filips-currymango', name: 'Filips curry mango', tagline: 'Curry, Philadelphia, soja', protein: ['kyckling'], carb: 'ris', veg: 'paprika', sauce: true,
    mix: [g('Philadelphia light', 'philadelphia', 50), g('Mini fraiche', 'minifraiche', 33), g('Lättmjölk', 'lattmjolk', 65, 'ml'), g('Tomatpuré', 'tomatpure', 10), s('Curry mango-krydda', 2, 'tsk'), s('Japansk soja', 1, 'tsk')],
    top: [s('Chiliflakes')], tip: 'Fräs tomatpurén torrt 1–2 min innan mejeriet går i.', heat: MICRO },
  { id: 'filips-marryme', name: 'Filips Marry me', tagline: 'Soltorkat, vitlök, parmesan', protein: ['kyckling'], carb: 'pasta', veg: 'spenat', sauce: true,
    mix: [g('Philadelphia light vitlök & örter', 'philadelphia', 30), g('Milda Mat Lätt', 'mildamat', 80, 'ml'), g('Soltorkade tomater', 'soltorkade', 6), s('Paprikapulver', 1, 'krm'), s('Chiliflakes', 1, 'krm')],
    top: [g('Parmesan', 'parmesan', 10)], tip: 'Stäng av värmen innan osten rörs ner så skär sig inte såsen.', heat: MICRO },
  { id: 'filips-ajvar', name: 'Filips ajvar', tagline: 'Ajvar, vitlök, parmesan', protein: ['kyckling', 'notfars'], carb: 'pasta', veg: 'spenat', sauce: true,
    mix: [g('Philadelphia light', 'philadelphia', 35), g('Ajvar', 'ajvar', 12), s('Vitlöksklyfta', 0.5, 'st'), s('Grillkrydda', 1, 'krm')],
    top: [g('Parmesan', 'parmesan', 6), s('Persilja')], tip: 'Spara lite pastavatten och späd såsen med det.', heat: MICRO },
  { id: 'filips-kebab', name: 'Filips Kebabgryta', tagline: 'Kebabkrydda, yoghurt, spenat', protein: ['kyckling'], carb: 'ris', veg: 'spenat', sauce: true,
    mix: [g('Mini fraiche', 'minifraiche', 40), g('Grekisk yoghurt', 'grekisk', 20), g('Röd kebabsås', 'kebabsas', 10), s('Kebabkrydda', 2, 'krm'), s('Spiskummin', 1, 'krm')],
    top: [s('Färsk spenat')], tip: 'Rör ner mejeriet på låg värme, sist.', heat: MICRO },
  { id: 'filips-philly', name: 'Filips Philly cheese', tagline: 'Färs, paprika, krämig ost', protein: ['notfars'], carb: 'pasta', veg: 'paprika', sauce: true,
    mix: [g('Philadelphia light', 'philadelphia', 30), g('Grekisk yoghurt', 'grekisk', 20), s('Pastavatten', 20, 'ml'), s('Vitlökspulver', 1, 'krm'), s('Paprikapulver', 1, 'krm')],
    top: [g('Mager ost', 'ost', 6)], tip: 'Stek färsen först, fräs paprika och lök mjuka i samma panna.', heat: MICRO },
  { id: 'filips-buffalo', name: 'Filips Buffalo', tagline: 'Hot sauce, ost, rödlök', protein: ['kyckling'], carb: 'sotpotatis', veg: 'broccoli',
    mix: [g('Philadelphia light', 'philadelphia', 50), g("Frank's RedHot", 'hotsauce', 15), s('Hackad rödlök', 0.5, 'msk')],
    top: [g('Mager ost', 'ost', 20), s('Honung, en skvätt')], tip: 'Riv kycklingen med två gafflar så fäster såsen.', heat: MICRO },
  { id: 'filips-svampsas', name: 'Filips svampsås', tagline: 'Kalvfond, dijon, champinjoner', protein: ['flaskkarre', 'notfars', 'kyckling'], carb: 'mos', veg: 'champinjoner', sauce: true,
    mix: [g('Philadelphia light', 'philadelphia', 25), g('Milda Mat Lätt', 'mildamat', 50, 'ml'), g('Lättmjölk', 'lattmjolk', 75, 'ml'), s('Kalvfond', 0.5, 'msk'), s('Japansk soja', 0.5, 'msk'), s('Dijonsenap', 0.25, 'tsk')],
    top: [g('Parmesan', 'parmesan', 15), s('Persilja')], tip: 'Stek svampen hårt tills den fått färg innan vätskan går i.', heat: MICRO },
  { id: 'filips-burger', name: 'Filips Cheeseburger', tagline: 'Ost, pickles, burgersås', protein: ['notfars'], carb: 'potatis', veg: 'broccoli',
    mix: [s('Hamburgerost', 1, 'st'), s('Vitlökspulver', 1, 'krm')],
    top: [g('Grekisk yoghurt', 'grekisk', 25), s('Senap', 0.5, 'tsk'), s('Pickles, hackad', 1, 'msk'), s('Rå gullök')], tip: 'Smält osten i den varma färsen. Såsen i egen burk.', heat: MICRO },
];

// Golden-angle hues: neighbouring kits always get clearly different colours.
export const KITS: readonly Kit[] = KIT_LIST.map((k, i) => ({ ...k, hue: Math.round((i * 137.508 + 25) % 360) }));

export const byId = <T extends { id: string }>(list: readonly T[], id: string): T => {
  const x = list.find((i) => i.id === id);
  if (!x) throw new Error(`Okänt id: ${id}`);
  return x;
};

export const OIL_G_PER_RAW_G = 13 / 500; // ~1 msk olja per 500 g rå på plåt
export const TRAY_CAPACITY_G = 1200; // rå vikt per plåt
