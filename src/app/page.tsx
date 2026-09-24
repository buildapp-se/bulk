import { t } from '@/i18n/sv';
import { Page, Section } from '@/components/Page';
import { GoalPanel } from '@/components/GoalPanel';
import { BoxCount, KitPicker, ProteinPicker, VegMode } from '@/components/Pickers';
import { BatchPanel } from '@/components/BatchPanel';
import { KitHint } from '@/components/KitHint';

export default function Home() {
  return (
    <Page>
      <div className="mb-7 flex flex-col gap-1.5">
        <h1 className="text-[clamp(26px,5vw,38px)] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance]">{t.hero.title}</h1>
        <p className="max-w-[56ch] text-muted [text-wrap:pretty]">{t.hero.sub}</p>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,1fr)]">
        <div className="flex flex-col gap-7">
          <Section n={1} title={t.sec.goal}><GoalPanel /></Section>
          <Section n={2} title={t.sec.protein}><ProteinPicker /></Section>
          <Section n={3} title={t.sec.boxes}><BoxCount /></Section>
          <Section n={4} title={t.sec.kits} aside={<KitHint />}><KitPicker /></Section>
          <Section n={5} title={t.sec.veg}><VegMode /></Section>
        </div>
        <BatchPanel />
      </div>
    </Page>
  );
}
