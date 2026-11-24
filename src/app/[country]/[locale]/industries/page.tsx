import type { Metadata } from "next";

import { getTranslation, type Locale } from "@/lib/i18n";
import { buildPageMetadata, buildPageBreadcrumbJsonLd } from "@/lib/seo";
import { BASE_URL } from "@/lib/constants";
import { INDUSTRY_DATA, INDUSTRY_SLUGS } from "@/lib/industry-data";
import { IndiaGeoFooter } from "@/components/sections/IndiaGeoFooter";
import { GeoFooterFrame } from "@/components/blog/index/IndexSections";
import { IndustriesExperience } from "@/components/industries/IndustriesExperience";
import { getIndustriesCopy } from "@/components/industries/industries-copy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; locale: string }>;
}): Promise<Metadata> {
  const { country, locale } = await params;
  return buildPageMetadata({
    page: "industries",
    country,
    locale: locale as Locale,
  });
}

export default async function IndustriesHubPage({
  params,
}: {
  params: Promise<{ country: string; locale: string }>;
}) {
  const { country, locale } = await params;
  const t = getTranslation(locale as Locale);

  const breadcrumbLd = buildPageBreadcrumbJsonLd(
    "industries",
    locale as Locale,
    country,
  );

  // ItemList JSON-LD — tells Google this hub indexes 5 standalone industry
  // URLs, each with its own canonical page. Critical for hub→spoke ranking.
  // (A second BreadcrumbList that strung the five industries together as if
  // each were the parent of the next was dropped: a breadcrumb is one path.)
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t.industries.title,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: INDUSTRY_SLUGS.length,
    itemListElement: INDUSTRY_SLUGS.map((slug, i) => {
      const data = INDUSTRY_DATA[slug];
      const display =
        t.industries.items.find((it) => it.id === slug)?.name ??
        data.serviceType;
      return {
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/${country}/${locale}/industries/${slug}`,
        name: display,
        description: data.metaDescription,
      };
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd).replace(/</g, "\\u003c") }}
      />
      <IndustriesExperience
        copy={getIndustriesCopy(locale as Locale)}
        t={t}
        base={`/${country}/${locale}`}
        geo={
          <GeoFooterFrame>
            <IndiaGeoFooter country={country} locale={locale} pageKey="industries" variant="compact" />
          </GeoFooterFrame>
        }
      />
    </>
  );
}
