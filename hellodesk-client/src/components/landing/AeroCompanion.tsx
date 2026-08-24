"use client";

import * as React from 'react';
import { SECTION_GUIDES, SectionGuide } from './landing-data';

export const AeroCompanion: React.FC = () => {
  const [activeGuide, setActiveGuide] = React.useState<SectionGuide>(SECTION_GUIDES[0]);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      // If at top of the page, show Hero guide
      if (scrollY < 200) {
        setActiveGuide(SECTION_GUIDES[0]);
        return;
      }

      // Check each section against viewport center
      const viewportCenter = window.innerHeight * 0.45;
      let matchedGuide: SectionGuide | null = null;

      for (const guide of SECTION_GUIDES) {
        if (guide.sectionId === 'hero') continue;
        const el = document.getElementById(guide.sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
            matchedGuide = guide;
            break;
          }
        }
      }

      if (matchedGuide) {
        setActiveGuide(matchedGuide);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (dismissed) return null;

  return (
    <div
      className={`fixed bottom-6 z-40 hidden md:flex items-end gap-3 transition-all duration-700 ease-out transform ${
        activeGuide.side === 'right' ? 'right-6 mb-16 flex-row-reverse' : 'left-6 flex-row'
      }`}
      style={{
        animation: 'hdFloat 4s ease-in-out infinite'
      }}
    >
      {/* Animated Mascot Head/Body */}
      <div className="relative group cursor-pointer">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 border border-indigo-500/40 shadow-2xl flex items-center justify-center text-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 backdrop-blur-xl">
          🤖
        </div>
        {/* Pulsing halo */}
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
        </span>
      </div>

      {/* Dynamic Interactive Speech Bubble Guide */}
      <div className="max-w-[270px] p-3.5 rounded-2xl bg-slate-900/95 border border-slate-800/90 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/50 relative">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-bold text-white flex items-center gap-1.5 truncate">
            {activeGuide.title}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {activeGuide.badge}
            </span>
            <button
              onClick={() => setDismissed(true)}
              className="text-slate-500 hover:text-slate-300 text-xs px-1 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              title="Dismiss guide"
            >
              ✕
            </button>
          </div>
        </div>
        <p className="text-[10.5px] text-slate-300 leading-relaxed">
          {activeGuide.text}
        </p>
      </div>
    </div>
  );
};
