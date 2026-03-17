import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/auth/SessionProvider";
import Navbar from "@/components/layout/Navbar";
import { ToastProvider } from "@/components/ui/Toast";
import { getBaseUrl } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = getBaseUrl();
const defaultTitle = "Kllivo — Short clips from your videos";
const defaultDescription =
  "Turn long-form video into Reels, TikTok & YouTube Shorts. Upload once, get AI-generated 9:16 clips ready to post.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7e22ce",
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: defaultTitle,
    template: "%s | Kllivo",
  },
  description: defaultDescription,
  keywords: [
    "video clips",
    "short form video",
    "Reels",
    "TikTok",
    "YouTube Shorts",
    "AI video editing",
    "video to clips",
  ],
  authors: [{ name: "Kllivo" }],
  creator: "Kllivo",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Kllivo",
    title: defaultTitle,
    description: defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION && {
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
    },
  }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100`}
      >
        <SessionProvider>
          <ToastProvider>
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
              {children}
            </main>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
