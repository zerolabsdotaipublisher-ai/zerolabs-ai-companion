import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const requireFromTest = createRequire(__filename);

test("redirects from /dashboard to /onboarding if onboarding_completed is missing or false", async () => {
  const authServerModule = requireFromTest("../../src/lib/auth/server") as typeof import("../../src/lib/auth/server");
  const supabaseServerModule = requireFromTest("../../src/lib/supabase/server") as typeof import("../../src/lib/supabase/server");
  const dashboardPageModulePath = requireFromTest.resolve("../../src/app/(app)/dashboard/page");

  // Create a mock next/navigation module before importing the page
  const mockNextNavigation = {
    redirect: (url: string) => {
      throw new Error(`REDIRECT_THROWN:${url}`);
    },
  };
  require.cache[requireFromTest.resolve("next/navigation")] = {
    id: requireFromTest.resolve("next/navigation"),
    filename: requireFromTest.resolve("next/navigation"),
    loaded: true,
    exports: mockNextNavigation,
  } as unknown as NodeJS.Module;

  const originalRequireServerSession = authServerModule.requireServerSession;
  const originalGetSupabaseServerClient = supabaseServerModule.getSupabaseServerClient;

  authServerModule.requireServerSession = async () => ({
    user: { id: "user-123", email: "test@example.com" },
  }) as unknown as Awaited<ReturnType<typeof authServerModule.requireServerSession>>;

  supabaseServerModule.getSupabaseServerClient = async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { preferences: { onboarding_completed: false } },
            error: null,
          }),
        }),
      }),
    }),
  }) as unknown as Awaited<ReturnType<typeof supabaseServerModule.getSupabaseServerClient>>;

  delete require.cache[dashboardPageModulePath];

  try {
    const DashboardPage = (requireFromTest("../../src/app/(app)/dashboard/page") as { default: (...args: unknown[]) => Promise<unknown> }).default;
    await assert.rejects(async () => {
      await DashboardPage({ searchParams: Promise.resolve({}) });
    }, /REDIRECT_THROWN:\/onboarding/);
  } finally {
    authServerModule.requireServerSession = originalRequireServerSession;
    supabaseServerModule.getSupabaseServerClient = originalGetSupabaseServerClient;
    delete require.cache[dashboardPageModulePath];
    delete require.cache[requireFromTest.resolve("next/navigation")];
  }
});

test("does not redirect from /dashboard if onboarding_completed is true", async () => {
  const authServerModule = requireFromTest("../../src/lib/auth/server") as typeof import("../../src/lib/auth/server");
  const supabaseServerModule = requireFromTest("../../src/lib/supabase/server") as typeof import("../../src/lib/supabase/server");
  const dashboardPageModulePath = requireFromTest.resolve("../../src/app/(app)/dashboard/page");

  const mockNextNavigation = {
    redirect: (url: string) => {
      throw new Error(`REDIRECT_THROWN:${url}`);
    },
  };
  require.cache[requireFromTest.resolve("next/navigation")] = {
    id: requireFromTest.resolve("next/navigation"),
    filename: requireFromTest.resolve("next/navigation"),
    loaded: true,
    exports: mockNextNavigation,
  } as unknown as NodeJS.Module;

  const originalRequireServerSession = authServerModule.requireServerSession;
  const originalGetSupabaseServerClient = supabaseServerModule.getSupabaseServerClient;

  authServerModule.requireServerSession = async () => ({
    user: { id: "user-123", email: "test@example.com" },
  }) as unknown as Awaited<ReturnType<typeof authServerModule.requireServerSession>>;

  supabaseServerModule.getSupabaseServerClient = async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { preferences: { onboarding_completed: true } },
            error: null,
          }),
        }),
      }),
    }),
  }) as unknown as Awaited<ReturnType<typeof supabaseServerModule.getSupabaseServerClient>>;

  delete require.cache[dashboardPageModulePath];

  try {
    const DashboardPage = (requireFromTest("../../src/app/(app)/dashboard/page") as { default: (...args: unknown[]) => Promise<unknown> }).default;
    const result = await DashboardPage({ searchParams: Promise.resolve({}) });
    assert.ok(result); // Rendered successfully without redirect
  } finally {
    authServerModule.requireServerSession = originalRequireServerSession;
    supabaseServerModule.getSupabaseServerClient = originalGetSupabaseServerClient;
    delete require.cache[dashboardPageModulePath];
    delete require.cache[requireFromTest.resolve("next/navigation")];
  }
});

