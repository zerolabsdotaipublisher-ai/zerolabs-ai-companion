export type PublicEnvName =
  | "NEXT_PUBLIC_APP_NAME"
  | "NEXT_PUBLIC_APP_URL"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY";

export type ServerEnvName =
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "OPENAI_API_KEY"
  | "QDRANT_URL"
  | "QDRANT_API_KEY"
  | "QDRANT_COLLECTION"
  | "ZERO_FLOW_API_URL"
  | "ZERO_FLOW_API_KEY";

function requiredPublic(name: PublicEnvName): string {
  const value = optionalPublic(name);

  if (value) {
    return value;
  }

  throw new Error(
    `Missing required environment variable: ${name}. Set it in .env.local (local) or your deployment environment settings.`,
  );
}

function optionalPublic(name: PublicEnvName): string | undefined {
  switch (name) {
    case "NEXT_PUBLIC_APP_NAME":
      return process.env.NEXT_PUBLIC_APP_NAME?.trim() || undefined;
    case "NEXT_PUBLIC_APP_URL":
      return process.env.NEXT_PUBLIC_APP_URL?.trim() || undefined;
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
    case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
      return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined;
  }
}

export function required(name: ServerEnvName): string {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  throw new Error(
    `Missing required environment variable: ${name}. Set it in .env.local (local) or your deployment environment settings.`,
  );
}

export function optional(name: ServerEnvName): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const publicConfig = {
  appName: optionalPublic("NEXT_PUBLIC_APP_NAME") ?? "AI Companion",
  get appUrl() {
    return requiredPublic("NEXT_PUBLIC_APP_URL");
  },
  get supabaseUrl() {
    return requiredPublic("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return requiredPublic("NEXT_PUBLIC_SUPABASE_ANON_KEY");
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
