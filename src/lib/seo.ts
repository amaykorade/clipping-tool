/**
 * Base URL for the site. Used in metadata, sitemap, and robots.
 * Set NEXTAUTH_URL in production (e.g. https://kllivo.com).
 */
export function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
