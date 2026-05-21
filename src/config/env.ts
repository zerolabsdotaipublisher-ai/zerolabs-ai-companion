import { z } from "zod";

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

const nonEmptyString = z
  .string({
    error: (issue) => {
      if (issue.input === undefined) {
        return "is required";
      }

      return undefined;
    },
  })
  .trim()
  .min(1, "is required");
const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : undefined;
  },
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : undefined;
  },
  z.string().url("must be a valid URL").optional(),
);

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: optionalTrimmedString,
  NEXT_PUBLIC_APP_URL: nonEmptyString.url("must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_URL: nonEmptyString.url("must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: nonEmptyString,
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: nonEmptyString,
  OPENAI_API_KEY: nonEmptyString,
  QDRANT_URL: optionalUrl,
  QDRANT_API_KEY: optionalTrimmedString,
  QDRANT_COLLECTION: optionalTrimmedString,
  ZERO_FLOW_API_URL: optionalUrl,
  ZERO_FLOW_API_KEY: optionalTrimmedString,
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

function formatEnvValidationError(scope: "public" | "server", error: z.ZodError): Error {
  const details = error.issues
    .map((issue) => `${issue.path.join(".") || "unknown"}: ${issue.message}`)
    .join("; ");
  return new Error(
    `Invalid ${scope} environment variables: ${details}. ` +
      "Define values in .env.local for local development and configure deployment/Vercel environment variables for CI and deployment.",
  );
}

function validateEnv<T>(scope: "public" | "server", schema: z.ZodSchema<T>, values: unknown): T {
  const result = schema.safeParse(values);

  if (!result.success) {
    throw formatEnvValidationError(scope, result.error);
  }

  return result.data;
}

const publicEnv = validateEnv("public", publicEnvSchema, {
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

function assertServerOnly(name: string): void {
  if (typeof window !== "undefined") {
    throw new Error(`${name} is server-only and cannot be accessed in client code.`);
  }
}

function getServerEnvValues() {
  return {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    QDRANT_URL: process.env.QDRANT_URL,
    QDRANT_API_KEY: process.env.QDRANT_API_KEY,
    QDRANT_COLLECTION: process.env.QDRANT_COLLECTION,
    ZERO_FLOW_API_URL: process.env.ZERO_FLOW_API_URL,
    ZERO_FLOW_API_KEY: process.env.ZERO_FLOW_API_KEY,
  };
}

function getServerEnv(): ServerEnv {
  assertServerOnly("server environment config");

  if (!cachedServerEnv) {
    cachedServerEnv = validateEnv("server", serverEnvSchema, getServerEnvValues());
  }

  return cachedServerEnv;
}

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
      return publicEnv.NEXT_PUBLIC_APP_NAME;
    case "NEXT_PUBLIC_APP_URL":
      return publicEnv.NEXT_PUBLIC_APP_URL;
    case "NEXT_PUBLIC_SUPABASE_URL":
      return publicEnv.NEXT_PUBLIC_SUPABASE_URL;
    case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
      return publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
}

export function required(name: ServerEnvName): string {
  const value = getServerEnv()[name];

  if (value) {
    return value;
  }

  throw new Error(
    `Missing required environment variable: ${name}. Set it in .env.local (local) or your deployment environment settings.`,
  );
}

export function optional(name: ServerEnvName): string | undefined {
  const value = getServerEnv()[name];
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