test("redirects from /onboarding to /dashboard if onboarding_completed is true", async () => {
  const authServerModule = requireFromTest("../../src/lib/auth/server") as typeof import("../../src/lib/auth/server");
  const supabaseServerModule = requireFromTest("../../src/lib/supabase/server") as typeof import("../../src/lib/supabase/server");
  const onboardingPageModulePath = requireFromTest.resolve("../../src/app/(onboarding)/onboarding/page");

  const mockNextNavigation = {
    redirect: (url: string) => {
      throw new Error(`REDIRECT_THROWN:${url}`);
    },
  };
  require.cache[requireFromTest.resolve("next/navigation")] = {
    id: requireFromTest.resolve("next/navigation"),
    filename: requireFromTest.resolve("next/navigation"),
    loaded: true,
    exports: mockNextNavigation,
  } as unknown as NodeJS.Module;

  const originalRequireServerSession = authServerModule.requireServerSession;
  const originalGetSupabaseServerClient = supabaseServerModule.getSupabaseServerClient;

  authServerModule.requireServerSession = async () => ({
    user: { id: "user-123", email: "test@example.com" },
  }) as unknown as Awaited<ReturnType<typeof authServerModule.requireServerSession>>;

  supabaseServerModule.getSupabaseServerClient = async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              preferred_name: "Alex",
              preferences: { onboarding_completed: true }
            },
            error: null,
          }),
        }),
      }),
    }),
  }) as unknown as Awaited<ReturnType<typeof supabaseServerModule.getSupabaseServerClient>>;

  delete require.cache[onboardingPageModulePath];

  try {
    const OnboardingPage = (requireFromTest("../../src/app/(onboarding)/onboarding/page") as { default: (...args: unknown[]) => Promise<unknown> }).default;
    await assert.rejects(async () => {
      await OnboardingPage();
    }, /REDIRECT_THROWN:\/dashboard/);
  } finally {
    authServerModule.requireServerSession = originalRequireServerSession;
    supabaseServerModule.getSupabaseServerClient = originalGetSupabaseServerClient;
    delete require.cache[onboardingPageModulePath];
    delete require.cache[requireFromTest.resolve("next/navigation")];
  }
});

test("does not redirect from /onboarding if onboarding_completed is missing or false", async () => {
  const authServerModule = requireFromTest("../../src/lib/auth/server") as typeof import("../../src/lib/auth/server");
  const supabaseServerModule = requireFromTest("../../src/lib/supabase/server") as typeof import("../../src/lib/supabase/server");
  const onboardingPageModulePath = requireFromTest.resolve("../../src/app/(onboarding)/onboarding/page");

  const mockNextNavigation = {
    redirect: (url: string) => {
      throw new Error(`REDIRECT_THROWN:${url}`);
    },
  };
  require.cache[requireFromTest.resolve("next/navigation")] = {
    id: requireFromTest.resolve("next/navigation"),
    filename: requireFromTest.resolve("next/navigation"),
    loaded: true,
    exports: mockNextNavigation,
  } as unknown as NodeJS.Module;

  const originalRequireServerSession = authServerModule.requireServerSession;
  const originalGetSupabaseServerClient = supabaseServerModule.getSupabaseServerClient;

  authServerModule.requireServerSession = async () => ({
    user: { id: "user-123", email: "test@example.com" },
  }) as unknown as Awaited<ReturnType<typeof authServerModule.requireServerSession>>;

  supabaseServerModule.getSupabaseServerClient = async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              preferred_name: "Alex",
              preferences: {} // missing onboarding_completed
            },
            error: null,
          }),
        }),
      }),
    }),
  }) as unknown as Awaited<ReturnType<typeof supabaseServerModule.getSupabaseServerClient>>;

  delete require.cache[onboardingPageModulePath];

  try {
    const OnboardingPage = (requireFromTest("../../src/app/(onboarding)/onboarding/page") as { default: (...args: unknown[]) => Promise<unknown> }).default;
    const result = await OnboardingPage();
    assert.ok(result); // Rendered successfully without redirect
  } finally {
    authServerModule.requireServerSession = originalRequireServerSession;
    supabaseServerModule.getSupabaseServerClient = originalGetSupabaseServerClient;
    delete require.cache[onboardingPageModulePath];
    delete require.cache[requireFromTest.resolve("next/navigation")];
  }
});

