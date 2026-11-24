import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowRight, ArrowUpRight, BrainCircuit, Building2, ChartNoAxesCombined, Database, Factory,
  GraduationCap, Layers3, ScanLine, ShieldCheck, ShoppingBag, Stethoscope, Workflow, type LucideIcon,
} from "lucide-react";
import type { Messages } from "@/lib/i18n";
import type { IndustryKey } from "@/lib/country-content";
import { INDUSTRY_SLUGS } from "@/lib/industry-data";
import { BlogMotion } from "@/components/blog/BlogMotion";
import { FinalCta } from "@/components/blog/BlogPrimitives";
import { FIGURE_LEGENDS, FIGURE_TITLES, IndustryArt, IndustryFigure } from "./IndustryFigures";
import { INDUSTRY_WORKFLOWS } from "./workflows";
import type { IndustriesCopy } from "./industries-copy";
import home from "../home/IndustrialHome.module.css";
import styles from "./IndustriesHub.module.css";

type IndustryItem = Messages["industries"]["items"][number];

const ICONS: Record<IndustryKey, LucideIcon> = {
  manufacturing: Factory,
  "real-estate": Building2,
  healthcare: Stethoscope,
  ecommerce: ShoppingBag,
  edtech: GraduationCap,
};
const readingIcons = [ScanLine, Layers3, Workflow, ChartNoAxesCombined];
const layerIcons = [Database, Workflow, BrainCircuit, ChartNoAxesCombined];

const pad = (n: number) => String(n).padStart(2, "0");

function Chapter({ number, children }: { number: string; children: ReactNode }) {
  return <div className={`${home.chapter} ${styles.upper}`}><span>{number}</span><span>{children}</span></div>;
}

function PartLabel({ number, children }: { number: string; children: ReactNode }) {
  return <h3 className={styles.partLabel}><span>{number}</span>{children}</h3>;
}

/**
 * /industries in the editorial system of the home, services and case-study
 * pages: one hub drawing, a sector index linking to each industry's own page,
 * then one chapter per industry read the same way, and the shared layer
 * underneath. Every word is in the server HTML; BlogMotion only animates.
 */
