import { useSkin } from "./SkinProvider";
import { gradientCss } from "./gradientPalettes";
import { contentSurfaceSx } from "./surfaceStyles";

export {
  chromeSurfaceSx,
  contentSurfaceSx,
  isGradientActive,
  contentPanelStyles,
} from "./surfaceStyles";

/** True when Appearance has a page gradient selected (not Off). */
export function useGradientActive(): boolean {
  const { themePrefs } = useSkin();
  return Boolean(gradientCss(themePrefs.gradientId));
}

/** Prefer solid light/dark panels over frosted glass when a gradient is on. */
export function useSolidContentPanels(): boolean {
  const { themePrefs } = useSkin();
  return Boolean(themePrefs.solidContentPanels);
}

/** Hook for pages that need content panel sx directly. */
export function useContentSurfaceSx() {
  const gradientActive = useGradientActive();
  const solidContentPanels = useSolidContentPanels();
  return contentSurfaceSx(gradientActive, solidContentPanels);
}
