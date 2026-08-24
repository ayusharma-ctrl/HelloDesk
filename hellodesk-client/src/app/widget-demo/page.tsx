"use client";

import { useEffect, useRef, useState } from 'react';
import { useCurrentUser } from '@/features/auth/api/me';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';

export default function WidgetDemoPage() {
  const { data: me } = useCurrentUser();
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [copied, setCopied] = useState(false);

  const workspaceId = me?.workspace?.id ?? '';
  const clientBase = typeof window !== 'undefined' ? window.location.origin : '';

  const embedCode = workspaceId
    ? `<div id="hellodesk-widget-root"></div>
<script
  src="${clientBase}/widget-demo/widget.js"
  data-workspace-id="${workspaceId}"
><\/script>`
    : '';

  // Mount widget once we have a real workspace ID
  useEffect(() => {
    if (!workspaceId) return;

    // Clean up any stale widget script/root/instance first
    if (typeof window !== 'undefined' && (window as any).__HELLODESK_WIDGET_CLEANUP__) {
      try {
        (window as any).__HELLODESK_WIDGET_CLEANUP__();
      } catch (e) {}
    }

    const oldRoot = document.getElementById('hellodesk-widget-root');
    if (oldRoot) oldRoot.remove();

    const oldScripts = document.querySelectorAll('script[src*="/widget-demo/widget.js"]');
    oldScripts.forEach((s) => s.remove());

    const script = document.createElement('script');
    script.src = '/widget-demo/widget.js';
    script.setAttribute('data-workspace-id', workspaceId);
    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (typeof window !== 'undefined' && (window as any).__HELLODESK_WIDGET_CLEANUP__) {
        try {
          (window as any).__HELLODESK_WIDGET_CLEANUP__();
        } catch (e) {}
      }
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
      const root = document.getElementById('hellodesk-widget-root');
      if (root) root.remove();
    };
  }, [workspaceId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Widget Demo</h1>
          <p className="text-slate-500">
            Preview the live chat widget for your workspace and copy the embed code.
          </p>
        </div>

        {/* Workspace Info */}
        {me && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
              {me.workspace?.name?.[0]?.toUpperCase() ?? 'W'}
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">{me.workspace?.name}</p>
              <p className="text-xs text-blue-600 font-mono">{workspaceId}</p>
            </div>
          </div>
        )}

        {/* Embed Code Block */}
        <div className="mb-8 card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800">Embed Code</h2>
            <button
              onClick={handleCopy}
              disabled={!embedCode}
              className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-40"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="text-xs bg-slate-900 text-green-300 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono select-all">
            {embedCode || '⏳ Loading workspace...'}
          </pre>
          <p className="text-xs text-slate-400 mt-3">
            Paste this snippet before the <code className="bg-slate-100 px-1 rounded">&lt;/body&gt;</code> tag on any page where you want the widget to appear.
          </p>
        </div>

        {/* Live Preview note */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>👇 Live Preview:</strong> The chat widget is loaded in the bottom-right corner of this page. Click the bubble to interact with it.
        </div>
      </div>

      {/* Widget mounts in the body via the useEffect */}
      <div id="hellodesk-widget-root" />
    </AuthenticatedLayout>
  );
}
