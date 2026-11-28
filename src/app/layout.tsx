import type { Metadata, Viewport } from "next";
import { Karla, Rubik_Wet_Paint } from "next/font/google";
import "./globals.css";
import { DemoBanner } from "@/components/DemoBanner";

const wetPaint = Rubik_Wet_Paint({ weight: "400", subsets: ["latin"], variable: "--font-wet-paint", display: "swap" });
const karla = Karla({ subsets: ["latin"], variable: "--font-karla", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Fashion Freak · Wichita's all-alternative thrift", template: "%s · Fashion Freak" },
  description: "Gothic, hippie, rave, festival and costume clothing, thrifted and consigned in Wichita, KS. Sizes XS to 6XL.",
  openGraph: { images: [{ url: "/brand/logo-512.png", width: 512, height: 512, alt: "Fashion Freak logo" }] },
};

export const viewport: Viewport = { themeColor: "#ff3f8e" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${wetPaint.variable} ${karla.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">
        <a href="#main" className="skip-link">Skip to content</a>
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
