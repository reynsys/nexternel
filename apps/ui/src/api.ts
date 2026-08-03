import { pushDiagnosticError } from "./diagnostics/errorRing";

const ACCESS_KEY = "nexternel_access_token";
const REFRESH_KEY = "nexternel_refresh_token";

export function getStoredAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearStoredTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getApiBase(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:4000`;
}

export function getWsBase(): string {
  return getApiBase().replace(/^http/, "ws");
}

function apiUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
}

type AuthResponse = {
  user: User;
  accessToken?: string;
  refreshToken?: string;
};

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(apiUrl("/api/v1/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearStoredTokens();
        return false;
      }
      const data = (await res.json()) as AuthResponse;
      if (!data.accessToken || !data.refreshToken) {
        clearStoredTokens();
        return false;
      }
      storeTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function shouldAttemptRefresh(path: string): boolean {
  return (
    !path.includes("/api/v1/auth/login") &&
    !path.includes("/api/v1/auth/refresh")
  );
}

async function parseErrorMessage(res: Response): Promise<string> {
  let message = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as {
      error?: { message?: string; debug?: Record<string, unknown> };
    };
    if (body.error?.message) {
      message = body.error.message;
      if (body.error.debug) {
        message += ` (${JSON.stringify(body.error.debug)})`;
      }
    }
  } catch {
    /* ignore */
  }
  return message;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const access = getStoredAccessToken();
  if (access) {
    headers.set("Authorization", `Bearer ${access}`);
    headers.set("X-Nexternel-Token", access);
  }

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...init,
      credentials: "include",
      headers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    pushDiagnosticError({
      kind: "api",
      message,
      source: path,
    });
    throw err instanceof Error ? err : new Error(message);
  }

  if (res.status === 401 && shouldAttemptRefresh(path)) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      const retryHeaders = new Headers(init?.headers);
      if (!retryHeaders.has("Content-Type") && init?.body) {
        retryHeaders.set("Content-Type", "application/json");
      }
      const nextAccess = getStoredAccessToken();
      if (nextAccess) {
        retryHeaders.set("Authorization", `Bearer ${nextAccess}`);
        retryHeaders.set("X-Nexternel-Token", nextAccess);
      }
      res = await fetch(apiUrl(path), {
        ...init,
        credentials: "include",
        headers: retryHeaders,
      });
    } else {
      clearStoredTokens();
      const message =
        "Session expired — sign in again (Sign out or Clear saved login on the login page).";
      pushDiagnosticError({
        kind: "api",
        message,
        source: path,
        status: 401,
      });
      throw new Error(message);
    }
  }

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    pushDiagnosticError({
      kind: "api",
      message,
      source: path,
      status: res.status,
    });
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export type UserThemePrefs = {
  mode: "light" | "dark";
  primary: string;
  skinId: string;
  /** Page gradient id, or `"none"` for solid background */
  gradientId?: string;
  /** Keep cards/panels as solid light/dark when a gradient is on */
  solidContentPanels?: boolean;
};

export type User = {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
  roleName?: string;
  isAdmin?: boolean;
  permissions?: import("./lib/permissions").RolePermissions;
  themePrefs?: UserThemePrefs;
  avatarData?: string | null;
};

export type Health = {
  status: string;
  version: string;
  service: string;
  database?: string;
  mqtt?: string;
};

export type Capability = {
  id: string;
  deviceId: string;
  deviceName: string;
  roomId: string | null;
  roomName?: string | null;
  kind: string;
  name: string;
  unit: string | null;
  sourceType: string;
  sourceId?: string;
  hasCommand: boolean;
  state: {
    value: unknown;
    quality: string;
    updatedAt: string;
  } | null;
};

function rememberAuth(data: AuthResponse) {
  if (data.accessToken && data.refreshToken) {
    storeTokens(data.accessToken, data.refreshToken);
  }
}

export type LiveEvent = {
  type: string;
  state?: {
    capabilityId: string;
    value: unknown;
    quality: string;
    updatedAt: string;
  };
  states?: {
    capabilityId: string;
    value: unknown;
    quality: string;
    updatedAt: string;
  }[];
  message?: string;
};

export function connectLiveSocket(onEvent: (ev: LiveEvent) => void): () => void {
  let closedByCaller = false;
  let ws: WebSocket | null = null;
  let pingTimer: number | null = null;
  let reconnectTimer: number | null = null;
  let attempt = 0;
  let connecting = false;

  function clearPing() {
    if (pingTimer !== null) {
      window.clearInterval(pingTimer);
      pingTimer = null;
    }
  }

  function clearReconnect() {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect() {
    if (closedByCaller) return;
    clearReconnect();
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5));
    attempt += 1;
    reconnectTimer = window.setTimeout(() => {
      void openSocket();
    }, delay);
  }

  async function openSocket() {
    if (closedByCaller || connecting) return;
    connecting = true;
    clearPing();

    try {
      // Ensure access token is fresh before WS auth (token is checked only at connect).
      let token = getStoredAccessToken();
      if (!token) {
        const ok = await tryRefreshSession();
        if (!ok || closedByCaller) {
          connecting = false;
          scheduleReconnect();
          return;
        }
        token = getStoredAccessToken();
      }
      if (!token) {
        connecting = false;
        scheduleReconnect();
        return;
      }

      // If the stored access token is already expired, refresh first.
      try {
        const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { exp?: number };
        if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now() + 15_000) {
          await tryRefreshSession();
          token = getStoredAccessToken() ?? token;
        }
      } catch {
        /* non-JWT or opaque — continue */
      }

      if (closedByCaller) {
        connecting = false;
        return;
      }

      if (ws) {
        try {
          ws.onclose = null;
          ws.onerror = null;
          ws.onmessage = null;
          ws.close();
        } catch {
          /* ignore */
        }
        ws = null;
      }

      const url = `${getWsBase()}/api/v1/ws?access_token=${encodeURIComponent(token)}`;
      const socket = new WebSocket(url);
      ws = socket;

      socket.onopen = () => {
        attempt = 0;
        connecting = false;
        clearPing();
        pingTimer = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      socket.onmessage = (msg) => {
        try {
          const data = JSON.parse(String(msg.data)) as LiveEvent;
          onEvent(data);
        } catch {
          /* ignore */
        }
      };

      socket.onerror = () => {
        /* onclose will reconnect */
      };

      socket.onclose = () => {
        connecting = false;
        clearPing();
        if (ws === socket) ws = null;
        if (!closedByCaller) scheduleReconnect();
      };
    } catch {
      connecting = false;
      if (!closedByCaller) scheduleReconnect();
    }
  }

  function onVisibilityOrOnline() {
    if (closedByCaller) return;
    if (document.visibilityState === "hidden") return;
    if (ws && ws.readyState === WebSocket.OPEN) return;
    // Tab woke / network back — reconnect promptly
    attempt = 0;
    clearReconnect();
    void openSocket();
  }

  document.addEventListener("visibilitychange", onVisibilityOrOnline);
  window.addEventListener("online", onVisibilityOrOnline);

  void openSocket();

  return () => {
    closedByCaller = true;
    clearPing();
    clearReconnect();
    document.removeEventListener("visibilitychange", onVisibilityOrOnline);
    window.removeEventListener("online", onVisibilityOrOnline);
    if (ws) {
      try {
        ws.onclose = null;
        ws.close();
      } catch {
        /* ignore */
      }
      ws = null;
    }
  };
}

export type ServerDiagnostics = {
  status: string;
  version: string;
  service: string;
  database: string;
  mqtt: string;
  mqttError: string | null;
  capabilityKindsRegistered: number;
  counts: {
    capabilities: number | null;
    capabilityBindings: number | null;
    v3Dashboards: number | null;
    devicesEnabled?: number | null;
    devicesOnline?: number | null;
    devicesOffline?: number | null;
  };
  process: {
    uptimeSeconds: number;
    nodeVersion: string;
  };
};

export const api = {
  health: () => apiFetch<Health>("/api/v1/health"),

  diagnostics: () => apiFetch<ServerDiagnostics>("/api/v1/diagnostics"),

  async login(username: string, password: string) {
    clearStoredTokens();
    const data = await apiFetch<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (!data.accessToken || !data.refreshToken) {
      throw new Error("Login response missing tokens from API");
    }
    rememberAuth(data);
    return data;
  },

  async logout() {
    try {
      await apiFetch<{ ok: boolean }>("/api/v1/auth/logout", { method: "POST" });
    } finally {
      clearStoredTokens();
    }
  },

  me: () => apiFetch<{ user: User }>("/api/v1/auth/me"),

  patchMe: (body: {
    displayName?: string | null;
    password?: string;
    themePrefs?: UserThemePrefs;
    avatarData?: string | null;
  }) =>
    apiFetch<{ user: User }>("/api/v1/auth/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  rooms: () =>
    apiFetch<{
      rooms: {
        id: string;
        name: string;
        description: string | null;
        sortOrder: number;
        deviceCount: number;
      }[];
    }>("/api/v1/rooms"),

  createRoom: (body: {
    name: string;
    description?: string;
    sortOrder?: number;
  }) =>
    apiFetch<{
      room: {
        id: string;
        name: string;
        description: string | null;
        sortOrder: number;
        deviceCount: number;
      };
    }>("/api/v1/rooms", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateRoom: (
    id: string,
    body: { name?: string; description?: string | null; sortOrder?: number }
  ) =>
    apiFetch<{
      room: {
        id: string;
        name: string;
        description: string | null;
        sortOrder: number;
        deviceCount: number;
      };
    }>(`/api/v1/rooms/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteRoom: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/v1/rooms/${id}`, { method: "DELETE" }),

  devices: () =>
    apiFetch<{ devices: DeviceRecord[] }>("/api/v1/devices"),

  createDevice: (body: {
    name: string;
    roomId?: string | null;
    mqttTopicPrefix: string;
    esphomeName?: string | null;
    firmwareType?: "esphome" | "shelly";
    shellyChannel?: number;
    shellySwitchCount?: number;
    shellyModelId?: string;
    ipAddress?: string | null;
    macAddress?: string | null;
    sensors?: EsphomeSensorInput[];
    relays?: EsphomeRelayInput[];
  }) =>
    apiFetch<{ device: DeviceRecord }>("/api/v1/devices", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  shellyModels: () =>
    apiFetch<{
      models: {
        id: string;
        label: string;
        switchCount: number;
        hint: string;
      }[];
    }>("/api/v1/shelly/models"),

  shellyDiscover: (body?: { timeoutMs?: number }) =>
    apiFetch<{
      devices: {
        topicPrefix: string;
        model: string | null;
        app: string | null;
        mac: string | null;
        gen: number | null;
        version: string | null;
        ip: string | null;
        suggestedSwitchCount: number;
        suggestedModelId: string;
        switchCountProbed: boolean;
        alreadyRegistered: boolean;
      }[];
    }>("/api/v1/shelly/discover", {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),

  updateDevice: (
    id: string,
    body: {
      name?: string;
      roomId?: string | null;
      mqttTopicPrefix?: string;
      esphomeName?: string | null;
      ipAddress?: string | null;
      macAddress?: string | null;
      isEnabled?: boolean;
    }
  ) =>
    apiFetch<{ device: DeviceRecord }>(`/api/v1/devices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteDevice: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/v1/devices/${id}`, { method: "DELETE" }),

  cameras: () => apiFetch<{ cameras: CameraRecord[] }>("/api/v1/cameras"),

  getCamera: (id: string) =>
    apiFetch<{ camera: CameraRecord }>(`/api/v1/cameras/${id}`),

  cameraPresets: () =>
    apiFetch<{ presets: CameraBrandPreset[] }>("/api/v1/cameras/presets"),

  createCamera: (body: {
    name: string;
    streamId: string;
    host: string;
    port?: number;
    path: string;
    username?: string;
    password?: string;
    areaId?: string | null;
    enabled?: boolean;
    sortOrder?: number;
  }) =>
    apiFetch<{ camera: CameraRecord }>("/api/v1/cameras", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateCamera: (
    id: string,
    body: {
      name?: string;
      streamId?: string;
      host?: string;
      port?: number;
      path?: string;
      username?: string;
      password?: string;
      areaId?: string | null;
      enabled?: boolean;
      sortOrder?: number;
    }
  ) =>
    apiFetch<{ camera: CameraRecord }>(`/api/v1/cameras/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteCamera: (id: string) =>
    apiFetch<void>(`/api/v1/cameras/${id}`, { method: "DELETE" }),

  cameraPlay: (id: string) =>
    apiFetch<{
      play: {
        id: string;
        name: string;
        streamId: string;
        hlsUrl: string;
        mseUrl: string;
        enabled: boolean;
      };
    }>(`/api/v1/cameras/${id}/play`),

  esphomeCatalog: () =>
    apiFetch<{
      configs: EsphomeCatalogEntry[];
      esphomeDirHint: string | null;
    }>("/api/v1/devices/esphome-catalog"),

  esphomeSuggest: (name: string) =>
    apiFetch<EsphomeImportSuggestion>(
      `/api/v1/devices/esphome-suggest?name=${encodeURIComponent(name)}`
    ),

  syncDeviceEsphome: (id: string) =>
    apiFetch<{
      addedRelays: number;
      updatedRelays: number;
      totalRelays: number;
      yamlFile: string;
      mqttTopicPrefix: string;
      relaysInYaml: string[];
      isOnline: boolean;
      device: DeviceRecord | null;
    }>(`/api/v1/devices/${id}/sync-esphome`, { method: "POST" }),

  renameRelay: (deviceId: string, relayId: string, name: string) =>
    apiFetch<{ ok: boolean }>(`/api/v1/devices/${deviceId}/relays/${relayId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  renameSensor: (deviceId: string, sensorId: string, name: string) =>
    apiFetch<{ ok: boolean }>(`/api/v1/devices/${deviceId}/sensors/${sensorId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  capabilities: () =>
    apiFetch<{ capabilities: Capability[] }>("/api/v1/capabilities"),

  command: (id: string, action: "on" | "off" | "toggle") =>
    apiFetch<{ ok: boolean; value: boolean }>(`/api/v1/capabilities/${id}/command`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  syncCapabilities: () =>
    apiFetch<{ ok: boolean; sensors: number; relays: number }>(
      "/api/v1/capabilities/sync",
      { method: "POST" }
    ),

  dashboards: () =>
    apiFetch<{ dashboards: DashboardSummary[] }>("/api/v1/dashboards"),

  getDashboard: (id: string) =>
    apiFetch<{ dashboard: DashboardDetail }>(`/api/v1/dashboards/${id}`),

  createDashboard: (name: string) =>
    apiFetch<{ dashboard: DashboardDetail }>("/api/v1/dashboards", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  saveDashboard: (
    id: string,
    body: { name?: string; document?: DashboardDocument; isDefault?: boolean }
  ) =>
    apiFetch<{ dashboard: DashboardDetail }>(`/api/v1/dashboards/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteDashboard: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/v1/dashboards/${id}`, { method: "DELETE" }),

  history: (capabilityId: string, range: HistoryRange = "24h") =>
    apiFetch<HistoryResponse>(
      `/api/v1/history?capabilityId=${encodeURIComponent(capabilityId)}&range=${encodeURIComponent(range)}`
    ),

  system: () => apiFetch<SystemInfo>("/api/v1/system"),

  configStatus: () =>
    apiFetch<ConfigStatusResponse>("/api/v1/system/config/status"),

  downloadConfigExport: async () => {
    const headers = new Headers();
    const access = getStoredAccessToken();
    if (access) {
      headers.set("Authorization", `Bearer ${access}`);
      headers.set("X-Nexternel-Token", access);
    }
    let res = await fetch(apiUrl("/api/v1/system/config/export"), {
      credentials: "include",
      headers,
    });
    if (res.status === 401) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        const next = getStoredAccessToken();
        const retryHeaders = new Headers();
        if (next) {
          retryHeaders.set("Authorization", `Bearer ${next}`);
          retryHeaders.set("X-Nexternel-Token", next);
        }
        res = await fetch(apiUrl("/api/v1/system/config/export"), {
          credentials: "include",
          headers: retryHeaders,
        });
      }
    }
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res));
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] || "nexternel-config.nexcfg";
    return { blob, filename };
  },

  adoptConfig: async (opts: {
    file: File;
    newBrokerIp: string;
    newTopicRoot: string;
    wifiSsid?: string;
    wifiPassword?: string;
  }) => {
    const buildForm = () => {
      const form = new FormData();
      form.append("file", opts.file);
      form.append("newBrokerIp", opts.newBrokerIp);
      form.append("newTopicRoot", opts.newTopicRoot);
      if (opts.wifiSsid) form.append("wifiSsid", opts.wifiSsid);
      if (opts.wifiPassword) form.append("wifiPassword", opts.wifiPassword);
      form.append("confirm", "ADOPT");
      return form;
    };

    const authHeaders = () => {
      const headers = new Headers();
      const access = getStoredAccessToken();
      if (access) {
        headers.set("Authorization", `Bearer ${access}`);
        headers.set("X-Nexternel-Token", access);
      }
      return headers;
    };

    let res = await fetch(apiUrl("/api/v1/system/config/adopt"), {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
      body: buildForm(),
    });
    if (res.status === 401) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        res = await fetch(apiUrl("/api/v1/system/config/adopt"), {
          method: "POST",
          credentials: "include",
          headers: authHeaders(),
          body: buildForm(),
        });
      }
    }
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res));
    }
    return res.json() as Promise<AdoptConfigResponse>;
  },

  downloadEsphomeCutoverPack: async () => {
    const headers = new Headers();
    const access = getStoredAccessToken();
    if (access) {
      headers.set("Authorization", `Bearer ${access}`);
      headers.set("X-Nexternel-Token", access);
    }
    let res = await fetch(apiUrl("/api/v1/system/config/esphome-pack"), {
      credentials: "include",
      headers,
    });
    if (res.status === 401) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        const next = getStoredAccessToken();
        const retryHeaders = new Headers();
        if (next) {
          retryHeaders.set("Authorization", `Bearer ${next}`);
          retryHeaders.set("X-Nexternel-Token", next);
        }
        res = await fetch(apiUrl("/api/v1/system/config/esphome-pack"), {
          credentials: "include",
          headers: retryHeaders,
        });
      }
    }
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res));
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] || "esphome-flash-ready.zip";
    return { blob, filename };
  },

  downloadFlashReadyYaml: async (stem: string) => {
    const headers = new Headers();
    const access = getStoredAccessToken();
    if (access) {
      headers.set("Authorization", `Bearer ${access}`);
      headers.set("X-Nexternel-Token", access);
    }
    const path = `/api/v1/system/config/flash-yaml/${encodeURIComponent(stem)}`;
    let res = await fetch(apiUrl(path), {
      credentials: "include",
      headers,
    });
    if (res.status === 401) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        const next = getStoredAccessToken();
        const retryHeaders = new Headers();
        if (next) {
          retryHeaders.set("Authorization", `Bearer ${next}`);
          retryHeaders.set("X-Nexternel-Token", next);
        }
        res = await fetch(apiUrl(path), {
          credentials: "include",
          headers: retryHeaders,
        });
      }
    }
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res));
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] || `${stem}-flash-ready.yaml`;
    return { blob, filename };
  },

  repairDashboardBindings: () =>
    apiFetch<{ ok: boolean; dashboardsUpdated: number; bindingsRemapped: number }>(
      "/api/v1/system/config/repair-dashboard-bindings",
      { method: "POST", body: "{}" }
    ),

  weather: (lat: number, lon: number) =>
    apiFetch<WeatherResponse>(
      `/api/v1/weather?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`
    ),

  weatherGeocode: (q: string) =>
    apiFetch<{
      results: Array<{
        name: string;
        latitude: number;
        longitude: number;
        country: string;
        admin1: string;
        timezone: string;
        label: string;
      }>;
    }>(`/api/v1/weather/geocode?q=${encodeURIComponent(q)}`),

  users: () => apiFetch<{ users: AdminUser[] }>("/api/v1/users"),

  createUser: (body: {
    username: string;
    password: string;
    displayName?: string;
    role: string;
    themePrefs?: UserThemePrefs;
    avatarData?: string | null;
  }) =>
    apiFetch<{ user: AdminUser }>("/api/v1/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patchUser: (
    id: string,
    body: {
      displayName?: string | null;
      role?: string;
      isActive?: boolean;
      password?: string;
      themePrefs?: UserThemePrefs;
      avatarData?: string | null;
    }
  ) =>
    apiFetch<{ user: AdminUser }>(`/api/v1/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  roles: () => apiFetch<{ roles: RoleDef[] }>("/api/v1/roles"),

  createRole: (body: {
    slug: string;
    name: string;
    description?: string | null;
    isAdmin?: boolean;
    permissions?: import("./lib/permissions").RolePermissions;
    sortOrder?: number;
  }) =>
    apiFetch<{ role: RoleDef }>("/api/v1/roles", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patchRole: (
    id: string,
    body: {
      name?: string;
      description?: string | null;
      isAdmin?: boolean;
      permissions?: import("./lib/permissions").RolePermissions;
      sortOrder?: number;
    }
  ) =>
    apiFetch<{ role: RoleDef }>(`/api/v1/roles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteRole: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/v1/roles/${id}`, { method: "DELETE" }),
};

export type SystemInfo = {
  version: string;
  service: string;
  uptimeSeconds: number;
  cpu: { model: string; cores: number; loadPercent: number };
  memory: { totalMb: number; usedMb: number; freeMb: number; percent?: number };
  /** Host CPU / board temperature (°C), when thermal zones are available */
  temperatureC?: number | null;
  lanIp: string | null;
  wanIp: string | null;
  database: string;
  mqtt: string;
  mqttError: string | null;
  nodeRedUrl: string;
  nodeRedPort: number;
  measuredAt?: string;
};

export type ConfigStatusResponse = {
  currentServerIp: string | null;
  mqttTopicPrefix?: string;
  esphomeMounted: boolean;
  ready: boolean;
};

export type AdoptConfigResponse = {
  ok: true;
  manifest: {
    format: string;
    formatVersion: number;
    appVersion: string;
    createdAt: string;
    serverIp: string;
  };
  counts: {
    rooms: number;
    devices: number;
    dashboards: number;
    cameras: number;
    esphomeFiles: number;
  };
  adoptChecklist: {
    brokerIp: string;
    topicRoot?: string;
    esphomeUrl: string;
    devices: {
      name: string;
      slug: string;
      yamlHint: string | null;
      topicPrefix?: string;
    }[];
    steps: string[];
  };
};

export type WeatherForecastDay = {
  date: string;
  weatherCode: number;
  description: string;
  tempMax?: number;
  tempMin?: number;
  precipProbability?: number | null;
  precipMm?: number;
  windMax?: number;
};

export type WeatherResponse = {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  weatherCode?: number;
  description?: string;
  time?: string;
  requestedLatitude?: number;
  requestedLongitude?: number;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  source?: string;
  forecast: WeatherForecastDay[];
};

export type AdminUser = {
  id: string;
  username: string;
  displayName: string | null;
  isActive: boolean;
  role: string;
  roleName?: string;
  isAdmin?: boolean;
  createdAt: string;
  themePrefs?: UserThemePrefs;
  avatarData?: string | null;
};

export type RoleDef = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isAdmin: boolean;
  isSystem: boolean;
  sortOrder: number;
  permissions?: import("./lib/permissions").RolePermissions;
  createdAt: string;
  updatedAt: string;
};

export type EsphomeSensorInput = {
  name: string;
  slug: string;
  sensorType: string;
  unit?: string;
  esphomeEntityId: string;
};

export type EsphomeRelayInput = {
  name: string;
  slug: string;
  esphomeEntityId: string;
  gpioPin?: number;
};

export type EsphomeImportSuggestion = {
  esphomeName: string;
  mqttTopicPrefix: string;
  yamlFile: string;
  sensors: EsphomeSensorInput[];
  relays: EsphomeRelayInput[];
};

export type EsphomeCatalogEntry = {
  fileName: string;
  esphomeName: string;
  mqttTopicPrefix: string;
  registered: boolean;
  sensorCount: number;
  relayCount: number;
  suggestion: EsphomeImportSuggestion | null;
};

export type CameraRecord = {
  id: string;
  name: string;
  streamId: string;
  areaId: string | null;
  areaName: string | null;
  enabled: boolean;
  sortOrder: number;
  hasRtspUrl: boolean;
  /** Editors only — never includes the password value. */
  host?: string;
  port?: number;
  path?: string;
  username?: string;
  hasPassword?: boolean;
  connectionPreview?: string;
};

export type CameraBrandPreset = {
  id: string;
  label: string;
  pathTemplate: string;
  hint: string;
};

export type DeviceRecord = {
  id: string;
  roomId: string | null;
  roomName: string | null;
  name: string;
  slug: string;
  mqttTopicPrefix: string;
  esphomeName: string | null;
  firmwareType?: string;
  ipAddress: string | null;
  macAddress: string | null;
  isEnabled: boolean;
  isOnline: boolean;
  lastSeenAt: string | null;
  sensors: {
    id: string;
    name: string;
    slug: string;
    sensorType: string;
    unit: string | null;
    esphomeEntityId: string | null;
    mqttStateTopic: string;
    isEnabled: boolean;
  }[];
  relays: {
    id: string;
    name: string;
    slug: string;
    esphomeEntityId: string | null;
    mqttCommandTopic: string;
    mqttStateTopic: string;
    lastState: string | null;
    isEnabled: boolean;
  }[];
};

export type HistoryRange = "1h" | "6h" | "24h" | "7d";

export type HistoryPoint = { t: string; v: number };

export type HistoryResponse = {
  capabilityId: string;
  name: string;
  unit: string | null;
  range: HistoryRange;
  aggregateEvery: string;
  points: HistoryPoint[];
};

export type WidgetInstance = {
  id: string;
  type: string;
  title?: string;
  layout: { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number };
  bindings: Record<string, unknown>;
  config: Record<string, unknown>;
};

export type DashboardSection = {
  id: string;
  title: string;
  order: number;
  collapsed?: boolean;
  roomId?: string | null;
  icon?: string;
  /** 12-col span: 12 full, 6 half, 4 third, 3 quarter */
  colSpan?: number;
  widgets: WidgetInstance[];
};

export type DashboardDocument = {
  schemaVersion: 2;
  name: string;
  tabIcon?: string;
  showTabLabel?: boolean;
  /** Section quick-jump chips below tab bar (off by default). */
  showSectionNav?: boolean;
  sections: DashboardSection[];
};

export type DashboardSummary = {
  id: string;
  name: string;
  isDefault: boolean;
  updatedAt: string;
  tabIcon?: string;
  showTabLabel?: boolean;
};

export type DashboardDetail = DashboardSummary & {
  document: DashboardDocument;
  ownerUserId: string | null;
  createdAt: string;
};
