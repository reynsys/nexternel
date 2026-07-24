/** Session-scoped: Visual Diagnostic FAB only while troubleshooting. */
const KEY = "nexternel.visualDiag.enabled";
export const VISUAL_DIAG_CHANGED = "nx-visual-diag-changed";

export function isVisualDiagEnabled(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setVisualDiagEnabled(enabled: boolean): void {
  try {
    if (enabled) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent(VISUAL_DIAG_CHANGED, { detail: { enabled } }));
}
