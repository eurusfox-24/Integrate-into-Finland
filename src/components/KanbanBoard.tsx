'use client';

import React, { useState } from 'react';
import { 
  Plus, Briefcase, MapPin, ExternalLink, 
  Trash2, Edit3, ChevronRight, ChevronLeft, 
  FileText, CheckCircle, Clock, Sparkles, X, Save
} from 'lucide-react';
import confetti from 'canvas-confetti';
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

interface KanbanBoardProps {
  jobs: Job[];
  onRefresh: () => void;
  initialSelectedJobId?: string | null;
  onClearInitialSelectedJobId?: () => void;
  onNavigateToDocs?: (filename: string) => void;
  lang?: 'en' | 'fi';
}

const COLUMNS = [
  { id: 'TO_APPLY', color: 'border-status-to-apply/30 text-status-to-apply', badge: 'bg-badge-to-apply text-status-to-apply border border-status-to-apply/10' },
  { id: 'APPLIED', color: 'border-status-applied/30 text-status-applied', badge: 'bg-badge-applied text-status-applied border border-status-applied/10' },
  { id: 'IN_PROGRESS', color: 'border-status-in-progress/30 text-status-in-progress', badge: 'bg-badge-in-progress text-status-in-progress border border-status-in-progress/10' },
  { id: 'OFFER', color: 'border-status-offer/30 text-status-offer', badge: 'bg-badge-offer text-status-offer border border-status-offer/10' },
  { id: 'REJECTED', color: 'border-status-rejected/30 text-status-rejected', badge: 'bg-badge-rejected text-status-rejected border border-status-rejected/10' }
] as const;

