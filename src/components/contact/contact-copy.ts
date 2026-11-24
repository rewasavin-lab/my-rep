import type { Locale } from "@/lib/i18n";
import { AUDIT, DISCOVERY } from "@/lib/offer";

/**
 * Page framing for /contact. The contact details, the subtitle and the form
 * labels stay in the locale JSON (`t.contact`); the offer facts come from
 * lib/offer.ts, so the audit length and the paid step are stated once.
 */
export interface ContactCopy {
  /** Two lines; the second is the accent. Null: use the translated `t.contact.title` as one line. */
  hero: [string, string] | null;
  edition: string;
  nextLabel: string;
  directLabel: string;
  directNote: string;
  whatsappText: string;
  further: string;
  confidential: [string, string];
  closingEyebrow: string;
  closingQuestion: string;
  closingLead: string;
  closingAccent: string;
  closingCta: string;
  closingSecondary: string;
  circuitLabel: string;
  backToTop: string;
}

export const CONTACT_EN: ContactCopy = {
  hero: ["Request your free", `${AUDIT.name}.`],
  edition: "A person replies within one business day",
  nextLabel: "What happens next",
  directLabel: "Prefer a conversation?",
  directNote: "Skip the form and reach us directly.",
  whatsappText: `Hi, I'd like to book a ${AUDIT.name}.`,
  further: `The audit is free and has no next step attached. If you want a build scoped, the ${DISCOVERY.name} is a paid ${DISCOVERY.duration} session (${DISCOVERY.price}). ${DISCOVERY.note}`,
  confidential: ["Confidential by default.", "NDA available on request."],
  closingEyebrow: "Not ready to talk yet",
  closingQuestion: "Prefer to see the work first?",
  closingLead: "Read the projects.",
  closingAccent: "Then tell us about yours.",
  closingCta: "Read the case studies",
  closingSecondary: "Explore our services",
  circuitLabel: "Your project next",
  backToTop: "Back to top",
};

/**
 * English framing for every locale for now; other locales keep their
 * translated title (`hero: null`), details and form labels from the locale
 * JSON. Add a translations map like ../case-studies/case-studies-translations.ts
 * when the framing is translated.
 */
export function getContactCopy(locale: Locale): ContactCopy {
  return locale === "en" ? CONTACT_EN : { ...CONTACT_EN, hero: null };
}
