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

const isDevelopment = process.env.NODE_ENV === "development";

export function required(name: EnvName): string {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  if (isDevelopment) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env.local for local development.`,
    );
  }

  return "";
}

export function optional(name: EnvName): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export const publicConfig = {
  appName: optional("NEXT_PUBLIC_APP_NAME") ?? "AI Companion",
  appUrl: required("NEXT_PUBLIC_APP_URL"),
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
};

export const serverConfig = {
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  openaiApiKey: required("OPENAI_API_KEY"),
  qdrantUrl: optional("QDRANT_URL"),
  qdrantApiKey: optional("QDRANT_API_KEY"),
  qdrantCollection: optional("QDRANT_COLLECTION"),
  zeroFlowApiUrl: optional("ZERO_FLOW_API_URL"),
  zeroFlowApiKey: optional("ZERO_FLOW_API_KEY"),
};
