import type { Metadata, Viewport } from "next";
import "./globals.css";
import Shell from "@/components/shell";

export const metadata: Metadata = {
  title: "Anjaneya Bois",
  description: "Private two-person total-fitness rivalry",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Anjaneya Bois", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#131312" },
    { media: "(prefers-color-scheme: light)", color: "#fcfcfb" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
