"use client";

import * as React from 'react';

export const EmbedWidgetSection: React.FC = () => {
  return (
    <section id="integrations" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-900 text-center">
      <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Universal Embedding</span>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
        Embed on Any Website in 30 Seconds
      </h2>
      <p className="text-sm text-slate-400 max-w-2xl mx-auto mt-3">
        Drop one script tag into React, Next.js, Vue, Shopify, WordPress, or mobile WebViews.
      </p>

      <div className="mt-8 max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-left font-mono text-xs text-indigo-300 overflow-x-auto">
{`<!-- HelloDesk AI Live Chat & Voice Widget -->
<div id="hellodesk-widget-root"></div>
<script
  src="https://hello-desk-rouge.vercel.app/widget-demo/widget.js"
  data-workspace-id="YOUR_WORKSPACE_ID"
></script>`}
      </div>
    </section>
  );
};
