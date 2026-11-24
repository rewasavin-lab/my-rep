import type { Metadata } from "next";
import {
  getTranslation,
  LOCALE_CODES,
  LOCALES,
  type Locale,
  type Messages,
} from "@/lib/i18n";
import {
  BASE_URL,
  BRAND,
  HREFLANG_COUNTRIES,
  INDEXABLE_LOCALES,
  ORGANIZATION_ID,
  PRIMARY_COUNTRY,
  PRIMARY_LOCALE,
  SOCIAL_PROFILES,
  isIndexable,
} from "@/lib/constants";
import { validCountryISOs } from "@/middleware";
import { localizedPath, normalizePublicUrl } from "@/lib/public-url";
import { editionPath } from "@/lib/page-versions";
import { getUrlGeo, formatLocation, formatLocationShort, type GeoInfo } from "@/lib/geo";
import { getCityPageLocales, type CityContent } from "@/lib/cities";

/* -------------------------------------------------------------------------- */
/*                Hreflang / canonical helpers                                */
/* -------------------------------------------------------------------------- */

/**
 * The shape Next.js wants under `metadata.alternates`. `canonical` is always
 * present. `languages` (the hreflang cluster) is present only on a canonical
 * edition: a page whose canonical points elsewhere cannot be a cluster member,
 * and declaring one from it is a non-reciprocal set that Google discards.
 */
export type AlternatesShape = {
  canonical: string;
  languages?: Record<string, string>;
};

/**
 * THE canonical rule for every page on the site. Every builder below — site
 * pages, city pages, Factory Graph pages — goes through here, so the
 * sitemap, the canonical and the hreflang cluster cannot disagree.
 *
 *   country not an edition   /us/en/pricing   → canonical /in/en/pricing
 *   locale not written       /in/hi/pricing   → canonical /in/en/pricing
 *   both                     /mo/hi/pricing   → canonical /in/en/pricing
 *   the edition itself       /in/en/pricing   → self-canonical + hreflang
 *   unknown code             /zz/en/pricing   → self-canonical (the route
 *                                               404s; noindex via isIndexable)
 *
 * `locales` is the languages THIS page is written in. Most pages pass nothing
 * and get INDEXABLE_LOCALES; a city with a Hindi body passes ["en", "hi"].
 * It must include PRIMARY_LOCALE, which is where everything else points.
 *
 * Every variant stays `index, follow` (see `isIndexable` in constants.ts):
 * the canonical alone tells Google which copy to keep. That is what turns
 * "Duplicate, Google chose different canonical than user" into "Alternate
 * page with proper canonical tag".
 */
export function resolveAlternates({
  country,
  locale,
  subPath,
  locales = INDEXABLE_LOCALES,
}: {
  country: string;
  locale: string;
  subPath: string;
  locales?: readonly string[];
}): AlternatesShape {
  const self = localizedPath({ country, locale, pathname: subPath });
  if (!isIndexable(country, locale)) return { canonical: self };

  const canonical = editionPath(country, locale, subPath, locales);
  if (canonical !== self) return { canonical };

  // The cluster: every edition country x every language this page is written
  // in, region-tagged (`en-IN`), identical on every member so each one
  // self-references, plus x-default on the primary edition.
  const languages: Record<string, string> = {};
  for (const c of HREFLANG_COUNTRIES) {
    for (const lang of locales) {
      languages[`${lang}-${c.toUpperCase()}`] =
        normalizePublicUrl({ country: c, locale: lang, pathname: subPath });
    }
  }
  languages["x-default"] =
    normalizePublicUrl({ country: PRIMARY_COUNTRY, locale: PRIMARY_LOCALE, pathname: subPath });

  return { canonical, languages };
}

/**
 * Canonical + hreflang for a site-wide page. `subPath` is the part after
 * `/{country}/{locale}/` — `""` for the homepage, `"services"`,
 * `"industries/manufacturing"`, `"blogs/some-post"`. See `resolveAlternates`.
 */
