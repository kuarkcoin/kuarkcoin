import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap { const base = process.env.NEXT_PUBLIC_SITE_URL || "https://kuarkcoin.com"; return ["", "/terminal", "/signals", "/terms", "/privacy", "/risk-disclosure"].map((path) => ({ url: `${base}${path}`, lastModified: new Date() })); }
