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

function isValidString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}


function toMonitoringEvent(body: WebVitalsRequestBody): MonitoringEventInput | null {
  if (!isValidString(body.event, 100)) {
    return null;
  }

  if (!isValidString(body.route, 500)) {
    return null;
  }

  if (!isValidString(body.metric, 100)) {
    return null;
  }

  const timestamp =
    typeof body.timestamp === "string" && !Number.isNaN(Date.parse(body.timestamp))
      ? body.timestamp
      : undefined;

  return {
    event: body.event,
    route: body.route,
    metric: body.metric,
    durationMs: toFiniteNumber(body.durationMs),
    value: toFiniteNumber(body.value),
    timestamp,
  };
}

export async function POST(request: Request): Promise<Response> {
  return withApiLatency("/api/monitoring/web-vitals", async () => {
    let body: WebVitalsRequestBody;

    try {
      body = (await request.json()) as WebVitalsRequestBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const monitoringEvent = toMonitoringEvent(body);

    if (!monitoringEvent) {
      return NextResponse.json({ error: "Invalid monitoring payload." }, { status: 400 });
    }

    logMonitoringEvent(monitoringEvent);

    return new NextResponse(null, { status: 202 });
  });
}
