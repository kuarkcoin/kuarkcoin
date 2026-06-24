export function serverEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://kuarkcoin.com";
}
