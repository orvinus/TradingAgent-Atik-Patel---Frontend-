// src/components/auth/BrandMark.tsx
import { useEffect, useState } from "react";
import { useThemeStore } from "@/store/themeStore";

interface Props {
  size?: "sm" | "md" | "lg";
  /** Kept for backwards compatibility — no longer renders a wordmark. */
  showWord?: boolean;
}

// Drop /public/logo-light.png to use a tailored light-theme logo.
// If it's missing, we keep showing /logo.png but apply a CSS filter that
// inverts lightness while preserving hues — usable on a light background.
const LOGO_DARK = "/logo.png";
const LOGO_LIGHT = "/logo-light.png";
const LIGHT_FALLBACK_FILTER = "invert(1) hue-rotate(180deg)";

export function BrandMark({ size = "md" }: Props) {
  const theme = useThemeStore((s) => s.theme);

  const [src, setSrc] = useState(theme === "light" ? LOGO_LIGHT : LOGO_DARK);
  const [usingFallback, setUsingFallback] = useState(false);

  // Whenever the theme changes, try the matching logo first.
  useEffect(() => {
    setSrc(theme === "light" ? LOGO_LIGHT : LOGO_DARK);
    setUsingFallback(false);
  }, [theme]);

  const mark =
    size === "sm" ? "h-20 w-20"
      : size === "lg" ? "h-32 w-32"
      : "h-24 w-24";

  // Apply the lightness-invert filter only when we had to fall back from
  // /logo-light.png to /logo.png on light theme.
  const filter =
    theme === "light" && usingFallback ? LIGHT_FALLBACK_FILTER : undefined;

  return (
    <div className="flex items-center">
      <img
        src={src}
        alt="Trading OS"
        onError={() => {
          if (src === LOGO_LIGHT) {
            setSrc(LOGO_DARK);
            setUsingFallback(true);
          }
        }}
        style={{ filter }}
        className={`${mark} flex-shrink-0 object-contain`}
      />
    </div>
  );
}