export function IndustriesExperience({ copy: c, t, base, geo }: { copy: IndustriesCopy; t: Messages; base: string; geo?: ReactNode }) {
  // The hub order is the SEO order (manufacturing first), not the JSON order.
  const items = INDUSTRY_SLUGS.flatMap((slug) => {
    const item = t.industries.items.find((it) => it.id === slug);
    return item ? [{ ...item, id: slug } as IndustryItem & { id: IndustryKey }] : [];
  });

  return <BlogMotion className={styles.page}>
    <section className={home.hero} aria-labelledby="industries-title" data-blog-scene="">
      <div className={home.container}>
        <div className={styles.eyebrow}><span className={home.signal} /><span>{t.brand.name} / {t.nav.industries}</span><span>{c.edition}</span></div>
        <div className={home.heroGrid}>
          <div className={home.heroCopy}>
            <h1 id="industries-title">{c.hero[0]}<br />{c.hero[1]}<br /><em>{c.hero[2]}</em></h1>
            <p>{c.lead}</p>
            <p className={home.heroDescription}>{c.intro}</p>
            <div className={home.heroActions}>
              <Link href={`${base}/contact`} className={home.primaryButton} data-track="cta_click" data-track-label={t.nav.cta} data-track-location="industries-hero">{t.nav.cta}<ArrowUpRight size={18} aria-hidden="true" /></Link>
              <a href="#industry-index" className={home.textButton}>{c.explore}<ArrowDown size={16} aria-hidden="true" /></a>
            </div>
            <div className={home.heroNote}><span />{c.heroNote}</div>
          </div>
          <div className={`${home.heroVisual} ${styles.heroFigure}`}>
            <IndustryFigure industry="hub" number={1} legend={FIGURE_LEGENDS.hub} />
          </div>
        </div>
        <div className={home.heroBand}>
          <span className={styles.upper}>{c.readingLabel[0]}<br /><strong>{c.readingLabel[1]}</strong></span>
          {c.reading.map((label, i) => { const Icon = readingIcons[i]; return <div key={label}><Icon size={19} aria-hidden="true" />{label}</div>; })}
        </div>
      </div>
    </section>

    <section id="industry-index" className={styles.index} aria-labelledby="industry-index-title" data-blog-scene="">
      <div className={home.container}>
        <div className={home.sectionHeading}>
          <div><Chapter number="01">{c.indexChapter}</Chapter><h2 id="industry-index-title">{c.indexTitle[0]}<br /><em>{c.indexTitle[1]}</em></h2></div>
          <p>{c.indexIntro}</p>
        </div>
        <ol className={styles.indexGrid}>
          {items.map((item, i) => {
            const Icon = ICONS[item.id];
            return <li key={item.id}>
              <Link href={`${base}/industries/${item.id}`} className={styles.indexCard} data-track="cta_click" data-track-label={item.name} data-track-location="industries-index">
                <span className={styles.thumb}><IndustryArt industry={item.id} compact /></span>
                <span className={styles.indexBody}>
                  <span className={styles.indexMeta}><span>{pad(i + 1)}</span><Icon size={15} strokeWidth={1.4} aria-hidden="true" /></span>
                  <strong>{item.name}</strong>
                  <span className={styles.indexTag}>{item.tag}</span>
                  <span className={styles.indexMore}>{c.open}<ArrowUpRight size={13} aria-hidden="true" /></span>
                </span>
              </Link>
            </li>;
          })}
        </ol>
      </div>
    </section>

    {items.map((item, index) => {
      const flow = INDUSTRY_WORKFLOWS[item.id];
      const outcomes = item.outcome.split("·").map((part) => part.trim()).filter(Boolean);
      const headline = c.headlines[item.id];
      return <section key={item.id} id={item.id} className={`${styles.sector} ${index % 2 === 0 ? styles.sectorPaper : ""}`} aria-labelledby={`${item.id}-title`} data-blog-scene="">
        <div className={home.container}>
          <div className={home.sectionHeading}>
            <div><Chapter number={pad(index + 2)}>{item.name}</Chapter><h2 id={`${item.id}-title`}>{headline[0]}<br /><em>{headline[1]}</em></h2></div>
            <p>{item.tag}</p>
          </div>

          <div className={styles.sectorGrid}>
            <div className={styles.story}>
              <PartLabel number="01">{c.parts[0]}</PartLabel>
              <ol className={styles.leaks}>{item.painPoints.map((point, i) => <li key={point}><span>{pad(i + 1)}</span>{point}</li>)}</ol>
              <PartLabel number="02">{c.parts[1]}</PartLabel>
              <p className={styles.summary}>{item.description}</p>
            </div>
            <div className={styles.flow}>
              <PartLabel number="03">{c.parts[2]}</PartLabel>
              <IndustryFigure industry={item.id} number={index + 2} legend={FIGURE_LEGENDS[item.id]} />
            </div>
          </div>

          <ol className={styles.rail} aria-label={`${c.stagesLabel}: ${flow.title}`} style={{ ["--stages" as string]: flow.stages.length }}>
            {flow.stages.map((stage, i) => <li key={stage.id}><span>{pad(i + 1)}</span>{stage.label}{i < flow.stages.length - 1 && <ArrowRight size={12} aria-hidden="true" />}</li>)}
          </ol>

          {outcomes.length > 0 && <div className={styles.outcomes}>
            <PartLabel number="04">{c.parts[3]}</PartLabel>
            <ul>{outcomes.map((outcome, i) => <li key={outcome}><span>{pad(i + 1)}</span><strong>{outcome}</strong></li>)}</ul>
          </div>}

          <div className={home.sectionBottom}>
            <span>{FIGURE_TITLES[item.id]} · {flow.title}</span>
            <Link href={`${base}/industries/${item.id}`} data-track="cta_click" data-track-label={item.name} data-track-location="industries-chapter">{c.exploreLink} {item.name}<ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>;
    })}

    <section className={styles.layer} aria-labelledby="industries-layer-title" data-blog-scene="">
      <div className={home.container}>
        <div className={home.sectionHeading}>
          <div><Chapter number={pad(items.length + 2)}>{c.layerChapter}</Chapter><h2 id="industries-layer-title">{c.layerTitle[0]}<br /><em>{c.layerTitle[1]}</em></h2></div>
          <p>{c.layerIntro}</p>
        </div>
        <ol className={styles.layers}>{c.layers.map((layer, i) => {
          const Icon = layerIcons[i] ?? Layers3;
          return <li key={layer.title}><span className={styles.layerNode}><Icon size={21} strokeWidth={1.25} aria-hidden="true" /></span><span className={styles.layerNumber}>{pad(i + 1)}</span><h3>{layer.title}</h3><p>{layer.body}</p></li>;
        })}</ol>
        <p className={styles.disclaimer}><ShieldCheck size={16} aria-hidden="true" />{c.disclaimer}</p>
      </div>
    </section>

    {geo}

    <FinalCta
      id="industries-final-title"
      eyebrow={c.closingEyebrow}
      question={c.closingQuestion}
      lead={c.closingLead}
      accent={c.closingAccent}
      ctaLabel={t.nav.cta}
      ctaHref={`${base}/contact`}
      note={c.closingNote}
      secondary={{ label: c.closingSecondary, href: `${base}/case-studies` }}
      circuitLabel={c.circuitLabel}
      footer={{ left: t.brand.name, center: t.brand.tagline, backToTop: { label: c.backToTop, href: "#industries-title" } }}
    />
  </BlogMotion>;
}
