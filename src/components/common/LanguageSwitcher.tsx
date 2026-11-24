"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { LOCALES, type Locale } from "@/lib/i18n";
import { switcherOptions } from "@/lib/page-versions";
import { countryNamesByISO } from "@/lib/country";
import styles from "./LanguageSwitcher.module.css";

interface LanguageSwitcherProps {
  locale: Locale;
  country: string;
  variant?: "compact" | "full";
  placement?: "above" | "below";
}

const labels: Record<Locale, { change: string; language: string; region: string }> = {
  en: { change: "Change language or region", language: "Language", region: "Region" },
  es: { change: "Cambiar idioma o región", language: "Idioma", region: "Región" },
  fr: { change: "Changer de langue ou de région", language: "Langue", region: "Région" },
  de: { change: "Sprache oder Region ändern", language: "Sprache", region: "Region" },
  ar: { change: "تغيير اللغة أو المنطقة", language: "اللغة", region: "المنطقة" },
  hi: { change: "भाषा या क्षेत्र बदलें", language: "भाषा", region: "क्षेत्र" },
  gu: { change: "ભાષા અથવા વિસ્તાર બદલો", language: "ભાષા", region: "વિસ્તાર" },
  zh: { change: "更改语言或地区", language: "语言", region: "地区" },
};

export default function LanguageSwitcher({ locale, country, variant = "compact", placement = "below" }: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const focusFirst = useRef(false);
  const panelId = useId();
  const pathname = usePathname();
  const copy = labels[locale];
  const currentCountry = country.toLowerCase();
  // Only versions of THIS page that exist (each one a sitemap URL). Linking
  // every locale x region put ~970 canonicalized copies in front of crawlers.
  const { languages, regions } = switcherOptions(pathname || "/" + currentCountry + "/" + locale);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (open && focusFirst.current) {
      panel.current?.querySelector<HTMLAnchorElement>("a")?.focus();
      focusFirst.current = false;
    }
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    }
    if (event.key === "ArrowDown" && event.target === trigger.current) {
      event.preventDefault();
      if (open) panel.current?.querySelector<HTMLAnchorElement>("a")?.focus();
      else { focusFirst.current = true; setOpen(true); }
    }
  }

  // Most pages exist in one version only: nothing to switch to, no control.
  if (languages.length === 0 && regions.length === 0) return null;

  return (
    <div className={styles.root} ref={root} onKeyDown={onKeyDown} onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
    }}>
      <button ref={trigger} type="button" onClick={() => setOpen((value) => !value)} className={styles.trigger + (variant === "full" ? " " + styles.full : "")} aria-label={copy.change} aria-expanded={open} aria-controls={panelId}>
        <Globe2 size={15} strokeWidth={1.5} aria-hidden="true" />
        <span dir="ltr">{locale.toUpperCase()} <span className={styles.divider}>/</span> {currentCountry.toUpperCase()}</span>
        <ChevronDown size={11} className={open ? styles.rotated : ""} aria-hidden="true" />
      </button>
      {/* Links stay in server HTML so crawlers can follow them; every one is a
          version of this page that is its own canonical. */}
      <div className={`${styles.panel} ${placement === "above" ? styles.above : ""}`} id={panelId} ref={panel} hidden={!open}>
        {languages.length > 0 && <nav aria-label={copy.language}>
          <h2>{copy.language}<span>{languages.length.toString().padStart(2, "0")}</span></h2>
          <ul>{languages.map((option) => {
            const item = LOCALES[option.code as Locale];
            return <li key={option.code}><a href={option.href} hrefLang={item.htmlLang} lang={item.htmlLang} dir={item.dir} aria-current={option.current ? "true" : undefined}>
              <span>{item.nativeName}</span>{option.current ? <Check size={13} aria-hidden="true" /> : <small>{option.code.toUpperCase()}</small>}
            </a></li>;
          })}</ul>
        </nav>}
        {regions.length > 0 && <nav aria-label={copy.region}>
          <h2>{copy.region}<span>{regions.length.toString().padStart(2, "0")}</span></h2>
          <ul>{regions.map((option) => <li key={option.code}><a href={option.href} aria-current={option.current ? "true" : undefined}>
            <span>{countryNamesByISO[option.code as keyof typeof countryNamesByISO] ?? option.code.toUpperCase()}</span>{option.current ? <Check size={13} aria-hidden="true" /> : <small>{option.code.toUpperCase()}</small>}
          </a></li>)}</ul>
        </nav>}
      </div>
    </div>
  );
}
