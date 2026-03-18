import { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo";
import { prisma } from "@/lib/db";
import { getAllCompetitorSlugs } from "@/data/competitors";
import { getAllUseCaseSlugs } from "@/data/useCases";
import { getAllHowToSlugs } from "@/data/howTo";
import { getAllPlatformSlugs } from "@/data/platforms";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  // Static pages — always include
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/upload`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/videos`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    ...getAllCompetitorSlugs().map((slug) => ({
      url: `${baseUrl}/compare/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${baseUrl}/use`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.85 },
    ...getAllUseCaseSlugs().map((slug) => ({
      url: `${baseUrl}/use/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${baseUrl}/how-to`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.85 },
    ...getAllHowToSlugs().map((slug) => ({
      url: `${baseUrl}/how-to/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${baseUrl}/clips-for`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.85 },
    ...getAllPlatformSlugs().map((slug) => ({
      url: `${baseUrl}/clips-for/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
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
