import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "Boomer and Kev Studio | Character-Driven Neural Narrative Engine",
  description: "Character engine and studio for Boomer and Kev. Create viral scripts with high-velocity retention mechanics using Aussie Alpha AI personas.",
  keywords: ["Aussie AI", "Boomer and Kev", "Script Generator", "Neural Narrative Core", "Viral Video Production"],
  openGraph: {
    title: "Boomer and Kev Studio",
    description: "The official character-driven Neural Narrative engine.",
    images: ["/og-image.png"]
  },
  twitter: {
    card: "summary_large_image",
    title: "Boomer and Kev Studio",
    description: "The official character-driven Neural Narrative engine.",
    images: ["/og-image.png"]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
