import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "GIWA Copilot — AI assistant for GIWA Sepolia",
  description:
    "Chat-based AI assistant for GIWA Sepolia testnet. Resolve .up.id names, check verified addresses, schedule recurring payments, and explore the GIWA ecosystem.",
  keywords: ["GIWA", "Sepolia", "OP Stack", "L2", "Ethereum", "AI", "Web3"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-black text-white antialiased"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Providers>
          <NavBar />
          <main className="min-h-screen pt-16">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
