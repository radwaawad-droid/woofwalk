import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WoofWalk — Dog walking on demand in Dubai",
  description: "Book a trusted dog walker in minutes. Live GPS, photo updates, in-app pay.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#d4722a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-50 text-ink-900 font-sans">
        <div className="mx-auto max-w-md min-h-screen bg-white shadow-xl">
          {children}
        </div>
      </body>
    </html>
  );
}
