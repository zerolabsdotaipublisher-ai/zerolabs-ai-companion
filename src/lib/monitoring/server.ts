import "server-only";
import { logger } from "@/lib/logger";
import type { MonitoringEvent, MonitoringEventInput } from "@/lib/monitoring/types";

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function buildMonitoringEvent(input: MonitoringEventInput): MonitoringEvent {
  return {
    event: input.event,
    route: input.route,
    metric: input.metric,
    durationMs: toFiniteNumber(input.durationMs),
    value: toFiniteNumber(input.value),
    statusCode: Number.isInteger(input.statusCode) ? input.statusCode : undefined,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

export function logMonitoringEvent(input: MonitoringEventInput): void {
  const event = buildMonitoringEvent(input);

  const source = event.route.startsWith("/") ? event.route.slice(1) : event.route;

  logger.info("Performance metric captured.", {
    context: "monitoring",
    source,
    metadata: event,
  });
}

export async function withApiLatency<T extends Response>(
  route: string,
  handler: () => Promise<T>,
): Promise<T> {
  const startTime = performance.now();

  try {
    const response = await handler();

    logMonitoringEvent({
      event: "api_request",
      route,
      metric: "api_latency_ms",
      durationMs: performance.now() - startTime,
      statusCode: response.status,
    });

    return response;
  } catch (error) {
    logMonitoringEvent({
      event: "api_request",
      route,
      metric: "api_latency_ms",
      durationMs: performance.now() - startTime,
      statusCode: 500,
    });

    throw error;
  }
}
