import type { MetadataRoute } from "next";
import { getAppUrl } from "./metadata";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: new URL("/sitemap.xml", appUrl).toString(),
  };
}
