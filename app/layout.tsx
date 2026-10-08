import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible was designed by the Braille Institute for low-vision readers.
const body = Atkinson_Hyperlegible_Next({
  variable: "--font-body",
  subsets: ["latin"],
  // next/font has no fallback metrics for this family; skip the adjusted fallback instead of warning.
  adjustFontFallback: false,
});

const heading = Source_Serif_4({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrialBridge",
  description:
    "Upload a cancer patient's medical reports and see which clinical trials recruiting in India they may qualify for. Gemma 4 reads the reports and checks every eligibility rule.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-base leading-relaxed">{children}</body>
    </html>
  );
}
