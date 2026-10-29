export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
  foreground: string;
}

export interface BrandPalette {
  primary: string;
  primaryForeground: string;
  primaryScale: ColorScale;
  secondary: string;
  secondaryForeground: string;
  secondaryScale: ColorScale;
}

// Convert Hex to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Convert RGB to Hex
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert RGB to HSL
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const normR = r / 255;
  const normG = g / 255;
  const normB = b / 255;
  const max = Math.max(normR, normG, normB);
  const min = Math.min(normR, normG, normB);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case normR:
        h = (normG - normB) / d + (normG < normB ? 6 : 0);
        break;
      case normG:
        h = (normB - normR) / d + 2;
        break;
      case normB:
        h = (normR - normG) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Convert HSL to RGB
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const normH = h / 360;
  const normS = s / 100;
  const normL = l / 100;

  if (normS === 0) {
    const val = Math.round(normL * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let normT = t;
    if (normT < 0) normT += 1;
    if (normT > 1) normT -= 1;
    if (normT < 1 / 6) return p + (q - p) * 6 * normT;
    if (normT < 1 / 2) return q;
    if (normT < 2 / 3) return p + (q - p) * (2 / 3 - normT) * 6;
    return p;
  };

  const q = normL < 0.5 ? normL * (1 + normS) : normL + normS - normL * normS;
  const p = 2 * normL - q;

  const r = hue2rgb(p, q, normH + 1 / 3);
  const g = hue2rgb(p, q, normH);
  const b = hue2rgb(p, q, normH - 1 / 3);

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// Relative Luminance for WCAG Contrast
export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const sr = r / 255 <= 0.03928 ? (r / 255) / 12.92 : Math.pow(((r / 255) + 0.055) / 1.055, 2.4);
  const sg = g / 255 <= 0.03928 ? (g / 255) / 12.92 : Math.pow(((g / 255) + 0.055) / 1.055, 2.4);
  const sb = b / 255 <= 0.03928 ? (b / 255) / 12.92 : Math.pow(((b / 255) + 0.055) / 1.055, 2.4);
  return 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
}

// WCAG AA Compliant High-Contrast Foreground (white or dark)
export function getContrastForeground(hex: string): string {
  const luminance = getRelativeLuminance(hex);
  // White luminance is 1.0, black is 0.0
  // Contrast with white: (1.0 + 0.05) / (L + 0.05)
  // Contrast with black: (L + 0.05) / (0.0 + 0.05)
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;

  return contrastWithWhite >= contrastWithBlack ? "#ffffff" : "#0f172a";
}

// Generate complete 50-950 color scale from base Hex
export function generateColorScale(baseHex: string): ColorScale {
  const { r, g, b } = hexToRgb(baseHex);
  const { h, s, l: baseL } = rgbToHsl(r, g, b);

  // Standard Tailwind lightness targets for shades
  const lightnessMap: Record<keyof Omit<ColorScale, "foreground">, number> = {
    50: 97,
    100: 93,
    200: 85,
    300: 74,
    400: 62,
    500: baseL, // anchor at base lightness
    600: Math.max(10, Math.min(48, baseL - 8)),
    700: Math.max(8, Math.min(38, baseL - 18)),
    800: Math.max(6, Math.min(27, baseL - 28)),
    900: Math.max(4, Math.min(18, baseL - 37)),
    950: Math.max(3, Math.min(10, baseL - 45)),
  };

  const scale: Partial<ColorScale> = {};

  (Object.keys(lightnessMap) as unknown as (keyof typeof lightnessMap)[]).forEach((key) => {
    const targetL = lightnessMap[key];
    // Scale saturation slightly for very light and very dark shades
    const targetS = key === 50 ? Math.min(s, 70) : key === 950 ? Math.min(s, 60) : s;
    const { r: sr, g: sg, b: sb } = hslToRgb(h, targetS, targetL);
    scale[key as keyof ColorScale] = rgbToHex(sr, sg, sb);
  });

  scale.foreground = getContrastForeground(baseHex);

  return scale as ColorScale;
}

// Generate full brand palette for backend, email, and PDF rendering
export function generateBrandPalette(primaryHex: string, secondaryHex: string): BrandPalette {
  const primaryScale = generateColorScale(primaryHex);
  const secondaryScale = generateColorScale(secondaryHex);

  return {
    primary: primaryHex,
    primaryForeground: primaryScale.foreground,
    primaryScale,
    secondary: secondaryHex,
    secondaryForeground: secondaryScale.foreground,
    secondaryScale,
  };
}
