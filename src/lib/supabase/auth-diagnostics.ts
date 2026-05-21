import { env } from "@/lib/env";

type AuthSettingsSignal = {
  reachable: boolean;
  responseStatus?: number;
  disableSignup?: boolean;
  emailProviderEnabled?: boolean;
  mailerAutoConfirmEnabled?: boolean;
  errorMessage?: string;
};

export type SupabaseAuthDiagnostics = {
  requestOrigin?: string;
  requestPath?: string;
  supabaseUrlHost?: string;
  supabaseUrlProjectRef?: string;
  supabaseAnonKeyProjectRef?: string;
  supabaseAnonKeyIssuer?: string;
  supabaseAnonKeyRole?: string;
  supabaseUrlKeyMatch?: boolean;
  authSettings?: AuthSettingsSignal;
};

type CreateSupabaseAuthDiagnosticsOptions = {
  includeAuthSettings?: boolean;
  request?: Pick<Request, "url">;
};

type DecodedAnonKey = {
  issuer?: string;
  projectRef?: string;
  role?: string;
};

const AUTH_SETTINGS_CACHE_TTL_MS = 60_000;

let cachedAuthSettingsSignal:
  | {
      expiresAt: number;
      value: AuthSettingsSignal;
    }
  | undefined;

function decodeSupabaseAnonKey(): DecodedAnonKey {
  const keyParts = env.supabaseAnonKey.split(".");

  if (keyParts.length < 2) {
    return {};
  }

  try {
    const payload = JSON.parse(Buffer.from(keyParts[1], "base64url").toString("utf8")) as {
      iss?: unknown;
      ref?: unknown;
      role?: unknown;
    };

    return {
      issuer: typeof payload.iss === "string" ? payload.iss : undefined,
      projectRef: typeof payload.ref === "string" ? payload.ref : undefined,
      role: typeof payload.role === "string" ? payload.role : undefined,
    };
  } catch {
    return {};
  }
}

function getSupabaseUrlHost(): string | undefined {
  try {
    return new URL(env.supabaseUrl).host;
  } catch {
    return undefined;
  }
}

function getSupabaseUrlProjectRef(): string | undefined {
  const host = getSupabaseUrlHost();
  return host ? host.split(".")[0] : undefined;
}

function getNestedBoolean(
  value: unknown,
  ...path: readonly string[]
): boolean | undefined {
  let current: unknown = value;

  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "boolean" ? current : undefined;
}

function getRequestDiagnostics(request?: Pick<Request, "url">): {
  requestOrigin?: string;
  requestPath?: string;
} {
  if (!request) {
    return {};
  }

  try {
    const requestUrl = new URL(request.url);
    return {
      requestOrigin: requestUrl.origin,
      requestPath: requestUrl.pathname,
    };
  } catch {
    return {};
  }
}

async function getAuthSettingsSignal(): Promise<AuthSettingsSignal> {
  const now = Date.now();

  if (cachedAuthSettingsSignal && cachedAuthSettingsSignal.expiresAt > now) {
    return cachedAuthSettingsSignal.value;
  }

  const cacheValue = (value: AuthSettingsSignal): AuthSettingsSignal => {
    cachedAuthSettingsSignal = {
      expiresAt: now + AUTH_SETTINGS_CACHE_TTL_MS,
      value,
    };

    return value;
  };

  try {
    const response = await fetch(new URL("/auth/v1/settings", env.supabaseUrl), {
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`,
      },
      cache: "no-store",
    });

    let body: unknown;

    try {
      body = await response.json();
    } catch {
      body = undefined;
    }

    return cacheValue({
      reachable: true,
      responseStatus: response.status,
      disableSignup: getNestedBoolean(body, "disable_signup"),
      emailProviderEnabled: getNestedBoolean(body, "external", "email", "enabled"),
      mailerAutoConfirmEnabled: getNestedBoolean(body, "mailer_autoconfirm"),
    });
  } catch (error) {
    return cacheValue({
      reachable: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function createSupabaseAuthDiagnostics(
  options: CreateSupabaseAuthDiagnosticsOptions = {},
): Promise<SupabaseAuthDiagnostics> {
  const decodedAnonKey = decodeSupabaseAnonKey();
  const supabaseUrlHost = getSupabaseUrlHost();
  const supabaseUrlProjectRef = getSupabaseUrlProjectRef();

  return {
    ...getRequestDiagnostics(options.request),
    supabaseUrlHost,
    supabaseUrlProjectRef,
    supabaseAnonKeyProjectRef: decodedAnonKey.projectRef,
    supabaseAnonKeyIssuer: decodedAnonKey.issuer,
    supabaseAnonKeyRole: decodedAnonKey.role,
    supabaseUrlKeyMatch:
      Boolean(supabaseUrlProjectRef) &&
      Boolean(decodedAnonKey.projectRef) &&
      supabaseUrlProjectRef === decodedAnonKey.projectRef,
    ...(options.includeAuthSettings ? { authSettings: await getAuthSettingsSignal() } : {}),
  };
}
