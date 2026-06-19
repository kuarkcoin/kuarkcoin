import type { MetadataRoute } from "next";
import { getAppUrl } from "./metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = getAppUrl();
  const routes = ["/", "/terminal", "/signals"];

  return routes.map((route) => ({
    url: new URL(route, appUrl).toString(),
    lastModified: new Date(),
    changeFrequency: route === "/" ? "daily" : "hourly",
    priority: route === "/" ? 1 : 0.8,
  }));
}
