import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalShell from "@/components/ConditionalShell";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IMBA - Irving Masjid Basketball Association",
  description: "Irving Masjid Basketball Association - Spring 2025 Season. Community basketball league in Irving, TX.",
  keywords: "IMBA, Irving Masjid, basketball, league, Irving TX, Muslim basketball",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full`} style={{ backgroundColor: '#111111' }}>
      <body className="min-h-screen flex flex-col" style={{ backgroundColor: '#111111', color: '#ffffff' }}>
        <ConditionalShell>{children}</ConditionalShell>
      </body>
    </html>
  );
}