export function buildAlternates({
  country,
  locale,
  subPath,
}: {
  country: string;
  locale: string;
  subPath: string;
}): AlternatesShape {
  return resolveAlternates({ country, locale, subPath });
}

/**
 * Hreflang + canonical for city-anchored pages (`/in/{locale}/cities/{slug}`
 * and its sub-routes). The written languages are per-CITY and per-page — see
 * `getCityPageLocales` in lib/cities.ts — so the one city with a hand-written
 * Hindi body keeps /in/hi/cities/{slug} as its own canonical while the other
 * cities' /hi/ copies point at English.
 *
 * `cityPath` is everything after `cities/` — e.g. `mumbai`, `mumbai/about`,
 * `mumbai/blog/some-post`. Leading/trailing slashes are stripped.
 */
export function buildCityAlternates({
  country,
  locale,
  city,
  cityPath,
}: {
  country: string;
  locale: string;
  city: CityContent;
  cityPath: string;
}): AlternatesShape {
  return resolveAlternates({
    country,
    locale,
    subPath: `cities/${cityPath}`,
    locales: getCityPageLocales(city, cityPath),
  });
}


export type PageKey =
  | "home"
  | "about"
  | "services"
  | "industries"
  | "pricing"
  | "caseStudies"
  | "contact"
  | "privacy"
  | "terms";

const PAGE_PATHS: Record<PageKey, string> = {
  home: "",
  about: "about",
  services: "services",
  industries: "industries",
  pricing: "pricing",
  caseStudies: "case-studies",
  contact: "contact",
  privacy: "privacy",
  terms: "terms",
};

/** Pages that should be geo-personalized in metadata. Legal pages skip personalization. */
const GEO_PERSONALIZED: PageKey[] = [
  "home",
  "about",
  "services",
  "industries",
  "pricing",
  "caseStudies",
  "contact",
];

interface BuildMetadataArgs {
  page: PageKey;
  country: string;
  locale: Locale;
}

/* -------------------------------------------------------------------------- */
/*               Geo-aware title, description, keywords injection             */
/* -------------------------------------------------------------------------- */

/**
 * Inject the visitor's country (and optionally city) into the title.
 *
 * The country slug is always known from the URL, so the country name is
 * GUARANTEED to appear in every personalized title — even when IP geo
 * detection fails. The city is added only when it makes the title fit.
 *
 * Examples:
 *   IN, detected city: "Savin Group in Bangalore, India — Software, AI & Industrial…"
 *   IN, no city:       "Savin Group in India — Software, AI & Industrial…"
 *   US, detected city: "Savin Group in New York, United States — Software…"
 *
 * Length budget: ~85 chars. The country always wins; city is dropped first
 * if total length would exceed the budget.
 */
function geoifyTitle(title: string, geo: GeoInfo): string {
  const country = geo.countryName;
  if (!country) return title;

  const cityPart = geo.detected && geo.city ? `${geo.city}, ` : "";
  const fullInsert = `in ${cityPart}${country}`;
  const countryOnlyInsert = `in ${country}`;

  // 1. Try inserting "in {city}, {country}" right after the brand name
  //    Matches: "Savin Group —", "Savin Group -", "Savin Group ·", "Savin Group |"
  const brandRe = /^(Savin Group)(\s*[—\-·|])/;

  if (brandRe.test(title)) {
    // First try full city+country
    const withCity = title.replace(brandRe, `$1 ${fullInsert}$2`);
    if (withCity.length <= 90) return withCity;

    // City made it too long → drop the city, keep the country
    const withCountry = title.replace(brandRe, `$1 ${countryOnlyInsert}$2`);
    if (withCountry.length <= 90) return withCountry;

    // Even country is too long → truncate the suffix after the separator
    // but always keep the country in the title
    const parts = title.split(/\s*[—\-·|]\s*/);
    if (parts.length >= 2) {
      const core = `Savin Group ${countryOnlyInsert} — ${parts[1]}`;
      return core.length <= 90 ? core : `Savin Group ${countryOnlyInsert} — ${parts[1].slice(0, 40)}…`;
    }
    return withCountry;
  }

  // 2. Brand didn't match the start of the title — append " · {city, country}"
  const withCity = `${title} · ${cityPart}${country}`;
  if (withCity.length <= 90) return withCity;

  const countryOnly = `${title} · ${country}`;
  return countryOnly.length <= 90 ? countryOnly : title;
}

