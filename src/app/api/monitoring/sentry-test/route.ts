import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { serverConfig } from "@/config/env";
import { logger } from "@/lib/logger";

const TRIGGER_HEADER = "x-sentry-test";
const TRIGGER_VALUE = "true";
const SECRET_HEADER = "x-sentry-test-secret";

export async function POST(request: Request): Promise<Response> {
  if (request.headers.get(TRIGGER_HEADER) !== TRIGGER_VALUE) {
    return NextResponse.json(
      {
        error: `Set ${TRIGGER_HEADER}: ${TRIGGER_VALUE} to trigger the Sentry test error.`,
      },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV === "production") {
    const sentryTestSecret = serverConfig.sentryTestSecret;

    if (!sentryTestSecret) {
      return NextResponse.json({ error: "Sentry test endpoint is disabled in production." }, { status: 404 });
    }

    if (request.headers.get(SECRET_HEADER) !== sentryTestSecret) {
      return NextResponse.json(
        {
          error: `Set ${SECRET_HEADER} to the server-configured secret to trigger the Sentry test error.`,
        },
        { status: 403 },
      );
    }
  }

  const error = new Error("Intentional Sentry test error from /api/monitoring/sentry-test");
  logger.error("Intentional Sentry test error triggered.", {
    context: "monitoring",
    source: "api/monitoring/sentry-test",
    metadata: {
      route: "/api/monitoring/sentry-test",
    },
    error,
  });

  Sentry.captureException(error);
  await Sentry.flush(2000);

  throw error;
}
