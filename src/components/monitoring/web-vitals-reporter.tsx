"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { sendMonitoringEvent } from "@/lib/monitoring/client";

function roundMetric(value: number): number {
  return Number(value.toFixed(2));
}

export function WebVitalsReporter(): null {
  useReportWebVitals((metric) => {
    sendMonitoringEvent({
      event: "web_vital",
      route: window.location.pathname,
      metric: metric.name,
      value: roundMetric(metric.value),
      timestamp: new Date(metric.startTime).toISOString(),
    });
  });

  useEffect(() => {
    const navigationEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    if (!navigationEntry) {
      return;
    }

    const pageLoadMs =
      navigationEntry.loadEventEnd > 0
        ? navigationEntry.loadEventEnd
        : navigationEntry.domComplete;

    if (!Number.isFinite(pageLoadMs) || pageLoadMs <= 0) {
      return;
    }

    sendMonitoringEvent({
      event: "page_load",
      route: window.location.pathname,
      metric: "page_load_ms",
      durationMs: roundMetric(pageLoadMs),
    });
  }, []);

  return null;
}
