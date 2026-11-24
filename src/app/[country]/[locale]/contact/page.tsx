import type { Metadata } from "next";
import { getTranslation, type Locale } from "@/lib/i18n";
import { buildPageMetadata, buildPageBreadcrumbJsonLd } from "@/lib/seo";
import { getGeo } from "@/lib/geo";
import { ContactForm } from "@/components/sections/ContactForm";
import { IndiaGeoFooter } from "@/components/sections/IndiaGeoFooter";
import { GeoFooterFrame } from "@/components/blog/index/IndexSections";
import { ContactExperience } from "@/components/contact/ContactExperience";
import { getContactCopy } from "@/components/contact/contact-copy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; locale: string }>;
}): Promise<Metadata> {
  const { country, locale } = await params;
  return buildPageMetadata({ page: "contact", country, locale: locale as Locale });
}

/* The proof strip that once stood on this page listed "50+ businesses scaled",
   "₹40Cr+ revenue impacted", "200% average ROI" and "4.9/5 satisfaction". None
   of the four can be sourced (the 4.9 rating is documented as invented in
   layout.tsx), so it was removed from the page where a visitor decides whether
   to trust us with an enquiry. Put real, attributable proof here when there is
   some. The "190+ countries" map strip went with the redesign for the same
   reason. */

export default async function ContactPage({
  params,
}: {
  params: Promise<{ country: string; locale: string }>;
}) {
  const { country, locale } = await params;
  const t = getTranslation(locale as Locale);
  const breadcrumbLd = buildPageBreadcrumbJsonLd("contact", locale as Locale, country);
  const geo = await getGeo(country, locale as Locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }}
      />
      <ContactExperience
        copy={getContactCopy(locale as Locale)}
        t={t}
        base={`/${country}/${locale}`}
        form={
          <ContactForm
            t={t}
            locale={locale as Locale}
            country={country}
            countryName={geo.countryName}
            formId="contact"
            tone="platform"
          />
        }
        geo={
          <GeoFooterFrame>
            <IndiaGeoFooter country={country} locale={locale} pageKey="contact" variant="compact" />
          </GeoFooterFrame>
        }
      />
    </>
  );
}
