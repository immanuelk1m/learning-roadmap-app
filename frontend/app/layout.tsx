'use client'

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";
import NavigationBar from "@/components/NavigationBar";
import { useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen text-[15px] overflow-x-hidden`}
      >
        <ToastProvider>
          <NavigationBar isOpen={isDrawerOpen} setIsOpen={setIsDrawerOpen} />
          <div 
            className={`pt-[65px] min-h-[calc(100vh-65px)] transition-transform duration-300 ${
              isDrawerOpen ? 'translate-x-72' : 'translate-x-0'
            }`}
          >
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}