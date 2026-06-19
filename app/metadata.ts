import "server-only";

const LOCAL_APP_URL = "http://localhost:3000";
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function parseAppUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function getAppUrl(): URL {
  const configuredUrl = process.env.APP_URL?.trim();

  if (!configuredUrl) {
    return new URL(LOCAL_APP_URL);
  }

  const appUrl = parseAppUrl(configuredUrl);

  if (!appUrl || !ALLOWED_PROTOCOLS.has(appUrl.protocol)) {
    return new URL(LOCAL_APP_URL);
  }

  return appUrl;
}
