import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next, Newsreader } from "next/font/google";
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
});

export const metadata: Metadata = {
  title: "TrialBridge",
  description:
    "Add photos of a cancer patient's reports and prescriptions and see which clinical trials recruiting in India they may qualify for. Gemma 4 reads the reports and checks every eligibility rule.",
};

export const viewport: Viewport = {
  themeColor: "#fcfcfa",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${body.variable} ${display.variable} ${data.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
