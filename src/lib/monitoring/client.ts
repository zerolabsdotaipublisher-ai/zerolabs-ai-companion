import type { MonitoringEventInput } from "@/lib/monitoring/types";

const MONITORING_ENDPOINT = "/api/monitoring/web-vitals";

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function sendMonitoringEvent(input: MonitoringEventInput): void {
  const payload = {
    event: input.event,
    route: input.route,
    metric: input.metric,
    durationMs: toFiniteNumber(input.durationMs),
    value: toFiniteNumber(input.value),
    timestamp: input.timestamp ?? new Date().toISOString(),
  };

  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(MONITORING_ENDPOINT, blob);
    return;
  }

  void fetch(MONITORING_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  });
}