/**
 * Prepend "Serving {city}, {state}, {country}." (or "Serving {country}." when
 * city/state are not detected) to the meta description.
 */
function geoifyDescription(desc: string, geo: GeoInfo): string {
  const loc = geo.detected ? formatLocation(geo) : geo.countryName;
  if (!loc) return desc;
  const prefix = `Serving ${loc}. `;
  const combined = prefix + desc;
  // Google snippet limit ~170 chars
  return combined.length > 170 ? combined.slice(0, 167) + "…" : combined;
}

/**
 * Append local keywords. Country keywords are always added; city/state
 * keywords are added only when they were actually detected.
 */
function geoifyKeywords(keywords: string, geo: GeoInfo): string {
  const parts = new Set(
    keywords.split(",").map((k) => k.trim()).filter(Boolean)
  );
  const extra: string[] = [];

  // Country keywords — always present
  if (geo.countryName) {
    extra.push(
      geo.countryName,
      `agency ${geo.countryName}`,
      `digital agency ${geo.countryName}`,
      `custom software ${geo.countryName}`,
      `SEO agency ${geo.countryName}`
    );
  }

  // City keywords — only when geo was actually detected
  if (geo.detected && geo.city) {
    extra.push(
      geo.city,
      `${geo.city} agency`,
      `agency in ${geo.city}`,
      `custom software ${geo.city}`,
      `SEO agency ${geo.city}`,
      `digital agency ${geo.city}`
    );
  }

  // State only when present
  if (geo.detected && geo.state && geo.state !== geo.city) {
    extra.push(geo.state);
  }

  for (const e of extra) parts.add(e);
  return Array.from(parts).join(", ");
}

/* -------------------------------------------------------------------------- */
/*                                Page titles                                 */
/* -------------------------------------------------------------------------- */

/**
 * The `title` to return from a page's metadata. The locale layout's template
 * appends " · Savin Group" to every child page's title, and most titles here
 * already name the brand ("Savin Group in India — Pricing", "… in Pune ·
 * Savin Group"), which rendered as "… · Savin Group · Savin Group" on ten
 * page types. A title that already names the brand is emitted as-is; any
 * other title gets the suffix from the template. The brand appears once.
 */
export function pageTitle(title: string): string | { absolute: string } {
  return title.includes(BRAND.name) ? { absolute: title } : title;
}

/* -------------------------------------------------------------------------- */
/*                             buildPageMetadata                              */
/* -------------------------------------------------------------------------- */

/**
 * Build a fully-populated `Metadata` object for a given page + locale + country.
 *
 * Automatically personalizes title/description/keywords with the visitor's
 * detected city, state, and country (from IP) for SEO boost.
 */
