/**
 * Carousel content data for Instagram/TikTok marketing.
 * Each carousel is a sequence of slides rendered at 1080×1350px (4:5).
 */

export type SlideType = "hook" | "content" | "comparison" | "stats" | "cta";

export interface SlideBase {
  slideNumber: number;
  type: SlideType;
  heading: string;
  body?: string;
  bullets?: string[];
  icon?: string;
  /** Words in heading to highlight with accent glow */
  accentWords?: string[];
}

export interface ComparisonSlide extends SlideBase {
  type: "comparison";
  left: { label: string; items: { text: string; good: boolean }[] };
  right: { label: string; items: { text: string; good: boolean }[] };
}

export interface StatsSlide extends SlideBase {
  type: "stats";
  stats: { value: string; label: string }[];
}

export type Slide = SlideBase | ComparisonSlide | StatsSlide;

export interface Carousel {
  id: string;
  name: string;
  caption: string;
  hashtags: string[];
  slides: Slide[];
}

export const CAROUSELS: Carousel[] = [
  // ── Carousel 1: The Repurposing Math ──────────────────────────────
  {
    id: "repurposing-math",
    name: "The Repurposing Math",
    caption:
      "1 video = 10 posts. Most creators don't do the math. Save this for your next upload.",
    hashtags: [
      "#contentcreator",
      "#podcasttips",
      "#reelsmaker",
      "#contentrepurposing",
      "#aitools",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "You recorded 1 video. You should be posting 10.",
        accentWords: ["1", "10"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "Most creators upload once and move on.",
        body: "That's leaving 90% of their content on the table.",
        accentWords: ["90%"],
      },
      {
        slideNumber: 3,
        type: "stats",
        heading: "Do the math",
        stats: [
          { value: "1", label: "podcast episode" },
          { value: "60", label: "minutes of content" },
          { value: "8-12", label: "clip-worthy moments" },
          { value: "0", label: "your audience sees" },
        ],
      },
      {
        slideNumber: 4,
        type: "content",
        heading: '"But editing 10 clips takes hours"',
        body: "It used to.",
        icon: "⏳",
        accentWords: ["used to"],
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Kllivo finds the best moments and renders 9:16 clips",
        body: "Upload once. AI transcribes, scores, and renders — in under 5 minutes.",
        accentWords: ["5 minutes"],
      },
      {
        slideNumber: 6,
        type: "stats",
        heading: "What you get",
        stats: [
          { value: "10×", label: "more clips per video" },
          { value: "100+", label: "languages supported" },
          { value: "< 5m", label: "processing time" },
          { value: "$0", label: "to start" },
        ],
      },
      {
        slideNumber: 7,
        type: "cta",
        heading: "Stop leaving content on the table.",
        body: "kllivo.com — free to start, no credit card.",
      },
    ],
  },

  // ── Carousel 2: AI Clipping Comparison ────────────────────────────
  {
    id: "ai-clipping-comparison",
    name: "What AI clipping tools actually do to your clips",
    caption:
      "Not all AI clipping tools are the same. The difference is in how they cut.",
    hashtags: [
      "#aitools",
      "#videoediting",
      "#contentcreator",
      "#shortformvideo",
      "#tiktokgrowth",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "Most AI clip tools butcher your content.",
        body: "Here's why.",
        accentWords: ["butcher"],
      },
      {
        slideNumber: 2,
        type: "comparison",
        heading: "How they cut your video",
        left: {
          label: "Other tools",
          items: [
            { text: "Cut by silence gaps", good: false },
            { text: "Clips start mid-thought", good: false },
            { text: "End mid-sentence", good: false },
          ],
        },
        right: {
          label: "Kllivo",
          items: [
            { text: "Cut by topic boundaries", good: true },
            { text: "Every clip starts with a hook", good: true },
            { text: "Ends with a complete idea", good: true },
          ],
        },
      },
      {
        slideNumber: 3,
        type: "comparison",
        heading: "How they score clips",
        left: {
          label: "Other tools",
          items: [
            { text: 'One vague "virality score"', good: false },
            { text: "No idea why a clip ranked high", good: false },
          ],
        },
        right: {
          label: "Kllivo",
          items: [
            { text: "Hook strength score", good: true },
            { text: "Payoff score", good: true },
            { text: "Pace & audio energy", good: true },
          ],
        },
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "Complete thoughts, not random fragments.",
        body: "Your audience deserves clips that make sense — start to finish.",
        accentWords: ["Complete thoughts"],
      },
      {
        slideNumber: 5,
        type: "cta",
        heading: "Your content deserves better cuts.",
        body: "Try free → kllivo.com",
      },
    ],
  },

  // ── Carousel 3: The 5-Minute Content System ──────────────────────
  {
    id: "5-minute-system",
    name: "The 5-minute content system",
    caption:
      "This is the system. No editor. No timeline. No guesswork. Save this.",
    hashtags: [
      "#contentcreator",
      "#socialmediatips",
      "#reelstips",
      "#podcasttips",
      "#aitools",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "How I get a week of content from one video in 5 minutes",
        accentWords: ["5 minutes"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "Step 1",
        body: "Record one long video. Podcast, webinar, talking head — anything with speech.",
        icon: "🎙️",
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "Step 2",
        body: "Upload to Kllivo. Or just paste a YouTube link.",
        icon: "📤",
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "Step 3",
        body: "AI transcribes, finds the best moments, scores each clip by hook, payoff, pace, and audio energy.",
        icon: "🤖",
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Step 4",
        body: "Review your clips. Each one is a complete thought, not a random cut.",
        icon: "✅",
      },
      {
        slideNumber: 6,
        type: "content",
        heading: "Step 5",
        body: "Download in the right format — TikTok, Reels, Shorts, LinkedIn — one click.",
        icon: "⬇️",
      },
      {
        slideNumber: 7,
        type: "stats",
        heading: "The result",
        stats: [
          { value: "8-12", label: "ready-to-post clips" },
          { value: "0", label: "editing required" },
          { value: "< 5m", label: "total time" },
          { value: "7", label: "days of content" },
        ],
      },
      {
        slideNumber: 8,
        type: "cta",
        heading: "The free plan gives you 1 video/month to test it.",
        body: "kllivo.com",
      },
    ],
  },

  // ── Carousel 4: Two Types of Creators ─────────────────────────────
  {
    id: "two-types-creators",
    name: "Two types of creators in 2026",
    caption: "Which one are you? Be honest.",
    hashtags: [
      "#contentcreator",
      "#creatortips",
      "#tiktokgrowth",
      "#reelsmaker",
      "#contentrepurposing",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "Two types of creators in 2026",
        accentWords: ["Two types"],
      },
      {
        slideNumber: 2,
        type: "comparison",
        heading: "Recording",
        left: {
          label: "❌",
          items: [{ text: "Records for 2 hours. Posts once.", good: false }],
        },
        right: {
          label: "✅",
          items: [
            {
              text: "Records for 2 hours. Gets 10+ clips automatically.",
              good: true,
            },
          ],
        },
      },
      {
        slideNumber: 3,
        type: "comparison",
        heading: "Editing",
        left: {
          label: "❌",
          items: [
            { text: "Spends 3 hours editing one Reel.", good: false },
          ],
        },
        right: {
          label: "✅",
          items: [
            {
              text: "Uploads once, AI renders 9:16 clips in minutes.",
              good: true,
            },
          ],
        },
      },
      {
        slideNumber: 4,
        type: "comparison",
        heading: "Growth",
        left: {
          label: "❌",
          items: [
            { text: "Posts once a week, gets 200 views.", good: false },
          ],
        },
        right: {
          label: "✅",
          items: [
            {
              text: "Posts daily from the same content, grows 10× faster.",
              good: true,
            },
          ],
        },
      },
      {
        slideNumber: 5,
        type: "cta",
        heading: "Be the right column.",
        body: "kllivo.com — free to start",
      },
    ],
  },

  // ── Carousel 5: What $0/month gets you ────────────────────────────
  {
    id: "free-plan",
    name: "What $0/month gets you",
    caption:
      'Genuinely free. Not "free trial for 3 days then we delete your clips" free. Link in bio.',
    hashtags: [
      "#freetools",
      "#aitools",
      "#contentcreator",
      "#reelsmaker",
      "#tiktokgrowth",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "This AI tool is free and nobody's talking about it",
        accentWords: ["free"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "Upload a video up to 20 minutes long",
        icon: "📹",
        body: "MP4, MOV, AVI, MKV — any format.",
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "AI finds the best moments",
        body: "Topic-aware segmentation, not random silence-based cuts.",
        icon: "🧠",
        accentWords: ["Topic-aware"],
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "Get 9:16 clips rendered for every platform",
        body: "Reels, TikTok, YouTube Shorts — ready to post.",
        icon: "📱",
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Download unlimited times. Your clips never get deleted.",
        body: "No watermark expiry tricks. No 3-day deletion.",
        accentWords: ["never"],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "Free plan. No credit card. No catch.",
        body: "kllivo.com",
      },
    ],
  },

  // ── Carousel 6: POV Still Editing Manually ────────────────────────
  {
    id: "pov-manual-editing",
    name: "POV: Still editing Reels manually",
    caption: "4 hours of editing vs 5 minutes. The math isn't mathing.",
    hashtags: [
      "#pov",
      "#reelstips",
      "#podcasttips",
      "#videoediting",
      "#aitools",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "POV: You spent 4 hours editing one Reel from your podcast",
        accentWords: ["4 hours"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "Meanwhile, AI can do it in 5 minutes",
        body: "Find the best moments, crop to 9:16, render clips — automatically.",
        accentWords: ["5 minutes"],
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "It scores every clip",
        body: "Hook strength, pace, and audio energy — so you know which ones will perform.",
        bullets: [
          "Hook strength score",
          "Pace analysis",
          "Audio energy detection",
          "Complete thought guarantee",
        ],
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "100+ languages supported",
        body: "Your audience isn't just English.",
        accentWords: ["100+"],
      },
      {
        slideNumber: 5,
        type: "cta",
        heading: "The future is working smarter.",
        body: "kllivo.com — try it free",
      },
    ],
  },

  // ── Carousel 7: Podcasters Goldmine ───────────────────────────────
  {
    id: "podcasters-goldmine",
    name: "Podcasters are sitting on a goldmine",
    caption:
      "If you have a podcast and you're NOT doing this, you're leaving growth on the table.",
    hashtags: [
      "#podcast",
      "#podcasttips",
      "#podcastgrowth",
      "#contentrepurposing",
      "#reelsmaker",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "Your podcast episodes are a goldmine you're not mining",
        icon: "🎙️",
        accentWords: ["goldmine"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "Every episode has 8-12 moments",
        body: "That would crush as Reels or TikToks. Your audience never sees them.",
        accentWords: ["8-12"],
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "The problem?",
        body: "Clipping them takes forever. So you don't.",
        icon: "😩",
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "Kllivo finds topic boundaries",
        body: "Not silence gaps. It extracts complete thoughts — each clip covers one idea, start to finish.",
        accentWords: ["topic boundaries"],
      },
      {
        slideNumber: 5,
        type: "stats",
        heading: "Every clip gets scored",
        stats: [
          { value: "Hook", label: "strength score" },
          { value: "Payoff", label: "completion score" },
          { value: "Pace", label: "analysis" },
          { value: "Energy", label: "audio detection" },
        ],
      },
      {
        slideNumber: 6,
        type: "content",
        heading: "One upload → a week of short-form content",
        body: "Download as 9:16 for any platform.",
        accentWords: ["One upload"],
      },
      {
        slideNumber: 7,
        type: "cta",
        heading: "Start with the free plan.",
        body: "Paste a YouTube link or upload directly. kllivo.com",
      },
    ],
  },
];
