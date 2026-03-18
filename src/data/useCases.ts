/**
 * Use-case data for programmatic SEO pages.
 * Single source of truth — each entry generates a /use/[slug] page.
 */

export interface UseCaseFAQ {
  q: string;
  a: string;
}

export interface UseCase {
  slug: string;
  /** SVG path(s) for the icon — rendered inside a 24x24 viewBox with stroke="currentColor" */
  iconPath: string;
  title: string;
  subtitle: string;

  // SEO
  metaTitle: string;
  metaDescription: string;
  keywords: string[];

  // Content
  heroHeadline: string;
  heroSubline: string;
  painPoints: Array<{ title: string; description: string }>;
  howKllivoHelps: Array<{ title: string; description: string }>;
  faqs: UseCaseFAQ[];
}

export const USE_CASES: UseCase[] = [
  {
    slug: "podcasters",
    iconPath: "M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z",
    title: "Podcasters",
    subtitle: "Turn episodes into viral short-form clips",
    metaTitle: "AI Clip Maker for Podcasters — Turn Episodes into Reels & Shorts",
    metaDescription: "Automatically turn your podcast episodes into 10+ short-form clips for TikTok, Instagram Reels, and YouTube Shorts. No editing skills needed.",
    keywords: ["podcast clip maker", "podcast to reels", "podcast short form content", "repurpose podcast episodes"],
    heroHeadline: "Turn every podcast episode into 10 shareable clips",
    heroSubline: "You record. We clip. Upload your episode once and get AI-generated 9:16 clips ready for Reels, TikTok, and Shorts — without touching an editor.",
    painPoints: [
      { title: "No time to edit clips", description: "You spend hours recording and editing your podcast. Creating short-form clips from each episode is another full-time job you don't have bandwidth for." },
      { title: "Missing out on short-form growth", description: "Your audience lives on TikTok, Reels, and Shorts. Every episode without clips is a missed opportunity to grow your podcast." },
      { title: "Hiring editors is expensive", description: "A freelance video editor costs $200-500 per episode for clips. That's $800-2000/month — more than most podcasters earn from their show." },
    ],
    howKllivoHelps: [
      { title: "Upload once, get clips in minutes", description: "Upload your full episode. Kllivo's AI transcribes it, finds the best moments, and generates vertical clips — automatically." },
      { title: "AI that understands topic flow", description: "Our semantic segmentation detects where topics change, so every clip covers one complete thought — not a random mid-sentence cut." },
      { title: "Edit and customize if you want", description: "Adjust trim points, add captions, change aspect ratios. Or just download the AI-generated clips as-is." },
    ],
    faqs: [
      { q: "How long can my podcast episode be?", a: "Up to 60 minutes on Starter ($19/mo) and up to 3 hours on Pro ($49/mo). The free plan supports episodes up to 20 minutes." },
      { q: "Does Kllivo add captions to podcast clips?", a: "Captions are available in the clip editor. You can choose from 6 styles including karaoke-style word-by-word highlighting, or keep captions off." },
      { q: "Can I upload audio-only podcast files?", a: "Currently Kllivo works with video files (MP4, MOV, AVI, MKV). If you record video alongside your podcast (Riverside, Zencastr, etc.), upload that directly." },
      { q: "How many clips does Kllivo generate per episode?", a: "Typically 5-10 clips per episode, depending on length and content density. Each clip is scored by our AI so you can pick the best ones." },
      { q: "Is there a watermark on the free plan?", a: "Yes, free plan clips include a small Kllivo watermark. Starter and Pro plans remove it completely." },
    ],
  },
  {
    slug: "youtubers",
    iconPath: "m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z",
    title: "YouTubers & Vloggers",
    subtitle: "Extract the best moments from long-form videos",
    metaTitle: "Turn YouTube Videos into Shorts Automatically — AI Clip Maker",
    metaDescription: "Extract the best moments from your YouTube videos and turn them into Shorts, Reels, and TikToks. AI-powered, no editing required.",
    keywords: ["youtube to shorts", "turn youtube video into shorts", "youtube clip maker", "extract clips from youtube"],
    heroHeadline: "Turn long YouTube videos into viral Shorts",
    heroSubline: "Extract the best moments from tutorials, vlogs, and reviews. Drive traffic back to your full videos with AI-generated clips.",
    painPoints: [
      { title: "YouTube rewards Shorts — but making them is tedious", description: "YouTube's algorithm pushes Shorts heavily. But manually scrubbing through a 20-minute video to find 60-second moments takes forever." },
      { title: "Your best content is buried in long videos", description: "That killer 45-second explanation at minute 14? Nobody finds it unless you clip it out and post it separately." },
      { title: "Repurposing to other platforms is manual work", description: "TikTok wants 9:16. Instagram wants Reels. Twitter wants short clips. Reformatting one video for every platform is exhausting." },
    ],
    howKllivoHelps: [
      { title: "Import directly from YouTube", description: "Paste a YouTube URL and Kllivo downloads, transcribes, and generates clips automatically. No need to re-upload your own files." },
      { title: "AI finds your best moments", description: "Hook strength, topic coherence, and speech pacing are all scored. You get the clips most likely to perform — not random cuts." },
      { title: "Export for every platform", description: "Render in 9:16 (Shorts, Reels, TikTok), 1:1 (Instagram feed), or 16:9 (Twitter, LinkedIn) with one click." },
    ],
    faqs: [
      { q: "Can I import videos directly from YouTube?", a: "Yes! Paste any YouTube URL and Kllivo will download and process it automatically. Works with regular videos, Shorts, and live recordings." },
      { q: "What aspect ratios does Kllivo support?", a: "9:16 (vertical for Shorts/Reels/TikTok), 1:1 (square for Instagram feed), and 16:9 (landscape for Twitter/LinkedIn)." },
      { q: "Will clips link back to my full YouTube video?", a: "Kllivo generates standalone video files. You can add your YouTube link in the caption when posting to drive traffic back." },
      { q: "How long can my YouTube video be?", a: "Up to 60 minutes on Starter and 3 hours on Pro. YouTube imports follow the same duration limits as direct uploads." },
    ],
  },
  {
    slug: "coaches",
    iconPath: "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z",
    title: "Speakers & Coaches",
    subtitle: "Repurpose keynotes and webinars into bite-sized content",
    metaTitle: "Repurpose Webinars & Keynotes into Clips — AI Video Clipper",
    metaDescription: "Turn your keynotes, workshops, and coaching calls into short-form clips that showcase your expertise. Grow your audience on social media automatically.",
    keywords: ["repurpose webinar content", "keynote to clips", "coaching content repurposing", "speaker social media clips"],
    heroHeadline: "Turn every keynote into weeks of social content",
    heroSubline: "You already have hours of valuable content from talks, webinars, and coaching calls. Turn them into clips that build your authority on social media.",
    painPoints: [
      { title: "Your best insights are locked in long recordings", description: "That 90-second insight on leadership from your keynote could go viral — but it's buried at minute 37 of a 60-minute recording." },
      { title: "Creating content from scratch is exhausting", description: "You're already creating content when you speak. But turning those recordings into social posts requires editing skills you don't have time to learn." },
      { title: "Your audience needs to see you, not just read you", description: "Text posts don't showcase your speaking style, energy, and charisma. Video clips do — and they build trust 10x faster." },
    ],
    howKllivoHelps: [
      { title: "Upload your recording, get clips", description: "Upload a keynote, webinar, or coaching call. Kllivo finds the most impactful moments — the advice, stories, and insights your audience needs to hear." },
      { title: "Professional-looking clips, instantly", description: "Vertical format, clean cropping, optional captions. Your clips look like they were made by a professional editor." },
      { title: "Weeks of content from one recording", description: "One 60-minute keynote typically generates 8-10 clips. Post one per day and you have nearly two weeks of content from a single recording." },
    ],
    faqs: [
      { q: "Can I upload Zoom recordings?", a: "Yes. If you have the MP4 recording from Zoom, Teams, or Google Meet, upload it directly to Kllivo." },
      { q: "Does it work with webinar recordings?", a: "Absolutely. Kllivo works with any video file — webinars, keynotes, workshops, coaching calls, interviews." },
      { q: "Can I add my branding to clips?", a: "Pro plan users can upload a custom watermark with configurable position and opacity." },
      { q: "What if the recording has multiple speakers?", a: "Kllivo detects individual speakers and labels clips accordingly, so you know who's talking in each clip." },
    ],
  },
  {
    slug: "real-estate",
    iconPath: "M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819",
    title: "Real Estate Agents",
    subtitle: "Turn property tours into social media clips",
    metaTitle: "AI Video Clips for Real Estate — Turn Property Tours into Social Content",
    metaDescription: "Automatically create short-form video clips from property walkthroughs and market updates. Grow your real estate brand on social media.",
    keywords: ["real estate video clips", "property tour clips", "real estate social media content", "real estate reels maker"],
    heroHeadline: "Turn property tours into scroll-stopping social clips",
    heroSubline: "Upload your walkthrough videos and get short, shareable clips that showcase each property's best features across every social platform.",
    painPoints: [
      { title: "You shoot walkthroughs but never post clips", description: "You record property tours for listings but creating short clips for Instagram and TikTok requires editing time you'd rather spend on sales calls." },
      { title: "Buyers scroll social media — not MLS", description: "73% of homebuyers under 40 find properties on social media. If you're not posting short-form video, you're invisible to them." },
      { title: "Consistent posting is impossible to maintain", description: "You know you should post daily. But between showings, paperwork, and clients, creating fresh video content falls to the bottom of the list." },
    ],
    howKllivoHelps: [
      { title: "One walkthrough = multiple clips", description: "Upload a 10-minute property tour. Kllivo finds the best room reveals, feature highlights, and commentary — and turns them into 15-60 second clips." },
      { title: "Ready for Instagram, TikTok, and Shorts", description: "Clips are rendered in 9:16 vertical format, ready to post. No editing, no reformatting, no exporting." },
      { title: "Build your personal brand effortlessly", description: "Post your market commentary, tips for buyers, and property highlights consistently without spending hours in an editor." },
    ],
    faqs: [
      { q: "Can I use property walkthrough videos?", a: "Yes. Upload any MP4 video — property tours, market updates, client testimonials, neighborhood guides." },
      { q: "What video length works best for property tours?", a: "5-30 minute walkthroughs work great. Kllivo extracts the best 15-60 second moments automatically." },
      { q: "Can I remove the watermark for client-facing clips?", a: "Yes. Starter ($19/mo) and Pro ($49/mo) plans include watermark-free exports." },
    ],
  },
  {
    slug: "fitness-trainers",
    iconPath: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z",
    title: "Fitness Trainers",
    subtitle: "Clip workouts and tips for social media",
    metaTitle: "AI Video Clipper for Fitness Trainers — Turn Workouts into Reels",
    metaDescription: "Turn your workout recordings, training tips, and fitness content into short-form clips for Instagram Reels, TikTok, and YouTube Shorts.",
    keywords: ["fitness content creator clips", "workout video clips", "personal trainer reels", "fitness tiktok maker"],
    heroHeadline: "Turn workout recordings into viral fitness clips",
    heroSubline: "Upload your training sessions, tips, and tutorials. Get short clips that show off your expertise and attract new clients on social media.",
    painPoints: [
      { title: "You film workouts but never post them", description: "You record full training sessions and tutorials but editing them into short clips for social media takes too much time between clients." },
      { title: "Social media grows your client base — if you post consistently", description: "Trainers who post daily Reels get 5x more DMs from potential clients. But creating daily content is unsustainable manually." },
      { title: "Generic stock content doesn't convert", description: "Your potential clients want to see YOUR style, YOUR energy, YOUR coaching. Generic fitness content doesn't build the trust that gets people to DM you." },
    ],
    howKllivoHelps: [
      { title: "Record once, post for weeks", description: "One 30-minute workout recording becomes 5-8 clips — each showing a different exercise, tip, or motivational moment." },
      { title: "AI picks the high-energy moments", description: "Our audio energy analysis identifies the most intense, engaging segments — the moments that stop the scroll." },
      { title: "Vertical clips ready for every platform", description: "9:16 format, auto-cropped, with optional captions. Post directly to Reels, TikTok, or Shorts." },
    ],
    faqs: [
      { q: "Can I use gym recordings with background music?", a: "Yes. Kllivo's AI focuses on speech detection, so background music doesn't interfere with clip generation." },
      { q: "What if I mainly do live training with clients?", a: "Record your sessions (with client permission) and upload them. Kllivo finds the best instructional and motivational moments." },
      { q: "Do clips include captions for exercises?", a: "You can add captions in the clip editor with multiple styles. Great for showing exercise names and cues." },
    ],
  },
  {
    slug: "churches",
    iconPath: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z",
    title: "Churches & Ministries",
    subtitle: "Share sermons and messages beyond Sunday",
    metaTitle: "Turn Sermons into Short Clips — AI Video Clipper for Churches",
    metaDescription: "Automatically clip the most powerful moments from your sermons and share them on social media. Reach your community beyond Sunday morning.",
    keywords: ["sermon clip maker", "church social media clips", "sermon to reels", "church video clips"],
    heroHeadline: "Share your message beyond Sunday morning",
    heroSubline: "Upload your sermon recording and get short, shareable clips of the most impactful moments — ready for Instagram, TikTok, and YouTube Shorts.",
    painPoints: [
      { title: "Your sermon reaches 100 people on Sunday — but could reach 10,000 online", description: "Short-form video is how people discover new churches and pastors. Your sermons have viral-worthy moments that never leave the building." },
      { title: "No one on staff has time to edit clips", description: "Your volunteer team barely has time to livestream. Asking them to also create clips from every sermon isn't realistic." },
      { title: "Full sermon uploads get low engagement", description: "Posting a 45-minute sermon to YouTube gets 50 views. A 60-second powerful moment on Reels gets 5,000. Short-form wins." },
    ],
    howKllivoHelps: [
      { title: "Upload the sermon, get clips automatically", description: "Upload your sermon recording after service. Kllivo finds the most quotable, emotional, and impactful moments and turns them into clips." },
      { title: "Post throughout the week", description: "One sermon typically generates 6-10 clips. Post one per day and keep your community engaged all week — not just Sunday." },
      { title: "Simple enough for any volunteer", description: "No video editing skills needed. Upload, wait, download. Your media team volunteer can do it in 5 minutes." },
    ],
    faqs: [
      { q: "Can we upload our livestream recordings?", a: "Yes. If you save your livestream as MP4 (from YouTube, Facebook, or your streaming platform), upload it directly." },
      { q: "How long can sermon recordings be?", a: "Pro plan supports up to 3 hours — long enough for even extended services." },
      { q: "Can multiple staff members use one account?", a: "Currently Kllivo uses individual accounts. We recommend a shared church account for the media team." },
      { q: "Is there a discount for churches?", a: "Contact us for nonprofit pricing options." },
    ],
  },
  {
    slug: "teachers",
    iconPath: "M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5",
    title: "Teachers & Educators",
    subtitle: "Turn lectures into bite-sized learning clips",
    metaTitle: "Turn Lectures into Short Video Clips — AI Tool for Educators",
    metaDescription: "Automatically break down lecture recordings into short, focused clips. Perfect for flipped classrooms, review materials, and student engagement.",
    keywords: ["lecture clip maker", "educational video clips", "teacher video tool", "lecture to short clips"],
    heroHeadline: "Turn lectures into clips students actually watch",
    heroSubline: "Students don't rewatch 90-minute lectures. But they will watch a 60-second clip explaining the key concept before an exam. Let AI create those clips for you.",
    painPoints: [
      { title: "Students don't rewatch full lectures", description: "You record every lecture. Students never revisit the full recording. The key concepts are lost in 90 minutes of content." },
      { title: "Creating study materials takes hours", description: "Breaking down a lecture into review clips manually means scrubbing through footage, setting trim points, and exporting — time you don't have." },
      { title: "Engagement drops in long-form content", description: "Studies show students lose focus after 6-10 minutes. Short, focused clips match how students actually learn in 2026." },
    ],
    howKllivoHelps: [
      { title: "Upload a lecture, get topic-by-topic clips", description: "Kllivo's semantic segmentation detects when you switch topics and creates a clip for each concept — automatically." },
      { title: "Perfect for flipped classrooms", description: "Generate short concept clips and share them with students before class. They come prepared, you spend class time on discussion." },
      { title: "Share on platforms students already use", description: "Post clips on YouTube, share in LMS, or send via class group chats. Meet students where they are." },
    ],
    faqs: [
      { q: "Does it work with screen-share recordings?", a: "Yes. Kllivo processes any video file including screen recordings with voiceover from Zoom, OBS, or Loom." },
      { q: "Can I upload recordings longer than an hour?", a: "Starter supports up to 60 minutes, Pro supports up to 3 hours — enough for any lecture recording." },
      { q: "Is there an education discount?", a: "Contact us for education pricing. We support educators making learning more accessible." },
    ],
  },
  {
    slug: "ecommerce",
    iconPath: "M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z",
    title: "E-commerce & DTC Brands",
    subtitle: "Turn product demos into social selling clips",
    metaTitle: "AI Video Clips for E-commerce — Product Demos to Social Content",
    metaDescription: "Turn product demos, unboxings, and reviews into short-form clips for social selling on Instagram, TikTok, and YouTube Shorts.",
    keywords: ["ecommerce video clips", "product demo clips", "social selling video", "product video to reels"],
    heroHeadline: "Turn product demos into social selling machines",
    heroSubline: "Upload product walkthroughs, unboxings, and reviews. Get short clips that showcase features and drive purchase decisions on social media.",
    painPoints: [
      { title: "Product videos don't perform on social", description: "Full product demos are great for your website. But nobody watches a 5-minute demo in their Instagram feed. Short clips convert." },
      { title: "Creating content for every product is expensive", description: "Professional video production for each SKU isn't scalable. You need a way to multiply every video you shoot." },
      { title: "UGC and reviews are gold — but unedited", description: "Customer reviews and influencer unboxings are your best content. But they're too long and unedited for social media." },
    ],
    howKllivoHelps: [
      { title: "One demo = multiple product clips", description: "Upload a product walkthrough. Kllivo creates clips for each feature, benefit, and use case — perfect for carousel-style posting." },
      { title: "Repurpose customer reviews", description: "Upload UGC and review videos. AI extracts the most enthusiastic and specific testimonial moments." },
      { title: "Consistent content without a production team", description: "Shoot one video per product. Get 5-8 clips. Schedule them across the week. Repeat with the next product." },
    ],
    faqs: [
      { q: "Can I use influencer/UGC content?", a: "Yes, as long as you have the rights to use the video. Upload any MP4 file and Kllivo will find the best moments." },
      { q: "Does it work for product tutorials?", a: "Absolutely. How-to and tutorial videos are great source material — each step becomes its own clip." },
      { q: "Can I add my brand watermark?", a: "Pro plan lets you upload a custom watermark with configurable position and opacity for brand consistency." },
    ],
  },
  {
    slug: "agencies",
    iconPath: "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
    title: "Marketing Agencies",
    subtitle: "Scale client content production without adding headcount",
    metaTitle: "AI Video Clipper for Marketing Agencies — Scale Content Production",
    metaDescription: "Help your agency clients get more social media content from every video. Turn client recordings into short-form clips at scale.",
    keywords: ["agency video tool", "social media agency clips", "content agency video repurposing", "scale video content production"],
    heroHeadline: "Deliver 10x more content for every client video",
    heroSubline: "Your clients give you one video. You give them 10 clips ready for every platform. Scale content production without hiring more editors.",
    painPoints: [
      { title: "Clients expect more content than you can produce", description: "Every client wants daily social content. Manually creating clips from their raw video doesn't scale past a few accounts." },
      { title: "Video editing is your biggest bottleneck", description: "Your social media managers can write captions and schedule posts. But trimming, cropping, and exporting video clips takes specialized skills." },
      { title: "Margins shrink when you hire more editors", description: "Each new client means more editing hours. Adding headcount eats into your margins. You need leverage, not more people." },
    ],
    howKllivoHelps: [
      { title: "Turn one client video into a week of content", description: "Upload the raw video from your client's webinar, podcast, or event. Get 8-10 clips per video, ready to schedule." },
      { title: "Multiple export formats for every platform", description: "9:16 for Reels/TikTok/Shorts, 1:1 for Instagram feed, 16:9 for LinkedIn and Twitter — from one upload." },
      { title: "White-label ready with custom branding", description: "Pro plan supports custom watermarks so clips match each client's brand guidelines." },
    ],
    faqs: [
      { q: "Can I manage multiple clients?", a: "Currently each account has one workspace. For agencies managing multiple clients, we recommend separate accounts per client for clean organization." },
      { q: "Is there bulk pricing for agencies?", a: "The Pro plan at $49/mo supports 25 videos per month with 3-hour duration limits — enough for most agency workflows. Contact us for custom plans." },
      { q: "Can my team access clips?", a: "Share download links with your team or clients. Clips can be downloaded directly from the platform." },
    ],
  },
  {
    slug: "event-organizers",
    iconPath: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5",
    title: "Event Organizers",
    subtitle: "Turn conferences and events into social highlights",
    metaTitle: "Turn Event Recordings into Social Media Clips — AI Video Clipper",
    metaDescription: "Automatically create highlight clips from conference talks, panels, and event recordings. Extend your event's reach on social media.",
    keywords: ["event video clips", "conference highlight clips", "event social media content", "conference to reels"],
    heroHeadline: "Your event doesn't end when the lights go down",
    heroSubline: "Upload session recordings from your conference, summit, or meetup. Get shareable clips that extend your event's reach for weeks after it ends.",
    painPoints: [
      { title: "Event recordings collect dust", description: "You invested thousands in speakers and production. The recordings sit on a hard drive. Only attendees saw the content." },
      { title: "Highlight reels take weeks to produce", description: "Editing a 2-day conference into a highlight reel means hiring an editor, reviewing hours of footage, and weeks of turnaround." },
      { title: "You need content to promote the next event", description: "The best marketing for your next event is clips from the last one. But creating those clips from raw session recordings is a huge project." },
    ],
    howKllivoHelps: [
      { title: "Upload each session, get clips same day", description: "Upload speaker recordings as they happen. Get clips within minutes — post highlights while the event is still trending." },
      { title: "Every speaker becomes a content piece", description: "10 speakers × 8 clips each = 80 pieces of content from one event. Drip them out over months to build anticipation for the next one." },
      { title: "Speakers share their own clips", description: "Give speakers their clips. They share on their own channels, exposing your event brand to their audience." },
    ],
    faqs: [
      { q: "Can I process multiple session recordings at once?", a: "Yes. Upload each session as a separate video. Pro plan allows 25 videos per month — enough for most conference lineups." },
      { q: "How fast are clips generated?", a: "Typically 5-15 minutes depending on video length. Short enough to generate clips between sessions at a live event." },
      { q: "Can speakers use the clips on their own channels?", a: "Absolutely. Download clips and share them with speakers. It's great cross-promotion for both parties." },
    ],
  },
];

export function getUseCaseBySlug(slug: string): UseCase | undefined {
  return USE_CASES.find((uc) => uc.slug === slug);
}

export function getAllUseCaseSlugs(): string[] {
  return USE_CASES.map((uc) => uc.slug);
}
