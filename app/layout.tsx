import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PACKD 🐺",
  description: "Group accountability, built different. Daily streaks, your pack, leaderboard.",
  openGraph: {
    title: "PACKD 🐺",
    description: "Group accountability, built different.",
    url: "https://packd-two.vercel.app",
    siteName: "PACKD",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐺</text></svg>"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0A0A0F" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PACKD" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0A0A0F" }}>{children}</body>
    </html>
  );
}
