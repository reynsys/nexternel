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
export type WidgetContribution = {
  type: string;
  label: string;
  /** When false, Add Widget skips capability picker. */
  needsCapability?: boolean;
  /** React component — typed loosely so SDK stays React-free at compile time for API pkgs. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: any;
};

export interface PluginHostContext {
  registerWidget(contribution: WidgetContribution): void;
  registerDriver(driverId: string): void;
}
