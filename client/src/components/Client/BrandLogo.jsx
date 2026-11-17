import React from "react";
import { BRAND } from "../../config/brand";

// Shows the right logo for light and dark mode.
// variant="mark" → GP logo only; variant="full" → GP + GPOS + tagline
const BrandLogo = ({ variant = "mark", className = "h-8" }) => {
  const light = variant === "full" ? BRAND.logoFull : BRAND.logo;
  const dark = variant === "full" ? BRAND.logoFullDark : BRAND.logoDark;
  const alt = variant === "full" ? `${BRAND.name} – ${BRAND.tagline}` : BRAND.name;

  return (
    <>
      <img src={light} alt={alt} className={`${className} w-auto dark:hidden`} />
      <img src={dark} alt={alt} className={`${className} w-auto hidden dark:block`} />
    </>
  );
};

export default BrandLogo;
