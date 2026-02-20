import { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  // Static pages — always include
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/upload`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/videos`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];

  // Optional: include public video pages for programmatic SEO
  // Videos are typically private; set INCLUDE_VIDEO_PAGES_IN_SITEMAP=true to add them
  if (process.env.INCLUDE_VIDEO_PAGES_IN_SITEMAP === "true") {
    try {
      const videos = await prisma.video.findMany({
        select: { id: true, updatedAt: true },
        take: 5000,
        orderBy: { updatedAt: "desc" },
      });
      const videoPages: MetadataRoute.Sitemap = videos.map((v) => ({
        url: `${baseUrl}/videos/${v.id}`,
        lastModified: v.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      }));
      return [...staticPages, ...videoPages];
    } catch {
      // DB may be unavailable during build
    }
  }

  return staticPages;
}
