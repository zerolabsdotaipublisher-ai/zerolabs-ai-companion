import "server-only";

const REQUIRED_LOCAL_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "OPENAI_API_KEY",
] as const;

type RequiredLocalEnvVar = (typeof REQUIRED_LOCAL_ENV_VARS)[number];

function readRequiredEnv(name: RequiredLocalEnvVar): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in your local environment file (for example, .env.local).`,
    );
  }

  return value;
}

function readOptionalEnv(name: string, fallback: string): string {
  const value = process.env[name];

  return value && value.trim() !== "" ? value : fallback;
}

function validateLocalEnv(): void {
  REQUIRED_LOCAL_ENV_VARS.forEach(readRequiredEnv);
}

// Local startup guard for developer machines; production envs are configured in deployment settings.
if (process.env.NODE_ENV === "development") {
  validateLocalEnv();
}

export const env = {
  appName: readOptionalEnv("NEXT_PUBLIC_APP_NAME", "AI Companion"),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  openAiApiKey: process.env.OPENAI_API_KEY,
};
