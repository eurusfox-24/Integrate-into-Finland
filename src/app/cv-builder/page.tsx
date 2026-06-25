'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import DocumentExplorer from '@/components/DocumentExplorer';

export default function CvBuilderPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-base text-text-main relative transition-colors duration-300">
      {/* Subtle Warm Glow Accent Blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-primary/3 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-brand-primary/2 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-border-warm bg-bg-card/40 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl border border-border-warm bg-bg-card hover:bg-bg-base text-text-muted hover:text-text-main transition-all cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight">AI CV Builder Workspace</h1>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-border-warm bg-bg-card text-text-main shadow-sm hover:border-border-hover active:scale-95 transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-brand-primary" />
            ) : (
              <Moon className="w-4 h-4 text-brand-primary" />
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        <DocumentExplorer />
      </main>
    </div>
  );
}
