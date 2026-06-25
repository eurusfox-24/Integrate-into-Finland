'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, MapPin, ExternalLink, Plus, Sparkles,
  Clock, CheckCircle, Loader2, AlertCircle, RefreshCw, Globe, X, Send, MessageSquare, Zap
} from 'lucide-react';
import { translations } from '@/utils/translations';

interface FeedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string;
  url: string;
  posted: string;
  category: string;
  sourceId?: string;
  sourceName?: string;
  sourceUrl?: string;
}

interface JobFeedProps {
  onRefreshTracker: () => void;
  trackedJobUrls: string[];
  onTrackJobSuccess?: (jobId: string) => void;
  lang?: 'en' | 'fi';
}

// ─── Board Directory ──────────────────────────────────────────────────────────

interface BoardEntry {
  name: string;
  url: string;
  color: string;
  abbr: string;
  scrapable?: boolean;  // can be scraped with Playwright locally
  scrapeUrl?: string;   // override URL used for scraping
}

const FINLAND_BOARDS: BoardEntry[] = [
  { name: 'Duunitori',     url: 'https://duunitori.fi/tyopaikat',                          color: '#E8522E', abbr: 'DU', scrapable: true },
  { name: 'TE-palvelut',   url: 'https://tyomarkkinatori.fi/etusivu/avoimet-tyopaikat',    color: '#003A8C', abbr: 'TE', scrapable: true },
  { name: 'Oikotie',       url: 'https://tyopaikat.oikotie.fi',                            color: '#FF5A00', abbr: 'OI', scrapable: true },
  { name: 'Jobly',         url: 'https://jobly.fi/en/jobs',                                color: '#6366F1', abbr: 'JB', scrapable: true },
  { name: 'Mol.fi',        url: 'https://www.mol.fi/tyopaikat',                            color: '#1E7A3A', abbr: 'MO', scrapable: true },
  { name: 'Academic Work', url: 'https://www.academicwork.fi/en/jobs',                     color: '#FF6B35', abbr: 'AW', scrapable: true },
  { name: 'LinkedIn FI',   url: 'https://www.linkedin.com/jobs/search/?location=Finland',  color: '#0A66C2', abbr: 'LI' },
  { name: 'Glassdoor FI',  url: 'https://www.glassdoor.com/Job/finland-jobs-SRCH_IL.0,7_IN73.htm', color: '#0CAA41', abbr: 'GD' },
  { name: 'Helsinki City', url: 'https://www.hel.fi/fi/kaupunginkanslian-toimiala/tyon-tarjoajille/avoimet-tyopaikat', color: '#003580', abbr: 'HC' },
  { name: 'Eezy',          url: 'https://www.eezy.fi/rekryt/avoimet-tyopaikat',            color: '#E91E63', abbr: 'EZ', scrapable: true },
  { name: 'Barona',        url: 'https://www.barona.fi/tyonhakijalle/avoimet-tyopaikat',   color: '#1565C0', abbr: 'BA', scrapable: true },
  { name: 'Adecco FI',     url: 'https://www.adecco.fi/tyonhakijalle/avoimet-tyopaikat',  color: '#E31837', abbr: 'AD', scrapable: true },
];

const EU_BOARDS: BoardEntry[] = [
  { name: 'EURES',        url: 'https://eures.europa.eu/jobs-and-ects/search-for-jobs_en',             color: '#003399', abbr: 'EU', scrapable: true },
  { name: 'StepStone',    url: 'https://www.stepstone.de/en/jobs',                                     color: '#FF3300', abbr: 'SS', scrapable: true },
  { name: 'Eurojobs',     url: 'https://www.eurojobs.com',                                             color: '#1B4FD8', abbr: 'EJ', scrapable: true },
  { name: 'Relocate.me',  url: 'https://relocate.me/jobs',                                             color: '#8B5CF6', abbr: 'RM', scrapable: true },
  { name: 'Arbeitnow',    url: 'https://www.arbeitnow.com',                                            color: '#2D9CDB', abbr: 'AN', scrapable: true },
  { name: 'EuroBrussels', url: 'https://www.eurobrussels.com/jobs',                                    color: '#4F46E5', abbr: 'EB', scrapable: true },
  { name: 'LinkedIn EU',  url: 'https://www.linkedin.com/jobs/search/?location=European+Union',        color: '#0A66C2', abbr: 'LI' },
  { name: 'Glassdoor EU', url: 'https://www.glassdoor.co.uk/Job/europe-jobs-SRCH_IL.0,6_IS4080.htm',  color: '#0CAA41', abbr: 'GD' },
  { name: 'Indeed EU',    url: 'https://www.indeed.com/jobs?l=Europe',                                 color: '#2164F3', abbr: 'ID' },
  { name: 'Remote OK',    url: 'https://remoteok.com',                                                 color: '#10B981', abbr: 'RO', scrapable: true },
  { name: 'EuroEngineer', url: 'https://www.eurengineer.com/en/jobs',                                  color: '#DC2626', abbr: 'EE', scrapable: true },
  { name: 'StackOverflow',url: 'https://stackoverflow.com/jobs',                                       color: '#F48024', abbr: 'SO' },
];

