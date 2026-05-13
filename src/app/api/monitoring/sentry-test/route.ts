import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const TRIGGER_HEADER = "x-sentry-test";
const TRIGGER_VALUE = "true";

export async function POST(request: Request): Promise<Response> {
  if (request.headers.get(TRIGGER_HEADER) !== TRIGGER_VALUE) {
    return NextResponse.json(
      {
        error: `Set ${TRIGGER_HEADER}: ${TRIGGER_VALUE} to trigger the Sentry test error.`,
      },
      { status: 400 },
    );
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