export async function buildPageMetadata({
  page,
  country,
  locale,
}: BuildMetadataArgs): Promise<Metadata> {
  const t = getTranslation(locale);
  const meta = t.pages[page];
  const subPath = PAGE_PATHS[page];
  const alternates = buildAlternates({ country, locale, subPath });
  const fullUrl = `${BASE_URL}${alternates.canonical}`;

  // Country-specific, and deterministic per URL. `getUrlGeo` derives
  // everything from the country slug and never reads request headers, so the
  // same URL always produces the same title/description. (`getGeo` does read
  // headers, which made these vary per request — see getUrlGeo's docblock.)
  const geo = getUrlGeo(country, locale);
  const geoize = GEO_PERSONALIZED.includes(page);

  const title = geoize ? geoifyTitle(meta.metaTitle, geo) : meta.metaTitle;
  const description = geoize
    ? geoifyDescription(meta.metaDescription, geo)
    : meta.metaDescription;
  const keywords = geoize
    ? geoifyKeywords(meta.metaKeywords, geo)
    : meta.metaKeywords;

  const ogTitleBase =
    (meta as { ogTitle?: string }).ogTitle ?? meta.metaTitle;
  const ogDescriptionBase =
    (meta as { ogDescription?: string }).ogDescription ?? meta.metaDescription;

  const ogTitle = geoize ? geoifyTitle(ogTitleBase, geo) : ogTitleBase;
  const ogDescription = geoize
    ? geoifyDescription(ogDescriptionBase, geo)
    : ogDescriptionBase;

  // Extra `<meta name="geo.*">` tags that SEO tools like GeoTarget, Yoast,
  // and Bing Places still read for local relevance signals. Country always
  // emitted; city/coords only when actually detected.
  const otherMeta: Record<string, string> = {
    "geo.country": geo.countryCode.toUpperCase(),
    "geo.region": geo.state
      ? `${geo.countryCode.toUpperCase()}-${geo.state}`
      : geo.countryCode.toUpperCase(),
  };
  if (geo.detected && geo.city) {
    otherMeta["geo.placename"] = geo.city;
  }
  if (geo.detected && geo.latitude && geo.longitude) {
    otherMeta["geo.position"] = `${geo.latitude};${geo.longitude}`;
    otherMeta["ICBM"] = `${geo.latitude}, ${geo.longitude}`;
  }

  // Breadcrumb — auto-generated for every page except home
  const breadcrumbItems = [
    { name: "Home", url: `${BASE_URL}/${country}/${locale}` },
  ];
  if (page !== "home") {
    const pageName = meta.metaTitle.split("—")[0]?.split("|")[0]?.trim() ?? page;
    breadcrumbItems.push({ name: pageName, url: fullUrl });
  }

  return {
    title: pageTitle(title),
    description,
    keywords,
    metadataBase: new URL(BASE_URL),
    alternates,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: fullUrl,
      siteName: t.brand.name,
      locale: `${locale}_${country.toUpperCase()}`,
      type: page === "home" ? "website" : "article",
      images: [
        {
          url: `${BASE_URL}/og.png`,
          width: 1200,
          height: 630,
          alt: t.brand.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [`${BASE_URL}/og.png`],
    },
    // `index` on every rendered variant; the canonical above decides which
    // copy Google keeps (see `resolveAlternates`). Only unknown codes ship
    // `noindex,follow`.
    robots: isIndexable(country, locale)
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
          },
        }
      : {
          index: false,
          follow: true,
          googleBot: { index: false, follow: true },
        },
    authors: [{ name: t.brand.name }],
    creator: t.brand.name,
    publisher: t.brand.name,
    other: otherMeta,
  };
}

/* -------------------------------------------------------------------------- */
/*                              JSON-LD builders                              */
/* -------------------------------------------------------------------------- */

/**
 * Topics the Organization node claims expertise in. Each one is a service the
 * site sells (services in en.json) or a Factory Graph page (platform/pages.ts);
 * keep it that way — `knowsAbout` is what entity graphs and AI assistants use
 * to answer "who does X", so a topic the site has no page for is a false lead.
 */
const ORGANIZATION_EXPERTISE = [
  "Custom software development",
  "Conversion-focused website development",
  "WhatsApp automation",
  "CRM automation",
  "Search engine optimization",
  "Local SEO",
  "Multi-language websites",
  "Custom ERP development",
  "Business process automation",
  "AI automation",
  "AI agents for ERP and CRM",
  "Industrial IoT",
  "Digital twins",
  "CAD/CAM and CNC integration",
  "Manufacturing ERP integration",
  "Smart manufacturing",
];

