import type { Metadata } from "next";
import "./globals.css";
import { Nunito, Plus_Jakarta_Sans, Space_Mono } from "next/font/google";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-nunito",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Caring Iggy",
    template: "%s | Caring Iggy",
  },
  description:
    "Connecting rescue animals with loving forever homes. Browse adoptable dogs, cats, and small pets, register your interest, and manage your adoption journey.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${plusJakartaSans.variable} ${spaceMono.variable}`}
    >
      <body className="font-[family-name:var(--font-body)] text-base font-normal leading-[1.75] text-[var(--color-ink-soft)] bg-[var(--color-canvas)] min-h-screen">
        <div className="flex flex-col min-h-screen">
          <PublicHeader />
          {/* MAIN: NO width constraint — each page sets its own max-w */}
          <main className="flex-1 py-8">
            {children}
          </main>
          <PublicFooter />
        </div>
      </body>
    </html>
  );
}
