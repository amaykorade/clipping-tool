# Kllivo SEO Setup Guide

This guide covers how to get your Kllivo site indexed by Google, visible in search, and how to track which pages are ranking.

---

## What’s Already in Place

The codebase already includes:

- **Meta tags**: Title, description, Open Graph, Twitter cards  
- **Sitemap**: Dynamic sitemap at `/sitemap.xml`  
- **Robots.txt**: At `/robots.txt`  
- **JSON-LD**: WebSite, SoftwareApplication, Organization on the home page  
- **Per-page metadata**: Pricing, Upload, Videos, Video detail pages  
- **Programmatic SEO**: Dynamic metadata for `/videos/[id]`

---

## Part 1: Add Your Domain to Google Search Console

### Step 1.1: Open Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Sign in with your Google account

### Step 1.2: Add a Property

1. Click **Add property**
2. Choose **URL prefix** (for a single domain like `https://kllivo.com`)
3. Enter your site URL, e.g. `https://kllivo.com` or `https://www.kllivo.com`
4. Click **Continue**

### Step 1.3: Verify Ownership

Google offers several verification methods:

#### Option A: HTML Tag (Easiest)

1. In Search Console, select **HTML tag**
2. Copy the **content** value only (the long string after `content="` and before `"`)
3. Add to your `.env`:
   ```
   GOOGLE_SITE_VERIFICATION=ABC123xyz...
   ```
4. The layout already reads this env var and adds the meta tag
5. Deploy the change
6. In Search Console, click **Verify**

#### Option B: DNS Verification (For Root Domain)

1. In Search Console, select **DNS record**
2. Add the TXT record at your DNS provider (e.g. Vercel, Cloudflare, GoDaddy)
3. Example: `google-site-verification=ABC123xyz...`
4. Wait 5–10 minutes for DNS propagation
5. Click **Verify**

#### Option C: HTML File Upload

1. Download the verification file from Search Console
2. Place it in `public/` (e.g. `public/google123abc.html`)
3. Deploy; the file will be at `https://yoursite.com/google123abc.html`
4. Click **Verify**

### Step 1.4: Domain vs URL Prefix

- **URL prefix**: `https://kllivo.com` — verifies one exact URL (with or without www)
- **Domain**: `kllivo.com` — verifies all subdomains and protocols (requires DNS)

Use **URL prefix** if you only have one domain. Use **Domain** if you want to cover all variants (www, subdomains, etc.).

---

## Part 2: Submit Your Sitemap

1. In Search Console, open your property
2. Go to **Sitemaps** (left sidebar)
3. Enter `sitemap.xml`
4. Click **Submit**

Your sitemap will be at `https://yourdomain.com/sitemap.xml`.

---

## Part 3: Include Video Pages in the Sitemap (Optional)

By default, only static pages (home, pricing, upload, videos list) are in the sitemap.  
To add video detail pages for programmatic SEO:

1. Add to `.env`:
   ```
   INCLUDE_VIDEO_PAGES_IN_SITEMAP=true
   ```
2. Rebuild and deploy

Use this only if you want video pages indexable (e.g. public or shareable videos).  
Right now video pages use `noindex`, so they are not meant to be indexed.

---

## Part 4: Track Which Pages Are Ranking

### 4.1: Google Search Console – Performance

1. In Search Console → **Performance**
2. You’ll see:
   - **Queries**: Search terms that brought traffic
   - **Pages**: URLs that appeared in search
   - **Countries**, **Devices**

Use **Pages** to see which URLs get impressions and clicks.

### 4.2: See Rankings by Page

1. Open **Performance**
2. Under **Search results**, click **Pages**
3. Click a URL to see which queries it ranks for and their average position

### 4.3: Track Over Time

- Data can take a few days to appear
- Use the date picker to compare periods
- Export to CSV if you want to analyze in a spreadsheet

---

## Part 5: Google Analytics 4 (Optional but Recommended)

1. Go to [Google Analytics](https://analytics.google.com)
2. Create a property for your site
3. Get your **Measurement ID** (e.g. `G-XXXXXXXXXX`)
4. Add the GA4 script to your site (e.g. via `next/script` in the layout)

This gives you traffic, behavior, and conversions. Search Console focuses on search performance.

---

## Part 6: Best Practices Checklist

| Item | Status |
|------|--------|
| `NEXTAUTH_URL` set to production URL | Required |
| Sitemap submitted in Search Console | Do once |
| Domain verified in Search Console | Do once |
| `robots.txt` allows crawling | ✅ In code |
| Unique title/description per page | ✅ In code |
| Open Graph & Twitter tags | ✅ In code |
| JSON-LD on home page | ✅ In code |
| HTTPS enabled | Ensure in production |

---

## Part 7: Programmatic SEO Summary

Kllivo uses programmatic SEO for:

1. **`/videos/[id]`**
   - Title from video name
   - Description with Kllivo branding
   - `noindex` (private content)

2. **Sitemap**
   - Static: `/`, `/pricing`, `/upload`, `/videos`
   - Optional: `/videos/[id]` when `INCLUDE_VIDEO_PAGES_IN_SITEMAP=true`

3. **JSON-LD**
   - `WebSite`, `SoftwareApplication`, `Organization` on the home page

---

## Part 8: Common Issues

**Sitemap returns 404**  
- Ensure `src/app/sitemap.ts` exists and is deployed  
- Visit `https://yourdomain.com/sitemap.xml` in a browser  

**Pages not appearing in search**  
- Indexing can take days or weeks  
- Check Search Console → Coverage for errors  
- Confirm pages are not `noindex`  

**Duplicate content**  
- Use canonical URLs if you have multiple domains (e.g. www vs non-www)  
- Set `metadataBase` in layout (already set in this project)