export function buildOrganizationJsonLd(t: Messages) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: t.brand.name,
    alternateName: BRAND.domain,
    url: BASE_URL,
    logo: `${BASE_URL}/og.png`,
    description: t.seo.description,
    slogan: t.brand.tagline,
    email: t.contact.details.email,
    telephone: t.contact.details.phone,
    knowsAbout: ORGANIZATION_EXPERTISE,
    brand: { "@type": "Brand", name: "Factory Graph" },
    // `sameAs` is emitted only when real profiles exist — Google uses it for
    // entity verification and a platform homepage with no company slug is an
    // unverifiable claim, which is worse than omitting the field. The list now
    // lives in `SOCIAL_PROFILES` (constants.ts) and is shared with the footer
    // icons, so the two can never disagree about which profiles are real.
    ...(SOCIAL_PROFILES.length
      ? { sameAs: SOCIAL_PROFILES.map((p) => p.url) }
      : {}),
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: t.contact.details.email,
        telephone: t.contact.details.phone,
        contactType: "sales",
        availableLanguage: LOCALE_CODES.map((c) => LOCALES[c].name),
        areaServed: validCountryISOs.map((c) => c.toUpperCase()),
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "IN",
    },
  };
}

// No LocalBusiness / ProfessionalService builder. The last one took its
// postal address from the VISITOR's IP (see the note in CityBanner.tsx), and
// the business has no premises address to publish. Organization (above) and
// per-city `Service` + `areaServed` nodes state what is true. Add a
// LocalBusiness only with a real, verifiable street address.

export function buildWebsiteJsonLd(t: Messages, locale: Locale, country: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    // The `@id` is required, not decorative: every city page emits a WebPage
    // with `isPartOf: { "@id": "<base>/<country>/<locale>#website" }`, and
    // this node had no `@id` at all — so that reference resolved to an empty
    // blank node and the WebPage→WebSite relationship was never established.
    "@id": `${BASE_URL}/${country}/${locale}#website`,
    name: t.brand.name,
    url: `${BASE_URL}/${country}/${locale}`,
    inLanguage: locale,
    publisher: { "@type": "Organization", "@id": ORGANIZATION_ID, name: t.brand.name },
    // No `potentialAction`/SearchAction. It declared a Sitelinks Searchbox
    // target of `?q={search_term_string}`, but the site implements no search
    // — the parameter is read nowhere, and the URL just returns the homepage.
    // Google also removed the sitelinks search box feature in November 2024,
    // so the markup described a non-existent endpoint for a non-existent
    // feature. Re-add only alongside a real search route.
  };
}

/**
 * Build breadcrumb JSON-LD for a page. Call from page components.
 */
