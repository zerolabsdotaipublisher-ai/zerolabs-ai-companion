import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const requireFromTest = createRequire(__filename);

test("uses the request origin for signup email confirmation callbacks", async () => {
  const originModule = requireFromTest("../../src/lib/auth/origin") as typeof import("../../src/lib/auth/origin");
  const signupProfileModule = requireFromTest("../../src/lib/auth/signup-profile") as typeof import("../../src/lib/auth/signup-profile");
  const adminModule = requireFromTest("../../src/lib/supabase/admin") as typeof import("../../src/lib/supabase/admin");
  const serverModule = requireFromTest("../../src/lib/supabase/server") as typeof import("../../src/lib/supabase/server");
  const routeModulePath = requireFromTest.resolve("../../src/app/auth/signup/route");
  const originalIsStateChangingAuthRequestAllowed =
    originModule.isStateChangingAuthRequestAllowed;
  const originalProvisionSignupIdentityProfile =
    signupProfileModule.provisionSignupIdentityProfile;
  const originalGetSupabaseAdminClient = adminModule.getSupabaseAdminClient;
  const originalGetSupabaseServerClient = serverModule.getSupabaseServerClient;
  let capturedEmailRedirectTo: string | undefined;

  originModule.isStateChangingAuthRequestAllowed = () => true;
  signupProfileModule.provisionSignupIdentityProfile = async () =>
    ({
      profile: {
        id: "profile-123",
        user_id: "user-123",
      },
      status: "created",
    }) as Awaited<
      ReturnType<typeof signupProfileModule.provisionSignupIdentityProfile>
    >;
  adminModule.getSupabaseAdminClient = () =>
    ({
      auth: {
        admin: {
          deleteUser: async () => ({ error: null }),
        },
      },
      from() {
        throw new Error("profile repository should not be used in this test");
      },
    }) as ReturnType<typeof adminModule.getSupabaseAdminClient>;
  serverModule.getSupabaseServerClient = async () =>
    ({
      auth: {
        signUp: async ({
          options,
        }: {
          options?: { emailRedirectTo?: string };
        }) => {
          capturedEmailRedirectTo = options?.emailRedirectTo;
          return {
            data: {
              session: null,
              user: {
                id: "user-123",
                identities: [{ id: "identity-123" }],
              },
            },
            error: null,
          };
        },
      },
    }) as Awaited<ReturnType<typeof serverModule.getSupabaseServerClient>>;

  delete require.cache[routeModulePath];

  try {
    const { POST } = requireFromTest(
      "../../src/app/auth/signup/route",
    ) as typeof import("../../src/app/auth/signup/route");
    const response = await POST(
      new Request("https://preview-123.vercel.app/auth/signup", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "preview@example.com",
          password: "Password123!",
          confirmPassword: "Password123!",
        }),
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(
      capturedEmailRedirectTo,
      "https://preview-123.vercel.app/auth/callback",
    );
  } finally {
    originModule.isStateChangingAuthRequestAllowed =
      originalIsStateChangingAuthRequestAllowed;
    signupProfileModule.provisionSignupIdentityProfile =
      originalProvisionSignupIdentityProfile;
    adminModule.getSupabaseAdminClient = originalGetSupabaseAdminClient;
    serverModule.getSupabaseServerClient = originalGetSupabaseServerClient;
    delete require.cache[routeModulePath];
  }
});
