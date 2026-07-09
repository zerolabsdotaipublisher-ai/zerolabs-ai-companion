import { env } from "@/lib/env";

type RequestOriginValidationOptions = {
  requireHeaders?: boolean;
  requestHeaders?: Headers;
  trustForwardedOrigin?: boolean;
};

export const STATE_CHANGING_AUTH_HEADER = "x-ai-companion-auth-request";
export const STATE_CHANGING_AUTH_HEADER_VALUE = "1";

const VALID_FORWARDED_PROTOCOLS = new Set(["http", "https"]);
const FORWARDED_HOST_VALIDATION_PROTOCOL = "http";
const FORWARDED_HOST_WITH_OPTIONAL_PORT_PATTERN = /^[A-Za-z0-9.-]+(?::\d+)?$/u;
const FORWARDED_IPV6_HOST_WITH_OPTIONAL_PORT_PATTERN = /^\[[0-9A-Fa-f:.]+\](?::\d+)?$/u;

type ForwardedOriginResolution =
  | { status: "absent" }
  | { status: "present"; origin: string }
  | { status: "invalid" };

function getFirstCommaSeparatedHeaderValue(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const [firstValue] = value.split(",");
  return firstValue?.trim() || undefined;
}

function isValidForwardedProtocol(value: string): value is "http" | "https" {
  return VALID_FORWARDED_PROTOCOLS.has(value);
}

function isValidForwardedHost(value: string): boolean {
  if (
    !(
      FORWARDED_HOST_WITH_OPTIONAL_PORT_PATTERN.test(value) ||
      FORWARDED_IPV6_HOST_WITH_OPTIONAL_PORT_PATTERN.test(value)
    )
  ) {
    return false;
  }

  try {
    const forwardedHostUrl = new URL(`${FORWARDED_HOST_VALIDATION_PROTOCOL}://${value}`);

    return (
      forwardedHostUrl.username === "" &&
      forwardedHostUrl.password === "" &&
      forwardedHostUrl.pathname === "/" &&
      forwardedHostUrl.search === "" &&
      forwardedHostUrl.hash === "" &&
      forwardedHostUrl.hostname.length > 0
    );
  } catch {
    return false;
  }
}

function resolveForwardedOrigin(
  requestHeaders: Headers | undefined,
  trustForwardedOrigin: boolean,
): ForwardedOriginResolution {
  const hasForwardedHostHeader = requestHeaders?.has("x-forwarded-host") === true;
  const hasForwardedProtoHeader = requestHeaders?.has("x-forwarded-proto") === true;
  const hasForwardedMetadata = hasForwardedHostHeader || hasForwardedProtoHeader;

  if (!hasForwardedMetadata) {
    return { status: "absent" };
  }

  const forwardedHostHeader = getFirstCommaSeparatedHeaderValue(
    requestHeaders?.get("x-forwarded-host") ?? null,
  );
  const forwardedProtoHeader = getFirstCommaSeparatedHeaderValue(
    requestHeaders?.get("x-forwarded-proto") ?? null,
  );

  if (!trustForwardedOrigin) {
    return { status: "invalid" };
  }

  if (!hasForwardedHostHeader || !hasForwardedProtoHeader) {
    return { status: "invalid" };
  }

  if (!forwardedHostHeader || !forwardedProtoHeader) {
    return { status: "invalid" };
  }

  if (!isValidForwardedProtocol(forwardedProtoHeader) || !isValidForwardedHost(forwardedHostHeader)) {
    return { status: "invalid" };
  }

  try {
    return {
      status: "present",
      origin: new URL(`${forwardedProtoHeader}://${forwardedHostHeader}`).origin,
    };
  } catch {
    return { status: "invalid" };
  }
}

function getAllowedRequestOrigins(
  requestUrl: string,
  options: RequestOriginValidationOptions,
): ReadonlySet<string> | undefined {
  const allowedOrigins = new Set<string>([
    new URL(requestUrl).origin,
    new URL(env.appUrl).origin,
  ]);

  const forwardedOrigin = resolveForwardedOrigin(
    options.requestHeaders,
    options.trustForwardedOrigin === true,
  );

  if (forwardedOrigin.status === "invalid") {
    // Reject requests that present malformed or untrusted forwarded metadata
    // instead of silently falling back to a broader origin check.
    return undefined;
  }

  if (forwardedOrigin.status === "present") {
    allowedOrigins.add(forwardedOrigin.origin);
  }

  return allowedOrigins;
}

function isSameOriginFetchSite(value: string | null): boolean {
  return value === "same-origin";
}

export function getStateChangingAuthHeaders(): Record<string, string> {
  return {
    [STATE_CHANGING_AUTH_HEADER]: STATE_CHANGING_AUTH_HEADER_VALUE,
  };
}

export function hasTrustedStateChangingAuthHeader(request: Request): boolean {
  return (
    request.headers.get(STATE_CHANGING_AUTH_HEADER) ===
    STATE_CHANGING_AUTH_HEADER_VALUE
  );
}

export function isRequestOriginAllowed(
  requestUrl: string,
  originHeader: string | null,
  refererHeader: string | null,
  options: RequestOriginValidationOptions = {},
): boolean {
  if (options.requireHeaders && !originHeader && !refererHeader) {
    return false;
  }

  const allowedRequestOrigins = getAllowedRequestOrigins(requestUrl, options);

  if (!allowedRequestOrigins) {
    return false;
  }

  if (originHeader) {
    try {
      if (!allowedRequestOrigins.has(new URL(originHeader).origin)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  if (refererHeader) {
    try {
      if (!allowedRequestOrigins.has(new URL(refererHeader).origin)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

export function isStateChangingAuthRequestAllowed(request: Request): boolean {
  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");

  const hasTrustedHeader = hasTrustedStateChangingAuthHeader(request);

  if (originHeader || refererHeader) {
    return isRequestOriginAllowed(request.url, originHeader, refererHeader, {
      requireHeaders: true,
      requestHeaders: request.headers,
    });
  }

  if (
    !originHeader &&
    !refererHeader &&
    isSameOriginFetchSite(request.headers.get("sec-fetch-site"))
  ) {
    return true;
  }

  return hasTrustedHeader;
}
