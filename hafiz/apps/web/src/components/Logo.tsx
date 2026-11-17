import { Link } from "react-router-dom";

interface LogoProps {
  size?: number;
  withText?: boolean;
  textClassName?: string;
  to?: string;
}

/** Logo HAFIZ. Remplacez `public/logo.svg` par le logo officiel si besoin. */
export function Logo({ size = 36, withText = true, textClassName = "text-white", to = "/" }: LogoProps) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5" aria-label="HAFIZ – Accueil">
      <img src="/logo.svg" alt="" width={size} height={size} className="rounded-xl" />
      {withText && (
        <span className={`text-xl font-bold tracking-[0.2em] ${textClassName}`}>HAFIZ</span>
      )}
    </Link>
  );
}
