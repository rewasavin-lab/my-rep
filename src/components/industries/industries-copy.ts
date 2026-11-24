import type { Locale } from "@/lib/i18n";
import type { IndustryKey } from "@/lib/country-content";
import { AUDIT } from "@/lib/offer";

/**
 * Page framing for /industries. The industry names, tags, pain points,
 * descriptions and outcomes stay in the locale JSON (`t.industries.items`);
 * the workflow titles and stage names come from ./workflows.ts and the
 * drawings from ./IndustryFigures.tsx.
 */
export interface IndustriesCopy {
  edition: string;
  hero: [string, string, string];
  lead: string;
  intro: string;
  explore: string;
  heroNote: string;
  readingLabel: [string, string];
  reading: [string, string, string, string];
  indexChapter: string;
  indexTitle: [string, string];
  indexIntro: string;
  open: string;
  parts: [string, string, string, string];
  stagesLabel: string;
  headlines: Record<IndustryKey, [string, string]>;
  /** Prefix of the link to each industry's own page: "Explore Manufacturing ERP". */
  exploreLink: string;
  layerChapter: string;
  layerTitle: [string, string];
  layerIntro: string;
  layers: { title: string; body: string }[];
  disclaimer: string;
  closingEyebrow: string;
  closingQuestion: string;
  closingLead: string;
  closingAccent: string;
  closingSecondary: string;
  closingNote: string;
  circuitLabel: string;
  backToTop: string;
}

export const INDUSTRIES_EN: IndustriesCopy = {
  edition: "Five sectors / One operating system",
  hero: ["Five industries.", "One connected", "operating system."],
  lead: "Different workflows. The same gaps between them.",
  intro:
    "Manufacturers, developers, clinics, D2C brands and coaching institutes each run on a different workflow. We build the ERP, CRM, automation and AI around the one you actually run, and connect it to the tools you already use.",
  explore: "Explore the industries",
  heroNote: "Illustrative systems. Outcomes are what each build is designed toward.",
  readingLabel: ["Every sector,", "read the same way."],
  reading: ["Where work leaks", "What we build", "The workflow", "Outcomes we design for"],
  indexChapter: "Sector index",
  indexTitle: ["Pick your industry.", "See the system we build for it."],
  indexIntro:
    "Each sector has its own page with the full workflow, the modules we build and the questions buyers ask before they start.",
  open: "Open",
  parts: ["Where it leaks", "What we build", "The workflow", "Outcomes we design for"],
  stagesLabel: "Workflow stages",
  headlines: {
    manufacturing: ["Tally and five spreadsheets", "become one cloud ERP."],
    "real-estate": ["Every portal lead answered,", "and tracked to the booking."],
    healthcare: ["Fewer calls at the front desk.", "Fewer empty slots."],
    ecommerce: ["Carts that come back.", "Customers who reorder."],
    edtech: ["From the first enquiry", "to a seat in the batch."],
  },
  exploreLink: "Explore",
  layerChapter: "Underneath every sector",
  layerTitle: ["Different front ends.", "One operating layer."],
  layerIntro:
    "The workflow changes by industry. The engineering underneath does not: every build runs on the same four layers, so a factory and a clinic get the same discipline.",
  layers: [
    { title: "Records", body: "One ERP or CRM as the source of truth for orders, stock, patients, leads and students." },
    { title: "Automation", body: "Hand-offs, reminders and paperwork run on their own, on WhatsApp and email." },
    { title: "AI agents", body: "Agents read documents, answer first enquiries and draft routine work, with a person approving." },
    { title: "Reporting", body: "Live numbers for the owner: daily P&L, pipeline, no-shows, repeat rate." },
  ],
  disclaimer:
    "The figures are illustrative drawings. Outcomes are what each build is designed toward, not a forecast for every business.",
  closingEyebrow: "Your sector",
  closingQuestion: "Running a workflow that is not on this list?",
  closingLead: "Start with the workflow.",
  closingAccent: "We build the system around it.",
  closingSecondary: "See the case studies",
  closingNote: `Free ${AUDIT.minutes}-minute audit. A written diagnosis. A clear next step.`,
  circuitLabel: "Your workflow, connected",
  backToTop: "Back to top",
};

/**
 * English for every locale for now. The translated parts of the page (names,
 * tags, pain points, outcomes, navigation) still come from the locale JSON;
 * add a translations map here, like ../case-studies/case-studies-translations.ts,
 * when the page framing is translated.
 */
export function getIndustriesCopy(_locale: Locale): IndustriesCopy {
  return INDUSTRIES_EN;
}
