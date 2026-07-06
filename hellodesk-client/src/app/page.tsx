"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthorized(!!token);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 text-center">
        {/* App Title with Premium Gradient */}
        <h1 className="text-4xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent transition-all duration-300 hover:scale-105 cursor-default select-none">
          HelloDesk
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          A production-style customer communication platform.
        </p>

        {isAuthorized === null ? (
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-slate-100 rounded-lg w-full"></div>
            <div className="h-10 bg-slate-100 rounded-lg w-full"></div>
          </div>
        ) : !isAuthorized ? (
          /* Unauthorized User Mode */
          <div className="space-y-4">
            <Link
              href="/signup"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 transform hover:-translate-y-[1px] active:translate-y-0"
            >
              🚀 Create Workspace
            </Link>
            <Link
              href="/login"
              className="block w-full text-center bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 transform hover:-translate-y-[1px] active:translate-y-0"
            >
              Sign In
            </Link>
          </div>
        ) : (
          /* Authorized User Mode */
          <div className="space-y-4">
            <Link
              href="/inbox"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 transform hover:-translate-y-[1px] active:translate-y-0"
            >
              📥 Open Inbox
            </Link>
            <Link
              href="/widget-demo"
              className="block w-full text-center bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl border border-slate-200 shadow-sm transition-all duration-200 transform hover:-translate-y-[1px] active:translate-y-0"
            >
              ⚙️ Widget Demo
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                setIsAuthorized(false);
              }}
              className="text-xs text-red-500 hover:text-red-600 font-medium mt-4 cursor-pointer focus:outline-none transition-colors"
            >
              Sign out of account
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
