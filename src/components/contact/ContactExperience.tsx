import type { ReactNode } from "react";
import { ArrowUpRight, Clock, Mail, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import type { Messages } from "@/lib/i18n";
import { AFTER_ENQUIRY } from "@/lib/offer";
import { BlogMotion } from "@/components/blog/BlogMotion";
import { FinalCta } from "@/components/blog/BlogPrimitives";
import type { ContactCopy } from "./contact-copy";
import home from "../home/IndustrialHome.module.css";
import styles from "./Contact.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

function PartLabel({ number, children }: { number: string; children: ReactNode }) {
  return <h2 className={styles.partLabel}><span>{number}</span>{children}</h2>;
}

/**
 * /contact in the editorial system of the home, services and case-study
 * pages: the form is on screen at load, with what happens next and the
 * direct lines beside it. The form itself is passed in (it needs the geo
 * lookup the page already does) and wears LeadForm's "platform" skin.
 */
export function ContactExperience({ copy: c, t, base, form, geo }: { copy: ContactCopy; t: Messages; base: string; form: ReactNode; geo?: ReactNode }) {
  const d = t.contact.details;
  const whatsapp = `https://wa.me/${d.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(c.whatsappText)}`;

  return <BlogMotion className={styles.page}>
    <section className={styles.hero} aria-labelledby="contact-title" data-blog-scene="">
      <div className={home.container}>
        <div className={styles.eyebrow}><span className={home.signal} /><span>{t.brand.name} / {t.nav.contact}</span><span>{c.edition}</span></div>
        <div className={styles.layout}>
          <div className={styles.intro}>
            <h1 id="contact-title">{c.hero ? <>{c.hero[0]}<br /><em>{c.hero[1]}</em></> : t.contact.title}</h1>
            <p className={styles.lead}>{t.contact.subtitle}</p>
          </div>

          <div className={styles.formColumn}>{form}</div>

          <div className={styles.details}>
            <PartLabel number="01">{c.nextLabel}</PartLabel>
            <ol className={styles.steps}>{AFTER_ENQUIRY.map((step, i) => <li key={step}><span>{pad(i + 1)}</span>{step}</li>)}</ol>

            <PartLabel number="02">{c.directLabel}</PartLabel>
            <p className={styles.note}>{c.directNote}</p>
            <ul className={styles.channels}>
              <li>
                <a href={whatsapp} data-track="cta_click" data-track-label="WhatsApp" data-track-location="contact-direct">
                  <MessageCircle size={18} strokeWidth={1.4} aria-hidden="true" />
                  <span><strong>{d.phoneLabel}</strong><span dir="ltr">{d.phone}</span></span>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              </li>
              <li>
                <a href={`mailto:${d.email}`} data-track="cta_click" data-track-label="Email" data-track-location="contact-direct">
                  <Mail size={18} strokeWidth={1.4} aria-hidden="true" />
                  <span><strong>{d.emailLabel}</strong><span>{d.email}</span></span>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              </li>
            </ul>
            <dl className={styles.facts}>
              <div><dt><Clock size={13} aria-hidden="true" />{d.hoursLabel}</dt><dd>{d.hours}</dd></div>
              <div><dt><MapPin size={13} aria-hidden="true" />{d.locationLabel}</dt><dd>{d.location}</dd></div>
            </dl>

            <p className={styles.further}>{c.further}</p>
            <p className={styles.confidential}><ShieldCheck size={17} strokeWidth={1.3} aria-hidden="true" /><span><strong>{c.confidential[0]}</strong> {c.confidential[1]}</span></p>
          </div>
        </div>
      </div>
    </section>

    {geo}

    <FinalCta
      id="contact-final-title"
      eyebrow={c.closingEyebrow}
      question={c.closingQuestion}
      lead={c.closingLead}
      accent={c.closingAccent}
      ctaLabel={c.closingCta}
      ctaHref={`${base}/case-studies`}
      secondary={{ label: c.closingSecondary, href: `${base}/services` }}
      circuitLabel={c.circuitLabel}
      footer={{ left: t.brand.name, center: t.brand.tagline, backToTop: { label: c.backToTop, href: "#contact-title" } }}
    />
  </BlogMotion>;
}
