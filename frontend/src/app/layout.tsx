import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeScript } from "@/components/ThemeScript";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zoom Clone — Video Conferencing",
  description:
    "A video conferencing platform: start instant meetings, schedule ahead, and join with a meeting ID — built with Next.js, FastAPI and WebRTC.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // No React-managed className on <html> so the theme class set by ThemeScript
    // (and the toggle) is never reconciled away.
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${inter.variable} flex min-h-full flex-col antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
