"use client";

import * as React from 'react';
import Link from 'next/link';

interface LandingNavbarProps {
  isAuthorized: boolean | null;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ isAuthorized }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navLinks = [
    { href: "#showcase", label: "Architecture" },
    { href: "#multi-agent", label: "Multi-Agent Mesh" },
    { href: "#tools", label: "Domain Tools" },
    { href: "#infrastructure", label: "BYO Infra" },
    { href: "#safety", label: "Safety" },
    { href: "#integrations", label: "Integration" },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base sm:text-lg shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
            H
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              HelloDesk
            </span>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25">
              AI
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links - Uniform hover states without sticky default selected styling */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-xs font-medium text-slate-300 whitespace-nowrap">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-slate-300 hover:text-white transition-colors py-1 px-1.5 rounded-lg hover:bg-slate-900/60"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Auth & CTA Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthorized ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 sm:py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all whitespace-nowrap"
              >
                📊 Dashboard
              </Link>
              <Link
                href="/inbox"
                className="text-xs font-semibold text-white px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all whitespace-nowrap"
              >
                📥 Inbox
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-block text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="text-xs font-semibold text-white px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
              >
                🚀 Get Started
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white focus:outline-none cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-3 pb-6 bg-slate-950/95 border-b border-slate-800 backdrop-blur-2xl transition-all flex flex-col gap-2 text-sm">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-300 hover:text-white py-2 px-3 rounded-lg hover:bg-slate-900 transition-colors"
            >
              {link.label}
            </a>
          ))}

          {!isAuthorized && (
            <div className="pt-3 mt-1 border-t border-slate-800/80 flex items-center gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 rounded-xl bg-slate-900 text-slate-300 text-xs font-semibold"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-blue-500/25"
              >
                🚀 Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
