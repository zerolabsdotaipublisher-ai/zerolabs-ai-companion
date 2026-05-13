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
const UNPARSABLE_LOG = "[Unparsable log payload]";
const SENSITIVE_KEY_PATTERN =
  /secret|token|password|api[_-]?key|authorization|cookie|session|credential|private[_-]?key|bearer|jwt/i;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

function sanitizeValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
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
    return value.map((item) => sanitizeValue(item, seen));
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

      result[key] = sanitizeValue(nestedValue, seen);
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
    const sanitizedError = sanitizeValue(error) as Record<string, unknown>;

    return {
      name: typeof sanitizedError.name === "string" ? sanitizedError.name : undefined,
      message: typeof sanitizedError.message === "string" ? sanitizedError.message : undefined,
      stack: typeof sanitizedError.stack === "string" ? sanitizedError.stack : undefined,
    };
  }

  return { message: String(error) };
}

function createLogEntry(level: LogLevel, message: string, options?: LogOptions): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(options?.context ? { context: options.context } : {}),
    ...(options?.source ? { source: options.source } : {}),
    ...(options?.metadata ? { metadata: sanitizeValue(options.metadata) as Record<string, unknown> } : {}),
    ...(options?.error ? { error: normalizeError(options.error) } : {}),
  };
}

function writeLog(level: LogLevel, payload: LogEntry): void {
  let output = UNPARSABLE_LOG;

  try {
    output = JSON.stringify(payload);
  } catch {
    output = JSON.stringify({
      level,
      message: payload.message,
      timestamp: payload.timestamp,
      error: {
        message: "Failed to serialize log payload",
      },
    });
  }

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
  info(message: string, options?: Omit<LogOptions, "error">): void {
    writeLog("info", createLogEntry("info", message, options));
  },
  warn(message: string, options?: Omit<LogOptions, "error">): void {
    writeLog("warn", createLogEntry("warn", message, options));
  },
  error(message: string, options?: LogOptions): void {
    writeLog("error", createLogEntry("error", message, options));
  },
};
