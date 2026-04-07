import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Caring Iggy",
    template: "%s | Caring Iggy",
  },
  description:
    "Caring Iggy connects adopters, staff, and administrators through one calm, role-aware adoption platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${publicSans.variable} h-full antialiased`}
    >
      <body className="shell-body">
        <div className="shell-frame">
          <PublicHeader />

          <main className="shell-main">{children}</main>

          <PublicFooter />
        </div>
      </body>
    </html>
  );
}
