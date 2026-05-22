type RequestOriginValidationOptions = {
  requireHeaders?: boolean;
};

function isTrustedFetchSite(value: string | null): boolean {
  return value === "same-origin";
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

  const requestOrigin = new URL(requestUrl).origin;

  if (originHeader) {
    try {
      if (new URL(originHeader).origin !== requestOrigin) {
        return false;
      }
    } catch {
      return false;
    }
  }

  if (refererHeader) {
    try {
      if (new URL(refererHeader).origin !== requestOrigin) {
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

  if (
    !originHeader &&
    !refererHeader &&
    isTrustedFetchSite(request.headers.get("sec-fetch-site"))
  ) {
    return true;
  }

  return isRequestOriginAllowed(
    request.url,
    originHeader,
    refererHeader,
    { requireHeaders: true },
  );
}
