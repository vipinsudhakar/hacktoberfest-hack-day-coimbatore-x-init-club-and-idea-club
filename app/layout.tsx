import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next, Newsreader } from "next/font/google";
import { SiteFooter, SiteHeader, SkipLink } from "@/components/SiteChrome";
import { column } from "@/components/ui";
import { THEME_BOOT_SCRIPT } from "@/lib/client/theme";
import "./globals.css";

// Atkinson Hyperlegible was designed by the Braille Institute for low-vision readers: the body voice.
const body = Atkinson_Hyperlegible_Next({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

// Newsreader's optical sizes keep headings calm and editorial at large sizes.
const display = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

// Only for real data: trial IDs, counts and timers.
const data = Atkinson_Hyperlegible_Mono({
  variable: "--font-data",
  subsets: ["latin"],
  display: "swap",
  // Not on the first screen, so it shouldn't compete with the body and heading fonts while the page loads.
  preload: false,
});

const DESCRIPTION =
  "Add photos of a cancer patient's reports and prescriptions and see which clinical trials recruiting in India they may qualify for. Gemma 4 reads the reports and checks every eligibility rule.";

export const metadata: Metadata = {
  title: { default: "TrialBridge: cancer trials in India, explained", template: "%s · TrialBridge" },
  description: DESCRIPTION,
  applicationName: "TrialBridge",
  openGraph: {
    title: "TrialBridge",
    description: DESCRIPTION,
    siteName: "TrialBridge",
    type: "website",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: "TrialBridge", description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfa" },
    { media: "(prefers-color-scheme: dark)", color: "#121417" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-IN"
      // The boot script may set data-theme before React hydrates.
      suppressHydrationWarning
      className={`${body.variable} ${display.variable} ${data.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <SkipLink />
        <SiteHeader />
        <main id="main" className={`${column} flex-1 pb-16 pt-8 sm:pt-12 print:max-w-none print:p-0`}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
