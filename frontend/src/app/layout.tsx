import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "../components/providers";

const sansFont = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mohan Power Looms - ERP Management System",
  description: "Modern production and financial ERP dashboard for Mohan Power Looms saree manufacturing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sansFont.variable} ${monoFont.variable} font-sans`} suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
