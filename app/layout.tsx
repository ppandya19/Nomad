import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nomad — Plan the day",
  description: "Pick a city, plan stops, watch reels. A day trip in one flow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
