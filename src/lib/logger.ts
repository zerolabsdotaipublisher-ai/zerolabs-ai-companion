import "server-only";

type LogLevel = "info" | "warn" | "error";

type LogPrimitive = string | number | boolean | null;

type LogValue =
  | LogPrimitive
  | Date
  | Error
  | bigint
  | LogValue[]
  | { [key: string]: LogValue | undefined };

export type LogMetadata = Record<string, LogValue | undefined>;

export type LogOptions = {
  context?: string;
  source?: string;
  metadata?: LogMetadata;
  error?: unknown;
};

type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
};

const REDACTED = "[REDACTED]";
const CIRCULAR_REFERENCE = "[Circular]";

const SENSITIVE_SINGLE_TOKENS = new Set([
  "secret",
  "token",
  "password",
  "passwd",
  "authorization",
  "cookie",
  "session",
  "credential",
  "bearer",
  "jwt",
]);

const SENSITIVE_EXACT_KEYS = new Set([
  "client_secret",
  "access_token",
  "refresh_token",
  "api_key",
  "apikey",
  "private_key",
]);

const SENSITIVE_TOKEN_PAIRS = new Set([
  "client_secret",
  "access_token",
  "refresh_token",
  "api_key",
  "private_key",
]);

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

  if (SENSITIVE_EXACT_KEYS.has(normalized)) {
    return true;
  }

  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  for (const token of tokens) {
    if (SENSITIVE_SINGLE_TOKENS.has(token)) {
      return true;
    }
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const pair = `${tokens[index]}_${tokens[index + 1]}`;
    if (SENSITIVE_TOKEN_PAIRS.has(pair)) {
      return true;
    }
  }

  return false;
}

function sanitizeValue(value: unknown): unknown {
  return sanitizeValueWithSeen(value, new WeakSet<object>());
}

function sanitizeValueWithSeen(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return CIRCULAR_REFERENCE;
    }

    seen.add(value);

    return value.map((item) => sanitizeValueWithSeen(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return CIRCULAR_REFERENCE;
    }

    seen.add(value);

    const result: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        result[key] = REDACTED;
        continue;
      }

      result[key] = sanitizeValueWithSeen(nestedValue, seen);
    }

    return result;
  }

  return String(value);
}

function normalizeError(error: unknown): LogEntry["error"] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (error && typeof error === "object") {
    const sanitizedError = sanitizeValueWithSeen(
      error,
      new WeakSet<object>(),
    ) as Record<string, unknown>;

    return {
      name:
        typeof sanitizedError.name === "string"
          ? sanitizedError.name
          : undefined,
      message:
        typeof sanitizedError.message === "string"
          ? sanitizedError.message
          : undefined,
      stack:
        typeof sanitizedError.stack === "string"
          ? sanitizedError.stack
          : undefined,
    };
  }

  return { message: String(error) };
}

function createLogEntry(
  level: LogLevel,
  message: string,
  options?: LogOptions,
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(options?.context ? { context: options.context } : {}),
    ...(options?.source ? { source: options.source } : {}),
    ...(options?.metadata
      ? { metadata: sanitizeValue(options.metadata) as Record<string, unknown> }
      : {}),
    ...(options?.error ? { error: normalizeError(options.error) } : {}),
  };
}

function writeLog(level: LogLevel, payload: LogEntry): void {
  const output = (() => {
    try {
      return JSON.stringify(payload);
    } catch (error) {
      return JSON.stringify({
        level,
        message: payload.message,
        timestamp: payload.timestamp,
        error: {
          message: "Failed to serialize log payload",
          stack: error instanceof Error ? error.stack : String(error),
        },
      });
    }
  })();

  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  console.info(output);
}

export const logger = {
  info(message: string, options?: LogOptions): void {
    writeLog("info", createLogEntry("info", message, options));
  },
  warn(message: string, options?: LogOptions): void {
    writeLog("warn", createLogEntry("warn", message, options));
  },
  error(message: string, options?: LogOptions): void {
    writeLog("error", createLogEntry("error", message, options));
  },
};
