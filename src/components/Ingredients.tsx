'use client';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { t } from '@/i18n/sv';
import { fmtG, fmtPacks, fmtQty, nf, type BoxCalc, type ShopRow } from '@/lib/calc';
import { useBatch } from '@/lib/useBatch';
import { setCook, useCook } from '@/lib/store';
import { haptic } from '@/lib/haptics';
import { Num } from './Num';
import { Check } from './Pickers';
import { spring, stagger } from './ui';
import { KitArt } from './KitArt';

const CATS = ['kött', 'grönt', 'fryst', 'mejeri', 'skafferi'] as const;
const MC = ['var(--p)', 'var(--c)', 'var(--f)'];

export function Ingredients() {
  const { calcs, shop, incomplete } = useBatch();
  const full = calcs.filter((c) => !c.missing.length);
  // One card per distinct box recipe (kit + protein + carb + veg).
  const types = [...full.reduce((m, c) => {
    const k = [c.box.kit?.id, c.box.protein?.id, c.box.carb?.id, c.box.veg?.id].join('|');
    const cur = m.get(k);
    m.set(k, cur ? { ...cur, n: cur.n + 1 } : { c, n: 1 });
    return m;
  }, new Map<string, { c: BoxCalc; n: number }>()).values()];

  const measured = shop.filter((r) => r.u === 'g' || r.u === 'ml');
  const spices = shop.filter((r) => !(r.u === 'g' || r.u === 'ml'));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[clamp(26px,5vw,38px)] font-semibold tracking-[-0.03em]">{t.ing.title(full.length)}</h1>
        <p className="text-muted">{t.ing.sub}</p>
        {incomplete.length > 0 && <Link href="/" transitionTypes={['nav-back']} className="text-[13px] text-warn underline">{t.missing(incomplete.length)}</Link>}
      </div>

      <motion.div variants={stagger.parent} initial="hidden" animate="show" className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        {types.map(({ c, n }) => <BoxCard key={c.box.i} c={c} n={n} />)}
      </motion.div>

      <ShoppingList measured={measured} spices={spices} />

      <div className="flex justify-end">
        <Link href="/tillagning" transitionTypes={['nav-forward']} onClick={() => haptic()} className="group flex gap-6 rounded-xl bg-ink px-5 py-3.5 font-semibold text-on-ink">
          <span>{t.toCook}</span><span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </div>
  );
}

