import type { Metadata, Viewport } from "next";
import { Karla, Rubik_Wet_Paint } from "next/font/google";
import "./globals.css";
import { DemoBanner } from "@/components/DemoBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LiveInventoryProvider } from "@/components/LiveInventory";
import { getSettings } from "@/lib/catalog";

const wetPaint = Rubik_Wet_Paint({ weight: "400", subsets: ["latin"], variable: "--font-wet-paint", display: "swap" });
const karla = Karla({ subsets: ["latin"], variable: "--font-karla", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Fashion Freak · Wichita's all-alternative thrift", template: "%s · Fashion Freak" },
  description: "Gothic, hippie, rave, festival and costume clothing, thrifted and consigned in Wichita, KS. Sizes XS to 6XL.",
  openGraph: { images: [{ url: "/brand/logo-512.png", width: 512, height: 512, alt: "Fashion Freak logo" }] },
};

export const viewport: Viewport = { themeColor: "#ff3f8e" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  return (
    <html lang="en" className={`${wetPaint.variable} ${karla.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">
        <a href="#main" className="skip-link">Skip to content</a>
        <DemoBanner />
        <SiteHeader />
        <LiveInventoryProvider settings={{ sold_visible_days: settings.sold_visible_days }}>
          <main id="main" className="flex-1">{children}</main>
        </LiveInventoryProvider>
        <SiteFooter />
      </body>
    </html>
  );
}
