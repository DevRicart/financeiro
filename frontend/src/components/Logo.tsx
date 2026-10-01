import logoHorizontal from "../assets/brand/lumi-logo-horizontal.svg";
import logoHorizontalNegativo from "../assets/brand/lumi-logo-horizontal-negativo.svg";
import simboloCompleto from "../assets/brand/lumi-simbolo-completo.svg";
import simboloCompletoNegativo from "../assets/brand/lumi-simbolo-completo-negativo.svg";
import simboloBorda from "../assets/brand/lumi-simbolo-borda.svg";
import simboloLiso from "../assets/brand/lumi-simbolo-liso.svg";

// Official brand artwork — see lumi-finance-marca/LEIAME.md for size tiers:
// completo >=56px, borda 24-56px (menu do app), liso <24px.
type SymbolSize = "completo" | "borda" | "liso";

const SYMBOL_SRC: Record<SymbolSize, { normal: string; negativo: string }> = {
  completo: { normal: simboloCompleto, negativo: simboloCompletoNegativo },
  borda: { normal: simboloBorda, negativo: simboloBorda },
  liso: { normal: simboloLiso, negativo: simboloLiso },
};

interface SymbolProps {
  size?: SymbolSize;
  /** Fixed on a permanently-colored panel (e.g. the petroleo auth panel) — always renders the negativo artwork, regardless of app theme. */
  onDark?: boolean;
  className?: string;
}

export function Symbol({ size = "completo", onDark = false, className }: SymbolProps) {
  const { normal, negativo } = SYMBOL_SRC[size];

  if (onDark) {
    return <img src={negativo} alt="" className={className} />;
  }

  return (
    <>
      <img src={normal} alt="" className={`${className ?? ""} dark:hidden`} />
      <img src={negativo} alt="" className={`${className ?? ""} hidden dark:block`} />
    </>
  );
}

interface LogoProps {
  onDark?: boolean;
  className?: string;
}

export function Logo({ onDark = false, className }: LogoProps) {
  if (onDark) {
    return <img src={logoHorizontalNegativo} alt="Lumi Finance" className={className} />;
  }

  return (
    <>
      <img src={logoHorizontal} alt="Lumi Finance" className={`${className ?? ""} dark:hidden`} />
      <img src={logoHorizontalNegativo} alt="Lumi Finance" className={`${className ?? ""} hidden dark:block`} />
    </>
  );
}
