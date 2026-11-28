import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Staff", template: "%s · Fashion Freak Staff" },
  manifest: "/staff.webmanifest",
  appleWebApp: { capable: true, title: "FF Staff", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#2b0016" };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col bg-blush">{children}</div>;
}
