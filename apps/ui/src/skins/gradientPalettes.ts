/**
 * Popular two-colour gradients for Appearance → Gradient background.
 * Inspired by https://www.color-meanings.com/gradient-color-palettes/
 */

export type GradientPalette = {
  id: string;
  label: string;
  from: string;
  to: string;
  /** CSS angle, e.g. 135deg */
  angle?: string;
};

export const GRADIENT_NONE_ID = "none";

export const GRADIENT_PALETTES: GradientPalette[] = [
  { id: "watermelon-crush", label: "Watermelon Crush", from: "#DB2763", to: "#B0DB43" },
  { id: "sedona-sunrise", label: "Sedona Sunrise", from: "#E43D00", to: "#FFE900" },
  { id: "seascape", label: "Seascape", from: "#E4F3E3", to: "#5CA9E9" },
  { id: "blackcurrant", label: "Blackcurrant", from: "#212130", to: "#39304A" },
  { id: "cotton-candy", label: "Cotton Candy", from: "#BCE7FC", to: "#C491B1" },
  { id: "carrot", label: "Carrot", from: "#D36135", to: "#80B069" },
  { id: "honeydew", label: "Honeydew", from: "#DAFF7D", to: "#B2EE9B" },
  { id: "spotlight", label: "Spotlight", from: "#350068", to: "#FF6978" },
  { id: "nectarine", label: "Nectarine", from: "#F7DBA7", to: "#F0AB86" },
  { id: "south-pacific", label: "South Pacific", from: "#022F40", to: "#38AECC" },
  { id: "raspberry-velvet", label: "Raspberry Velvet", from: "#870057", to: "#A5303F" },
  { id: "pink-sands", label: "Pink Sands", from: "#91F1EF", to: "#FFD5E0" },
  { id: "iguana", label: "Iguana", from: "#264653", to: "#2A9D8F" },
  { id: "stormy-skies", label: "Stormy Skies", from: "#505250", to: "#CBD3C1" },
  { id: "jade-aubergine", label: "Jade Aubergine", from: "#51A3A3", to: "#75485E" },
  { id: "hot-and-cold", label: "Hot and Cold", from: "#DA3068", to: "#14469F" },
  { id: "emerald-isle", label: "Emerald Isle", from: "#23CD6B", to: "#272D2D" },
  { id: "cloudburst", label: "Cloudburst", from: "#7FB7BE", to: "#D2F3EE" },
  { id: "ocean-sunsets", label: "Ocean Sunsets", from: "#EDAE48", to: "#D1495B" },
  { id: "lavender-haze", label: "Lavender Haze", from: "#D7B8F3", to: "#B8B8F3" },
  { id: "dust-bowl", label: "Dust Bowl", from: "#584D3C", to: "#9F956C" },
  { id: "pink-clouds", label: "Pink Clouds", from: "#EEBBD5", to: "#2F284E" },
  { id: "azure-mist", label: "Azure Mist", from: "#00C1D0", to: "#0A0F44" },
  { id: "touch-of-gray", label: "Touch of Gray", from: "#FCFAFB", to: "#C8D3D6" },
  { id: "buckskin", label: "Buckskin", from: "#9F7E6A", to: "#D2BA9F" },
  { id: "parakeet", label: "Parakeet", from: "#FCFB62", to: "#91F9E5" },
  { id: "lupine-bloom", label: "Lupine Bloom", from: "#7B4C94", to: "#7D82B9" },
  { id: "amulet", label: "Amulet", from: "#70C1B3", to: "#247B9F" },
  { id: "seashell", label: "Seashell", from: "#C88284", to: "#F3D8DB" },
  { id: "blueberry-blitz", label: "Blueberry Blitz", from: "#301847", to: "#C10214" },
  { id: "lime-sherbet", label: "Lime Sherbet", from: "#17E0BC", to: "#98CE00" },
  { id: "grayscale", label: "Grayscale", from: "#BFBDC1", to: "#6D6975" },
  { id: "asphalt", label: "Asphalt", from: "#474449", to: "#2D232E" },
];

const BY_ID = new Map(GRADIENT_PALETTES.map((p) => [p.id, p]));

export function getGradientPalette(id: string | null | undefined): GradientPalette | null {
  if (!id || id === GRADIENT_NONE_ID) return null;
  return BY_ID.get(id) ?? null;
}

/** CSS `background-image` value, or null for solid theme background. */
export function gradientCss(id: string | null | undefined): string | null {
  const p = getGradientPalette(id);
  if (!p) return null;
  const angle = p.angle ?? "135deg";
  return `linear-gradient(${angle}, ${p.from}, ${p.to})`;
}
