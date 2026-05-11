type EnvName =
  | "NEXT_PUBLIC_APP_NAME"
  | "NEXT_PUBLIC_APP_URL"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "OPENAI_API_KEY"
  | "QDRANT_URL"
  | "QDRANT_API_KEY"
  | "QDRANT_COLLECTION"
  | "ZERO_FLOW_API_URL"
  | "ZERO_FLOW_API_KEY";

export function required(name: EnvName): string {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  throw new Error(
    `Missing required environment variable: ${name}. Set it in .env.local (local) or your deployment environment settings.`,
  );
}

export function optional(name: EnvName): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export const publicConfig = {
  appName: optional("NEXT_PUBLIC_APP_NAME") ?? "AI Companion",
  get appUrl() {
    return required("NEXT_PUBLIC_APP_URL");
  },
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
};

function assertServerOnly(name: string): void {
  if (typeof window !== "undefined") {
    throw new Error(`${name} is server-only and cannot be accessed in client code.`);
  }
}

export const serverConfig = {
  get supabaseServiceRoleKey() {
    assertServerOnly("serverConfig.supabaseServiceRoleKey");
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get openaiApiKey() {
    assertServerOnly("serverConfig.openaiApiKey");
    return required("OPENAI_API_KEY");
  },
  get qdrantUrl() {
    assertServerOnly("serverConfig.qdrantUrl");
    return optional("QDRANT_URL");
  },
  get qdrantApiKey() {
    assertServerOnly("serverConfig.qdrantApiKey");
    return optional("QDRANT_API_KEY");
  },
  get qdrantCollection() {
    assertServerOnly("serverConfig.qdrantCollection");
    return optional("QDRANT_COLLECTION");
  },
  get zeroFlowApiUrl() {
    assertServerOnly("serverConfig.zeroFlowApiUrl");
    return optional("ZERO_FLOW_API_URL");
  },
  get zeroFlowApiKey() {
    assertServerOnly("serverConfig.zeroFlowApiKey");
    return optional("ZERO_FLOW_API_KEY");
  },
};