export function buildPageBreadcrumbJsonLd(
  page: PageKey,
  locale: Locale,
  country: string,
): object {
  const t = getTranslation(locale);
  const subPath = PAGE_PATHS[page];
  const homeUrl = `${BASE_URL}/${country}/${locale}`;
  const items = [{ name: t.nav.home, url: homeUrl }];

  if (page !== "home") {
    const pageUrl = `${homeUrl}/${subPath}`;
    const label =
      page === "caseStudies" ? t.nav.work :
      page === "about" ? t.nav.about :
      page === "services" ? t.nav.services :
      page === "industries" ? t.nav.industries :
      page === "pricing" ? t.nav.pricing :
      page === "contact" ? t.nav.contact :
      page;
    items.push({ name: label, url: pageUrl });
  }

  return buildBreadcrumbJsonLd(items);
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function buildFaqJsonLd(items: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*                       Industry slug page metadata                          */
/* -------------------------------------------------------------------------- */

import type { IndustrySeoData } from "@/lib/industry-data";
export type { CityContent } from "@/lib/cities";

/**
 * Build Metadata for `/{country}/{locale}/industries/{slug}` from a static
 * `IndustrySeoData` entry. Mirrors `buildPageMetadata` — per-slug canonical,
 * hreflang cluster pinned to /in/*, and the same geoify treatment applied to
 * title / description / keywords so the page personalizes by visitor country.
 */
export async function buildIndustryPageMetadata({
  industry,
  country,
  locale,
}: {
  industry: IndustrySeoData;
  country: string;
  locale: Locale;
}): Promise<Metadata> {
  const subPath = `industries/${industry.slug}`;
  const alternates = buildAlternates({ country, locale, subPath });
  const fullUrl = `${BASE_URL}${alternates.canonical}`;

  const geo = getUrlGeo(country, locale);

  const title = geoifyTitle(industry.metaTitle, geo);
  const description = geoifyDescription(industry.metaDescription, geo);
  const keywords = geoifyKeywords(industry.metaKeywords, geo);

  const ogTitle = geoifyTitle(industry.ogTitle, geo);
  const ogDescription = geoifyDescription(industry.ogDescription, geo);

  const otherMeta: Record<string, string> = {
    "geo.country": geo.countryCode.toUpperCase(),
    "geo.region": geo.state
      ? `${geo.countryCode.toUpperCase()}-${geo.state}`
      : geo.countryCode.toUpperCase(),
  };
  if (geo.detected && geo.city) {
    otherMeta["geo.placename"] = geo.city;
  }
  if (geo.detected && geo.latitude && geo.longitude) {
    otherMeta["geo.position"] = `${geo.latitude};${geo.longitude}`;
    otherMeta["ICBM"] = `${geo.latitude}, ${geo.longitude}`;
  }

  return {
    title: pageTitle(title),
    description,
    keywords,
    metadataBase: new URL(BASE_URL),
    alternates,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: fullUrl,
      siteName: "Savin Group",
      locale: `${locale}_${country.toUpperCase()}`,
      type: "article",
      images: [
        {
          url: `${BASE_URL}/og.png`,
          width: 1200,
          height: 630,
          alt: "Savin Group",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [`${BASE_URL}/og.png`],
    },
    robots: isIndexable(country, locale)
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
          },
        }
      : {
          index: false,
          follow: true,
          googleBot: { index: false, follow: true },
        },
    authors: [{ name: "Savin Group" }],
    creator: "Savin Group",
    publisher: "Savin Group",
    other: otherMeta,
  };
}

/**
 * `Service` JSON-LD for an industry page — pins the page as a Service offering
 * with `areaServed` set to the country and `provider` set to the org.
 */
export function buildIndustryServiceJsonLd(
  industry: IndustrySeoData,
  locale: Locale,
  country: string,
) {
  const url = `${BASE_URL}/${country}/${locale}/industries/${industry.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: industry.metaTitle.split("|")[0]?.trim() ?? industry.serviceType,
    serviceType: industry.serviceType,
    description: industry.metaDescription,
    provider: {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: "Savin Group",
      url: BASE_URL,
    },
    areaServed: {
      "@type": "Country",
      name: country.toUpperCase() === "IN" ? "India" : country.toUpperCase(),
    },
    url,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      priceSpecification: {
        "@type": "PriceSpecification",
        priceCurrency: "INR",
        description: "Custom-priced from a 1-week paid discovery",
      },
    },
  };
}

export function buildServiceJsonLd(
  service: Messages["services"]["items"][number],
  locale: Locale,
  country: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    serviceType: service.kicker,
    description: service.summary,
    provider: { "@type": "Organization", "@id": ORGANIZATION_ID, name: "Savin Group" },
    url: `${BASE_URL}/${country}/${locale}/services#${service.id}`,
    areaServed: "Worldwide",
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      priceSpecification: {
        "@type": "PriceSpecification",
        priceCurrency: "INR",
        description: service.investment,
      },
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                       Removed: India LocalBusiness helpers                 */
/* -------------------------------------------------------------------------- */

// buildCityLocalBusinessJsonLd, buildCityBreadcrumbJsonLd, buildCityFaqJsonLd,
// buildServiceAreaJsonLd and buildIndiaGeoTargeting were removed on
// 2026-11-23. None was called, and each would have published something false
// the moment it was: a "+91-XXXX-XXXX" phone, an "Office details" street
// address, a default 4.9 AggregateRating with no reviews behind it, a
// LocalBusiness with no address, and FAQ Questions carrying properties
// schema.org does not define. City pages emit Service + areaServed and
// buildBreadcrumbJsonLd / buildFaqJsonLd instead.
