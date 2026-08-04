/**
 * Plugin SDK contracts — host must not require WidgetRenderer edits per widget.
 */

export type PluginApiVersion = 1;

export interface PluginContributions {
  widgets?: string[];
  drivers?: string[];
  services?: string[];
  navigation?: string[];
  themes?: string[];
}

export interface PluginManifest {
  id: string;
  version: string;
  pluginApi: PluginApiVersion;
  name?: string;
  description?: string;
  contributes: PluginContributions;
}

/** UI host registers React widgets by type id. */
export type WidgetCategoryId =
  | "status"
  | "sensors"
  | "history"
  | "controls"
  | "media"
  | "system"
  | "plugins";

export type WidgetBindingSlotDef = {
  key: string;
  label: string;
  /** Accepted capability kinds (any match). */
  kinds?: string[];
  /** Substrings matched against capability name (case-insensitive). */
  nameHints?: string[];
  /** When true, Add widget / editor should require a selection. */
  required?: boolean;
};

export type WidgetContribution = {
  type: string;
  label: string;
  /** Catalog group for Add widget picker. Defaults to plugins. */
  category?: WidgetCategoryId;
  /** When false, Add Widget skips single-capability picker. */
  needsCapability?: boolean;
  /** Named multi-capability bindings (composite widgets). */
  bindingSlots?: WidgetBindingSlotDef[];
  /** Default grid size when added from dashboard. */
  defaultSize?: { w: number; h: number };
  /** React component — typed loosely so SDK stays React-free at compile time for API pkgs. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: any;
};

export interface PluginHostContext {
  registerWidget(contribution: WidgetContribution): void;
  registerDriver(driverId: string): void;
}

  /** Optional props the UI host may pass to plugin widget components. */
export type PluginWidgetHostProps = {
  editMode?: boolean;
  onCapabilityCommand?: (
    capabilityId: string,
    action: "on" | "off"
  ) => Promise<{ value: unknown } | void>;
};
