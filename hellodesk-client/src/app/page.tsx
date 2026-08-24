"use client";

import * as React from 'react';
import Script from 'next/script';
import { TYPEWRITER_PHRASES } from '@/components/landing/landing-data';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingHero } from '@/components/landing/LandingHero';
import { AeroCompanion } from '@/components/landing/AeroCompanion';
import { ArchitectureSection } from '@/components/landing/ArchitectureSection';
import { MultiAgentSection } from '@/components/landing/MultiAgentSection';
import { RagSection } from '@/components/landing/RagSection';
import { ToolsSection } from '@/components/landing/ToolsSection';
import { VoiceSection } from '@/components/landing/VoiceSection';
import { SafetySection } from '@/components/landing/SafetySection';
import { InfrastructureSection } from '@/components/landing/InfrastructureSection';
import { EngineeringStandardsSection } from '@/components/landing/EngineeringStandardsSection';
import { EmbedWidgetSection } from '@/components/landing/EmbedWidgetSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function HomePage() {
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);
  const [mousePos, setMousePos] = React.useState({ x: 500, y: 300 });
  const [scrollY, setScrollY] = React.useState(0);
  const [scrollVelocity, setScrollVelocity] = React.useState(0);

  // Typewriter effect state
  const [phraseIdx, setPhraseIdx] = React.useState(0);
  const [charIdx, setCharIdx] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [displayedText, setDisplayedText] = React.useState("");

  // Check auth on mount
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthorized(!!token);
  }, []);

  // Global scroll and mouse tracking for interactive canvas lighting
  React.useEffect(() => {
    let lastScrollY = window.scrollY;
    let lastScrollTime = Date.now();

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const currentTime = Date.now();
      const timeDelta = Math.max(1, currentTime - lastScrollTime);
      const velocity = Math.abs(currentScrollY - lastScrollY) / timeDelta;

      setScrollY(currentScrollY);
      setScrollVelocity(Math.min(velocity * 100, 50));

      lastScrollY = currentScrollY;
      lastScrollTime = currentTime;
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Dynamic Typewriter loop
  React.useEffect(() => {
    const currentPhrase = TYPEWRITER_PHRASES[phraseIdx];
    let timer: NodeJS.Timeout;

    if (!isDeleting && charIdx < currentPhrase.length) {
      timer = setTimeout(() => {
        setDisplayedText(currentPhrase.substring(0, charIdx + 1));
        setCharIdx(charIdx + 1);
      }, 55);
    } else if (!isDeleting && charIdx === currentPhrase.length) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 2200);
    } else if (isDeleting && charIdx > 0) {
      timer = setTimeout(() => {
        setDisplayedText(currentPhrase.substring(0, charIdx - 1));
        setCharIdx(charIdx - 1);
      }, 28);
    } else if (isDeleting && charIdx === 0) {
      setIsDeleting(false);
      setPhraseIdx((phraseIdx + 1) % TYPEWRITER_PHRASES.length);
    }

    return () => clearTimeout(timer);
  }, [charIdx, isDeleting, phraseIdx]);

  const openWidget = () => {
    if (typeof window !== 'undefined' && (window as any).HelloDesk) {
      (window as any).HelloDesk.open();
    } else {
      window.location.href = '/widget-demo';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-clip">
      {/* Dynamic Background Glow Lighting Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 rounded-full blur-[140px] transition-all duration-300 ease-out"
          style={{
            width: `${750 + scrollVelocity * 3}px`,
            height: `${500 + scrollVelocity * 2}px`,
            background: scrollVelocity > 30
              ? 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(59,130,246,0.35))'
              : 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(99,102,241,0.18))',
            transform: `translate(-50%, ${scrollY * 0.12}px) rotate(${scrollY * 0.03}deg)`,
          }}
        ></div>
        <div
          className="absolute top-1/3 -left-48 w-[450px] h-[450px] bg-blue-600/15 rounded-full blur-[120px] transition-transform duration-100"
          style={{ transform: `translateY(${scrollY * -0.08}px)` }}
        ></div>
        <div
          className="absolute top-2/3 -right-48 w-[450px] h-[450px] bg-purple-600/15 rounded-full blur-[120px] transition-transform duration-100"
          style={{ transform: `translateY(${scrollY * 0.06}px)` }}
        ></div>
      </div>

      {/* Interactive Cursor Spotlight & Dynamic Lighting Ripple */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.22), rgba(59, 130, 246, 0.14) 35%, rgba(168, 85, 247, 0.08) 60%, transparent 80%)`,
        }}
      />

      {/* Synchronized AI Mascot Companion */}
      <AeroCompanion />

      {/* Navigation Bar */}
      <LandingNavbar isAuthorized={isAuthorized} />

      {/* Hero Section */}
      <LandingHero
        displayedText={displayedText}
        isAuthorized={isAuthorized}
        onOpenWidget={openWidget}
      />

      {/* Pinned Architecture Carousel */}
      <ArchitectureSection />

      {/* LangGraph Multi-Agent Mesh */}
      <MultiAgentSection />

      {/* PostgreSQL pgvector Hybrid RAG */}
      <RagSection />

      {/* Domain & Custom Tools */}
      <ToolsSection />

      {/* Real-Time Streaming Voice AI */}
      <VoiceSection />

      {/* Defense-in-Depth Safety Guardrails */}
      <SafetySection />

      {/* Bring Your Own Infrastructure (BYOI) */}
      <InfrastructureSection />

      {/* Full-Stack & AI Systems Engineering Architecture */}
      <EngineeringStandardsSection />

      {/* 1-Line Universal Widget Embedding */}
      <EmbedWidgetSection />

      {/* Footer */}
      <LandingFooter />

      {/* Live Chat & Voice Widget Embed Script */}
      <Script
        src="/widget-demo/widget.js"
        strategy="lazyOnload"
        data-workspace-id="d02ca34d-edde-4f94-a7fb-87f5c4887ef6"
      />

      {/* Keyframes for Mascot Floating Animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes hdFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
        `
      }} />
    </div>
  );
}