// ─── Board Icon Card ──────────────────────────────────────────────────────────

function BoardIcon({
  board, scrapingId, onScrape, lang
}: {
  board: BoardEntry;
  scrapingId: string | null;
  onScrape: (board: BoardEntry) => void;
  lang: 'en' | 'fi';
}) {
  const isThisOne = scrapingId === board.name;
  const isAny = !!scrapingId;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <a
        href={board.url}
        target="_blank"
        rel="noreferrer"
        title={`Visit ${board.name}`}
        className="group flex flex-col items-center gap-2 p-2.5 rounded-xl border border-border-warm bg-bg-card hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-all cursor-pointer w-full"
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-extrabold text-[11px] shadow-sm group-hover:scale-110 transition-transform relative"
          style={{ backgroundColor: board.color }}
        >
          {isThisOne ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            board.abbr
          )}
        </div>
        <span className="text-[9px] font-semibold text-text-muted group-hover:text-text-main text-center leading-tight w-full text-center transition-colors truncate">
          {board.name}
        </span>
      </a>
      {board.scrapable && (
        <button
          onClick={() => onScrape(board)}
          disabled={isAny}
          title={lang === 'en' ? `Scrape live jobs from ${board.name}` : `Skrapaa töitä: ${board.name}`}
          className={`w-full text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-0.5 ${
            isThisOne
              ? 'bg-brand-primary/15 border-brand-primary/30 text-brand-primary animate-pulse'
              : 'bg-bg-base border-border-warm text-text-muted hover:border-brand-primary/50 hover:text-brand-primary'
          }`}
        >
          {isThisOne
            ? <><Loader2 className="w-2 h-2 animate-spin" /> {lang === 'en' ? 'Scraping' : 'Haetaan'}</>
            : <><Zap className="w-2 h-2" /> {lang === 'en' ? 'Scrape' : 'Skrapaa'}</>
          }
        </button>
      )}
    </div>
  );
}

