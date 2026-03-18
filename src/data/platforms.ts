/**
 * Platform data for programmatic SEO pages.
 * Each entry generates a /clips-for/[slug] page targeting "[platform] clip maker" searches.
 */

export interface PlatformSpec {
  aspectRatio: string;
  resolution: string;
  maxDuration: string;
  bestLength: string;
}

export interface Platform {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  heroHeadline: string;
  heroSubline: string;
  specs: PlatformSpec;
  bestPractices: string[];
  howKllivoHelps: Array<{ title: string; description: string }>;
  faqs: Array<{ q: string; a: string }>;
}

export const PLATFORMS: Platform[] = [
  {
    slug: "tiktok",
    name: "TikTok",
    metaTitle: "AI TikTok Clip Maker — Turn Any Video into TikToks",
    metaDescription: "Create TikTok-ready clips from your long-form videos automatically. 9:16 vertical format, AI-selected moments, captions included.",
    keywords: ["tiktok clip maker", "ai tiktok video maker", "create tiktok from long video", "tiktok content creator tool"],
    heroHeadline: "Create TikToks from any video in minutes",
    heroSubline: "Upload your long video. AI finds the most engaging moments and renders them in TikTok-ready 9:16 vertical format. No editing skills needed.",
    specs: {
      aspectRatio: "9:16 (vertical)",
      resolution: "1080 x 1920",
      maxDuration: "10 minutes (but 15-60 seconds performs best)",
      bestLength: "15-45 seconds for maximum completion rate",
    },
    bestPractices: [
      "Hook viewers in the first 1-2 seconds — start with a bold claim, question, or surprising visual",
      "Keep clips between 15-45 seconds for the highest completion rates",
      "Add captions — TikTok's audience watches with sound off more than you'd think",
      "Post 1-3 times per day for fastest growth. Consistency beats production quality.",
      "Use trending sounds and hashtags when posting — they boost discoverability",
      "Vertical (9:16) is mandatory — landscape videos get buried in the algorithm",
    ],
    howKllivoHelps: [
      { title: "Auto-finds viral moments", description: "AI scores clips by hook strength, pacing, and completeness — prioritizing the moments TikTok's algorithm rewards." },
      { title: "Perfect 9:16 vertical output", description: "Clips render at 1080x1920 — TikTok's native resolution. Landscape videos are intelligently cropped to vertical." },
      { title: "Karaoke-style captions", description: "Add word-by-word highlighted captions that TikTok audiences love. 6 caption styles to match your aesthetic." },
    ],
    faqs: [
      { q: "What video format does TikTok require?", a: "TikTok accepts MP4 and MOV files. Kllivo exports in MP4 format with H.264 encoding — universally compatible." },
      { q: "What's the best clip length for TikTok?", a: "15-45 seconds gets the highest completion rates, which is what TikTok's algorithm optimizes for. Kllivo's AI typically generates clips in this range." },
      { q: "Can I add trending sounds after?", a: "Yes. Download the clip from Kllivo, then add trending sounds directly in TikTok's editor when posting." },
      { q: "Does Kllivo remove my original audio?", a: "No. Your original audio is preserved. You can add music or sounds on top when posting to TikTok." },
    ],
  },
  {
    slug: "instagram-reels",
    name: "Instagram Reels",
    metaTitle: "AI Instagram Reels Maker — Create Reels from Long Videos",
    metaDescription: "Turn your long-form videos into Instagram Reels automatically. AI finds the best moments, renders in 9:16, adds captions. Ready to post.",
    keywords: ["instagram reels maker", "create reels from video", "ai reels generator", "video to instagram reels"],
    heroHeadline: "Create Instagram Reels from any video automatically",
    heroSubline: "Upload your video. AI extracts the most engaging moments and renders them in Reels-ready format with optional captions. Post in minutes, not hours.",
    specs: {
      aspectRatio: "9:16 (vertical)",
      resolution: "1080 x 1920",
      maxDuration: "90 seconds (but 15-30 seconds gets most reach)",
      bestLength: "15-30 seconds for maximum algorithmic reach",
    },
    bestPractices: [
      "Instagram's algorithm heavily favors Reels over static posts — they get 2x the reach",
      "Optimal length is 15-30 seconds. Instagram surfaces shorter Reels more aggressively",
      "Add captions — 85% of Instagram users watch stories and Reels with sound off",
      "Use 3-5 relevant hashtags (not 30). Quality over quantity in 2026.",
      "Post Reels between 9 AM - 12 PM and 7 PM - 9 PM for peak engagement",
      "Cover image matters — choose a frame that looks good in the grid",
    ],
    howKllivoHelps: [
      { title: "9:16 format, every time", description: "Clips render at 1080x1920 — exactly what Instagram Reels requires. No manual cropping or reformatting." },
      { title: "AI picks shareable moments", description: "The AI prioritizes moments with strong hooks and complete thoughts — the type of content that gets shared and saved on Instagram." },
      { title: "Multiple caption styles", description: "Choose from 6 caption styles. Modern and karaoke styles are the most popular for Reels." },
    ],
    faqs: [
      { q: "What's the maximum Reels length?", a: "Instagram allows Reels up to 90 seconds. However, 15-30 second Reels get distributed more widely by the algorithm." },
      { q: "Can I also create square clips for Instagram feed?", a: "Yes. Kllivo supports 1:1 (square) rendering in addition to 9:16 vertical. Square works great for feed posts." },
      { q: "Does Kllivo create the cover image?", a: "Kllivo generates a thumbnail from your clip. You can choose your own cover image when posting to Instagram." },
    ],
  },
  {
    slug: "youtube-shorts",
    name: "YouTube Shorts",
    metaTitle: "AI YouTube Shorts Maker — Turn Videos into Shorts Automatically",
    metaDescription: "Create YouTube Shorts from your existing long-form videos. Import by URL, AI finds the best moments, download vertical clips ready to upload.",
    keywords: ["youtube shorts maker", "create shorts from youtube video", "ai youtube shorts generator", "turn video into youtube shorts"],
    heroHeadline: "Turn your videos into YouTube Shorts automatically",
    heroSubline: "Import any YouTube video by URL. AI finds the best 60-second moments and renders them as vertical Shorts ready to upload.",
    specs: {
      aspectRatio: "9:16 (vertical)",
      resolution: "1080 x 1920",
      maxDuration: "60 seconds (strict limit for Shorts classification)",
      bestLength: "30-60 seconds for maximum Shorts shelf visibility",
    },
    bestPractices: [
      "Videos must be 60 seconds or under AND vertical to be classified as Shorts",
      "Post 3-5 Shorts per week for optimal channel growth",
      "Shorts bring in new subscribers — add a CTA to subscribe or watch the full video",
      "Strong hooks are even more critical on Shorts — viewers swipe away in 1-2 seconds",
      "Use #Shorts in the title or description (YouTube auto-detects, but it helps)",
      "Shorts and long-form feed different algorithmic systems — both benefit your channel",
    ],
    howKllivoHelps: [
      { title: "Import directly from YouTube", description: "Paste your video URL — Kllivo downloads and processes it. No need to download and re-upload your own content." },
      { title: "Clips under 60 seconds", description: "AI generates clips within YouTube Shorts' 60-second limit, ensuring they're properly classified as Shorts." },
      { title: "Drive traffic to full videos", description: "Each Short is a trailer for your long-form content. Add a pinned comment linking to the full video." },
    ],
    faqs: [
      { q: "Do Shorts help grow a YouTube channel?", a: "Yes. Shorts get surfaced on the Shorts shelf to millions of users. Many creators report Shorts driving 50-80% of new subscriber growth." },
      { q: "What if my clip is 62 seconds?", a: "YouTube won't classify it as a Short. Kllivo's AI typically generates clips well within the 60-second limit. You can also trim in the editor." },
      { q: "Can I monetize YouTube Shorts?", a: "Yes. YouTube's Shorts monetization shares ad revenue with creators based on views. The more Shorts you post, the more you can earn." },
    ],
  },
  {
    slug: "linkedin",
    name: "LinkedIn",
    metaTitle: "Create LinkedIn Video Clips — AI Video Clipper for Professionals",
    metaDescription: "Turn webinars, talks, and interviews into professional LinkedIn video clips. Square format, captions, optimized for business audiences.",
    keywords: ["linkedin video clips", "linkedin video content creator", "professional video clips", "linkedin video maker"],
    heroHeadline: "Create LinkedIn videos that establish your expertise",
    heroSubline: "Turn your webinars, talks, and interviews into professional video clips that your network actually watches. Square format, captions included.",
    specs: {
      aspectRatio: "1:1 (square recommended) or 16:9 or 9:16",
      resolution: "1080 x 1080 (square) or 1920 x 1080 (landscape)",
      maxDuration: "10 minutes (but 30-90 seconds performs best)",
      bestLength: "30-90 seconds for maximum feed engagement",
    },
    bestPractices: [
      "Square (1:1) video takes up 78% more feed space on mobile than landscape — use it",
      "LinkedIn auto-mutes videos in the feed. Captions are mandatory for engagement.",
      "Post between 7-9 AM on Tuesday-Thursday for peak professional engagement",
      "Pair your video clip with a text post that adds context. Start with a hook, not 'I'm excited to share...'",
      "Tag people and companies mentioned in the clip to expand reach",
      "Clips from webinars and conference talks perform best on LinkedIn",
    ],
    howKllivoHelps: [
      { title: "Square (1:1) rendering", description: "Render clips in 1:1 square format — proven to get the most engagement on LinkedIn's feed." },
      { title: "Professional caption styles", description: "Add clean, readable captions. LinkedIn videos are auto-muted, so captions aren't optional — they're essential." },
      { title: "Webinar-to-clips pipeline", description: "Upload your webinar or talk recording and get clips that showcase your professional expertise." },
    ],
    faqs: [
      { q: "What video format works best on LinkedIn?", a: "Square (1:1) performs best because it takes up maximum feed space on both desktop and mobile. Kllivo renders in 1:1, 9:16, and 16:9." },
      { q: "How long should LinkedIn videos be?", a: "30-90 seconds is the sweet spot. LinkedIn's audience is time-constrained — they want value fast." },
      { q: "Should every LinkedIn post be a video?", a: "No. Mix video with text posts, carousels, and articles. But video posts consistently get the highest engagement." },
    ],
  },
  {
    slug: "twitter",
    name: "Twitter / X",
    metaTitle: "Create Twitter Video Clips — AI Video Clipper for X",
    metaDescription: "Turn your long-form videos into engaging Twitter/X video clips. Landscape or square format with captions for maximum engagement.",
    keywords: ["twitter video clips", "x video content", "twitter video maker", "create video clips for twitter"],
    heroHeadline: "Create video clips that stop the Twitter scroll",
    heroSubline: "Turn your long videos into short, engaging clips optimized for Twitter/X. Landscape or square format with captions for autoplay.",
    specs: {
      aspectRatio: "16:9 (landscape) or 1:1 (square)",
      resolution: "1920 x 1080 (landscape) or 1080 x 1080 (square)",
      maxDuration: "2 minutes 20 seconds (140 seconds)",
      bestLength: "15-45 seconds for maximum engagement",
    },
    bestPractices: [
      "Twitter auto-plays videos on mute. Captions are essential or nobody will engage.",
      "Keep clips under 45 seconds. Twitter's timeline moves fast — shorter clips get more complete views.",
      "Landscape (16:9) is the default for Twitter. Square (1:1) also works well on mobile.",
      "Quote-tweet your video clip with commentary to boost algorithmic reach",
      "Post clips during peak hours: 8-10 AM and 6-9 PM in your audience's timezone",
      "Thread your video clips — post multiple related clips as a thread for maximum engagement",
    ],
    howKllivoHelps: [
      { title: "Landscape and square output", description: "Render in 16:9 (Twitter's native format) or 1:1 (square) for maximum mobile real estate." },
      { title: "Short, punchy clips", description: "AI prioritizes clips with strong hooks and concise delivery — exactly what works on Twitter's fast-moving feed." },
      { title: "Caption overlay", description: "Add burned-in captions so your message comes through even on autoplay mute." },
    ],
    faqs: [
      { q: "What's the maximum video length on Twitter?", a: "2 minutes 20 seconds (140 seconds). But clips under 45 seconds perform significantly better." },
      { q: "Should I use landscape or vertical on Twitter?", a: "Landscape (16:9) is Twitter's native format and looks best on desktop. Square (1:1) is a good compromise for mobile-first audiences." },
      { q: "Does Twitter support vertical video?", a: "Technically yes, but vertical video appears with large black bars on desktop. Landscape or square is recommended." },
    ],
  },
  {
    slug: "facebook-reels",
    name: "Facebook Reels",
    metaTitle: "Create Facebook Reels from Videos — AI Video Clip Maker",
    metaDescription: "Turn your long-form videos into Facebook Reels automatically. Vertical format, AI-selected moments, ready to post to Facebook and Instagram.",
    keywords: ["facebook reels maker", "create facebook reels from video", "facebook short video maker", "facebook reels creator tool"],
    heroHeadline: "Create Facebook Reels from your existing videos",
    heroSubline: "Facebook Reels reach audiences beyond your page followers. Upload your video, AI finds the best moments, and you get vertical clips ready to post.",
    specs: {
      aspectRatio: "9:16 (vertical)",
      resolution: "1080 x 1920",
      maxDuration: "90 seconds",
      bestLength: "15-30 seconds for maximum organic reach",
    },
    bestPractices: [
      "Facebook Reels get distributed to non-followers — it's the best organic reach tool on Facebook in 2026",
      "Cross-post to Instagram Reels simultaneously — Meta lets you share to both from one upload",
      "Keep clips 15-30 seconds. Facebook surfaces shorter Reels more aggressively",
      "Add captions — Facebook auto-mutes video in the feed",
      "Use descriptive text in the first line — it shows as a preview and determines if people tap to watch",
      "Facebook's older demographic engages more with educational and inspirational content than entertainment",
    ],
    howKllivoHelps: [
      { title: "Reels-ready format", description: "9:16 vertical at 1080x1920 — exactly what Facebook Reels requires. Download and upload directly." },
      { title: "Cross-platform efficiency", description: "Same clip works on Facebook Reels AND Instagram Reels. Create once, post twice." },
      { title: "AI finds what works", description: "Our AI selects moments with complete thoughts and strong hooks — the format that drives engagement across Meta's platforms." },
    ],
    faqs: [
      { q: "Are Facebook Reels the same as Instagram Reels?", a: "They use the same format (9:16 vertical, up to 90 seconds) and you can cross-post between them. But they have separate audiences and algorithms." },
      { q: "Do Facebook Reels reach non-followers?", a: "Yes. That's their biggest advantage. Facebook distributes Reels beyond your existing page followers, giving you organic reach that regular posts don't get." },
      { q: "Can I post the same clip to both Facebook and Instagram?", a: "Yes. The same 9:16 vertical clip works on both platforms. Meta even offers a cross-posting feature when uploading." },
    ],
  },
];

export function getPlatformBySlug(slug: string): Platform | undefined {
  return PLATFORMS.find((p) => p.slug === slug);
}

export function getAllPlatformSlugs(): string[] {
  return PLATFORMS.map((p) => p.slug);
}
