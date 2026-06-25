'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Trophy, CheckCircle, Clock, Briefcase, 
  LayoutDashboard, FileText, Search, Sparkles, AlertCircle, Sun, Moon
} from 'lucide-react';
import KanbanBoard from '@/components/KanbanBoard';
import JobFeed from '@/components/JobFeed';
import DocumentExplorer from '@/components/DocumentExplorer';
import { translations } from '@/utils/translations';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string;
  url: string;
  status: 'TO_APPLY' | 'APPLIED' | 'IN_PROGRESS' | 'OFFER' | 'REJECTED';
  notes: string;
  created_at: string;
  updated_at: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'board' | 'feed' | 'docs'>('feed');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deep linking and routing states
  const [initialSelectedJobId, setInitialSelectedJobId] = useState<string | null>(null);
  const [selectedDocFilename, setSelectedDocFilename] = useState<string | null>(null);

  const handleTrackJobSuccess = (jobId: string) => {
    fetchJobs();
    setInitialSelectedJobId(jobId);
    setActiveTab('board');
  };

  const handleNavigateToDocs = (filename: string) => {
    setSelectedDocFilename(filename);
    setActiveTab('docs');
  };
  
  // Theme Switching Logic
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

  // Language Switching Logic
  const [lang, setLang] = useState<'en' | 'fi'>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') as 'en' | 'fi' | null;
    if (savedLang) {
      setLang(savedLang);
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'fi' : 'en';
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      } else {
        setError(lang === 'en' ? "Failed to load tracking data from local SQLite database." : "Seurantatietojen lataaminen paikallisesta SQLite-tietokannasta epäonnistui.");
      }
    } catch (err) {
      console.error(err);
      setError(lang === 'en' ? "Failed to connect to local database server." : "Yhteys paikalliseen tietokantapalvelimeen epäonnistui.");
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Statistics calculations
  const totalTracked = jobs.length;
  const appliedCount = jobs.filter(j => j.status === 'APPLIED').length;
  const inProgressCount = jobs.filter(j => j.status === 'IN_PROGRESS').length;
  const offerCount = jobs.filter(j => j.status === 'OFFER').length;

  // Tracked URLs to disable track button in recommendations feed if already tracked
  const trackedUrls = jobs.map(j => j.url).filter((url): url is string => !!url);

  const t = translations[lang];

  return (
    <div className="flex flex-col min-h-screen bg-bg-base text-text-main relative transition-colors duration-300">
      {/* Subtle Warm Glow Accent Blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-primary/3 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-brand-primary/2 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-border-warm gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-brand-primary" />
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">{t.commandCenter}</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1.5">
              {t.finlandJobHunt}
            </h1>
            <p className="text-text-muted text-xs mt-1 max-w-md">
              {t.dashboardDesc}
            </p>
          </div>

          {/* Controls & Stats Badges */}
          <div className="flex items-center gap-4 self-end md:self-center">
            {/* Language Toggle Button */}
            <button
              onClick={toggleLanguage}
              className="px-3.5 py-2.5 rounded-xl border border-border-warm bg-bg-card text-text-main shadow-sm hover:border-border-hover active:scale-95 transition-all cursor-pointer font-bold text-xs"
              aria-label="Toggle language"
            >
              {lang === 'en' ? 'FI' : 'EN'}
            </button>

            {/* Theme Toggle Button */}
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



            {/* Stats */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="glass-panel px-3.5 py-2 rounded-xl flex flex-col items-center min-w-16">
                <span className="text-[9px] text-text-muted font-bold uppercase">{t.total}</span>
                <span className="text-base font-bold mt-0.5">{totalTracked}</span>
              </div>
              <div className="glass-panel px-3.5 py-2 rounded-xl flex flex-col items-center min-w-16 border-status-applied/20">
                <span className="text-[9px] text-status-applied font-bold uppercase flex items-center gap-0.5">
                  <CheckCircle className="w-2.5 h-2.5" /> {t.sent}
                </span>
                <span className="text-base font-bold text-status-applied mt-0.5">{appliedCount}</span>
              </div>
              <div className="glass-panel px-3.5 py-2 rounded-xl flex flex-col items-center min-w-16 border-status-in-progress/20">
                <span className="text-[9px] text-status-in-progress font-bold uppercase flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> {t.interview}
                </span>
                <span className="text-base font-bold text-status-in-progress mt-0.5">{inProgressCount}</span>
              </div>
              <div className="glass-panel px-3.5 py-2 rounded-xl flex flex-col items-center min-w-16 border-status-offer/20 bg-status-offer/5">
                <span className="text-[9px] text-status-offer font-bold uppercase flex items-center gap-0.5">
                  <Trophy className="w-2.5 h-2.5" /> {t.offer}
                </span>
                <span className="text-base font-bold text-status-offer mt-0.5">{offerCount}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Selection */}
        <div className="flex border-b border-border-warm mb-8">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'feed'
                ? 'border-brand-primary text-brand-primary bg-brand-primary/3'
                : 'border-transparent text-text-muted hover:text-text-main hover:bg-bg-card/40'
            }`}
          >
            <Search className="w-4 h-4" /> {t.tabJobBoard}
          </button>
          <button
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'board'
                ? 'border-brand-primary text-brand-primary bg-brand-primary/3'
                : 'border-transparent text-text-muted hover:text-text-main hover:bg-bg-card/40'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> {t.tabKanbanBoard}
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'docs'
                ? 'border-brand-primary text-brand-primary bg-brand-primary/3'
                : 'border-transparent text-text-muted hover:text-text-main hover:bg-bg-card/40'
            }`}
          >
            <FileText className="w-4 h-4" /> {t.tabCvCustomizer}
          </button>
        </div>

        {/* Database Load Error Notification */}
        {error && (
          <div className="mb-6 p-4 bg-status-rejected/10 border border-status-rejected/25 text-status-rejected rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-semibold">{error}</span>
          </div>
        )}

        {/* Tab Contents */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-24">
            <LoaderIcon className="w-10 h-10 text-brand-primary animate-spin" />
            <span className="text-sm text-text-muted mt-4">
              {lang === 'en' ? "Connecting to SQLite database..." : "Yhdistetään SQLite-tietokantaan..."}
            </span>
          </div>
        ) : (
          <div className="transition-all duration-300">
            {activeTab === 'board' && (
              <KanbanBoard 
                jobs={jobs} 
                onRefresh={fetchJobs} 
                initialSelectedJobId={initialSelectedJobId}
                onClearInitialSelectedJobId={() => setInitialSelectedJobId(null)}
                onNavigateToDocs={handleNavigateToDocs}
                lang={lang}
              />
            )}
            
            {activeTab === 'feed' && (
              <JobFeed 
                onRefreshTracker={fetchJobs} 
                trackedJobUrls={trackedUrls} 
                onTrackJobSuccess={handleTrackJobSuccess}
                lang={lang}
              />
            )}
            
            {activeTab === 'docs' && (
              <DocumentExplorer 
                selectedDocFilename={selectedDocFilename}
                onClearSelectedDoc={() => setSelectedDocFilename(null)}
                lang={lang}
              />
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 mt-12 border-t border-border-warm text-text-muted/50 text-xs">
        &copy; {new Date().getFullYear()} {lang === 'en' ? "Career Command Center. Local Host Mode." : "Urakomentokeskus. Paikallinen tila."}{' '}
        {lang === 'en' ? "Integrated with local SQLite DB & Gemini model." : "Integroitu paikalliseen SQLite-tietokantaan ja Gemini-malliin."}
      </footer>
    </div>
  );
}

// Simple loader helper since we don't have Loader from Lucide
function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
