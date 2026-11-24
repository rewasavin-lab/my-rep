import type { Locale, Messages } from "@/lib/i18n";
import { AFTER_ENQUIRY } from "@/lib/offer";
import { LeadForm } from "@/components/leads/LeadForm";
import { getLeadFormCopy, type LeadFormCopy } from "@/components/leads/lead-form-copy";

/**
 * The general contact form, on /contact and on each city's contact page.
 *
 * WHAT CHANGED. This component used to wait 900 ms and show "Message
 * received." without sending anything: every enquiry made through it was
 * lost, and the visitor was told otherwise. It is now a thin wrapper around
 * LeadForm, which posts to /api/leads and reports what the server actually
 * said (see components/leads/LeadForm.tsx and lib/leads/pipeline.ts).
 *
 * It keeps the labels this form already had in every locale
 * (`t.contact.form`), and takes the rest from lead-form-copy.ts.
 *
 * A server component: it only assembles props. `countryName` prefills the
 * country field from the market in the URL, and the visitor can change it.
 */
export function ContactForm({
  t,
  locale,
  country,
  countryName,
  formId = "contact",
  tone = "site",
}: {
  t: Messages;
  locale: Locale;
  /** The `/{country}/` segment of the URL. */
  country: string;
  countryName: string;
  /** Names the form in the stored lead, e.g. "contact" or "city-pune". */
  formId?: string;
  /** "platform" for pages in the editorial (paper-and-ink) system, e.g. /contact. */
  tone?: "site" | "platform";
}) {
  const f = t.contact.form;
  const copy: LeadFormCopy = {
    ...getLeadFormCopy(locale),
    name: f.name,
    email: f.email,
    company: f.company,
    industry: f.industry,
    challenge: f.challenge,
    submit: f.submit,
    submitting: f.submitting,
    // The English page keeps the heading and the prompt it has always had.
    ...(locale === "en"
      ? {
          eyebrow: "Revenue Audit Request",
          title: "Let's talk about your business",
          challengePlaceholder:
            "Our website doesn't convert, we're burning money on ads, our team is buried in manual work, our systems don't talk to each other…",
        }
      : {}),
  };

  return (
    <LeadForm
      locale={locale}
      market={country}
      formId={formId}
      copy={copy}
      industries={f.industries}
      defaultCountry={countryName}
      systems="collapsed"
      contact={{ email: t.contact.details.email, phone: t.contact.details.phone }}
      // lib/offer.ts is English-only; other locales show the reference and the
      // translated confirmation without the step list.
      nextSteps={locale === "en" ? AFTER_ENQUIRY : undefined}
      tone={tone}
    />
  );
}
