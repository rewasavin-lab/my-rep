// lib/page-versions.ts
//
// Which versions of a page exist, worked out from its URL alone.
//
// A page "exists" in a version when that /{country}/{locale}/ copy is its own
// canonical: an edition country (INDEXABLE_COUNTRIES) in a language the page
// is actually written in. Those are the URLs in the sitemap and the page's
// hreflang cluster. Every other copy either renders and points its canonical
// at one of them, or (see `retiredDuplicateTarget`) redirects to it.
//
// Kept light on purpose (constants and public-url only): the middleware and
// the header's language switcher both import it, and neither should pull in
// the city, blog or research content. scripts/sitemap.test.mjs checks every
// answer here against the canonical each page's own metadata declares.

import {
  INDEXABLE_COUNTRIES,
  INDEXABLE_LOCALES,
  PRIMARY_COUNTRY,
  PRIMARY_LOCALE,
  isIndexable,
  isIndexableCountry,
  isResolvableCountry,
} from "@/lib/constants";
import { localizedPath } from "@/lib/public-url";

/**
 * Cities whose body is hand-written in a language besides English, and the
 * languages it is written in. The source of truth is the city data
 * (`bodyLocales` plus a `translations` block, read by
 * `getCityIndexableLocales` in cities.ts); this copy exists so the middleware
 * and the header do not import 90 KB of city copy. A test fails if the two
 * disagree, so translating a new city means adding it here too.
 */
export const TRANSLATED_CITY_LOCALES: Readonly<Record<string, readonly string[]>> = {
  ahmedabad: ["en", "hi"],
};

/**
 * City sub-pages that render the localized city body. The others (about, the
 * city blog index and its posts) are English whatever the locale.
 */
const LOCALIZED_CITY_SUBPAGES: ReadonlySet<string> = new Set([
  "services",
  "process",
  "case-studies",
  "contact",
]);

/**
 * The languages one city page is written in, given the languages the city's
 * body is written in. `cityPath` is everything after `cities/`: `jaipur`,
 * `jaipur/services`, `jaipur/blog/some-post`.
 */
export function cityPageLocales<L extends string>(
  cityLocales: readonly L[],
  cityPath: string,
): readonly (L | typeof PRIMARY_LOCALE)[] {
  const sub = cityPath.split("/").filter(Boolean)[1];
  return !sub || LOCALIZED_CITY_SUBPAGES.has(sub) ? cityLocales : [PRIMARY_LOCALE];
}

/**
 * The languages the page at `subPath` (the part after /{country}/{locale}/)
 * is written in: the same list its own metadata hands to `resolveAlternates`.
 */
export function writtenLocales(subPath: string): readonly string[] {
  const segs = subPath.split("/").filter(Boolean);
  if (segs[0] === "cities" && segs[1]) {
    return cityPageLocales(TRANSLATED_CITY_LOCALES[segs[1]] ?? [PRIMARY_LOCALE], segs.slice(1).join("/"));
  }
  return INDEXABLE_LOCALES;
}

/**
 * The copy of /{country}/{locale}/{subPath} that is its own canonical: the
 * country becomes the edition (/in/) unless it is one, and the language
 * becomes English unless the page is written in it. `resolveAlternates`
 * (seo.ts) applies exactly this rule.
 */
export function editionPath(
  country: string,
  locale: string,
  subPath: string,
  locales: readonly string[],
): string {
  return localizedPath({
    country: isIndexableCountry(country) ? country : PRIMARY_COUNTRY,
    locale: locales.includes(locale.toLowerCase()) ? locale : PRIMARY_LOCALE,
    pathname: subPath,
  });
}

/**
 * The canonical path the page at /{country}/{locale}/{subPath} declares.
 * Unknown codes (/zz/en/…) are self-canonical, as in `resolveAlternates`.
 */
export function canonicalPath(country: string, locale: string, subPath: string): string {
  if (!isIndexable(country, locale)) return localizedPath({ country, locale, pathname: subPath });
  return editionPath(country, locale, subPath, writtenLocales(subPath));
}

export interface SwitcherOption {
  /** Locale code (languages) or ISO country code (regions). */
  code: string;
  /** A version of the page that exists: always a sitemap URL. */
  href: string;
  /** The language (or region) the visitor is reading now. */
  current: boolean;
}

/**
 * What the header's language/region switcher may offer on `pathname`: only
 * versions of this page that exist, so every link it renders is a URL in the
 * sitemap. A list comes back empty when it has nowhere to go (its only entry
 * is what the visitor is already reading), and with both empty the switcher
 * renders nothing.
 *
 *   /in/en/services           → nothing: the page exists only in English
 *   /in/en/cities/ahmedabad   → English (current), हिन्दी
 *   /in/hi/services           → English: the Hindi copy is not a translation
 *   /us/en/pricing            → India: the edition this copy points at
 *
 * Before this, every page linked 7 other locales and 11 other countries,
 * which is how ~970 copies that all declare an /in/en/ canonical ended up
 * linked from the 54 pages in the sitemap.
 */
export function switcherOptions(pathname: string): { languages: SwitcherOption[]; regions: SwitcherOption[] } {
  const [rawCountry = PRIMARY_COUNTRY, rawLocale = PRIMARY_LOCALE, ...rest] = pathname
    .split("/")
    .filter(Boolean);
  const country = rawCountry.toLowerCase();
  const locale = rawLocale.toLowerCase();
  const subPath = rest.join("/");
  const locales = writtenLocales(subPath);
  const edition = isIndexableCountry(country) ? country : PRIMARY_COUNTRY;
  const language = locales.includes(locale) ? locale : PRIMARY_LOCALE;

  const languages = locales.map((code) => ({
    code,
    href: localizedPath({ country: edition, locale: code, pathname: subPath }),
    current: code === locale,
  }));
  const regions = INDEXABLE_COUNTRIES.map((code) => ({
    code: code as string,
    href: localizedPath({ country: code, locale: language, pathname: subPath }),
    current: code === country,
  }));
  const useful = (list: SwitcherOption[]) => (list.some((option) => !option.current) ? list : []);
  return { languages: useful(languages), regions: useful(regions) };
}

/**
 * Where a retired exact duplicate should 308 to, or null to serve the URL.
 *
 * A country outside RESOLVABLE_COUNTRIES has no market content:
 * `getCountryContent` falls back to India, so /tv/en/cities/bengaluru is the
 * India page word for word. Those copies were listed in the old ~93,000-URL
 * sitemaps, nothing links to them now, and the middleware never sends a
 * visitor to one (it maps visitor countries to RESOLVABLE_COUNTRIES). Google
 * still holds some, and had picked /at/gu/cities/delhi and
 * /tv/en/cities/bengaluru as canonicals over the /in/en/ pages.
 *
 * Each one goes, in one hop, to the canonical it already declares, so the
 * redirect and the rel=canonical agree. A real translation survives:
 * /tv/hi/cities/ahmedabad lands on /in/hi/cities/ahmedabad.
 *
 * Left alone: /in/ in any locale, the 11 market editions (/us/, /ae/ …, which
 * carry their own market copy and are where the middleware sends visitors),
 * and unknown codes, which 404.
 */
export function retiredDuplicateTarget(pathname: string): string | null {
  const [country, locale, ...rest] = pathname.split("/").filter(Boolean);
  if (!country || !locale) return null;
  if (!isIndexable(country, locale) || isResolvableCountry(country)) return null;
  return canonicalPath(country, locale, rest.join("/"));
}
