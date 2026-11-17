// Everything the landing page and client portal show about the product.
// Change it here once; every page reads from this file.
//
// Colors: the GPOS red is used as Tailwind arbitrary classes (e.g. bg-[#E00000])
// in the client pages, because Tailwind needs the literal class in the source.
// To change the red, search and replace #E00000 / #B80000 in src/pages/Public,
// src/pages/Client and src/components/Client.

import logo from "../assets/brand/gpos-logo.png";
import logoDark from "../assets/brand/gpos-logo-dark.png";
import logoFull from "../assets/brand/gpos-brand.png";
import logoFullDark from "../assets/brand/gpos-brand-dark.png";

export const BRAND = {
  name: "GPOS",
  tagline: "All in one POS",
  headline: "Run your whole business from one POS",
  description:
    "Point of sale, inventory, purchasing, production and accounting in one system. Built for retail, restaurants, trading, manufacturing and services.",
  supportEmail: "support@example.com",
  currency: "₱",
  locale: "en-PH",

  // Logo mark (GP) and full logo (GP + GPOS + tagline), with white versions for dark mode
  logo,
  logoDark,
  logoFull,
  logoFullDark,

  colors: {
    red: "#E00000", // UI red (slightly deeper than the logo's #FF0000 so text stays readable)
    redHover: "#B80000",
    black: "#000000",
  },
};

export const money = (value) =>
  `${BRAND.currency}${Number(value || 0).toLocaleString(BRAND.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
