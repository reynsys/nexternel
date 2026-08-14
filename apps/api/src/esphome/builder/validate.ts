import {
  boardCatalogEntry,
  componentCatalogEntry,
  type BuilderComponent,
  type EsphomeDeviceBuilderConfig,
} from "@nexternel/domain";

export type BuilderValidationIssue = {
  path: string;
  message: string;
  code: string;
};

export type BuilderValidationResult = {
  valid: boolean;
  issues: BuilderValidationIssue[];
};

function issue(
  path: string,
  message: string,
  code: string
): BuilderValidationIssue {
  return { path, message, code };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveBuilderSlug(config: EsphomeDeviceBuilderConfig): string {
  const raw = config.slug?.trim() || slugify(config.displayName);
  return raw.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function validateEsphomeBuilderConfig(
  input: unknown
): BuilderValidationResult {
  const issues: BuilderValidationIssue[] = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      valid: false,
      issues: [issue("", "Device configuration is required", "invalid_config")],
    };
  }

  const config = input as Partial<EsphomeDeviceBuilderConfig>;

  if (config.version !== 1) {
    issues.push(
      issue("version", "Unsupported configuration version", "unsupported_version")
    );
  }

  if (!config.displayName?.trim()) {
    issues.push(issue("displayName", "Device display name is required", "required"));
  } else if (config.displayName.trim().length > 100) {
    issues.push(
      issue("displayName", "Device display name is too long", "max_length")
    );
  } else if (/^\d/.test(config.displayName.trim())) {
    issues.push(
      issue(
        "displayName",
        "Device name must not start with a number",
        "invalid_name"
      )
    );
  }

  const board = config.boardId ? boardCatalogEntry(config.boardId) : undefined;
  if (!board) {
    issues.push(issue("boardId", "Select a supported board", "invalid_board"));
  }

  if (config.platform !== "esp32" && config.platform !== "esp8266") {
    issues.push(issue("platform", "Select ESP32 or ESP8266", "invalid_platform"));
  } else if (board && board.platform !== config.platform) {
    issues.push(
      issue(
        "boardId",
        `Board ${board.label} is not compatible with platform ${config.platform}`,
        "platform_mismatch"
      )
    );
  }

  const slug = resolveBuilderSlug(config as EsphomeDeviceBuilderConfig);
  if (!slug) {
    issues.push(
      issue("slug", "Could not derive a valid device identifier", "invalid_slug")
    );
  } else if (!/^[a-z][a-z0-9-]{0,62}$/.test(slug)) {
    issues.push(
      issue(
        "slug",
        "Device identifier must start with a letter and use lowercase letters, numbers, and hyphens only",
        "invalid_slug"
      )
    );
  }

  const components = Array.isArray(config.components) ? config.components : [];
  if (components.length === 0) {
    issues.push(
      issue("components", "Add at least one component", "components_required")
    );
  }

  const usedPins = new Map<number, string>();

  components.forEach((raw, index) => {
    const path = `components[${index}]`;
    if (!raw || typeof raw !== "object") {
      issues.push(issue(path, "Invalid component entry", "invalid_component"));
      return;
    }
    const comp = raw as BuilderComponent;
    if (!comp.id?.trim()) {
      issues.push(issue(`${path}.id`, "Component id is required", "required"));
    }

    const catalog = componentCatalogEntry(comp.kind);
    if (!catalog) {
      issues.push(issue(`${path}.kind`, "Unsupported component type", "invalid_kind"));
      return;
    }

    if (config.platform && !catalog.platforms.includes(config.platform)) {
      issues.push(
        issue(
          `${path}.kind`,
          `${catalog.label} is not supported on ${config.platform}`,
          "platform_unsupported"
        )
      );
    }

    if (comp.kind === "dht") {
      const pin = comp.pin;
      if (!Number.isInteger(pin)) {
        issues.push(issue(`${path}.pin`, "DHT data pin is required", "required"));
      } else if (board && (pin < board.gpioMin || pin > board.gpioMax)) {
        issues.push(
          issue(
            `${path}.pin`,
            `GPIO ${pin} is not valid for ${board.label}`,
            "invalid_pin"
          )
        );
      } else {
        const prev = usedPins.get(pin);
        if (prev) {
          issues.push(
            issue(
              `${path}.pin`,
              `GPIO ${pin} is already used by ${prev}`,
              "duplicate_pin"
            )
          );
        } else {
          usedPins.set(pin, catalog.label);
        }
      }
      if (!["DHT11", "DHT21", "DHT22"].includes(comp.variant)) {
        issues.push(issue(`${path}.variant`, "Select DHT11, DHT21, or DHT22", "invalid_variant"));
      }
    }

    if (comp.kind === "gpio_switch") {
      const pin = comp.pin;
      if (!Number.isInteger(pin)) {
        issues.push(issue(`${path}.pin`, "GPIO pin is required", "required"));
      } else if (board && (pin < board.gpioMin || pin > board.gpioMax)) {
        issues.push(
          issue(
            `${path}.pin`,
            `GPIO ${pin} is not valid for ${board.label}`,
            "invalid_pin"
          )
        );
      } else {
        const prev = usedPins.get(pin);
        if (prev) {
          issues.push(
            issue(
              `${path}.pin`,
              `GPIO ${pin} is already used by ${prev}`,
              "duplicate_pin"
            )
          );
        } else {
          usedPins.set(pin, comp.name?.trim() || catalog.label);
        }
      }
      if (!comp.name?.trim()) {
        issues.push(issue(`${path}.name`, "Switch display name is required", "required"));
      }
    }

    if (comp.kind === "pms") {
      const tx = comp.uartTxPin;
      const rx = comp.uartRxPin;
      for (const [pin, label] of [
        [tx, "UART TX"],
        [rx, "UART RX"],
      ] as const) {
        if (!Number.isInteger(pin)) {
          issues.push(issue(`${path}.uart`, `${label} pin is required`, "required"));
        } else if (board && (pin < board.gpioMin || pin > board.gpioMax)) {
          issues.push(
            issue(
              `${path}.uart`,
              `GPIO ${pin} is not valid for ${board.label}`,
              "invalid_pin"
            )
          );
        } else {
          const prev = usedPins.get(pin);
          if (prev) {
            issues.push(
              issue(
                `${path}.uart`,
                `GPIO ${pin} is already used by ${prev}`,
                "duplicate_pin"
              )
            );
          } else {
            usedPins.set(pin, `${catalog.label} ${label}`);
          }
        }
      }
      if (tx === rx) {
        issues.push(
          issue(`${path}.uart`, "UART TX and RX must use different GPIO pins", "duplicate_pin")
        );
      }
      if (!["PMSX003", "PMS5003", "PMS7003"].includes(comp.variant)) {
        issues.push(issue(`${path}.variant`, "Select a supported PMS model", "invalid_variant"));
      }
    }

    if (comp.kind === "pulse_meter") {
      const pin = comp.pin;
      if (!Number.isInteger(pin)) {
        issues.push(issue(`${path}.pin`, "Pulse input pin is required", "required"));
      } else if (board && (pin < board.gpioMin || pin > board.gpioMax)) {
        issues.push(
          issue(`${path}.pin`, `GPIO ${pin} is not valid for ${board.label}`, "invalid_pin")
        );
      } else {
        const prev = usedPins.get(pin);
        if (prev) {
          issues.push(
            issue(`${path}.pin`, `GPIO ${pin} is already used by ${prev}`, "duplicate_pin")
          );
        } else {
          usedPins.set(pin, catalog.label);
        }
      }
      const rate = comp.pulseRate;
      if (!Number.isInteger(rate) || rate < 1 || rate > 100_000) {
        issues.push(
          issue(`${path}.pulseRate`, "Enter impulses per kWh from your meter label", "invalid_rate")
        );
      }
    }
  });

  return { valid: issues.length === 0, issues };
}

export function normalizeBuilderConfig(
  input: EsphomeDeviceBuilderConfig
): EsphomeDeviceBuilderConfig {
  const slug = resolveBuilderSlug(input);
  return {
    ...input,
    version: 1,
    displayName: input.displayName.trim(),
    slug,
    description: input.description?.trim() || undefined,
    roomId: input.roomId ?? null,
    components: input.components.map((c) => {
      if (c.kind === "dht") {
        return {
          ...c,
          id: c.id.trim(),
          updateIntervalSeconds: c.updateIntervalSeconds ?? 60,
        };
      }
      if (c.kind === "pms") {
        return {
          ...c,
          id: c.id.trim(),
          updateIntervalSeconds: c.updateIntervalSeconds ?? 60,
        };
      }
      if (c.kind === "pulse_meter") {
        return {
          ...c,
          id: c.id.trim(),
          pulseRate: c.pulseRate ?? 1000,
        };
      }
      return {
        ...c,
        id: c.id.trim(),
        name: c.name.trim(),
        inverted: c.inverted !== false,
      };
    }),
  };
}
