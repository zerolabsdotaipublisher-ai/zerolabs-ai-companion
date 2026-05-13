import * as Sentry from "@sentry/nextjs";

const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

function resolveTracesSampleRate(): number {
  const rawSampleRate = process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE;
  const parsedSampleRate =
    typeof rawSampleRate === "string" ? Number.parseFloat(rawSampleRate) : Number.NaN;

  if (Number.isFinite(parsedSampleRate) && parsedSampleRate >= 0 && parsedSampleRate <= 1) {
    return parsedSampleRate;
  }

  return DEFAULT_TRACES_SAMPLE_RATE;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: resolveTracesSampleRate(),
});
