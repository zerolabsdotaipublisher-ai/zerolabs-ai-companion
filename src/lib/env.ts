import "server-only";

type RequiredLocalEnvVar =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "OPENAI_API_KEY";

function readRequiredEnv(name: RequiredLocalEnvVar): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in your local environment file (for example, .env.local).`,
    );
  }

  return value;
}

function readRuntimeRequiredEnv(name: RequiredLocalEnvVar): string {
  if (process.env.NODE_ENV === "development") {
    return readRequiredEnv(name);
  }

  const value = process.env[name];
  return value && value.trim() !== "" ? value : "";
}

export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "AI Companion",
  supabaseUrl: readRuntimeRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readRuntimeRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  openAiApiKey: readRuntimeRequiredEnv("OPENAI_API_KEY"),
};
