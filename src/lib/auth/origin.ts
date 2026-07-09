type RequestOriginValidationOptions = {
  requireHeaders?: boolean;
  requestHeaders?: Headers;
};

export const STATE_CHANGING_AUTH_HEADER = "x-ai-companion-auth-request";
export const STATE_CHANGING_AUTH_HEADER_VALUE = "1";

function getFirstCommaSeparatedHeaderValue(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const [firstValue] = value.split(",");
  const normalizedValue = firstValue?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function getAllowedRequestOrigins(
  requestUrl: string,
  requestHeaders?: Headers,
): ReadonlySet<string> {
  const requestOrigin = new URL(requestUrl).origin;
  const allowedOrigins = new Set<string>([requestOrigin]);
  const forwardedHostHeader = getFirstCommaSeparatedHeaderValue(
    requestHeaders?.get("x-forwarded-host") ?? null,
  );
  const protocol =
    getFirstCommaSeparatedHeaderValue(requestHeaders?.get("x-forwarded-proto") ?? null) ??
    new URL(requestUrl).protocol.slice(0, -1);

  if (!forwardedHostHeader) {
    return allowedOrigins;
  }

  try {
    allowedOrigins.add(new URL(`${protocol}://${forwardedHostHeader}`).origin);
  } catch {
    return allowedOrigins;
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

  const allowedRequestOrigins = getAllowedRequestOrigins(requestUrl, options.requestHeaders);

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
