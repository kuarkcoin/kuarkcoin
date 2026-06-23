const DEFAULT_REDIRECT_PATH = "/account";

export function getSafeRedirectPath(value: string | null | undefined, fallback = DEFAULT_REDIRECT_PATH) {
  if (!value) return fallback;

  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) return fallback;

    const url = new URL(decoded, "http://kuarkcoin.local");
    if (url.origin !== "http://kuarkcoin.local") return fallback;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function appendSafeNextParam(path: string, next: string | null | undefined) {
  const safeNext = getSafeRedirectPath(next, "");
  if (!safeNext) return path;
  const url = new URL(path, "http://kuarkcoin.local");
  url.searchParams.set("next", safeNext);
  return `${url.pathname}${url.search}`;
}
