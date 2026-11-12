import { Suspense } from "react";
import type { Metadata } from "next";
import { Pixels } from "@/components/analytics/pixels";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Rahita",
  description: "Perfumes and gifts",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Meta / TikTok pixels: render nothing unless NEXT_PUBLIC_*_PIXEL_ID is set */}
        <Suspense fallback={null}>
          <Pixels />
        </Suspense>
      </body>
    </html>
  );
}