test("onboarding flow client component JSONB merge logic correctly handles default configuration settings", async () => {
  const supabaseClientModule = requireFromTest("../../src/lib/supabase/client") as typeof import("../../src/lib/supabase/client");
  const onboardingFlowModulePath = requireFromTest.resolve("../../src/components/onboarding/OnboardingFlow");
  const originalGetSupabaseBrowserClient = supabaseClientModule.getSupabaseBrowserClient;

  let capturedUpdates: Record<string, unknown> | null = null;

  supabaseClientModule.getSupabaseBrowserClient = () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "user-123" } },
        error: null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              preferences: {
                companion_preferences: { companion_tone: "calm" },
                some_other_setting: true
              }
            },
            error: null,
          }),
        }),
      }),
      update: (values: Record<string, unknown>) => {
        capturedUpdates = values;
        return {
          eq: () => ({
            error: null,
          })
        };
      },
    }),
  }) as unknown as ReturnType<typeof supabaseClientModule.getSupabaseBrowserClient>;

  const mockNextNavigation = {
    useRouter: () => ({
      refresh: () => {},
      replace: () => {},
    }),
  };
  require.cache[requireFromTest.resolve("next/navigation")] = {
    id: requireFromTest.resolve("next/navigation"),
    filename: requireFromTest.resolve("next/navigation"),
    loaded: true,
    exports: mockNextNavigation,
  } as unknown as NodeJS.Module;

  const mockReact = {
    ...(requireFromTest("react") as object),
    useState: (initial: unknown) => {
      // Step state
      if (initial === 1) return [2, () => {}];
      // Name state
      if (initial === "Alex") return ["Alex", () => {}];
      // Vibe state
      if (initial === "") return ["Spontaneous", () => {}];
      // isSubmitting state
      if (initial === false) return [false, () => {}];
      // error state
      if (initial === null) return [null, () => {}];
      return [initial, () => {}];
    },
  };
  require.cache[requireFromTest.resolve("react")] = {
    id: requireFromTest.resolve("react"),
    filename: requireFromTest.resolve("react"),
    loaded: true,
    exports: mockReact,
  } as unknown as NodeJS.Module;

  delete require.cache[onboardingFlowModulePath];

  try {
    const OnboardingFlow = (requireFromTest("../../src/components/onboarding/OnboardingFlow") as { OnboardingFlow: (props: { initialName: string }) => { props: { children: unknown[] } } }).OnboardingFlow;
    const element = OnboardingFlow({ initialName: "Alex" });

    const children = Array.isArray(element.props.children) ? element.props.children : [];

    const button = children.find((c: unknown) => {
        const component = c as { type?: string, props?: { onClick?: () => Promise<void> } };
        return component && component.type === "button";
    }) as { props: { onClick: () => Promise<void> } };
    assert.ok(button, "Button not found");
    assert.ok(button.props.onClick, "onClick handler missing");

    await button.props.onClick();

    assert.ok(capturedUpdates, "Updates should have been captured");
    assert.deepEqual((capturedUpdates as { preferences?: unknown })?.preferences, {
      companion_preferences: { companion_tone: "calm" },
      some_other_setting: true,
      onboarding_completed: true,
      companion_vibe: "Spontaneous",
    });

  } finally {
    supabaseClientModule.getSupabaseBrowserClient = originalGetSupabaseBrowserClient;
    delete require.cache[onboardingFlowModulePath];
    delete require.cache[requireFromTest.resolve("next/navigation")];
    delete require.cache[requireFromTest.resolve("react")];
  }
});
