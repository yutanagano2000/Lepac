import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SideNav } from "@/components/SideNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { FeedbackInput } from "@/components/FeedbackInput";
import { Header } from "@/components/Header";
import { MainContentWrapper } from "@/components/MainContentWrapper";
import { MobileMenuProvider } from "@/components/MobileMenuContext";
import { Toaster } from "sonner";
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
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <MobileMenuProvider>
              <div className="min-h-screen bg-background">
                <div className="flex">
                  <SideNav />
                  <div className="min-w-0 flex-1 flex flex-col">
                    <Header />
                    <main className="flex-1">
                      <MainContentWrapper>
                        {children}
                      </MainContentWrapper>
                      <FeedbackInput />
                    </main>
                  </div>
                </div>
              </div>
            </MobileMenuProvider>
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
