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

  return res.json() as Promise<T>;
}

export type User = {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
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
  kind: string;
  name: string;
  unit: string | null;
  sourceType: string;
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
  const token = getStoredAccessToken();
  if (!token) return () => undefined;

  const url = `${getWsBase()}/api/v1/ws?access_token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);

  ws.onmessage = (msg) => {
    try {
      const data = JSON.parse(String(msg.data)) as LiveEvent;
      onEvent(data);
    } catch {
      /* ignore */
    }
  };

  const ping = window.setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }, 25000);

  return () => {
    window.clearInterval(ping);
    ws.close();
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
    ipAddress?: string | null;
    macAddress?: string | null;
    sensors?: EsphomeSensorInput[];
    relays?: EsphomeRelayInput[];
  }) =>
    apiFetch<{ device: DeviceRecord }>("/api/v1/devices", {
      method: "POST",
      body: JSON.stringify(body),
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

  users: () => apiFetch<{ users: AdminUser[] }>("/api/v1/users"),

  createUser: (body: {
    username: string;
    password: string;
    displayName?: string;
    role: "admin" | "viewer";
  }) =>
    apiFetch<{ user: AdminUser }>("/api/v1/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patchUser: (
    id: string,
    body: {
      displayName?: string | null;
      role?: "admin" | "viewer";
      isActive?: boolean;
      password?: string;
    }
  ) =>
    apiFetch<{ user: AdminUser }>(`/api/v1/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export type SystemInfo = {
  version: string;
  service: string;
  uptimeSeconds: number;
  cpu: { model: string; cores: number; loadPercent: number };
  memory: { totalMb: number; usedMb: number; freeMb: number };
  lanIp: string | null;
  wanIp: string | null;
  database: string;
  mqtt: string;
  mqttError: string | null;
  nodeRedUrl: string;
  nodeRedPort: number;
};

export type AdminUser = {
  id: string;
  username: string;
  displayName: string | null;
  isActive: boolean;
  role: "admin" | "viewer";
  createdAt: string;
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

export type DeviceRecord = {
  id: string;
  roomId: string | null;
  roomName: string | null;
  name: string;
  slug: string;
  mqttTopicPrefix: string;
  esphomeName: string | null;
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
  widgets: WidgetInstance[];
};

export type DashboardDocument = {
  schemaVersion: 2;
  name: string;
  sections: DashboardSection[];
};

export type DashboardSummary = {
  id: string;
  name: string;
  isDefault: boolean;
  updatedAt: string;
};

export type DashboardDetail = DashboardSummary & {
  document: DashboardDocument;
  ownerUserId: string | null;
  createdAt: string;
};
