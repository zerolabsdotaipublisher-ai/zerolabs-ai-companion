const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

export function resolveSentryTracesSampleRate(): number {
  const rawSampleRate = process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE;
  const parsedSampleRate =
    typeof rawSampleRate === "string" ? Number.parseFloat(rawSampleRate) : Number.NaN;

  if (Number.isFinite(parsedSampleRate) && parsedSampleRate >= 0 && parsedSampleRate <= 1) {
    return parsedSampleRate;
  }

  return DEFAULT_TRACES_SAMPLE_RATE;
}