function BoxCard({ c, n }: { c: BoxCalc; n: number }) {
  const e = [c.m[1] * 4, c.m[2] * 4, c.m[3] * 9];
  const et = e[0] + e[1] + e[2] || 1;
  const k = c.box.kit!;
  return (
    <motion.article variants={stagger.child} style={{ '--hue': k.hue } as React.CSSProperties}
      className="relative mt-16 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 pt-24">
      <span className="absolute -top-16 left-1/2 -translate-x-1/2"><KitArt kit={k} size={168} spin /></span>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[17px] font-semibold">{k.name}</div>
          <div className="text-[13px] text-muted">{c.box.protein!.name} · {c.box.carb!.name} · {c.box.veg!.name}</div>
        </div>
        <div className="font-mono text-[13px] text-muted">×{n}</div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[44px] font-semibold leading-none tracking-[-0.04em]"><Num v={c.m[0]} /></span>
        <span className="text-[13px] text-muted">{t.ing.kcalBox}</span>
      </div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {e.map((x, i) => <motion.div key={i} className="h-full" style={{ background: MC[i] }} initial={{ width: 0 }} animate={{ width: `${(x / et) * 100}%` }} transition={{ ...spring, delay: 0.1 + i * 0.05 }} />)}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {t.ing.macros.map((l, i) => (
          <div key={l} className="flex flex-col">
            <span className="flex items-center gap-1.5 text-[12px] text-muted"><span className="h-2 w-2 rounded-sm" style={{ background: MC[i] }} />{l}</span>
            <span className="text-[17px] font-semibold"><Num v={c.m[i + 1]} /> g</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 border-t border-line-soft pt-3 text-sm">
        <div className="label mb-0.5">{t.ing.perBox}</div>
        {c.parts.filter((x) => x.role !== 'olja').map((x, i) => (
          <div key={i} className={`flex justify-between gap-3 ${x.role === 'topp' ? 'text-muted' : ''}`}>
            <span>{x.role === 'topp' ? '+ ' : ''}{x.name}</span>
            <span className="font-mono text-[13px]">{x.u === 'g' && x.cooked ? `${nf(x.q)} g rå` : fmtQty(x.q, x.u)}</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-bg px-3 py-2 text-[12px] text-muted">{t.cook.heat}: {k.heat} {k.tip}</div>
    </motion.article>
  );
}

function ShoppingList({ measured, spices }: { measured: ShopRow[]; spices: ShopRow[] }) {
  const cook = useCook();
  const [copied, setCopied] = useState(false);
  const toggle = (k: string) => { haptic(); setCook((s) => ({ ...s, bought: { ...s.bought, [k]: !s.bought[k] } })); };
  const line = (r: ShopRow) => `${r.name}: ${r.packs.length ? fmtPacks(r.packs) : fmtQty(r.need, r.u)}`;
  const copy = async () => {
    const txt = [...CATS.flatMap((cat) => measured.filter((r) => r.cat === cat).map(line)), ...spices.map(line)].join('\n');
    try { await navigator.clipboard.writeText(txt); setCopied(true); haptic(); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };
  const groups = CATS.map((cat) => ({ cat, rows: measured.filter((r) => r.cat === cat) })).filter((g) => g.rows.length);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Inköpslista</h2>
        <motion.button whileTap={{ scale: 0.95 }} onClick={copy} className="rounded-full border border-line px-3 py-1.5 text-[13px]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={String(copied)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="block">{copied ? t.ing.copied : t.ing.copy}</motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
      <div className="grid gap-x-10 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        {groups.map((g) => (
          <div key={g.cat} className="flex flex-col">
            <div className="border-b border-ink pb-2 font-semibold">{t.ing.groups[g.cat]}</div>
            {g.rows.map((r) => <Row key={r.key} r={r} on={!!cook.bought[r.key]} onToggle={() => toggle(r.key)} />)}
          </div>
        ))}
        {spices.length > 0 && (
          <div className="flex flex-col">
            <div className="border-b border-ink pb-2 font-semibold">{t.ing.spices}</div>
            {spices.map((r) => <Row key={r.key} r={r} on={!!cook.bought[r.key]} onToggle={() => toggle(r.key)} />)}
          </div>
        )}
      </div>
      <p className="text-[12px] text-muted">{t.ing.source}</p>
    </section>
  );
}

function Row({ r, on, onToggle }: { r: ShopRow; on: boolean; onToggle: () => void }) {
  const main = r.packs.length ? fmtPacks(r.packs) : fmtQty(r.need, r.u);
  const sub = [r.packs.length ? t.ing.need(fmtQty(r.need, r.u)) : '', r.cooked ? t.ing.cooked(fmtG(r.cooked)) : ''].filter(Boolean).join(' · ');
  return (
    <button onClick={onToggle} className="flex items-center gap-3 border-b border-line py-2.5 text-left">
      <Check on={on} />
      <span className={`flex flex-1 flex-col transition-opacity ${on ? 'opacity-40' : ''}`}>
        <span className="relative w-fit">
          {r.name}
          <motion.span className="absolute inset-x-0 top-1/2 h-px origin-left bg-ink" initial={false} animate={{ scaleX: on ? 1 : 0 }} transition={spring} />
        </span>
        {sub && <span className="text-[12px] text-muted">{sub}</span>}
      </span>
      <span className={`whitespace-nowrap font-mono text-sm ${on ? 'opacity-40' : ''}`}>{main}</span>
    </button>
  );
}
