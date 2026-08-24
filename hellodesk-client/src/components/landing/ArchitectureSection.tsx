"use client";

import * as React from 'react';
import { PINNED_SLIDES } from './landing-data';

export const ArchitectureSection: React.FC = () => {
  const pinnedSectionRef = React.useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = React.useState(0);
  const [pinnedProgress, setPinnedProgress] = React.useState(0);
  const [intraSlideProgress, setIntraSlideProgress] = React.useState(0);

  const GLOW_COLORS = [
    'rgba(59, 130, 246,', // Blue (RAG)
    'rgba(245, 158, 11,', // Amber (Multi-Agent)
    'rgba(99, 102, 241,', // Indigo (Voice)
    'rgba(16, 185, 129,', // Emerald (Safety)
  ];

  React.useEffect(() => {
    const handleScroll = () => {
      if (!pinnedSectionRef.current) return;
      const rect = pinnedSectionRef.current.getBoundingClientRect();
      const totalScrollableDistance = pinnedSectionRef.current.clientHeight - window.innerHeight;

      if (totalScrollableDistance > 0) {
        const scrolledInside = -rect.top;
        const progress = Math.max(0, Math.min(1, scrolledInside / totalScrollableDistance));
        setPinnedProgress(progress);

        const rawIndex = progress * PINNED_SLIDES.length;
        const slideIndex = Math.min(
          PINNED_SLIDES.length - 1,
          Math.floor(rawIndex)
        );
        setActiveSlide(slideIndex);

        // Progress within the current active slide [0, 1]
        const intra = Math.max(0, Math.min(1, rawIndex - Math.floor(rawIndex)));
        setIntraSlideProgress(intra);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentGlowBase = GLOW_COLORS[activeSlide] || GLOW_COLORS[0];
  const dynamicBoxShadow = `0 25px 50px -12px ${currentGlowBase} ${0.2 + intraSlideProgress * 0.15}), 0 -10px 40px -10px ${currentGlowBase} ${0.15 + intraSlideProgress * 0.1}), 18px -18px 45px -10px ${currentGlowBase} ${0.2 + intraSlideProgress * 0.15}), 0 0 35px ${currentGlowBase} 0.1)`;

  return (
    <section
      id="showcase"
      ref={pinnedSectionRef}
      className="relative h-[320vh] w-full border-t border-slate-900"
    >
      <div className="sticky top-0 h-screen w-full py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center justify-center">
        {/* Header & Step Indicator */}
        <div className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
              <span>⚡</span> Architecture (Scroll to advance)
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {PINNED_SLIDES[activeSlide].title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {PINNED_SLIDES.map((slide, idx) => (
              <button
                key={slide.step}
                onClick={() => {
                  if (pinnedSectionRef.current) {
                    const totalScrollableDistance = pinnedSectionRef.current.clientHeight - window.innerHeight;
                    const targetScrollTop = window.scrollY + pinnedSectionRef.current.getBoundingClientRect().top + (idx / PINNED_SLIDES.length) * totalScrollableDistance;
                    window.scrollTo({ top: targetScrollTop + 5, behavior: 'smooth' });
                  }
                }}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  activeSlide === idx
                    ? 'w-8 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-md'
                    : 'w-2.5 bg-slate-800 hover:bg-slate-700'
                }`}
                aria-label={`Jump to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full max-w-5xl h-1 bg-slate-900 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-150"
            style={{ width: `${pinnedProgress * 100}%` }}
          ></div>
        </div>

        {/* Dynamic Slide Card Container with Top-Right and Perimeter Glow */}
        <div
          className="w-full max-w-5xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative overflow-hidden transition-all duration-300"
          style={{
            boxShadow: dynamicBoxShadow,
            transform: `translateY(${(intraSlideProgress - 0.5) * -8}px) scale(${1 + Math.sin(intraSlideProgress * Math.PI) * 0.012})`,
          }}
        >
          {/* Top-Right Ambient Glow Halo */}
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-500"
            style={{ background: `${currentGlowBase} 0.22)` }}
          />

          {/* Left Column: Descriptions & Stats */}
          <div
            className="lg:col-span-6 space-y-6 relative z-10 transition-transform duration-200"
            style={{ transform: `translateY(${(intraSlideProgress - 0.5) * -4}px)` }}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${PINNED_SLIDES[activeSlide].color} flex items-center justify-center text-2xl shadow-lg transition-transform duration-300`}
                style={{
                  transform: `rotate(${(intraSlideProgress - 0.5) * 12}deg) scale(${1 + Math.sin(intraSlideProgress * Math.PI) * 0.08})`,
                }}
              >
                {PINNED_SLIDES[activeSlide].icon}
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-slate-400">
                  STEP {PINNED_SLIDES[activeSlide].step} / 04
                </span>
                <span className="ml-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-blue-400 border border-slate-700">
                  {PINNED_SLIDES[activeSlide].badge}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-200">
                {PINNED_SLIDES[activeSlide].tagline}
              </h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                {PINNED_SLIDES[activeSlide].description}
              </p>
            </div>

            {/* Performance Metric Badges with Staggered Wave Floating */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {PINNED_SLIDES[activeSlide].stats.map((s, sIdx) => (
                <div
                  key={sIdx}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 transition-transform duration-200"
                  style={{
                    transform: `translateY(${Math.sin((intraSlideProgress + sIdx * 0.3) * Math.PI) * -5}px)`,
                  }}
                >
                  <span className="text-[10px] text-slate-500 font-mono block">{s.label}</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono mt-0.5 block">{s.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Code Window with Top-Right Dynamic Glow */}
          <div className="lg:col-span-6 relative z-10">
            <div
              className="bg-slate-950 rounded-2xl border p-4 font-mono text-xs shadow-inner relative group transition-all duration-300"
              style={{
                boxShadow: `0 15px 30px -10px ${currentGlowBase} 0.25), 12px -12px 28px -8px ${currentGlowBase} 0.2)`,
                transform: `perspective(1000px) rotateY(${(intraSlideProgress - 0.5) * -4}deg) translateY(${(intraSlideProgress - 0.5) * -4}px)`,
                borderColor: `${currentGlowBase} ${0.25 + intraSlideProgress * 0.35})`,
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3 text-slate-400 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
                  <span className="ml-2 text-slate-300 font-semibold">execution_spec.ts</span>
                </div>
                <span className="text-indigo-400 font-mono text-[10px]">Active Execution</span>
              </div>
              <pre className="text-indigo-200/90 overflow-x-auto text-[11.5px] leading-relaxed p-1">
                {PINNED_SLIDES[activeSlide].code}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