export default function KanbanBoard({ 
  jobs, 
  onRefresh, 
  initialSelectedJobId, 
  onClearInitialSelectedJobId, 
  onNavigateToDocs,
  lang = 'en'
}: KanbanBoardProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorSuccess, setTailorSuccess] = useState<string | null>(null);

  const t = translations[lang];

  React.useEffect(() => {
    if (initialSelectedJobId) {
      const job = jobs.find(j => j.id === initialSelectedJobId);
      if (job) {
        handleOpenDetails(job);
        if (onClearInitialSelectedJobId) {
          onClearInitialSelectedJobId();
        }
      }
    }
  }, [initialSelectedJobId, jobs, onClearInitialSelectedJobId]);
  
  // Form States
  const [formTitle, setFormTitle] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRequirements, setFormRequirements] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<Job['status']>('TO_APPLY');

  const handleOpenAddModal = () => {
    setFormTitle('');
    setFormCompany('');
    setFormLocation('');
    setFormUrl('');
    setFormDescription('');
    setFormRequirements('');
    setFormNotes('');
    setFormStatus('TO_APPLY');
    setIsAddingJob(true);
  };

  const handleOpenDetails = (job: Job) => {
    setSelectedJob(job);
    setFormTitle(job.title);
    setFormCompany(job.company);
    setFormLocation(job.location || '');
    setFormUrl(job.url || '');
    setFormDescription(job.description || '');
    setFormRequirements(job.requirements || '');
    setFormNotes(job.notes || '');
    setFormStatus(job.status);
    setTailorSuccess(null);
    setIsEditing(false);
  };

  const handleUpdateStatus = async (jobId: string, newStatus: Job['status']) => {
    try {
      const res = await fetch('/api/jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, status: newStatus })
      });
      if (res.ok) {
        if (newStatus === 'OFFER') {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
        onRefresh();
        if (selectedJob && selectedJob.id === jobId) {
          setSelectedJob(prev => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formCompany) return;

    try {
      const url = '/api/jobs';
      const method = isEditing ? 'PUT' : 'POST';
      const payload = isEditing 
        ? { id: selectedJob?.id, title: formTitle, company: formCompany, location: formLocation, url: formUrl, description: formDescription, requirements: formRequirements, notes: formNotes, status: formStatus }
        : { title: formTitle, company: formCompany, location: formLocation, url: formUrl, description: formDescription, requirements: formRequirements, notes: formNotes, status: formStatus };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onRefresh();
        setIsAddingJob(false);
        setIsEditing(false);
        if (isEditing) {
          const updated = await res.json();
          setSelectedJob(updated);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm(t.confirmDeleteApp)) return;
    try {
      const res = await fetch(`/api/jobs?id=${jobId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onRefresh();
        setSelectedJob(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTailorCv = async () => {
    if (!selectedJob) return;
    setIsTailoring(true);
    setTailorSuccess(null);
    try {
      const res = await fetch('/api/cvs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJob.id,
          jobTitle: selectedJob.title,
          company: selectedJob.company,
          description: selectedJob.description,
          requirements: selectedJob.requirements
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTailorSuccess(data.filename);
      } else {
        alert(data.error || t.failedTailorCv);
      }
    } catch (err) {
      console.error(err);
      alert(t.errorTailoring);
    } finally {
      setIsTailoring(false);
    }
  };

  const moveStatus = (job: Job, direction: 'left' | 'right') => {
    const currentIndex = COLUMNS.findIndex(c => c.id === job.status);
    let nextIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < COLUMNS.length) {
      handleUpdateStatus(job.id, COLUMNS[nextIndex].id);
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="text-brand-primary w-5 h-5" />
          {t.appPipeline}
        </h2>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-medium shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4" /> {t.addApplication}
        </button>
      </div>

      {/* Grid columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
        {COLUMNS.map(col => {
          const colJobs = jobs.filter(j => j.status === col.id);
          return (
            <div key={col.id} className="glass-panel p-4 rounded-2xl flex flex-col min-h-[500px] bg-bg-card/30">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-warm">
                <span className="font-semibold text-sm tracking-wide text-text-main">{t.statuses[col.id]}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${col.badge}`}>
                  {colJobs.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 flex-1">
                {colJobs.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-border-warm rounded-xl p-4 text-center">
                    <span className="text-xs text-text-muted">{t.noJobsTracked}</span>
                  </div>
                ) : (
                  colJobs.map(job => (
                    <div 
                      key={job.id}
                      onClick={() => handleOpenDetails(job)}
                      className="glass-panel p-3.5 rounded-xl cursor-pointer glow-card border border-border-warm bg-bg-card hover:border-brand-primary/40 animate-card-slide flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h4 className="font-bold text-sm text-text-main line-clamp-1 hover:text-brand-primary">{job.title}</h4>
                        </div>
                        <p className="text-xs text-brand-primary font-semibold mb-2">{job.company}</p>
                        {job.location && (
                          <div className="flex items-center gap-1 text-[11px] text-text-muted mb-2">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="line-clamp-1">{job.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Footer controls */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-warm" onClick={e => e.stopPropagation()}>
                        <button 
                          disabled={job.status === 'TO_APPLY'}
                          onClick={() => moveStatus(job, 'left')}
                          className="p-1 rounded bg-bg-base hover:bg-border-warm text-text-muted disabled:opacity-30 disabled:hover:bg-bg-base cursor-pointer"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        
                        <div className="flex items-center gap-1.5">
                          {job.url && (
                            <a href={job.url} target="_blank" rel="noreferrer" className="p-1 rounded bg-bg-base hover:bg-border-warm text-text-muted">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button onClick={() => handleDeleteJob(job.id)} className="p-1 rounded bg-bg-base hover:bg-status-rejected/10 text-text-muted hover:text-status-rejected cursor-pointer">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <button 
                          disabled={job.status === 'REJECTED'}
                          onClick={() => moveStatus(job, 'right')}
                          className="p-1 rounded bg-bg-base hover:bg-border-warm text-text-muted disabled:opacity-30 disabled:hover:bg-bg-base cursor-pointer"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Add / Edit Modal */}
      {(isAddingJob || (isEditing && selectedJob)) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-border-warm bg-bg-card shadow-2xl overflow-hidden animate-card-slide">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border-warm bg-bg-base/40">
              <h3 className="font-bold text-text-main text-base">
                {isEditing ? t.editJobApp : t.addNewJobApp}
              </h3>
              <button 
                onClick={() => { setIsAddingJob(false); setIsEditing(false); }}
                className="text-text-muted hover:text-text-main cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">{t.jobTitleReq}</label>
                  <input 
                    type="text" required value={formTitle} onChange={e => setFormTitle(e.target.value)}
                    placeholder={lang === 'en' ? "e.g. Frontend Developer" : "esim. Frontend-kehittäjä"}
                    className="w-full px-3 py-2 text-sm bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/45 text-text-main"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">{t.companyReq}</label>
                  <input 
                    type="text" required value={formCompany} onChange={e => setFormCompany(e.target.value)}
                    placeholder={lang === 'en' ? "e.g. Wolt" : "esim. Wolt"}
                    className="w-full px-3 py-2 text-sm bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/45 text-text-main"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">{t.location}</label>
                  <input 
                    type="text" value={formLocation} onChange={e => setFormLocation(e.target.value)}
                    placeholder={lang === 'en' ? "e.g. Helsinki, Finland" : "esim. Helsinki, Suomi"}
                    className="w-full px-3 py-2 text-sm bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/45 text-text-main"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">{t.jobPostUrl}</label>
                  <input 
                    type="url" value={formUrl} onChange={e => setFormUrl(e.target.value)}
                    placeholder="https://company.com/job"
                    className="w-full px-3 py-2 text-sm bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/45 text-text-main"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">{t.statusLabel}</label>
                <select 
                  value={formStatus} onChange={e => setFormStatus(e.target.value as Job['status'])}
                  className="w-full px-3 py-2 text-sm bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/45 text-text-main"
                >
                  <option value="TO_APPLY">{t.statuses.TO_APPLY}</option>
                  <option value="APPLIED">{t.statuses.APPLIED}</option>
                  <option value="IN_PROGRESS">{t.statuses.IN_PROGRESS}</option>
                  <option value="OFFER">{t.statuses.OFFER}</option>
                  <option value="REJECTED">{t.statuses.REJECTED}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">{t.jobDescription}</label>
                <textarea 
                  rows={3} value={formDescription} onChange={e => setFormDescription(e.target.value)}
                  placeholder={lang === 'en' ? "Paste details of the role..." : "Liitä tehtävän tiedot..."}
                  className="w-full px-3 py-2 text-sm bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/45 text-text-main"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">{t.coreTechReqs}</label>
                <input 
                  type="text" value={formRequirements} onChange={e => setFormRequirements(e.target.value)}
                  placeholder="TypeScript, React, Node.js"
                  className="w-full px-3 py-2 text-sm bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/45 text-text-main"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1">{t.myNotesLabel}</label>
                <textarea 
                  rows={2} value={formNotes} onChange={e => setFormNotes(e.target.value)}
                  placeholder={lang === 'en' ? "Note down recruiter names, interview dates, etc..." : "Kirjoita muistiin rekrytoijan nimet, haastattelupäivät jne..."}
                  className="w-full px-3 py-2 text-sm bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/45 text-text-main"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setIsAddingJob(false); setIsEditing(false); }}
                  className="px-4 py-2 rounded-lg bg-bg-base hover:bg-border-warm text-text-main text-sm transition-all cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-semibold text-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Save className="w-4 h-4" /> {t.saveApplication}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Slide-out Drawer */}
      {selectedJob && !isEditing && (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
            onClick={() => setSelectedJob(null)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-lg glass-panel h-full border-l border-border-warm bg-bg-card shadow-2xl flex flex-col justify-between z-10 animate-card-slide">
            <div className="flex justify-between items-center px-6 py-5 border-b border-border-warm bg-bg-base/40">
              <div>
                <h3 className="font-bold text-text-main text-lg">{selectedJob.title}</h3>
                <span className="text-brand-primary font-semibold text-sm">{selectedJob.company}</span>
              </div>
              <button 
                onClick={() => setSelectedJob(null)}
                className="p-1.5 rounded bg-bg-base hover:bg-border-warm text-text-muted hover:text-text-main cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable details content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Indicator */}
              <div className="flex items-center justify-between p-3.5 bg-bg-base border border-border-warm rounded-xl">
                <span className="text-xs font-semibold text-text-muted">{t.currentPhase}</span>
                <select 
                  value={selectedJob.status}
                  onChange={e => handleUpdateStatus(selectedJob.id, e.target.value as Job['status'])}
                  className="text-xs px-3 py-1.5 font-bold rounded-lg bg-bg-card border border-border-warm text-text-main focus:outline-none focus:border-brand-primary"
                >
                  <option value="TO_APPLY">{t.statuses.TO_APPLY}</option>
                  <option value="APPLIED">{t.statuses.APPLIED}</option>
                  <option value="IN_PROGRESS">{t.statuses.IN_PROGRESS}</option>
                  <option value="OFFER">{t.statuses.OFFER}</option>
                  <option value="REJECTED">{t.statuses.REJECTED}</option>
                </select>
              </div>

              {/* Basic metadata */}
              <div className="grid grid-cols-2 gap-4">
                {selectedJob.location && (
                  <div className="space-y-1">
                    <span className="text-xs text-text-muted font-medium">{t.location}</span>
                    <p className="text-sm text-text-main flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-text-muted" />
                      {selectedJob.location}
                    </p>
                  </div>
                )}
                {selectedJob.url && (
                  <div className="space-y-1">
                    <span className="text-xs text-text-muted font-medium">{t.jobPostUrl}</span>
                    <p className="text-sm">
                      <a href={selectedJob.url} target="_blank" rel="noreferrer" className="text-brand-primary hover:text-brand-hover flex items-center gap-1 font-semibold">
                        {t.viewBoard} <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </p>
                  </div>
                )}
              </div>

              {/* Tech stack tags */}
              {selectedJob.requirements && (
                <div className="space-y-2">
                  <span className="text-xs text-text-muted font-medium">{t.coreTechReqs}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJob.requirements.split(',').map((req, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded bg-bg-base border border-border-warm text-text-main font-medium">
                        {req.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedJob.description && (
                <div className="space-y-2">
                  <span className="text-xs text-text-muted font-medium">{t.jobDetails}</span>
                  <p className="text-sm text-text-muted whitespace-pre-wrap bg-bg-base/50 p-4 border border-border-warm rounded-xl leading-relaxed">
                    {selectedJob.description}
                  </p>
                </div>
              )}

              {/* User notes */}
              <div className="space-y-2">
                <span className="text-xs text-text-muted font-medium">{t.appNotes}</span>
                <p className="text-sm text-text-muted whitespace-pre-wrap bg-bg-base/50 p-4 border border-border-warm rounded-xl leading-relaxed">
                  {selectedJob.notes || <span className="text-text-muted/65 italic">{t.noNotesPlaceholder}</span>}
                </p>
              </div>

              {/* AI CV Tailoring Section */}
              <div className="space-y-3 p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> {t.aiCvTailoring}
                  </span>
                  <span className="text-[10px] text-text-muted">{t.usingGeminiCli}</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {t.tailorDesc}
                </p>
                
                {tailorSuccess ? (
                  <div className="p-3 bg-status-offer/5 border border-status-offer/20 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-status-offer font-bold">
                      <CheckCircle className="w-4 h-4" /> {t.tailorSuccessMsg}
                    </div>
                    <p className="text-[11px] text-text-main font-mono select-all truncate bg-bg-base/75 p-1.5 rounded border border-border-warm font-semibold">
                      {tailorSuccess}
                    </p>
                    <button
                      onClick={() => {
                        if (onNavigateToDocs) {
                          onNavigateToDocs(tailorSuccess);
                        }
                      }}
                      className="mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-offer hover:bg-status-offer/95 text-white text-xs font-semibold shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      {t.openCvEditor} <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={isTailoring}
                    onClick={handleTailorCv}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-semibold text-xs shadow-sm disabled:opacity-40 transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    {isTailoring ? (
                      <>
                        <Clock className="w-3.5 h-3.5 animate-spin" /> {t.tailoringResumeProgress}
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5" /> {t.tailorBaseCvBtn}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-6 py-4 border-t border-border-warm bg-bg-base/40 flex gap-3">
              <button 
                onClick={() => setIsEditing(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border-warm text-text-main bg-bg-card hover:bg-bg-base text-sm font-semibold transition-all cursor-pointer"
              >
                <Edit3 className="w-4 h-4" /> {t.editDetails}
              </button>
              <button 
                onClick={() => handleDeleteJob(selectedJob.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-status-rejected/10 border border-status-rejected/20 text-status-rejected hover:bg-status-rejected/20 text-sm font-semibold transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> {t.deleteTracker}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
