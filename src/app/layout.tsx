import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CareLoop — AI Healthcare Appointment & Follow-up Manager",
  description:
    "AI-powered clinical triage, concurrent slot holds, zero double-bookings, and automated post-visit summaries.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground antialiased`}>
        <Providers>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t py-6 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">CareLoop</span>
                <span>• AI Healthcare Management System</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Concurrency Protection</span>
                <span>• Gemini 2.0 Flash AI</span>
                <span>• Resilient Queue</span>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
