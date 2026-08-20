import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const requireFromTest = createRequire(__filename);

test("exchanges the callback code and redirects to a safe post-auth route", async () => {
  const serverModule = requireFromTest("../../src/lib/supabase/server") as typeof import("../../src/lib/supabase/server");
  const routeModulePath = requireFromTest.resolve("../../src/app/(app)/auth/callback/route");
  const { NextRequest } = requireFromTest("next/server") as typeof import("next/server");
  const originalGetSupabaseServerClient = serverModule.getSupabaseServerClient;
  let exchangedCode: string | undefined;

  serverModule.getSupabaseServerClient = async () =>
    ({
      auth: {
        exchangeCodeForSession: async (code: string) => {
          exchangedCode = code;
          return { error: null };
        },
      },
    }) as Awaited<ReturnType<typeof serverModule.getSupabaseServerClient>>;

  delete require.cache[routeModulePath];

  try {
    const { GET } = requireFromTest(
      "../../src/app/(app)/auth/callback/route",
    ) as typeof import("../../src/app/(app)/auth/callback/route");
    const response = await GET(
      new NextRequest(
        "https://preview-123.vercel.app/auth/callback?code=test-code&next=%2Fprofile",
      ),
    );

    assert.equal(exchangedCode, "test-code");
    assert.equal(response.headers.get("location"), "https://preview-123.vercel.app/profile");
  } finally {
    serverModule.getSupabaseServerClient = originalGetSupabaseServerClient;
    delete require.cache[routeModulePath];
  }
});

test("redirects signup callback failures back to signup with a safe error", async () => {
  const routeModulePath = requireFromTest.resolve("../../src/app/(app)/auth/callback/route");
  const { NextRequest } = requireFromTest("next/server") as typeof import("next/server");

  delete require.cache[routeModulePath];

  try {
    const { GET } = requireFromTest(
      "../../src/app/(app)/auth/callback/route",
    ) as typeof import("../../src/app/(app)/auth/callback/route");
    const response = await GET(
      new NextRequest("https://preview-123.vercel.app/auth/callback?type=signup"),
    );

    assert.equal(
      response.headers.get("location"),
      "https://preview-123.vercel.app/signup?error=verification_failed",
    );
  } finally {
    delete require.cache[routeModulePath];
  }
});
