"use client";

import * as React from 'react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="relative z-10 border-t border-slate-800/80 py-10 px-4 sm:px-6 lg:px-8 mt-auto text-center text-xs text-slate-500">
      <p>© 2026 HelloDesk AI • </p>
      <p className="mt-2 text-slate-600">
        ⚡ Developed by{" "}
        <a
          href="https://github.com/ayusharma-ctrl"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:underline font-bold"
        >
          ayusharma-ctrl
        </a>
      </p>
    </footer>
  );
};