function getSourceName(job: { sourceName?: string; sourceUrl?: string; url?: string }): string {
  if (job.sourceName) return job.sourceName;
  const targetUrl = job.sourceUrl || job.url;
  if (!targetUrl) return 'Board';
  try {
    const hostname = new URL(targetUrl).hostname;
    const cleanHost = hostname.replace('www.', '');
    if (cleanHost.includes('duunitori.fi')) return 'Duunitori';
    if (cleanHost.includes('jobly.fi')) return 'Jobly';
    if (cleanHost.includes('oikotie.fi')) return 'Oikotie';
    if (cleanHost.includes('tyomarkkinatori.fi') || cleanHost.includes('te-palvelut')) return 'TE-palvelut';
    if (cleanHost.includes('linkedin.com')) return 'LinkedIn';
    if (cleanHost.includes('glassdoor.com')) return 'Glassdoor';
    if (cleanHost.includes('wolt.com')) return 'Wolt';
    return cleanHost.split('.')[0].charAt(0).toUpperCase() + cleanHost.split('.')[0].slice(1);
  } catch (e) {
    return 'Board';
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JobFeed({ onRefreshTracker, trackedJobUrls, onTrackJobSuccess, lang = 'en' }: JobFeedProps) {
  const [feedJobs, setFeedJobs] = useState<FeedJob[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Scraper state
  const [scrapingBoardName, setScrapingBoardName] = useState<string | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);
  const [scrapeResultCount, setScrapeResultCount] = useState<number | null>(null);

  // URL Importer State
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importedJob, setImportedJob] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [missingKeyError, setMissingKeyError] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const categories = ['All', 'Tech', 'Design', 'Management', 'Marketing', 'Operations'];
  const t = translations[lang];

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; jobs?: any[] }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChatMessages([{ role: 'assistant', content: t.uraMoi }]);
  }, [lang, t.uraMoi]);

  useEffect(() => {
    if (chatMessages.length > 1) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [chatMessages]);

  const handleSendChatMessage = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = customQuery || chatInput;
    if (!query.trim()) return;
    const userMsg = { role: 'user' as const, content: query };
    setChatMessages(prev => [...prev, userMsg]);
    if (!customQuery) setChatInput('');
    setIsChatLoading(true);
    setChatError(null);
    try {
      const chatHistory = chatMessages.concat(userMsg).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chatbot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply, jobs: data.jobs }]);
      } else {
        setChatError(data.error || t.chatbotError);
      }
    } catch (err) {
      setChatError(t.networkErrorChat);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAddScrapedJobToFeed = (job: any) => {
    setFeedJobs(prev => {
      if (prev.some(j => j.url === job.url)) return prev;
      return [job as FeedJob, ...prev];
    });
    alert(t.addedToFeedAlert.replace('{title}', job.title));
  };

  const fetchFeed = useCallback(async (categoryName: string) => {
    setLoadingFeed(true);
    try {
      const res = await fetch(`/api/jobs/feed?category=${categoryName}`);
      if (res.ok) setFeedJobs(await res.json());
    } catch (err) {
      console.error('Error fetching job feed:', err);
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => { fetchFeed('All'); }, [fetchFeed]);

  // ── Playwright scraper per board ────────────────────────────────────────────
  const handleScrapeBoard = async (board: BoardEntry) => {
    if (scrapingBoardName) return;
    setScrapingBoardName(board.name);
    setScrapeStatus(lang === 'en' ? `Launching Chromium headless browser for ${board.name}…` : `Käynnistetään Chromium-selain sivulle ${board.name}…`);
    setScrapeResultCount(null);

    try {
      const res = await fetch('/api/jobs/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: board.name, boardUrl: board.scrapeUrl || board.url, boardName: board.name }),
      });
      const data = await res.json();
      if (res.ok && data.jobs?.length > 0) {
        setFeedJobs(prev => {
          const existingUrls = new Set(prev.map(j => j.url));
          const fresh = (data.jobs as FeedJob[]).filter(j => !existingUrls.has(j.url));
          return [...fresh, ...prev];
        });
        setScrapeResultCount(data.count);
        setScrapeStatus(
          lang === 'en'
            ? `✓ Found ${data.count} live jobs from ${board.name}`
            : `✓ Löydettiin ${data.count} avointa paikkaa – ${board.name}`
        );
        setTimeout(() => { setScrapeStatus(null); setScrapeResultCount(null); }, 5000);
      } else if (res.ok) {
        setScrapeStatus(lang === 'en' ? `No jobs found on ${board.name}. Site may block scrapers.` : `Töitä ei löydetty – ${board.name} saattaa estää skrapauksen.`);
        setTimeout(() => setScrapeStatus(null), 6000);
      } else {
        setScrapeStatus(data.error || (lang === 'en' ? 'Scraping failed.' : 'Skrapaus epäonnistui.'));
        setTimeout(() => setScrapeStatus(null), 6000);
      }
    } catch (err) {
      setScrapeStatus(lang === 'en' ? 'Network error during scraping.' : 'Verkkovirhe skraupauksessa.');
      setTimeout(() => setScrapeStatus(null), 6000);
    } finally {
      setScrapingBoardName(null);
    }
  };

  // ── Track & Import ──────────────────────────────────────────────────────────
  const handleTrackJob = async (job: Partial<FeedJob>) => {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: job.title, company: job.company, location: job.location,
          description: job.description, requirements: job.requirements, url: job.url,
          status: 'TO_APPLY',
          notes: lang === 'en'
            ? `Added from ${job.sourceName || 'job board'}.`
            : `Lisätty sivustolta ${job.sourceName || 'työpaikkasivusto'}.`
        })
      });
      if (res.ok) {
        const newJob = await res.json();
        setSuccessMsg(t.addedTrackerSuccess.replace('{title}', job.title || '').replace('{company}', job.company || ''));
        setTimeout(() => setSuccessMsg(null), 4000);
        if (onTrackJobSuccess) onTrackJobSuccess(newJob.id);
        else onRefreshTracker();
      } else {
        const err = await res.json();
        alert(err.error || t.failedAddTracker);
      }
    } catch (err) { console.error(err); }
  };

  const handleImportUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;
    setIsImporting(true);
    setImportError(null);
    setMissingKeyError(false);
    setImportedJob(null);
    try {
      const res = await fetch('/api/jobs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl })
      });
      const data = await res.json();
      if (res.ok) {
        setImportedJob(data);
      } else {
        if (data.missingKey) setMissingKeyError(true);
        else setImportError(data.error || (lang === 'en' ? 'Failed to parse webpage.' : 'Verkkosivun jäsentäminen epäonnistui.'));
      }
    } catch (err) {
      setImportError(lang === 'en' ? 'Network error.' : 'Verkkovirhe.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importedJob) return;
    await handleTrackJob(importedJob);
    setImportedJob(null);
    setImportUrl('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── SCRAPING PROGRESS BANNER ─── shown globally while Playwright runs ── */}
      {scrapingBoardName && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-primary/8 border border-brand-primary/25 animate-card-slide">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
            <Loader2 className="w-4 h-4 text-brand-primary absolute inset-0 m-auto animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-brand-primary">
              {lang === 'en' ? '⚡ Playwright scraper running' : '⚡ Playwright-skrapaus käynnissä'}
              <span className="ml-1.5 text-text-muted font-normal">— {scrapingBoardName}</span>
            </p>
            <p className="text-[10px] text-text-muted mt-0.5 truncate">{scrapeStatus}</p>
          </div>
          {/* Animated dots */}
          <div className="flex gap-1 flex-shrink-0">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Scrape result notification (non-scraping state) */}
      {!scrapingBoardName && scrapeStatus && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2 max-w-fit shadow-sm animate-card-slide ${
          scrapeResultCount !== null && scrapeResultCount > 0
            ? 'bg-status-offer/5 border-status-offer/20 text-status-offer'
            : 'bg-status-rejected/5 border-status-rejected/20 text-status-rejected'
        }`}>
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-semibold">{scrapeStatus}</span>
        </div>
      )}

      {/* ── JOB BOARD DIRECTORY ───────────────────────────────────────────────── */}
      <div className="glass-panel p-5 rounded-2xl border border-brand-primary/15 bg-gradient-to-br from-brand-primary/[0.01] to-bg-card relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-40 h-40 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-3 mb-4">
          <Globe className="text-brand-primary w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-text-main text-base">
              {lang === 'en' ? 'Job Board Directory' : 'Työpaikkasivustot'}
            </h3>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              {lang === 'en'
                ? 'Browse any board → find a listing → paste its URL below to save to Kanban. Boards marked ⚡ can be scraped locally by Playwright.'
                : 'Selaa sivustoja → löydä ilmoitus → liitä URL alle Kanban-tallennukseen. ⚡-merkityt sivustot tukevat Playwright-skraupausta.'}
            </p>
          </div>
        </div>

        {/* Finland */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base leading-none">🇫🇮</span>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              {lang === 'en' ? 'Finland' : 'Suomi'}
            </span>
            <div className="flex-1 h-px bg-border-warm" />
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
            {FINLAND_BOARDS.map(b => (
              <BoardIcon key={b.name} board={b} scrapingId={scrapingBoardName} onScrape={handleScrapeBoard} lang={lang} />
            ))}
          </div>
        </div>

        {/* EU Region */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base leading-none">🇪🇺</span>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              {lang === 'en' ? 'EU Region' : 'EU-alue'}
            </span>
            <div className="flex-1 h-px bg-border-warm" />
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
            {EU_BOARDS.map(b => (
              <BoardIcon key={b.name} board={b} scrapingId={scrapingBoardName} onScrape={handleScrapeBoard} lang={lang} />
            ))}
          </div>
        </div>
      </div>

      {/* ── URL IMPORTER ─────────────────────────────────────────────────────── */}
      <div className="glass-panel p-5 rounded-2xl border border-brand-primary/15 bg-gradient-to-br from-brand-primary/[0.03] to-bg-card relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-32 h-32 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="text-brand-primary w-5 h-5 animate-pulse" />
          <h3 className="font-bold text-text-main text-base">{t.smartImporter}</h3>
          <span className="text-[9px] px-2 py-0.5 rounded border border-brand-primary/10 bg-brand-primary/10 text-brand-primary font-bold uppercase tracking-wider">
            {t.poweredByGemini}
          </span>
        </div>
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          {lang === 'en'
            ? 'Find a job on any board above → copy its URL → paste here. Gemini extracts the details and saves it straight to your Kanban board.'
            : 'Löydä haluamasi ilmoitus → kopioi URL → liitä tähän. Gemini poimii tiedot ja tallentaa ne Kanban-seurantaasi.'}
        </p>

        <form onSubmit={handleImportUrl} className="flex gap-2 max-w-3xl">
          <input
            type="url" required value={importUrl}
            onChange={e => setImportUrl(e.target.value)}
            placeholder={t.pasteUrlPlaceholder}
            className="flex-1 px-4 py-2.5 text-sm bg-bg-base border border-border-warm rounded-xl focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/45 text-text-main placeholder-text-muted/40"
          />
          <button type="submit" disabled={isImporting}
            className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-semibold text-sm shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5 disabled:opacity-50">
            {isImporting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.analyzing}</> : t.parseUrl}
          </button>
        </form>

        {missingKeyError && (
          <div className="mt-4 p-4 bg-status-in-progress/5 border border-status-in-progress/20 rounded-xl flex items-start gap-3 max-w-3xl animate-card-slide">
            <AlertCircle className="text-status-in-progress w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-status-in-progress">{t.geminiKeyMissing}</h5>
              <p className="text-[11px] text-text-muted">{t.geminiKeyInstructions}</p>
              <pre className="text-[10px] bg-bg-base/75 p-2 rounded border border-border-warm font-mono text-text-main select-all max-w-fit font-bold">GEMINI_API_KEY=your_gemini_api_key_here</pre>
              <p className="text-[11px] text-text-muted">{t.geminiKeyRestart}</p>
            </div>
          </div>
        )}

        {importError && (
          <div className="mt-4 p-4 bg-status-rejected/5 border border-status-rejected/20 rounded-xl flex items-start gap-3 max-w-3xl animate-card-slide">
            <AlertCircle className="text-status-rejected w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="text-xs font-bold text-status-rejected">{t.couldNotExtract}</h5>
              <p className="text-[11px] text-text-muted mt-0.5">{importError}. {t.blockScanningDesc}</p>
            </div>
          </div>
        )}

        {importedJob && (
          <div className="mt-4 p-4 bg-bg-card border border-border-warm rounded-xl max-w-3xl space-y-4 shadow-sm animate-card-slide">
            <div className="flex justify-between items-start border-b border-border-warm pb-3">
              <div>
                <span className="text-[9px] text-brand-primary font-bold tracking-wider uppercase">{t.extractedPreview}</span>
                <h4 className="font-bold text-text-main text-base mt-0.5">{importedJob.title}</h4>
                <p className="text-xs text-text-muted font-medium">{importedJob.company} &bull; {importedJob.location || (lang === 'en' ? 'Unknown Location' : 'Tuntematon sijainti')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setImportedJob(null)}
                  className="px-3 py-1.5 text-xs bg-bg-base hover:bg-border-warm text-text-muted rounded-lg cursor-pointer">{t.discard}</button>
                <button onClick={handleConfirmImport}
                  className="px-4 py-1.5 text-xs bg-status-offer hover:bg-status-offer/95 text-white font-semibold rounded-lg shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> {t.saveToToApply}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <span className="text-text-muted font-semibold">{t.techStackSkills}</span>
                <p className="text-text-main font-medium bg-bg-base p-2.5 rounded-lg border border-border-warm leading-relaxed">{importedJob.requirements || t.noReqsExtracted}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-text-muted font-semibold">{t.descSummary}</span>
                <p className="text-text-muted leading-relaxed bg-bg-base p-2.5 rounded-lg border border-border-warm line-clamp-4">{importedJob.description || t.noDescExtracted}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUCCESS TOAST */}
      {successMsg && (
        <div className="p-3.5 bg-status-offer/5 border border-status-offer/20 text-status-offer rounded-xl flex items-center gap-2 max-w-fit shadow-sm animate-card-slide">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-semibold">{successMsg}</span>
        </div>
      )}

      {/* ── JOBS FEED + CHATBOT ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left: Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-text-main text-base">{t.vacanciesFeed}</h3>
              <p className="text-[10px] text-text-muted mt-0.5">
                {lang === 'en'
                  ? 'Live listings from Duunitori · Scraped results appear here · Paste any URL above to save to Kanban'
                  : 'Live-ilmoitukset Duunitorilta · Skrapatut tulokset näkyvät tässä · Liitä URL yllä tallenntaaksesi Kanbaniin'}
              </p>
            </div>
          </div>

          {/* Category Filter + Refresh */}
          <div className="bg-bg-card/30 p-4 rounded-2xl border border-border-warm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{t.categoryFilter}</span>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => { setActiveCategory(cat); fetchFeed(cat); }}
                      className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                        activeCategory === cat
                          ? 'bg-brand-primary border-brand-primary text-white'
                          : 'bg-bg-card border-border-warm text-text-muted hover:border-border-hover hover:text-text-main'
                      }`}>
                      {t.categories[cat as keyof typeof t.categories] || cat}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => fetchFeed(activeCategory)} disabled={loadingFeed}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg border border-border-warm bg-bg-card hover:bg-bg-base hover:text-text-main text-xs font-semibold text-text-muted transition-all disabled:opacity-50 cursor-pointer self-end sm:self-auto">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFeed ? 'animate-spin' : ''}`} /> {t.refreshFeed}
              </button>
            </div>
          </div>

          {/* Feed Grid */}
          {loadingFeed ? (
            <div className="flex flex-col items-center justify-center p-20 border border-dashed border-border-warm rounded-2xl bg-bg-card/20">
              <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-3" />
              <span className="text-sm text-text-muted">{t.loadingListings}</span>
            </div>
          ) : feedJobs.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border-warm rounded-2xl bg-bg-card/10">
              <span className="text-sm text-text-muted">{t.noJobsFound}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedJobs.map(job => {
                const isAlreadyTracked = trackedJobUrls.includes(job.url);
                // Determine a clean source label
                const source = getSourceName(job);
                // Hide generic placeholder descriptions from the scraper
                const isPlaceholder = job.description?.startsWith('Live vacancy from') || job.description?.startsWith('Found on');
                return (
                  <div key={job.id}
                    className="glass-panel p-4 rounded-xl border border-border-warm bg-bg-card hover:border-brand-primary/45 flex flex-col justify-between glow-card">

                    {/* Header row: source + category */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <a href={job.sourceUrl || job.url} target="_blank" rel="noreferrer"
                        className="text-[9px] px-2 py-0.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-bold tracking-wider uppercase hover:bg-brand-primary/25 transition-colors truncate max-w-[60%]">
                        {source}
                      </a>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-bg-base border border-border-warm text-text-muted font-bold tracking-wider uppercase flex-shrink-0">
                        {t.categories[job.category as keyof typeof t.categories] || job.category}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-text-main text-sm line-clamp-1">{job.title}</h4>
                      <p className="text-xs text-brand-primary font-bold mt-0.5">{job.company}</p>
                      <div className="flex items-center gap-1 text-[10px] text-text-muted mt-2 font-medium">
                        <MapPin className="w-3.5 h-3.5" /> <span>{job.location}</span>
                      </div>
                      {!isPlaceholder && (
                        <p className="text-xs text-text-muted mt-3 line-clamp-3 leading-relaxed">{job.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {job.requirements.split(',').slice(0, 5).map((req, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-bg-base text-text-main border border-border-warm font-medium">
                            {req.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-warm">
                      <span className="text-[10px] text-text-muted flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" /> {job.posted}
                      </span>
                      <div className="flex items-center gap-2">
                        <a href={job.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-bg-base hover:bg-border-warm text-text-main font-semibold">
                          {source} <ExternalLink className="w-3 h-3" />
                        </a>
                        {isAlreadyTracked ? (
                          <span className="flex items-center gap-1 text-[11px] text-status-offer font-bold bg-status-offer/5 border border-status-offer/20 px-2.5 py-1 rounded-lg">
                            <CheckCircle className="w-3.5 h-3.5" /> {t.tracked}
                          </span>
                        ) : (
                          <button onClick={() => handleTrackJob(job)}
                            className="flex items-center gap-1 text-[11px] px-3 py-1 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-semibold shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                            <Plus className="w-3.5 h-3.5" /> {t.trackJob}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Ura AI Chatbot */}
        <div className="glass-panel p-5 rounded-2xl border border-brand-primary/15 bg-gradient-to-br from-brand-primary/[0.01] to-bg-card flex flex-col h-[650px]">
          <div className="flex items-center gap-2 pb-3.5 border-b border-border-warm mb-3.5">
            <div className="p-2 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
              <MessageSquare className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-text-main text-xs">{t.uraAssistant}</h4>
              <p className="text-[10px] text-text-muted">{t.uraAssistantSub}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 py-1 flex flex-col">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col space-y-2 max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                <div className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand-primary/10 border border-brand-primary/20 text-text-main rounded-tr-none font-semibold'
                    : 'bg-bg-base border border-border-warm text-text-main rounded-tl-none'
                }`} style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
                {msg.jobs && msg.jobs.length > 0 && (
                  <div className="space-y-2 max-h-56 overflow-y-auto mt-1 p-1 bg-bg-base/50 rounded-xl border border-border-warm">
                    {msg.jobs.map(job => {
                      const isTracked = trackedJobUrls.includes(job.url);
                      const source = getSourceName(job);
                      return (
                        <div key={job.id} className="p-2.5 bg-bg-card border border-border-warm rounded-lg text-[10px] space-y-1.5">
                          <div>
                            <span className="font-bold text-text-main block">{job.title}</span>
                            <span className="text-brand-primary font-semibold block">{job.company}</span>
                            <span className="text-text-muted block text-[9px]">{job.location} &bull; {job.posted}</span>
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 border-t border-border-warm/50">
                            <a href={job.url} target="_blank" rel="noreferrer"
                              className="px-2 py-1 rounded bg-bg-base hover:bg-border-warm text-text-main font-semibold flex items-center gap-0.5">
                              {source} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <button onClick={() => handleAddScrapedJobToFeed(job)}
                              className="px-2 py-1 rounded bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary font-semibold">
                              {t.addToFeed}
                            </button>
                            {isTracked ? (
                              <span className="text-status-offer font-bold ml-auto flex items-center gap-0.5">
                                <CheckCircle className="w-3 h-3" /> {t.tracked}
                              </span>
                            ) : (
                              <button onClick={() => handleTrackJob(job)}
                                className="px-2 py-1 rounded bg-brand-primary text-white font-semibold ml-auto hover:bg-brand-hover">
                                {t.track}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {isChatLoading && (
              <div className="self-start flex items-center gap-2 bg-bg-base border border-border-warm rounded-2xl rounded-tl-none px-4 py-2.5 max-w-[85%] text-xs text-text-muted">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
                <span>{t.typingAndScraping}</span>
              </div>
            )}
            {chatError && (
              <div className="self-start flex items-center gap-2 bg-status-rejected/5 border border-status-rejected/25 rounded-xl px-4 py-2 text-xs text-status-rejected font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> <span>{chatError}</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="py-2.5 border-t border-border-warm flex flex-wrap gap-1.5">
            {[
              { q: 'scrape python jobs', label: t.quickSuggestions.scrapePython },
              { q: 'find senior react developer jobs', label: t.quickSuggestions.searchReact },
              { q: 'show Wolt vacancies', label: t.quickSuggestions.findWolt },
            ].map(chip => (
              <button key={chip.q} onClick={() => handleSendChatMessage(undefined, chip.q)} disabled={isChatLoading}
                className="text-[10px] px-2.5 py-1 rounded-md border border-border-warm bg-bg-card hover:border-brand-primary/30 hover:text-brand-primary text-text-muted transition-colors cursor-pointer font-bold disabled:opacity-50">
                {chip.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendChatMessage} className="flex gap-1.5 pt-2 border-t border-border-warm">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              placeholder={isChatLoading ? t.chatInputPlaceholderLoading : t.chatInputPlaceholder}
              disabled={isChatLoading}
              className="flex-1 px-3 py-2 text-xs bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main placeholder-text-muted/40 disabled:opacity-55 font-semibold" />
            <button type="submit" disabled={isChatLoading || !chatInput.trim()}
              className="p-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 hover:scale-105 active:scale-95">
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
