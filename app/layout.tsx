import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import ConvexClientProvider from "./ConvexClientProvider";
import { Toaster } from "@/components/ui/sonner";
import TermsModal from "@/components/trust/TermsModal";
import { RoleProvider } from "@/context/RoleContext";
import { ThemeProvider } from "@/context/ThemeProvider";
import Navbar from "@/components/layout/Navbar";
import AnnouncementsBar from "@/components/layout/AnnouncementsBar";
import BannedBanner from "@/components/layout/BannedBanner";

export const metadata: Metadata = {
  title: "Peer - P2P Academic Marketplace",
  description: "Connect with students for academic help",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans mesh-bg min-h-screen antialiased`}>
        <ConvexClientProvider>
          <ThemeProvider>
            <RoleProvider>
              <Navbar />
              <BannedBanner />
              <AnnouncementsBar />
              {children}
              <Toaster />
              <TermsModal />
            </RoleProvider>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
