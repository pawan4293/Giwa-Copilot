"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { WalletConnect } from "./WalletConnect";

const TABS = [
  { href: "/",          label: "Home",     icon: "⛩" },
  { href: "/chat",      label: "Copilot",  icon: "✦" },
  { href: "/activity",  label: "Activity", icon: "◎" },
  { href: "/verified",  label: "Verified", icon: "✓" },
  { href: "/schedule",  label: "Schedule", icon: "⏱" },
  { href: "/about",     label: "About",    icon: "◈" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 border border-white/20 rounded-xl flex items-center justify-center text-sm group-hover:border-white/40 transition-colors">
            ⛩
          </div>
          <span className="text-white font-bold tracking-tight hidden sm:block">
            GIWA Copilot
          </span>
        </Link>

        {/* Nav tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link key={tab.href} href={tab.href}>
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "text-black"
                      : "text-white/50 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white rounded-xl"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <span className="text-xs opacity-70">{tab.icon}</span>
                    {tab.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Mobile nav */}
        <nav className="flex md:hidden items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link key={tab.href} href={tab.href}>
                <div
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-white text-black"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {tab.icon}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Wallet */}
        <WalletConnect />
      </div>
    </header>
  );
}
