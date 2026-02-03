import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SideNav } from "@/components/SideNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FeedbackInput } from "@/components/FeedbackInput";
import { initDb } from "@/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ALAN - 建設業界向けアプリ",
  description: "建設業界向けの案件管理・TODO管理・法令検索アプリケーション",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await initDb();
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background">
            <div className="flex">
              <SideNav />
              <main className="min-w-0 flex-1">
                {children}
                <FeedbackInput />
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
