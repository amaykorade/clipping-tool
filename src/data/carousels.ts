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

  // ── Carousel 8: Short-Form Algorithm Secrets ───────────────────────
  {
    id: "algorithm-secrets",
    name: "How the algorithm actually picks your Reels",
    caption:
      "The algorithm isn't random. It follows rules. Here's what actually matters for Reels, Shorts, and TikToks.",
    hashtags: [
      "#algorithm",
      "#reelstips",
      "#tiktokgrowth",
      "#instagramgrowth",
      "#contentcreator",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "The algorithm doesn't hate you. You're just feeding it wrong.",
        accentWords: ["feeding it wrong"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "It measures 3 things in the first 3 seconds",
        bullets: [
          "Watch-through rate (do people keep watching?)",
          "Replay rate (do people rewatch?)",
          "Share rate (do people send it to friends?)",
        ],
        accentWords: ["3 things", "3 seconds"],
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "That means your hook is everything",
        body: "If the first 2 seconds don't grab attention, the algorithm never shows it to more people.",
        icon: "🪝",
        accentWords: ["hook"],
      },
      {
        slideNumber: 4,
        type: "comparison",
        heading: "Weak hook vs Strong hook",
        left: {
          label: "Weak",
          items: [
            { text: '"Hey guys, today I want to talk about..."', good: false },
            { text: "Slow intro with music", good: false },
            { text: "Title card for 3 seconds", good: false },
          ],
        },
        right: {
          label: "Strong",
          items: [
            { text: "Start mid-sentence with the best line", good: true },
            { text: "Open with a bold claim or question", good: true },
            { text: "Jump straight into the value", good: true },
          ],
        },
      },
      {
        slideNumber: 5,
        type: "stats",
        heading: "What the data says",
        stats: [
          { value: "85%", label: "watch on mute" },
          { value: "3s", label: "to grab attention" },
          { value: "15-45s", label: "optimal clip length" },
          { value: "3-5×", label: "more reach with daily posts" },
        ],
      },
      {
        slideNumber: 6,
        type: "content",
        heading: "Kllivo scores every clip for hook strength",
        body: "So you know which clips will actually perform before you post them.",
        accentWords: ["hook strength"],
      },
      {
        slideNumber: 7,
        type: "cta",
        heading: "Stop guessing. Let AI find your best hooks.",
        body: "kllivo.com — free to start",
      },
    ],
  },

  // ── Carousel 9: Captions Are Not Optional ──────────────────────────
  {
    id: "captions-not-optional",
    name: "Captions aren't optional anymore",
    caption:
      "85% of social video is watched on mute. If your clips don't have captions, they don't exist. Here's the data.",
    hashtags: [
      "#captions",
      "#accessibility",
      "#reelstips",
      "#contentcreator",
      "#videoediting",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "85% of people watch your video on mute.",
        body: "No captions = invisible.",
        accentWords: ["85%", "mute"],
      },
      {
        slideNumber: 2,
        type: "stats",
        heading: "The numbers don't lie",
        stats: [
          { value: "85%", label: "watch on mute" },
          { value: "80%", label: "more watch time with captions" },
          { value: "16%", label: "more reach" },
          { value: "15%", label: "more shares" },
        ],
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "It's not just about mute viewers",
        bullets: [
          "Non-native speakers follow along easier",
          "Noisy environments (commute, gym, office)",
          "Accessibility for deaf/HoH audience",
          "Captions reinforce memory retention",
        ],
      },
      {
        slideNumber: 4,
        type: "comparison",
        heading: "Caption styles that work",
        left: {
          label: "Don't",
          items: [
            { text: "Tiny text at the bottom", good: false },
            { text: "White text on light backgrounds", good: false },
            { text: "Full paragraph blocks", good: false },
          ],
        },
        right: {
          label: "Do",
          items: [
            { text: "Bold text, center of screen", good: true },
            { text: "High contrast with outline/shadow", good: true },
            { text: "2-3 words at a time (karaoke style)", good: true },
          ],
        },
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Kllivo has 6 caption styles built in",
        body: "Modern, bold, minimal, karaoke, outline — pick one and it's burned into the video.",
        accentWords: ["6 caption styles"],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "Your clips deserve to be heard. Even on mute.",
        body: "kllivo.com — captions included free",
      },
    ],
  },

  // ── Carousel 10: YouTube Shorts Strategy ───────────────────────────
  {
    id: "youtube-shorts-strategy",
    name: "YouTube Shorts strategy that actually works",
    caption:
      "YouTube Shorts is the biggest untapped growth channel for creators in 2026. Here's the strategy.",
    hashtags: [
      "#youtubeshorts",
      "#youtubestrategy",
      "#contentcreator",
      "#youtube",
      "#shortformvideo",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "YouTube Shorts get 70 billion views per day.",
        body: "And most creators are ignoring them.",
        accentWords: ["70 billion"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "Why Shorts matter more than you think",
        bullets: [
          "Shorts viewers subscribe 2× more than regular viewers",
          "Algorithm tests Shorts with non-subscribers first",
          "Shorts feed traffic back to your long-form videos",
          "Monetization is now live for Shorts",
        ],
        accentWords: ["2×"],
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "The cheat code: repurpose your existing videos",
        body: "You already have hours of content. Your best moments are buried in videos with 200 views.",
        icon: "🔑",
        accentWords: ["cheat code"],
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "The rules for Shorts that perform",
        bullets: [
          "Must be vertical (9:16) and under 60 seconds",
          "Hook in the first 2 seconds",
          "Post 3-5 Shorts per week minimum",
          "Add captions — always",
        ],
      },
      {
        slideNumber: 5,
        type: "stats",
        heading: "What repurposing looks like",
        stats: [
          { value: "1", label: "long video uploaded" },
          { value: "8-12", label: "Shorts extracted" },
          { value: "3 weeks", label: "of daily content" },
          { value: "< 5m", label: "to generate" },
        ],
      },
      {
        slideNumber: 6,
        type: "content",
        heading: "Paste a YouTube URL. Get clips.",
        body: "Kllivo imports directly from YouTube. No download needed.",
        icon: "🔗",
        accentWords: ["YouTube URL"],
      },
      {
        slideNumber: 7,
        type: "cta",
        heading: "Turn your back catalog into a Shorts machine.",
        body: "kllivo.com — paste any YouTube link, free",
      },
    ],
  },

  // ── Carousel 11: Content Calendar From One Recording ───────────────
  {
    id: "content-calendar",
    name: "A month of content from 4 recordings",
    caption:
      "You don't need to create more. You need to repurpose smarter. Here's the exact math.",
    hashtags: [
      "#contentcalendar",
      "#contentrepurposing",
      "#socialmediatips",
      "#contentcreator",
      "#podcasttips",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "You don't need to create more content.",
        body: "You need to extract more from what you already have.",
        accentWords: ["more content"],
      },
      {
        slideNumber: 2,
        type: "stats",
        heading: "The repurposing math",
        stats: [
          { value: "1", label: "video recorded" },
          { value: "10", label: "clips generated" },
          { value: "5", label: "platforms to post on" },
          { value: "50", label: "pieces of content" },
        ],
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "Week 1: Record one podcast/video",
        body: "30-60 minutes is the sweet spot. Upload to Kllivo and get 8-12 clips in under 5 minutes.",
        icon: "🎬",
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "Week 2: Post clips across platforms",
        bullets: [
          "Monday: TikTok + Instagram Reel",
          "Tuesday: YouTube Short + LinkedIn",
          "Wednesday: Twitter clip + Facebook Reel",
          "Thursday: Repeat best performer with new caption",
          "Friday: Behind-the-scenes from the recording",
        ],
        icon: "📅",
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Week 3-4: Repeat with the next recording",
        body: "4 recordings per month = 40+ clips = 200+ social posts. That's daily content across every platform.",
        accentWords: ["200+"],
      },
      {
        slideNumber: 6,
        type: "comparison",
        heading: "Old way vs Smart way",
        left: {
          label: "Old way",
          items: [
            { text: "Create unique content for each platform", good: false },
            { text: "20+ hours/week on content", good: false },
            { text: "Burn out in 2 months", good: false },
          ],
        },
        right: {
          label: "Smart way",
          items: [
            { text: "Record once, repurpose everywhere", good: true },
            { text: "4 hours/month recording + 20 min AI clips", good: true },
            { text: "Sustainable forever", good: true },
          ],
        },
      },
      {
        slideNumber: 7,
        type: "cta",
        heading: "Build a content machine, not a content treadmill.",
        body: "kllivo.com — free to start",
      },
    ],
  },

  // ── Carousel 12: Coaches & Speakers ────────────────────────────────
  {
    id: "coaches-speakers",
    name: "Coaches: your webinars are content gold",
    caption:
      "If you've ever done a webinar, workshop, or keynote — you're sitting on months of short-form content.",
    hashtags: [
      "#coachesofinstagram",
      "#speakertips",
      "#webinar",
      "#contentrepurposing",
      "#onlinecoach",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "You ran a 1-hour webinar. That's 10+ Reels you didn't make.",
        accentWords: ["10+ Reels"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "Your webinars are full of clip-worthy moments",
        bullets: [
          "Client success stories you told",
          "Framework breakdowns",
          "Q&A answers (these perform incredibly)",
          "Motivational moments that hit hard",
        ],
        icon: "💡",
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "The problem: you never clip them",
        body: "You ran the webinar, felt great, and moved on. The recording sits in Zoom forever.",
        icon: "📂",
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "Upload the Zoom recording to Kllivo",
        body: "AI finds the most powerful moments — the stories, the insights, the soundbites that sell your coaching.",
        accentWords: ["powerful moments"],
      },
      {
        slideNumber: 5,
        type: "stats",
        heading: "What coaches get from one webinar",
        stats: [
          { value: "8-12", label: "short clips" },
          { value: "3+", label: "weeks of content" },
          { value: "0", label: "editing needed" },
          { value: "100+", label: "languages for global reach" },
        ],
      },
      {
        slideNumber: 6,
        type: "content",
        heading: "Short clips sell coaching better than anything",
        body: "A 30-second clip of you explaining a concept = trust. Trust = clients. Posting daily = top of mind.",
        accentWords: ["trust"],
      },
      {
        slideNumber: 7,
        type: "cta",
        heading: "Your next client is one clip away.",
        body: "kllivo.com — upload your webinar recording free",
      },
    ],
  },

  // ── Carousel 13: Podcast Growth Tactics ────────────────────────────
  {
    id: "podcast-growth-tactics",
    name: "5 ways to grow your podcast with short-form",
    caption:
      "Podcasters who repurpose into short-form grow 3× faster. Here are 5 proven tactics.",
    hashtags: [
      "#podcastgrowth",
      "#podcasttips",
      "#podcasting",
      "#reelsmaker",
      "#contentrepurposing",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "Your podcast won't grow from audio alone.",
        body: "Here's what works in 2026.",
        accentWords: ["won't grow"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "1. Clip the best 30-60 seconds",
        body: "Find the moment that makes people say 'I need to hear the rest.' That's your Reel.",
        icon: "✂️",
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "2. Post vertical video with captions",
        body: "Audiograms are dead. Real video clips with burned-in captions get 3× more engagement.",
        icon: "📱",
        accentWords: ["3×"],
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "3. Post on 3+ platforms daily",
        body: "TikTok, Reels, YouTube Shorts, LinkedIn, Twitter — each platform has unique discovery. Be everywhere.",
        icon: "🌐",
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "4. Use the hook from your guest's best answer",
        body: "Guest quotes are gold. 'Here's what nobody tells you about...' = instant curiosity.",
        icon: "🎙️",
        accentWords: ["Guest quotes"],
      },
      {
        slideNumber: 6,
        type: "content",
        heading: "5. Automate with AI so you actually do it",
        body: "The best strategy fails if it takes too long. Upload to Kllivo → get clips in 5 minutes → post.",
        icon: "🤖",
        accentWords: ["Automate"],
      },
      {
        slideNumber: 7,
        type: "cta",
        heading: "Podcasters who clip consistently grow 3× faster.",
        body: "kllivo.com — start clipping free",
        accentWords: ["3×"],
      },
    ],
  },

  // ── Carousel 14: LinkedIn Video Strategy ───────────────────────────
  {
    id: "linkedin-video",
    name: "LinkedIn video is underrated",
    caption:
      "LinkedIn video gets 5× more engagement than text posts. Here's how to use it without creating new content.",
    hashtags: [
      "#linkedin",
      "#linkedintips",
      "#b2bmarketing",
      "#contentrepurposing",
      "#thoughtleadership",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "LinkedIn video gets 5× more engagement than text.",
        body: "And almost nobody is using it.",
        accentWords: ["5×"],
      },
      {
        slideNumber: 2,
        type: "stats",
        heading: "Why LinkedIn video wins",
        stats: [
          { value: "5×", label: "more engagement" },
          { value: "78%", label: "more feed space (1:1)" },
          { value: "20×", label: "more shares than text" },
          { value: "7-9 AM", label: "best posting time" },
        ],
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "You don't need to create LinkedIn-specific content",
        body: "Take your podcast, webinar, or talk — clip the 30-60 second insights. That's your LinkedIn post.",
        accentWords: ["don't need"],
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "What works on LinkedIn",
        bullets: [
          "Industry insights in 30-60 seconds",
          "Hot takes on trends in your field",
          "Lessons learned from failures",
          "Client results and case study snippets",
        ],
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Use 1:1 square format for LinkedIn",
        body: "Square video takes up 78% more space in the feed than landscape. Kllivo renders in 1:1, 9:16, and 16:9.",
        icon: "⬜",
        accentWords: ["1:1 square"],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "Become the thought leader in your feed.",
        body: "kllivo.com — clip your content for LinkedIn, free",
      },
    ],
  },

  // ── Carousel 15: Why Your Clips Get 0 Views ───────────────────────
  {
    id: "zero-views-fix",
    name: "Why your clips get 0 views (and how to fix it)",
    caption:
      "Your clips aren't bad. They're just cut wrong. Here's what most people get wrong about short-form video.",
    hashtags: [
      "#reelstips",
      "#tiktokgrowth",
      "#contentcreator",
      "#videoediting",
      "#shortformvideo",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "Your Reels get 0 views. It's not the algorithm.",
        body: "It's how you cut them.",
        accentWords: ["0 views"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "Mistake #1: No hook",
        body: "If the first 2 seconds don't grab attention, the algorithm stops showing it. Period.",
        icon: "❌",
        accentWords: ["No hook"],
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "Mistake #2: Clip ends mid-sentence",
        body: "Nothing kills engagement like an abrupt cut. Viewers feel cheated and swipe away.",
        icon: "❌",
        accentWords: ["mid-sentence"],
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "Mistake #3: Too long for the platform",
        body: "TikTok: 15-45s optimal. Reels: 15-30s. Shorts: 30-60s. Know your platform.",
        icon: "❌",
        accentWords: ["Too long"],
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Mistake #4: No captions",
        body: "85% watch on mute. If there's no text, there's no message. Your Reel doesn't exist.",
        icon: "❌",
        accentWords: ["No captions"],
      },
      {
        slideNumber: 6,
        type: "content",
        heading: "Kllivo fixes all 4 automatically",
        bullets: [
          "AI picks clips with the strongest hooks",
          "Every clip ends on a complete thought",
          "Renders at optimal length per platform",
          "6 built-in caption styles",
        ],
        accentWords: ["all 4"],
      },
      {
        slideNumber: 7,
        type: "cta",
        heading: "Fix your clips. Fix your reach.",
        body: "kllivo.com — free to try",
      },
    ],
  },

  // ── Carousel 16: The ROI of Repurposing ────────────────────────────
  {
    id: "roi-repurposing",
    name: "The insane ROI of repurposing content",
    caption:
      "Creating new content every day is a losing game. Repurposing is the cheat code. Here's the ROI math.",
    hashtags: [
      "#roi",
      "#contentrepurposing",
      "#contentmarketing",
      "#socialmediatips",
      "#creatoreconomy",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "Creating new content every day is a trap.",
        accentWords: ["trap"],
      },
      {
        slideNumber: 2,
        type: "comparison",
        heading: "Create new vs Repurpose",
        left: {
          label: "Create new daily",
          items: [
            { text: "20+ hours/week creating", good: false },
            { text: "Burnout in 2-3 months", good: false },
            { text: "Quality drops over time", good: false },
          ],
        },
        right: {
          label: "Repurpose",
          items: [
            { text: "4 hours/month recording", good: true },
            { text: "Sustainable indefinitely", good: true },
            { text: "Quality stays high (it's your best moments)", good: true },
          ],
        },
      },
      {
        slideNumber: 3,
        type: "stats",
        heading: "The ROI math per video",
        stats: [
          { value: "1hr", label: "recording time" },
          { value: "10", label: "clips generated" },
          { value: "50", label: "posts across platforms" },
          { value: "$0", label: "editing cost" },
        ],
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "That means 1 hour of work = 50 pieces of content",
        body: "An editor would charge $50-100 per clip. That's $500-1000 worth of content from one recording.",
        accentWords: ["$500-1000"],
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "The best creators aren't working harder",
        body: "They record once and distribute everywhere. It's not lazy — it's leverage.",
        accentWords: ["leverage"],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "Work smarter. Repurpose with AI.",
        body: "kllivo.com — your first video is free",
      },
    ],
  },

  // ── Carousel 17: Multilingual Content ──────────────────────────────
  {
    id: "multilingual-content",
    name: "Your audience speaks 100+ languages",
    caption:
      "If you only post in English, you're missing 75% of the internet. Here's how to reach a global audience.",
    hashtags: [
      "#multilingual",
      "#globalcreator",
      "#contentcreator",
      "#languagelearning",
      "#internationalcreator",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "75% of the internet doesn't speak English.",
        body: "Are you ignoring them?",
        accentWords: ["75%"],
      },
      {
        slideNumber: 2,
        type: "stats",
        heading: "The global content opportunity",
        stats: [
          { value: "75%", label: "of internet is non-English" },
          { value: "4.7B", label: "social media users globally" },
          { value: "100+", label: "languages Kllivo supports" },
          { value: "0", label: "extra effort to reach them" },
        ],
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "Most clip tools only support 20-30 languages",
        body: "So if you speak Spanish, Hindi, Arabic, Portuguese, or any of 70+ other languages — they can't help you.",
        accentWords: ["20-30"],
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "Kllivo transcribes and clips in 100+ languages",
        body: "Automatic language detection. Same topic-aware AI. Same quality clips. No setup needed.",
        accentWords: ["100+"],
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Who benefits most",
        bullets: [
          "Non-English creators (finally, a tool that works for you)",
          "Bilingual creators (clips in both languages from one video)",
          "Global brands (localized content at scale)",
          "Language teachers (clip lessons automatically)",
        ],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "Your language. Your content. Your clips.",
        body: "kllivo.com — 100+ languages, free to start",
      },
    ],
  },

  // ── Carousel 18: Real Estate Agents ────────────────────────────────
  {
    id: "real-estate-clips",
    name: "Real estate agents: your tours are going to waste",
    caption:
      "You shoot 30-minute property tours. You post one photo. Here's how to get 10+ Reels from every tour.",
    hashtags: [
      "#realestate",
      "#realtor",
      "#realestatetips",
      "#realestatemarketing",
      "#reelsmaker",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "You filmed a 30-min property tour. You posted 1 photo.",
        body: "That's 10 Reels you just threw away.",
        accentWords: ["10 Reels"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "Every tour has clip-worthy moments",
        bullets: [
          "The kitchen reveal (always gets views)",
          "The backyard walkthrough",
          "Your commentary on the neighborhood",
          "The 'and here's the best part...' moment",
        ],
        icon: "🏠",
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "Buyers scroll Reels before they call agents",
        body: "The agent who posts daily gets the call. The agent who posts monthly gets forgotten.",
        accentWords: ["daily"],
      },
      {
        slideNumber: 4,
        type: "stats",
        heading: "What 1 tour becomes",
        stats: [
          { value: "8-12", label: "clips per tour" },
          { value: "2 weeks", label: "of daily content" },
          { value: "5", label: "platforms reached" },
          { value: "< 5m", label: "to generate" },
        ],
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Upload the tour. AI clips the highlights.",
        body: "Kllivo finds the moments that showcase each property best — no editing timeline needed.",
        accentWords: ["AI clips the highlights"],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "Post more listings. Close more deals.",
        body: "kllivo.com — your first tour is free",
      },
    ],
  },

  // ── Carousel 19: Fitness Trainers ──────────────────────────────────
  {
    id: "fitness-clips",
    name: "Fitness creators: you're overcomplicating content",
    caption:
      "Stop spending hours editing workout clips. Upload once, get 10+ clips. Focus on training, not editing.",
    hashtags: [
      "#fitnesscreator",
      "#fitnesstips",
      "#personaltrainer",
      "#gymcontent",
      "#reelsmaker",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "You recorded a 45-min workout. You posted nothing.",
        body: "Because editing takes too long.",
        accentWords: ["nothing"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "Your workout videos are full of content",
        bullets: [
          "Exercise form breakdowns",
          "Motivational moments between sets",
          "Client transformations and reactions",
          "Quick tips you say naturally while training",
        ],
        icon: "💪",
      },
      {
        slideNumber: 3,
        type: "comparison",
        heading: "How trainers post now vs How they should",
        left: {
          label: "Now",
          items: [
            { text: "Film a separate video for each Reel", good: false },
            { text: "Spend 2 hours editing per clip", good: false },
            { text: "Post 2-3 times per week", good: false },
          ],
        },
        right: {
          label: "With AI clipping",
          items: [
            { text: "Upload the full workout recording", good: true },
            { text: "AI extracts 8-12 best moments", good: true },
            { text: "Post daily with zero extra effort", good: true },
          ],
        },
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "The trainer who posts daily gets the clients",
        body: "Consistency > perfection. 10 good clips beat 1 perfect one. Every time.",
        accentWords: ["daily"],
      },
      {
        slideNumber: 5,
        type: "cta",
        heading: "Train harder. Edit less.",
        body: "kllivo.com — clip workouts for free",
      },
    ],
  },

  // ── Carousel 20: Churches & Ministries ─────────────────────────────
  {
    id: "church-clips",
    name: "Churches: your sermons deserve a bigger audience",
    caption:
      "Your pastor speaks for 30-45 minutes every Sunday. That's months of short-form content for your community.",
    hashtags: [
      "#churchsocialmedia",
      "#pastors",
      "#ministry",
      "#sermonclips",
      "#churchgrowth",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "Sunday sermons reach 200 people. Short clips can reach 200,000.",
        accentWords: ["200", "200,000"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "Every sermon has moments that resonate",
        bullets: [
          "The illustration that hits home",
          "The encouragement someone needs to hear",
          "The challenging truth spoken with love",
          "The prayer that brings tears",
        ],
        icon: "⛪",
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "People scroll social media every day",
        body: "Meet them where they are. A 30-second sermon clip in their feed can change their week.",
        accentWords: ["every day"],
      },
      {
        slideNumber: 4,
        type: "stats",
        heading: "What 1 sermon becomes",
        stats: [
          { value: "8-12", label: "clip-worthy moments" },
          { value: "3+", label: "weeks of content" },
          { value: "100+", label: "languages supported" },
          { value: "$0", label: "to start" },
        ],
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Upload the recording. AI does the rest.",
        body: "Kllivo finds the most impactful moments — the stories, the wisdom, the calls to action.",
        accentWords: ["impactful moments"],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "Spread the message beyond Sunday.",
        body: "kllivo.com — free for your first sermon",
      },
    ],
  },

  // ── Carousel 21: Stop Hiring Editors ───────────────────────────────
  {
    id: "stop-hiring-editors",
    name: "You don't need a video editor",
    caption:
      "Hiring a video editor costs $300-2000/month. Or you can get AI clips in 5 minutes for free. Do the math.",
    hashtags: [
      "#videoeditor",
      "#savemoney",
      "#contentcreator",
      "#aitools",
      "#soloprenur",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "You're paying $500/month for a video editor.",
        body: "For clips an AI can make in 5 minutes.",
        accentWords: ["$500/month"],
      },
      {
        slideNumber: 2,
        type: "stats",
        heading: "What editors charge for clips",
        stats: [
          { value: "$30-100", label: "per clip" },
          { value: "$300-2K", label: "per month retainer" },
          { value: "24-48h", label: "turnaround time" },
          { value: "∞", label: "revision rounds" },
        ],
      },
      {
        slideNumber: 3,
        type: "comparison",
        heading: "Editor vs AI clipping",
        left: {
          label: "Freelance editor",
          items: [
            { text: "$500+/month", good: false },
            { text: "24-48 hour turnaround", good: false },
            { text: "Back-and-forth revisions", good: false },
            { text: "Limited by their schedule", good: false },
          ],
        },
        right: {
          label: "Kllivo",
          items: [
            { text: "$0-49/month", good: true },
            { text: "5 minutes, done", good: true },
            { text: "Edit yourself if needed", good: true },
            { text: "Available 24/7", good: true },
          ],
        },
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "When you DO need an editor",
        body: "Heavy motion graphics, multi-camera edits, branded intros — that's editor work. Simple clips from long videos? That's AI work.",
        accentWords: ["Simple clips"],
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Save $6,000+ per year",
        body: "Use the savings for ads, equipment, or actual content creation. Let AI handle the repetitive clipping.",
        accentWords: ["$6,000+"],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "Keep your editor for the big stuff. Let AI clip the rest.",
        body: "kllivo.com — free plan, no credit card",
      },
    ],
  },

  // ── Carousel 22: TikTok Growth Playbook ────────────────────────────
  {
    id: "tiktok-growth",
    name: "TikTok growth playbook for non-TikTokers",
    caption:
      "You don't need to dance. You don't need trends. Here's how to grow on TikTok with your existing content.",
    hashtags: [
      "#tiktokgrowth",
      "#tiktokstrategy",
      "#contentcreator",
      "#tiktokforbusiness",
      "#shortformvideo",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "You don't need to dance on TikTok.",
        body: "You need to clip your best content.",
        accentWords: ["don't need to dance"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "TikTok rewards value, not production",
        body: "Raw, authentic clips from podcasts and webinars outperform overproduced content. The algorithm wants watch time, not polish.",
        accentWords: ["value"],
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "The TikTok rules for clips",
        bullets: [
          "15-45 seconds is the sweet spot",
          "Hook in the first 1-2 seconds (or get swiped)",
          "Vertical 9:16 is mandatory",
          "Captions = 2× more watch time",
          "Post 1-3 times per day for max growth",
        ],
      },
      {
        slideNumber: 4,
        type: "stats",
        heading: "What TikTok rewards",
        stats: [
          { value: "1-2s", label: "to hook the viewer" },
          { value: "15-45s", label: "optimal length" },
          { value: "1-3×", label: "posts per day" },
          { value: "9:16", label: "only format" },
        ],
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Repurpose what you already have",
        body: "That podcast episode? 8-12 TikToks. That webinar? 10+ clips. Your YouTube video? Unlimited Shorts that drive traffic back.",
        accentWords: ["already have"],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "Skip the trends. Clip your best content.",
        body: "kllivo.com — free TikTok clips from any video",
      },
    ],
  },

  // ── Carousel 23: Content Burnout ───────────────────────────────────
  {
    id: "content-burnout",
    name: "Content burnout is real. Here's the fix.",
    caption:
      "If you're exhausted from creating content, you're doing it wrong. There's a better way.",
    hashtags: [
      "#burnout",
      "#contentcreator",
      "#creatorburnout",
      "#contentrepurposing",
      "#sustainability",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "You're burnt out on content creation.",
        body: "It's not because you're lazy. It's because you're doing it wrong.",
        accentWords: ["burnt out"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "The burnout cycle",
        bullets: [
          "Create unique content for 5 platforms daily",
          "Spend 3-4 hours editing per piece",
          "Run out of ideas by Wednesday",
          "Skip posting → feel guilty → repeat",
        ],
        icon: "🔄",
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "The lie: 'I need to create more content'",
        body: "You don't. You need to extract more value from content you've already made.",
        accentWords: ["already made"],
      },
      {
        slideNumber: 4,
        type: "comparison",
        heading: "Burnout path vs Sustainable path",
        left: {
          label: "Burnout",
          items: [
            { text: "New content every day", good: false },
            { text: "4+ hours editing daily", good: false },
            { text: "Quit after 3 months", good: false },
          ],
        },
        right: {
          label: "Sustainable",
          items: [
            { text: "Record once per week", good: true },
            { text: "AI clips in 5 minutes", good: true },
            { text: "Daily posts for months", good: true },
          ],
        },
      },
      {
        slideNumber: 5,
        type: "stats",
        heading: "The sustainable creator math",
        stats: [
          { value: "1", label: "recording per week" },
          { value: "10", label: "clips per recording" },
          { value: "40", label: "posts per month" },
          { value: "5 min", label: "AI processing time" },
        ],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "Create less. Post more. Burn out never.",
        body: "kllivo.com — free to start",
      },
    ],
  },

  // ── Carousel 24: Aspect Ratio Guide ────────────────────────────────
  {
    id: "aspect-ratio-guide",
    name: "The aspect ratio cheat sheet",
    caption:
      "9:16? 1:1? 16:9? Here's exactly which format to use for each platform. Save this.",
    hashtags: [
      "#aspectratio",
      "#videoediting",
      "#socialmediatips",
      "#contentcreator",
      "#reelstips",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "Wrong aspect ratio = wasted reach.",
        body: "Here's the cheat sheet for every platform.",
        accentWords: ["Wrong aspect ratio"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "9:16 Vertical (1080×1920)",
        bullets: [
          "TikTok — mandatory",
          "Instagram Reels — mandatory",
          "YouTube Shorts — mandatory",
          "Facebook Reels — mandatory",
        ],
        icon: "📱",
        accentWords: ["9:16"],
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "1:1 Square (1080×1080)",
        bullets: [
          "LinkedIn — 78% more feed space than 16:9",
          "Twitter/X — stands out in timeline",
          "Instagram Feed — still the classic format",
          "Facebook Feed — great for ads too",
        ],
        icon: "⬜",
        accentWords: ["1:1"],
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "16:9 Landscape (1920×1080)",
        bullets: [
          "YouTube (regular videos)",
          "Twitter/X video tweets",
          "Website embeds",
          "Presentations and webinars",
        ],
        icon: "🖥️",
        accentWords: ["16:9"],
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Kllivo renders all 3 formats from one upload",
        body: "Upload once. Export as 9:16, 1:1, or 16:9. Fill mode (crop) or fit mode (blur background).",
        accentWords: ["all 3 formats"],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "One video. Every format. Every platform.",
        body: "kllivo.com — free to start",
      },
    ],
  },

  // ── Carousel 25: Teachers & Educators ──────────────────────────────
  {
    id: "teacher-clips",
    name: "Teachers: turn lectures into learning clips",
    caption:
      "Your 1-hour lecture has 10+ moments that would make perfect study aids. Here's how to clip them automatically.",
    hashtags: [
      "#edtech",
      "#teachertok",
      "#educationcontent",
      "#onlineteaching",
      "#studytips",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "Your students rewatch 30-second clips. Not 1-hour lectures.",
        accentWords: ["30-second clips"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "Short clips are better for learning",
        bullets: [
          "Bite-sized = easier to review before exams",
          "Shareable among study groups",
          "Searchable by topic, not timestamp",
          "Students actually watch them (vs skipping the lecture)",
        ],
        icon: "📚",
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "Upload your lecture recording",
        body: "Zoom, Teams, or any recording. Kllivo AI finds the key concepts, explanations, and examples.",
        accentWords: ["key concepts"],
      },
      {
        slideNumber: 4,
        type: "stats",
        heading: "What 1 lecture becomes",
        stats: [
          { value: "8-12", label: "concept clips" },
          { value: "100+", label: "languages supported" },
          { value: "< 5m", label: "processing time" },
          { value: "9:16", label: "mobile-ready" },
        ],
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Share on TikTok, YouTube, or your LMS",
        body: "EduTok is massive. Teachers who post short explainers build audiences of millions. Your lecture is the raw material.",
        accentWords: ["EduTok"],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "Make learning bite-sized.",
        body: "kllivo.com — your first lecture is free",
      },
    ],
  },

  // ── Carousel 26: The Hook Formula ──────────────────────────────────
  {
    id: "hook-formula",
    name: "The hook formula top creators use",
    caption:
      "The first 2 seconds determine if your Reel gets 100 views or 100,000. Here's the formula.",
    hashtags: [
      "#hookformula",
      "#reelstips",
      "#tiktokgrowth",
      "#contentcreator",
      "#shortformvideo",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "100 views or 100,000. The difference is the first 2 seconds.",
        accentWords: ["2 seconds"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "Hook type 1: The bold claim",
        body: '"Most people get this wrong..." / "Nobody talks about this..." / "This changed everything for me..."',
        icon: "🔥",
        accentWords: ["bold claim"],
      },
      {
        slideNumber: 3,
        type: "content",
        heading: "Hook type 2: The curiosity gap",
        body: '"Here\'s what happens when you..." / "I tried this for 30 days..." / "The thing about [topic] that nobody tells you..."',
        icon: "🧲",
        accentWords: ["curiosity gap"],
      },
      {
        slideNumber: 4,
        type: "content",
        heading: "Hook type 3: The mid-sentence start",
        body: "Don't start at the beginning. Start at the most interesting sentence. Then let context fill in naturally.",
        icon: "⚡",
        accentWords: ["mid-sentence start"],
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Kllivo AI scores hook strength for every clip",
        body: "It analyzes the opening of each clip and scores how strong the hook is. So you always know which clips will grab attention.",
        accentWords: ["scores hook strength"],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "Stop guessing which clips will work.",
        body: "kllivo.com — AI-scored hooks, free to try",
      },
    ],
  },

  // ── Carousel 27: Agencies ──────────────────────────────────────────
  {
    id: "agency-clips",
    name: "Agencies: 10× your output without hiring",
    caption:
      "Your clients want more content. You don't have more hours. Here's how to 10× output without 10× the team.",
    hashtags: [
      "#agencylife",
      "#marketingagency",
      "#contentagency",
      "#clientwork",
      "#socialmediaagency",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "Your client wants 30 clips per month. You have 1 editor.",
        accentWords: ["30 clips", "1 editor"],
      },
      {
        slideNumber: 2,
        type: "content",
        heading: "The agency content bottleneck",
        bullets: [
          "Client sends a 1-hour video",
          "Editor takes 2 days to clip it",
          "Client wants revisions",
          "Repeat × 10 clients = impossible",
        ],
        icon: "😫",
      },
      {
        slideNumber: 3,
        type: "stats",
        heading: "With AI clipping",
        stats: [
          { value: "5 min", label: "per client video" },
          { value: "10+", label: "clips per video" },
          { value: "10", label: "clients served daily" },
          { value: "$0", label: "extra editing costs" },
        ],
      },
      {
        slideNumber: 4,
        type: "comparison",
        heading: "Scale with people vs Scale with AI",
        left: {
          label: "Hire editors",
          items: [
            { text: "$3,000-5,000/month per editor", good: false },
            { text: "Training and management overhead", good: false },
            { text: "Still limited by hours in a day", good: false },
          ],
        },
        right: {
          label: "Use Kllivo",
          items: [
            { text: "$49/month for 25 videos", good: true },
            { text: "No training needed", good: true },
            { text: "100 videos processed = same speed", good: true },
          ],
        },
      },
      {
        slideNumber: 5,
        type: "content",
        heading: "Charge clients $200-500/month for clip packages",
        body: "Your cost: $49/month for Pro plan. Your margin: 90%+. Scale without headcount.",
        accentWords: ["90%+"],
      },
      {
        slideNumber: 6,
        type: "cta",
        heading: "Deliver more. Hire less. Profit more.",
        body: "kllivo.com — agency-ready AI clipping",
      },
    ],
  },

  // ── Carousel 28: Before & After ────────────────────────────────────
  {
    id: "before-after",
    name: "The before and after of AI clipping",
    caption:
      "This is what content creation looks like before and after AI clipping. Which column are you in?",
    hashtags: [
      "#beforeandafter",
      "#contentcreator",
      "#aitools",
      "#contentrepurposing",
      "#productivity",
    ],
    slides: [
      {
        slideNumber: 1,
        type: "hook",
        heading: "Before AI clipping vs After.",
        body: "The difference is embarrassing.",
        accentWords: ["Before", "After"],
      },
      {
        slideNumber: 2,
        type: "comparison",
        heading: "Time spent",
        left: {
          label: "Before",
          items: [
            { text: "4 hours scrubbing through footage", good: false },
            { text: "1 hour editing each clip", good: false },
            { text: "30 min exporting for each platform", good: false },
          ],
        },
        right: {
          label: "After",
          items: [
            { text: "Upload video: 1 minute", good: true },
            { text: "AI finds best moments: 3 minutes", good: true },
            { text: "Download all clips: 1 minute", good: true },
          ],
        },
      },
      {
        slideNumber: 3,
        type: "comparison",
        heading: "Output",
        left: {
          label: "Before",
          items: [
            { text: "2-3 clips per week", good: false },
            { text: "1 platform only", good: false },
          ],
        },
        right: {
          label: "After",
          items: [
            { text: "10+ clips per video", good: true },
            { text: "Every platform, every format", good: true },
          ],
        },
      },
      {
        slideNumber: 4,
        type: "stats",
        heading: "The real numbers",
        stats: [
          { value: "5h→5m", label: "time per video" },
          { value: "3→10+", label: "clips per video" },
          { value: "1→5", label: "platforms reached" },
          { value: "$500→$0", label: "editing cost" },
        ],
      },
      {
        slideNumber: 5,
        type: "cta",
        heading: "Join the 'After' column.",
        body: "kllivo.com — free to start, no credit card",
      },
    ],
  },
];
