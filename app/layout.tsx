import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import Footer from "@/components/Footer";
import { LocaleProvider } from "@/components/LocaleProvider";
import Navbar from "@/components/Navbar";
import { dirFor } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "TripMate AI — Plan Smarter, Travel Better",
    template: "%s · TripMate AI",
  },
  description:
    "Create personalized travel itineraries with AI. Plan day by day, stay within your budget, and save every trip in one place.",
};

/**
 * Applies the saved theme before the page paints.
 *
 * Without this the browser renders light, then React switches to dark a moment
 * later — a white flash on every load for dark-mode users. It has to be inline
 * and synchronous to run before first paint.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('tripmate:theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Language is resolved here so `lang` and `dir` are correct in the very
  // first HTML response, rather than corrected after hydration.
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>

      <body className="flex min-h-full flex-col bg-bg text-ink">
        <LocaleProvider locale={locale}>
          <Navbar />

          {children}

          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
