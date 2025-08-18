import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";
import NavigationBar from "@/components/NavigationBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI PDF 학습 서비스",
  description: "AI 기반 PDF 학습 서비스 - 대학생을 위한 스마트 학습 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ToastProvider>
          <NavigationBar />
          <div className="pt-16 min-h-[calc(100vh-64px)] pb-4">
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
