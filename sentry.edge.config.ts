import * as Sentry from "@sentry/nextjs";
import { resolveSentryTracesSampleRate } from "./sentry.shared.config";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: resolveSentryTracesSampleRate(),
});
