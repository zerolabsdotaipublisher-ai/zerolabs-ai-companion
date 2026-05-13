import { NextResponse } from "next/server";
import { toFiniteNumber } from "@/lib/monitoring/number";
import { logMonitoringEvent, withApiLatency } from "@/lib/monitoring/server";
import type { MonitoringEventInput } from "@/lib/monitoring/types";

type WebVitalsRequestBody = {
  event?: unknown;
  route?: unknown;
  metric?: unknown;
  durationMs?: unknown;
  value?: unknown;
  timestamp?: unknown;
};

const MAX_MONITORING_BODY_BYTES = 4 * 1024;
const MAX_MONITORING_VALUE = 10_000_000;
const ALLOWED_PAYLOAD_KEYS = new Set([
  "event",
  "route",
  "metric",
  "durationMs",
  "value",
  "timestamp",
]);

function isValidString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidOrigin(request: Request): boolean {
  const requestOrigin = new URL(request.url).origin;
  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");

  if (originHeader) {
    try {
      if (new URL(originHeader).origin !== requestOrigin) {
        return false;
      }
    } catch {
      return false;
    }
  }

  if (refererHeader) {
    try {
      if (new URL(refererHeader).origin !== requestOrigin) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

function hasValidNumericValue(value: number | undefined): boolean {
  return value === undefined || (value >= 0 && value <= MAX_MONITORING_VALUE);
}

function toMonitoringEvent(body: WebVitalsRequestBody): MonitoringEventInput | null {
  const bodyEntries = Object.entries(body);

  if (
    bodyEntries.length === 0 ||
    bodyEntries.length > ALLOWED_PAYLOAD_KEYS.size ||
    bodyEntries.some(([key]) => !ALLOWED_PAYLOAD_KEYS.has(key))
  ) {
    return null;
  }

  if (!isValidString(body.event, 100)) {
    return null;
  }

  if (!isValidString(body.route, 500)) {
    return null;
  }

  if (!body.route.startsWith("/")) {
    return null;
  }

  if (!isValidString(body.metric, 100)) {
    return null;
  }

  const timestamp =
    typeof body.timestamp === "string" && !Number.isNaN(Date.parse(body.timestamp))
      ? body.timestamp
      : undefined;
  const durationMs = toFiniteNumber(body.durationMs);
  const value = toFiniteNumber(body.value);

  if (!hasValidNumericValue(durationMs) || !hasValidNumericValue(value)) {
    return null;
  }

  if (durationMs === undefined && value === undefined) {
    return null;
  }

  return {
    event: body.event,
    route: body.route,
    metric: body.metric,
    durationMs,
    value,
    timestamp,
  };
}

export async function POST(request: Request): Promise<Response> {
  return withApiLatency("/api/monitoring/web-vitals", async () => {
    if (!isValidOrigin(request)) {
      return NextResponse.json({ error: "Origin is not allowed." }, { status: 403 });
    }

    const contentLength = request.headers.get("content-length");

    if (contentLength !== null) {
      const isValidContentLengthFormat = /^\d+$/.test(contentLength);
      const parsedLength = isValidContentLengthFormat ? Number(contentLength) : Number.NaN;

      if (!Number.isFinite(parsedLength) || parsedLength <= 0 || parsedLength > MAX_MONITORING_BODY_BYTES) {
        return NextResponse.json({ error: "Monitoring payload too large." }, { status: 413 });
      }
    }

    try {
      const rawBody = await request.text();
      const bodyByteLength = new TextEncoder().encode(rawBody).length;

      if (bodyByteLength === 0) {
        return NextResponse.json({ error: "Monitoring payload is required." }, { status: 400 });
      }

      if (bodyByteLength > MAX_MONITORING_BODY_BYTES) {
        return NextResponse.json({ error: "Monitoring payload too large." }, { status: 413 });
      }

      const parsedBody = JSON.parse(rawBody) as unknown;

      if (!isPlainObject(parsedBody)) {
        return NextResponse.json({ error: "Invalid monitoring payload." }, { status: 400 });
      }

      const monitoringEvent = toMonitoringEvent(parsedBody as WebVitalsRequestBody);

      if (!monitoringEvent) {
        return NextResponse.json({ error: "Invalid monitoring payload." }, { status: 400 });
      }

      logMonitoringEvent(monitoringEvent);

      return new NextResponse(null, { status: 202 });
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
  });
}
