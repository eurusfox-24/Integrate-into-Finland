'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, ExternalLink, RefreshCw, Loader2, 
  Calendar, HardDrive, AlertCircle, FileCode,
  Upload, Save, Sparkles, X, Check, FileCheck,
  User, Download, Printer, Plus, Mail, Link2, Code2, Briefcase, GraduationCap, Sliders, Palette
} from 'lucide-react';
import { marked } from 'marked';
import { translations } from '@/utils/translations';

interface CvFile {
  filename: string;
  url: string;
  sizeBytes: number;
  updatedAt: string;
  filetype: 'PDF' | 'MD' | 'DOCX' | 'TXT' | 'OTHER';
  isBaseCv?: boolean;
}

interface Job {
  id: string;
  title: string;
  company: string;
  status: string;
  description?: string;
  requirements?: string;
}

const CAREER_ARCHETYPES = [
  { id: 'LLMOps', name: 'AI Platform / LLMOps', description: 'Pipelines, evals, monitoring, reliability, observability' },
  { id: 'Agentic', name: 'Agentic / Automation', description: 'Agent orchestration, human-in-the-loop (HITL), workflows, multi-agent' },
  { id: 'TechnicalPM', name: 'Technical AI PM', description: 'PRDs, roadmaps, discovery, stakeholders, product management' },
  { id: 'SolutionsArchitect', name: 'AI Solutions Architect', description: 'Architecture, enterprise integration, systems design' },
  { id: 'ForwardDeployed', name: 'AI Forward Deployed', description: 'Client-facing, prototypes, fast delivery, field deployment' },
  { id: 'Transformation', name: 'AI Transformation', description: 'Change management, adoption, enablement, training' },
];

interface DocumentExplorerProps {
  selectedDocFilename?: string | null;
  onClearSelectedDoc?: () => void;
  lang?: 'en' | 'fi';
}

export default function DocumentExplorer({ selectedDocFilename, onClearSelectedDoc, lang = 'en' }: DocumentExplorerProps) {
  const [files, setFiles] = useState<CvFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<CvFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  
  // UI Loading States
  const [loadingList, setLoadingList] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Upload States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'tailored' | 'base'>('tailored');
  const [uploadJobId, setUploadJobId] = useState<string>('none');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Create CV States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFilename, setCreateFilename] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Profile Context Drawer States
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isParsingProfile, setIsParsingProfile] = useState(false);
  const [profileParseError, setProfileParseError] = useState<string | null>(null);

  // Profile Form Context fields
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formSkills, setFormSkills] = useState('');
  const [formExperience, setFormExperience] = useState('');
  const [formProjects, setFormProjects] = useState('');
  const [formEducation, setFormEducation] = useState('');

  // Job Applications list for upload & tailoring linkage
  const [jobs, setJobs] = useState<Job[]>([]);

  // Editor States
  const [activeReaderTab, setActiveReaderTab] = useState<'preview' | 'edit' | 'refine' | 'tailor'>('preview');
  const [selectedTemplate, setSelectedTemplate] = useState<'minimalist' | 'serif' | 'executive' | 'creative'>('minimalist');
  const [editedMarkdown, setEditedMarkdown] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  
  // AI Editing States (AI Refine Tab)
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [selectedArchetype, setSelectedArchetype] = useState<string>('');
  const [jobDescriptionInput, setJobDescriptionInput] = useState<string>('');
  const [isEditingAI, setIsEditingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AI Tailoring States (AI Tailor Tab)
  const [tailorJobId, setTailorJobId] = useState<string>('none');
  const [tailorArchetype, setTailorArchetype] = useState<string>('');
  const [tailorCustomJobTitle, setTailorCustomJobTitle] = useState('');
  const [tailorCustomCompany, setTailorCustomCompany] = useState('');
  const [tailorCustomDesc, setTailorCustomDesc] = useState('');
  const [tailorCustomReqs, setTailorCustomReqs] = useState('');
  const [isGeneratingTailor, setIsGeneratingTailor] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [tailorSuccess, setTailorSuccess] = useState<string | null>(null);

  const t = translations[lang];

  const fetchFiles = useCallback(async () => {
    setLoadingList(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/cvs');
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
        // Automatically select the base-cv if no file is selected yet
        if (!selectedFile && data.length > 0) {
          const base = data.find((f: CvFile) => f.isBaseCv);
          if (base) {
            loadFileContent(base);
          } else {
            loadFileContent(data[0]);
          }
        }
      } else {
        setErrorMsg(t.failedListCvs);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(t.errorFileApi);
    } finally {
      setLoadingList(false);
    }
  }, [selectedFile, t.failedListCvs, t.errorFileApi]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error("Error fetching jobs list for dropdown:", err);
    }
  }, []);

  const loadProfileContext = useCallback(async () => {
    try {
      const res = await fetch('/api/cvs/base');
      if (res.ok) {
        const data = await res.json();
        importMarkdownToForm(data.content);
      }
    } catch (err) {
      console.error("Error loading profile context:", err);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    fetchJobs();
    loadProfileContext();
  }, []); // Run once on mount

  const loadFileContent = async (file: CvFile) => {
    setSelectedFile(file);
    setActiveReaderTab('preview');
    setAiMessage(null);
    setAiPrompt('');
    setSelectedArchetype('');
    setJobDescriptionInput('');
    setTailorJobId('none');
    setTailorArchetype('');
    setTailorSuccess(null);
    setTailorError(null);

    if (file.filetype === 'PDF' || file.filetype === 'DOCX') {
      setFileContent('');
      setEditedMarkdown('');
      return;
    }

    setLoadingContent(true);
    try {
      const fetchUrl = file.isBaseCv 
        ? '/api/cvs?filename=base-cv.md' 
        : `/api/cvs?filename=${encodeURIComponent(file.filename)}`;
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const text = await res.text();
        setFileContent(text);
        setEditedMarkdown(text);
      } else {
        setFileContent(t.failedLoadContent);
        setEditedMarkdown('');
      }
    } catch (err) {
      console.error(err);
      setFileContent(t.errorReadingServer);
      setEditedMarkdown('');
    } finally {
      setLoadingContent(false);
    }
  };

  // Handle deep-linking selected doc
  useEffect(() => {
    if (selectedDocFilename && files.length > 0) {
      const matched = files.find(f => f.filename === selectedDocFilename);
      if (matched) {
        loadFileContent(matched);
        if (onClearSelectedDoc) {
          onClearSelectedDoc();
        }
      }
    }
  }, [selectedDocFilename, files, onClearSelectedDoc]);

  const handleOpenSystem = async (file: CvFile) => {
    try {
      const res = await fetch('/api/cvs/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.filename })
      });
      if (!res.ok) {
        alert(t.couldNotOpenViewer);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save manual edits
  const handleSaveManualEdit = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    setAiMessage(null);

    try {
      const blob = new Blob([editedMarkdown], { type: 'text/markdown' });
      const file = new File([blob], selectedFile.filename, { type: 'text/markdown' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', selectedFile.isBaseCv ? 'base' : 'tailored');

      const res = await fetch('/api/cvs/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setFileContent(editedMarkdown);
        setAiMessage({ type: 'success', text: t.changesSavedSuccess });
        fetchFiles();
      } else {
        setAiMessage({ type: 'error', text: data.error || t.failedSaveFile });
      }
    } catch (err: any) {
      console.error(err);
      setAiMessage({ type: 'error', text: err.message || t.networkErrorSaving });
    } finally {
      setIsSaving(false);
    }
  };

  // Run AI Refinement using Gemini + career-ops skills
  const handleAiRefine = async () => {
    if (!selectedFile || !aiPrompt) return;
    setIsEditingAI(true);
    setAiMessage(null);

    try {
      const res = await fetch('/api/cvs/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.isBaseCv ? 'base-cv.md' : selectedFile.filename,
          prompt: aiPrompt,
          archetype: selectedArchetype || undefined,
          jobDescription: jobDescriptionInput || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setEditedMarkdown(data.content);
        setFileContent(data.content);
        setAiPrompt('');
        setAiMessage({ 
          type: 'success', 
          text: t.cvEditedAiSuccess 
        });
        fetchFiles();
      } else {
        setAiMessage({ type: 'error', text: data.error || t.failedEditAi });
      }
    } catch (err: any) {
      console.error(err);
      setAiMessage({ type: 'error', text: err.message || t.networkErrorAiEdit });
    } finally {
      setIsEditingAI(false);
    }
  };

  // Handle Document Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError(t.selectUploadFileError);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('type', uploadType);
      if (uploadType === 'tailored' && uploadJobId !== 'none') {
        formData.append('jobId', uploadJobId);
      }

      const res = await fetch('/api/cvs/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setUploadSuccess(data.message || t.fileUploadedSuccess);
        setUploadFile(null);
        // Reset file input element
        const fileInput = document.getElementById('cv-file-upload-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        fetchFiles();
        setTimeout(() => {
          setIsUploadModalOpen(false);
          setUploadSuccess(null);
        }, 1500);
      } else {
        setUploadError(data.error || t.failedUploadFile);
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || t.networkErrorUpload);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle new document creation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFilename.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/cvs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: createFilename })
      });
      const data = await res.json();
      if (res.ok) {
        setIsCreateModalOpen(false);
        setCreateFilename('');
        await fetchFiles();
        
        // Select and open the new file in edit mode
        const newFile: CvFile = {
          filename: data.filename,
          url: `/cvs/${data.filename}`,
          sizeBytes: 0,
          updatedAt: new Date().toISOString(),
          filetype: 'MD',
          isBaseCv: false
        };
        await loadFileContent(newFile);
        setActiveReaderTab('edit');
      } else {
        alert(data.error || t.failedCreateDoc);
      }
    } catch (err) {
      console.error(err);
      alert(t.networkErrorCreateDoc);
    } finally {
      setIsCreating(false);
    }
  };

  // Parse markdown content and populate form fields
  const importMarkdownToForm = (md: string) => {
    if (!md) return;
    const lines = md.split('\n');
    let name = '';
    let contact = '';
    let summary = '';
    let skills = '';
    
    const headerMatch = md.match(/^#\s+(.+)$/m);
    if (headerMatch) name = headerMatch[1].trim();

    const nameIndex = lines.findIndex(l => l.trim().startsWith('# '));
    if (nameIndex !== -1) {
      for (let i = nameIndex + 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          contact = lines[i].trim();
          break;
        }
      }
    }

    const sections: { [key: string]: string } = {};
    const splitByHeadings = md.split(/\n##\s+/);
    
    splitByHeadings.forEach(sec => {
      const linesOfSec = sec.split('\n');
      const title = linesOfSec[0].trim().toLowerCase();
      const content = linesOfSec.slice(1).join('\n').trim();
      
      if (title.includes('summary')) {
        summary = content;
      } else if (title.includes('skills')) {
        skills = content;
      } else if (title.includes('experience')) {
        sections['experience'] = content;
      } else if (title.includes('projects')) {
        sections['projects'] = content;
      } else if (title.includes('education')) {
        sections['education'] = content;
      }
    });

    setFormName(name);
    setFormContact(contact);
    setFormSummary(summary);
    setFormSkills(skills);
    setFormExperience(sections['experience'] || '');
    setFormProjects(sections['projects'] || '');
    setFormEducation(sections['education'] || '');
  };

  // Upload and parse resume directly inside the profile context drawer
  const handleParseProfileFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingProfile(true);
    setProfileParseError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/cvs/parse', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        importMarkdownToForm(data.content);
        // Automatically save parsed content as the base CV so AI understands context immediately
        await fetch('/api/cvs/base', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: data.content })
        });
        fetchFiles(); // update base-cv stats
      } else {
        setProfileParseError(data.error || t.failedUploadFile);
      }
    } catch (err) {
      console.error(err);
      setProfileParseError(t.networkErrorUpload);
    } finally {
      setIsParsingProfile(false);
      // Reset input element
      e.target.value = '';
    }
  };

  // Save profile context to base-cv.md
  const handleSaveProfileContext = async () => {
    setIsSavingProfile(true);
    const compiled = `# ${formName}

${formContact}

Professional Summary:
${formSummary}

Technical Skills:
${formSkills}

Professional Experience:
${formExperience}

Projects:
${formProjects}

Education:
${formEducation}
`;
    try {
      const res = await fetch('/api/cvs/base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: compiled })
      });
      if (res.ok) {
        alert(t.profileUpdatedSuccess);
        setIsProfileOpen(false);
        fetchFiles();
      } else {
        const data = await res.json();
        alert(data.error || t.failedSaveProfile);
      }
    } catch (err) {
      console.error(err);
      alert(t.networkErrorSaveProfile);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // AI Tailoring generation handler
  const handleAiTailorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingTailor(true);
    setTailorError(null);
    setTailorSuccess(null);

    let payload: any = {};
    if (tailorJobId !== 'none') {
      const selectedJob = jobs.find(j => j.id === tailorJobId);
      if (!selectedJob) return;
      payload = {
        jobId: selectedJob.id,
        jobTitle: selectedJob.title,
        company: selectedJob.company,
        description: selectedJob.description,
        requirements: selectedJob.requirements,
      };
    } else {
      if (!tailorCustomJobTitle || !tailorCustomCompany) {
        setTailorError(t.customJobDetailsError);
        setIsGeneratingTailor(false);
        return;
      }
      payload = {
        jobId: 'custom-tailoring',
        jobTitle: tailorCustomJobTitle,
        company: tailorCustomCompany,
        description: tailorCustomDesc,
        requirements: tailorCustomReqs,
      };
    }

    try {
      const tailorRes = await fetch('/api/cvs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: payload.jobId,
          jobTitle: payload.jobTitle,
          company: payload.company,
          description: payload.description,
          requirements: payload.requirements
        })
      });

      const data = await tailorRes.json();
      if (!tailorRes.ok) {
        throw new Error(data.error || t.failedGenerateTailored);
      }

      const generatedFilename = data.filename;

      // Apply archetype alignment if selected
      if (tailorArchetype) {
        const archetypeRes = await fetch('/api/cvs/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: generatedFilename,
            archetype: tailorArchetype,
            jobDescription: payload.description,
            prompt: `Align this resume to the ${tailorArchetype} archetype requirements.`
          })
        });

        const archetypeData = await archetypeRes.json();
        if (!archetypeRes.ok) {
          console.warn("Archetype editing failed:", archetypeData.error);
        }
      }

      setTailorSuccess(`Successfully generated tailored CV: ${generatedFilename}`);
      await fetchFiles();
      
      // Load the new file immediately
      const newFile: CvFile = {
        filename: generatedFilename,
        url: `/cvs/${generatedFilename}`,
        sizeBytes: 0,
        updatedAt: new Date().toISOString(),
        filetype: 'MD',
        isBaseCv: false
      };
      await loadFileContent(newFile);
      setActiveReaderTab('preview');
    } catch (err: any) {
      console.error(err);
      setTailorError(err.message || t.errorGeneratingTailored);
    } finally {
      setIsGeneratingTailor(false);
    }
  };

  // Download raw markdown file
  const handleDownloadMd = () => {
    const content = editedMarkdown || fileContent;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile?.filename || 'resume.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Word doc format (.doc)
  const handleDownloadWord = () => {
    const content = editedMarkdown || fileContent;
    
    let templateStyles = `
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.25; }
      h1 { font-size: 18pt; font-weight: bold; margin-top: 0; margin-bottom: 6pt; color: #111111; }
      h2 { font-size: 13pt; font-weight: bold; border-bottom: 1px solid #999999; margin-top: 14pt; margin-bottom: 6pt; color: #333333; }
      h3 { font-size: 11pt; font-weight: bold; margin-top: 8pt; margin-bottom: 2pt; color: #111111; }
      p, li { margin-top: 0; margin-bottom: 4pt; color: #333333; }
      ul { margin-bottom: 6pt; padding-left: 18pt; }
    `;

    if (selectedTemplate === 'serif') {
      templateStyles = `
        body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 11.5pt; line-height: 1.35; color: #222222; }
        h1 { font-size: 22pt; font-weight: bold; text-align: center; margin-top: 0; margin-bottom: 8pt; color: #111111; }
        p, li { margin-top: 0; margin-bottom: 4pt; }
        h2 { font-size: 14pt; font-weight: bold; border-bottom: 1px dashed #aaaaaa; text-align: center; margin-top: 16pt; margin-bottom: 8pt; color: #8c2d19; }
        h3 { font-size: 11.5pt; font-weight: bold; margin-top: 8pt; margin-bottom: 2pt; color: #111111; }
        ul { margin-bottom: 6pt; padding-left: 18pt; }
      `;
    } else if (selectedTemplate === 'executive') {
      templateStyles = `
        body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.25; color: #1a202c; }
        h1 { font-size: 20pt; font-weight: bold; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; margin-top: 0; margin-bottom: 8pt; }
        h2 { font-size: 13pt; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #94a3b8; margin-top: 14pt; margin-bottom: 6pt; }
        h3 { font-size: 11pt; font-weight: bold; color: #1a202c; margin-top: 8pt; margin-bottom: 2pt; }
        p, li { margin-top: 0; margin-bottom: 4pt; }
        ul { margin-bottom: 6pt; padding-left: 18pt; }
      `;
    } else if (selectedTemplate === 'creative') {
      templateStyles = `
        body { font-family: 'Trebuchet MS', 'Arial', sans-serif; font-size: 10.5pt; line-height: 1.3; color: #0f172a; }
        h1 { font-size: 22pt; font-weight: bold; color: #0d9488; border-bottom: 2.5px solid #0d9488; margin-top: 0; margin-bottom: 8pt; }
        h2 { font-size: 13pt; font-weight: bold; color: #0d9488; border-left: 3px solid #0d9488; padding-left: 6pt; margin-top: 14pt; margin-bottom: 6pt; }
        h3 { font-size: 11pt; font-weight: bold; color: #0d9488; margin-top: 8pt; margin-bottom: 2pt; }
        p, li { margin-top: 0; margin-bottom: 4pt; }
        ul { margin-bottom: 6pt; padding-left: 18pt; }
      `;
    }

    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${selectedFile?.filename || 'CV'}</title>
        <style>
          ${templateStyles}
        </style>
      </head>
      <body>
    `;
    const footer = "</body></html>";
    const htmlContent = header + marked.parse(content) + footer;
    
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (selectedFile?.filename.replace(/\.(md|txt)$/, '') || 'resume') + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download PDF format via backend Playwright
  const handleDownloadPdf = async () => {
    if (!selectedFile) return;
    setIsDownloadingPdf(true);
    try {
      const content = editedMarkdown || fileContent;
      const res = await fetch('/api/cvs/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markdown: content,
          template: selectedTemplate,
          filename: selectedFile.filename.replace(/\.(md|txt)$/, '')
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (selectedFile.filename.replace(/\.(md|txt)$/, '') || 'resume') + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(lang === 'en' ? 'Failed to generate and download PDF' : 'PDF-tiedoston luonti ja lataus epäonnistui');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Print PDF helper
  const handlePrintPdf = () => {
    window.print();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'fi-FI', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMarkdown = (md: string) => {
    try {
      const parsed = marked.parse(md, { async: false }) as string;
      return { __html: parsed };
    } catch (e) {
      return { __html: `<p>Failed to compile Markdown preview.</p>` };
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="text-brand-primary w-5 h-5" />
            {t.cvBuilderCommandCenter}
          </h2>
          <p className="text-xs text-text-muted mt-1">
            {t.cvBuilderDesc}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Personal Profile context trigger button */}
          <button
            onClick={() => {
              loadProfileContext();
              setIsProfileOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-warm bg-bg-card hover:bg-bg-base hover:text-brand-primary text-xs font-bold text-text-muted transition-all cursor-pointer shadow-xs"
          >
            <User className="w-4 h-4 text-brand-primary" /> {t.profileContextFormBtn}
          </button>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-warm bg-bg-card hover:bg-bg-base hover:text-brand-primary text-xs font-bold text-text-muted transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-brand-primary" /> {t.createCvBtn}
          </button>

          <button
            onClick={() => {
              setUploadError(null);
              setUploadSuccess(null);
              setUploadFile(null);
              setIsUploadModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Upload className="w-4 h-4" /> {t.uploadDocBtn}
          </button>

          <button 
            onClick={fetchFiles}
            disabled={loadingList}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-warm bg-bg-card hover:bg-bg-base hover:text-text-main text-xs font-semibold text-text-muted transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} /> {t.refreshBtn}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Side: Files Panel (4 cols) */}
        <div className="glass-panel rounded-2xl p-4 md:col-span-4 flex flex-col gap-3 min-h-[500px] bg-bg-card/35">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider px-1 mb-2">
            {t.myDocuments} ({files.length})
          </div>

          {loadingList ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
            </div>
          ) : errorMsg ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center border border-dashed border-status-rejected/25 rounded-xl">
              <span className="text-xs text-status-rejected flex flex-col items-center gap-2">
                <AlertCircle className="w-6 h-6" /> {errorMsg}
              </span>
            </div>
          ) : files.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-border-warm rounded-xl bg-bg-card/10">
              <FileText className="w-8 h-8 text-text-muted/50 mb-2" />
              <span className="text-xs text-text-muted font-bold">{t.noDocsFound}</span>
              <p className="text-[10px] text-text-muted/75 mt-1.5 leading-relaxed">
                {t.noDocsDesc}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {files.map(file => {
                const isActive = selectedFile?.filename === file.filename && selectedFile?.isBaseCv === file.isBaseCv;
                let badgeColor = 'bg-bg-base text-text-muted border border-border-warm';
                if (file.isBaseCv) badgeColor = 'bg-brand-primary/10 text-brand-primary border border-brand-primary/15';
                else if (file.filetype === 'PDF') badgeColor = 'bg-badge-rejected text-status-rejected border border-status-rejected/10';
                else if (file.filetype === 'MD') badgeColor = 'bg-badge-to-apply text-status-to-apply border border-status-to-apply/10';
                else if (file.filetype === 'TXT') badgeColor = 'bg-badge-in-progress text-status-in-progress border border-status-in-progress/10';

                return (
                  <div
                    key={file.filename + '-' + (file.isBaseCv ? 'base' : 'tailored')}
                    onClick={() => loadFileContent(file)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                      isActive 
                        ? 'bg-brand-primary/5 border-brand-primary/30 text-text-main shadow-xs' 
                        : 'bg-bg-card/40 border-border-warm text-text-main hover:border-border-hover hover:bg-bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {file.isBaseCv ? (
                        <FileCheck className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand-primary' : 'text-brand-primary/80'}`} />
                      ) : file.filetype === 'MD' ? (
                        <FileCode className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand-primary' : 'text-text-muted'}`} />
                      ) : file.filetype === 'PDF' ? (
                        <FileText className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand-primary' : 'text-text-muted'}`} />
                      ) : (
                        <FileText className="w-4 h-4 flex-shrink-0 text-text-muted" />
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold truncate pr-2">
                          {file.isBaseCv ? (lang === 'en' ? 'Base CV (base-cv.md)' : 'Perus-CV (base-cv.md)') : file.filename}
                        </h4>
                        <span className="text-[10px] text-text-muted flex items-center gap-1.5 mt-0.5 font-medium">
                          <Calendar className="w-3 h-3" /> {formatDate(file.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${badgeColor}`}>
                      {file.isBaseCv ? (lang === 'en' ? 'BASE' : 'PERUS') : file.filetype}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Document reader & workspace tabs (8 cols) */}
        <div className="md:col-span-8 flex flex-col min-h-[500px]">
          {!selectedFile ? (
            <div className="glass-panel flex-1 rounded-2xl flex flex-col items-center justify-center p-12 text-center border border-border-warm bg-bg-card/25">
              <FileText className="w-12 h-12 text-text-muted/50 mb-3" />
              <h4 className="font-bold text-text-main text-base">{t.selectDocToView}</h4>
              <p className="text-xs text-text-muted max-w-sm mt-2 leading-relaxed">
                {t.selectDocDesc}
              </p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-border-warm bg-bg-card flex flex-col flex-1 overflow-hidden shadow-sm">
              {/* File Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-border-warm bg-bg-base/40 gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-text-main text-sm truncate">
                    {selectedFile.isBaseCv ? 'base-cv.md (Base CV Source)' : selectedFile.filename}
                  </h3>
                  <div className="flex items-center gap-3 text-[10px] text-text-muted mt-1 font-medium">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5" /> {t.size}: {formatSize(selectedFile.sizeBytes)}
                    </span>
                    <span>&bull;</span>
                    <span>{t.modified}: {formatDate(selectedFile.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Cohesive workspace tab controls */}
                  {selectedFile.filetype !== 'PDF' && selectedFile.filetype !== 'DOCX' && (
                    <div className="flex bg-bg-base border border-border-warm rounded-lg p-0.5">
                      <button
                        onClick={() => setActiveReaderTab('preview')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          activeReaderTab === 'preview'
                            ? 'bg-bg-card text-brand-primary shadow-xs'
                            : 'text-text-muted hover:text-text-main'
                        }`}
                      >
                        {t.previewTab}
                      </button>
                      <button
                        onClick={() => setActiveReaderTab('edit')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          activeReaderTab === 'edit'
                            ? 'bg-bg-card text-brand-primary shadow-xs'
                            : 'text-text-muted hover:text-text-main'
                        }`}
                      >
                        {t.editSourceTab}
                      </button>
                      <button
                        onClick={() => setActiveReaderTab('refine')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          activeReaderTab === 'refine'
                            ? 'bg-bg-card text-brand-primary shadow-xs'
                            : 'text-text-muted hover:text-text-main'
                        }`}
                      >
                        {t.aiRefineTab}
                      </button>
                      <button
                        onClick={() => setActiveReaderTab('tailor')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          activeReaderTab === 'tailor'
                            ? 'bg-bg-card text-brand-primary shadow-xs'
                            : 'text-text-muted hover:text-text-main'
                        }`}
                      >
                        {t.aiTailorTab}
                      </button>
                    </div>
                  )}

                  {/* Template Selector */}
                  {selectedFile.filetype === 'MD' && activeReaderTab === 'preview' && (
                    <div className="flex items-center gap-1.5 border border-border-warm rounded-lg px-2.5 py-1 bg-bg-card">
                      <Palette className="w-3.5 h-3.5 text-brand-primary" />
                      <span className="text-[10px] font-bold text-text-muted uppercase">{t.templateLabel}</span>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value as any)}
                        className="bg-transparent text-xs font-semibold text-text-main focus:outline-none cursor-pointer border-none p-0 pr-1"
                      >
                        <option value="minimalist">{t.minimalist}</option>
                        <option value="serif">{t.serif}</option>
                        <option value="executive">{t.executive}</option>
                        <option value="creative">{t.creative}</option>
                      </select>
                    </div>
                  )}

                  {/* Export actions */}
                  {selectedFile.filetype !== 'PDF' && selectedFile.filetype !== 'DOCX' && activeReaderTab === 'preview' && (
                    <div className="flex border border-border-warm rounded-lg overflow-hidden bg-bg-card divide-x divide-border-warm">
                      <button
                        onClick={handleDownloadMd}
                        title="Download Markdown"
                        className="p-1.5 hover:text-brand-primary text-text-muted hover:bg-bg-base transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleDownloadWord}
                        title="Download Word Doc"
                        className="p-1.5 hover:text-brand-primary text-text-muted hover:bg-bg-base transition-colors cursor-pointer text-xs font-bold flex items-center justify-center w-6"
                      >
                        W
                      </button>
                      <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloadingPdf}
                        title={lang === 'en' ? 'Download PDF' : 'Lataa PDF'}
                        className="p-1.5 hover:text-brand-primary text-text-muted hover:bg-bg-base transition-colors cursor-pointer text-xs font-bold flex items-center justify-center w-8 disabled:opacity-50"
                      >
                        {isDownloadingPdf ? (
                          <Loader2 className="w-3 h-3 animate-spin text-brand-primary" />
                        ) : (
                          'PDF'
                        )}
                      </button>
                      <button
                        onClick={handlePrintPdf}
                        title="Print / Save PDF"
                        className="p-1.5 hover:text-brand-primary text-text-muted hover:bg-bg-base transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {!selectedFile.isBaseCv && (
                    <button 
                      onClick={() => handleOpenSystem(selectedFile)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary hover:bg-brand-primary/20 font-semibold text-xs transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      {t.openLocal} <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Render Area */}
              <div className="flex-1 overflow-hidden flex flex-col bg-bg-base/15">
                {loadingContent ? (
                  <div className="w-full h-80 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                  </div>
                ) : activeReaderTab === 'preview' ? (
                  /* Preview Tab */
                  <div className="p-6 overflow-y-auto max-h-[600px] flex-1">
                    {selectedFile.filetype === 'MD' ? (
                      <div 
                        id="cv-print-area"
                        className={`markdown-body template-${selectedTemplate} text-text-main`}
                        dangerouslySetInnerHTML={renderMarkdown(fileContent)}
                      />
                    ) : selectedFile.filetype === 'PDF' ? (
                      <iframe 
                        src={selectedFile.url} 
                        title={selectedFile.filename}
                        className="w-full h-[600px] border border-border-warm rounded-xl bg-bg-base" 
                      />
                    ) : selectedFile.filetype === 'TXT' ? (
                      <pre 
                        id="cv-print-area"
                        className="font-mono text-xs overflow-auto bg-bg-base p-4 border border-border-warm rounded-xl text-text-main leading-relaxed whitespace-pre-wrap font-semibold"
                      >
                        {fileContent}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <AlertCircle className="w-12 h-12 text-text-muted/50 mb-3" />
                        <h5 className="font-bold text-text-main text-sm">{t.previewNotSupported}</h5>
                        <p className="text-xs text-text-muted max-w-xs mt-1.5 leading-relaxed">
                          {lang === 'en' ? "Inline browser preview is not supported for" : "Selaimen sisäistä esikatselua ei tueta tiedostomuodolle"} <strong>{selectedFile.filetype}</strong> {lang === 'en' ? "files. Please open it in your local default editor." : "tiedostoille. Avaa se paikallisella oletusohjelmallasi."}
                        </p>
                      </div>
                    )}
                  </div>
                ) : activeReaderTab === 'edit' ? (
                  /* Edit Source Tab */
                  <div className="flex flex-col flex-1 p-4 bg-bg-card h-[600px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-text-muted uppercase">{t.sourceEditorTitle}</span>
                      <button
                        onClick={handleSaveManualEdit}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-status-offer text-white text-xs font-semibold shadow-xs disabled:opacity-40 hover:bg-status-offer/95 cursor-pointer"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> {t.savingProgress}
                          </>
                        ) : (
                          <>
                            <Save className="w-3 h-3" /> {t.saveChangesBtn}
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      value={editedMarkdown}
                      onChange={(e) => setEditedMarkdown(e.target.value)}
                      className="flex-1 w-full p-4 border border-border-warm rounded-xl bg-bg-base text-xs font-mono text-text-main focus:outline-none focus:border-brand-primary resize-none leading-relaxed font-semibold"
                    />
                  </div>
                ) : activeReaderTab === 'refine' ? (
                  /* AI Refine Tab */
                  <div className="flex flex-col md:flex-row flex-1 max-h-[600px] overflow-hidden">
                    <div className="flex-1 md:w-3/5 p-4 flex flex-col border-b md:border-b-0 md:border-r border-border-warm bg-bg-card">
                      <div className="bg-bg-base/40 border border-border-warm px-3 py-1 text-[10px] text-text-muted font-mono rounded-t-lg flex justify-between items-center">
                        <span>{t.workspaceEditorTitle}</span>
                        <span className="text-status-offer font-bold">{t.unsavedChangesNotice}</span>
                      </div>
                      <textarea
                        value={editedMarkdown}
                        onChange={(e) => setEditedMarkdown(e.target.value)}
                        className="flex-1 w-full p-4 border-l border-r border-b border-border-warm rounded-b-xl bg-bg-base text-xs font-mono text-text-main focus:outline-none focus:border-brand-primary resize-none leading-relaxed font-semibold"
                      />
                    </div>

                    <div className="w-full md:w-2/5 p-4 flex flex-col gap-4 overflow-y-auto bg-bg-base/20">
                      <div className="flex items-center gap-1.5 pb-2 border-b border-border-warm">
                        <Sparkles className="w-4 h-4 text-brand-primary animate-pulse" />
                        <h4 className="text-xs font-bold text-text-main uppercase">{t.geminiAiAssistant}</h4>
                      </div>

                      {aiMessage && (
                        <div className={`p-3 rounded-lg text-xs flex gap-2 items-start ${
                          aiMessage.type === 'success' 
                            ? 'bg-status-offer/5 border border-status-offer/20 text-status-offer' 
                            : 'bg-status-rejected/5 border border-status-rejected/20 text-status-rejected'
                        }`}>
                          {aiMessage.type === 'success' ? (
                            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          )}
                          <span className="font-semibold">{aiMessage.text}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-text-muted uppercase">{t.alignArchetype}</label>
                        <select
                          value={selectedArchetype}
                          onChange={(e) => setSelectedArchetype(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs bg-bg-card border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main font-semibold"
                        >
                          <option value="">{t.noneCustomPrompt}</option>
                          {CAREER_ARCHETYPES.map(arch => (
                            <option key={arch.id} value={arch.id}>
                              {t.archetypes[arch.id as keyof typeof t.archetypes]?.name || arch.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-text-muted uppercase">{t.targetJobDetails}</label>
                        <textarea
                          rows={3}
                          value={jobDescriptionInput}
                          onChange={(e) => setJobDescriptionInput(e.target.value)}
                          placeholder={t.targetJobDescPlaceholder}
                          className="w-full p-2.5 text-xs bg-bg-card border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main placeholder-text-muted/40 font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-text-muted uppercase">{t.instructionsPrompt}</label>
                        <textarea
                          rows={4}
                          required
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder={t.promptPlaceholder}
                          className="w-full p-2.5 text-xs bg-bg-card border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main placeholder-text-muted/40 font-semibold"
                        />
                      </div>

                      <button
                        onClick={handleAiRefine}
                        disabled={isEditingAI || !aiPrompt}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 cursor-pointer"
                      >
                        {isEditingAI ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> {t.rewritingCvProgress}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 animate-pulse" /> {t.applyAiRefinementBtn}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* AI Tailor Tab */
                  <div className="flex flex-col md:flex-row flex-1 max-h-[600px] overflow-hidden">
                    {/* Left Panel: Preview/Context info */}
                    <div className="flex-1 md:w-1/2 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border-warm bg-bg-card overflow-y-auto">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border-warm">
                          <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" />
                          <h4 className="font-bold text-sm text-text-main uppercase">{t.aiJobTailoringWorkspace}</h4>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed">
                          {t.tailoringWorkspaceDesc}
                        </p>
                        
                        <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-xl space-y-2">
                          <h5 className="text-[11px] font-bold text-brand-primary uppercase">{t.activeSourceFile}</h5>
                          <div className="flex items-center gap-2 text-xs font-semibold text-text-main">
                            <FileCode className="w-4 h-4 text-brand-primary" />
                            <span>{selectedFile.filename}</span>
                          </div>
                          <p className="text-[10px] text-text-muted">
                            {t.activeSourceDesc}
                          </p>
                        </div>

                        {tailorSuccess && (
                          <div className="p-3 bg-status-offer/10 border border-status-offer/20 rounded-xl text-status-offer text-xs flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <Check className="w-4 h-4" />
                              <span>{t.tailorSuccessMsg}</span>
                            </div>
                            <p className="text-[10px] font-mono select-all truncate mt-0.5">
                              {tailorSuccess}
                            </p>
                            <span className="text-[9px] text-text-muted italic">
                              {t.tailorSuccessSwitchMsg}
                            </span>
                          </div>
                        )}

                        {tailorError && (
                          <div className="p-3 bg-status-rejected/10 border border-status-rejected/20 rounded-xl text-status-rejected text-xs flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{tailorError}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3 bg-bg-base border border-border-warm rounded-lg text-[10px] text-text-muted mt-4">
                        💡 {t.docAutoSavedNotice}
                      </div>
                    </div>

                    {/* Right Panel: Tailoring Job Details Form */}
                    <form onSubmit={handleAiTailorSubmit} className="w-full md:w-1/2 p-6 flex flex-col gap-4 overflow-y-auto bg-bg-base/20">
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-text-muted uppercase">{t.linkToPipelineJob}</label>
                        <select
                          value={tailorJobId}
                          onChange={e => {
                            setTailorJobId(e.target.value);
                            if (e.target.value !== 'none') {
                              setTailorCustomCompany('');
                              setTailorCustomJobTitle('');
                              setTailorCustomDesc('');
                              setTailorCustomReqs('');
                            }
                          }}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main font-semibold"
                        >
                          <option value="none">{t.enterCustomJobDetails}</option>
                          {jobs.map(job => (
                            <option key={job.id} value={job.id}>
                              {job.title} @ {job.company}
                            </option>
                          ))}
                        </select>
                      </div>

                      {tailorJobId === 'none' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase">{t.companyLabel}</label>
                            <input 
                              type="text" 
                              required
                              value={tailorCustomCompany} 
                              onChange={e => setTailorCustomCompany(e.target.value)}
                              placeholder={lang === 'en' ? "e.g. Wolt" : "esim. Wolt"}
                              className="w-full px-2.5 py-1.5 text-xs bg-bg-card border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-text-muted uppercase">{t.jobTitleLabel}</label>
                            <input 
                              type="text" 
                              required
                              value={tailorCustomJobTitle} 
                              onChange={e => setTailorCustomJobTitle(e.target.value)}
                              placeholder={lang === 'en' ? "e.g. Frontend Lead" : "esim. Frontend-tiiminvetäjä"}
                              className="w-full px-2.5 py-1.5 text-xs bg-bg-card border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main font-semibold"
                            />
                          </div>
                        </div>
                      )}

                      {tailorJobId === 'none' && (
                        <>
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-text-muted uppercase">{t.jobDescription}</label>
                            <textarea
                              rows={3}
                              value={tailorCustomDesc}
                              onChange={e => setTailorCustomDesc(e.target.value)}
                              placeholder={lang === 'en' ? "Paste responsibilities and details here..." : "Liitä tehtävän tiedot ja vastuut tähän..."}
                              className="w-full p-2.5 text-xs bg-bg-card border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main placeholder-text-muted/40 font-semibold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-text-muted uppercase">{t.coreTechReqs}</label>
                            <input 
                              type="text" 
                              value={tailorCustomReqs} 
                              onChange={e => setTailorCustomReqs(e.target.value)}
                              placeholder="e.g. TypeScript, Next.js, Tailwind"
                              className="w-full px-2.5 py-1.5 text-xs bg-bg-card border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main font-semibold"
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-text-muted uppercase">{t.alignArchetype}</label>
                        <select
                          value={tailorArchetype}
                          onChange={e => setTailorArchetype(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-bg-card border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main font-semibold"
                        >
                          <option value="">{t.standardCustomization}</option>
                          {CAREER_ARCHETYPES.map(arch => (
                            <option key={arch.id} value={arch.id}>
                              {t.archetypes[arch.id as keyof typeof t.archetypes]?.name || arch.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={isGeneratingTailor}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-40 mt-2"
                      >
                        {isGeneratingTailor ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> {t.customizingCvProgress}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 animate-pulse" /> {t.tailorCreateCvBtn}
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE CV MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm rounded-2xl border border-border-warm bg-bg-card shadow-2xl overflow-hidden animate-card-slide">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border-warm bg-bg-base/40">
              <h3 className="font-bold text-text-main text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-primary" /> {t.createNewCvModalTitle}
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-text-muted hover:text-text-main cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">{t.resumeFilenameLabel}</label>
                <input 
                  type="text" 
                  required
                  placeholder={lang === 'en' ? "e.g. resume-wolt.md" : "esim. ansioluettelo-wolt.md"}
                  value={createFilename}
                  onChange={e => setCreateFilename(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main font-semibold"
                />
                <p className="text-[10px] text-text-muted mt-1 px-1">
                  {t.createCvInstructions}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-warm">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-bg-base hover:bg-border-warm text-text-main text-xs font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  disabled={isCreating || !createFilename}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-semibold text-xs shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>{t.createDocBtn}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERSONAL PROFILE CONTEXT DRAWER */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in" 
            onClick={() => setIsProfileOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-xl glass-panel h-full border-l border-border-warm bg-bg-card shadow-2xl flex flex-col justify-between z-10 animate-card-slide">
            <div className="flex justify-between items-center px-6 py-5 border-b border-border-warm bg-bg-base/40">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-brand-primary" />
                <div>
                  <h3 className="font-bold text-text-main text-base">{t.personalProfileContextTitle}</h3>
                  <span className="text-[10px] text-text-muted">{t.globalRefProfileSub}</span>
                </div>
              </div>
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="p-1.5 rounded bg-bg-base hover:bg-border-warm text-text-muted hover:text-text-main cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Auto-Parse Uploader block */}
              <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-primary">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span>{t.resumeAutoParseTitle}</span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  {t.resumeAutoParseDesc}
                </p>

                <div className="relative border border-dashed border-border-warm hover:border-brand-primary/40 rounded-lg p-4 bg-bg-card flex flex-col items-center justify-center text-center cursor-pointer transition-colors">
                  <input 
                    type="file"
                    accept=".pdf,.md,.docx,.txt,image/*"
                    onChange={handleParseProfileFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-6 h-6 text-text-muted mb-1" />
                  <span className="text-[11px] font-bold text-text-main">
                    {isParsingProfile ? t.parsingResumeProgress : t.dragFileToParse}
                  </span>
                  {isParsingProfile && <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin mt-1" />}
                </div>

                {profileParseError && (
                  <div className="text-[11px] text-status-rejected font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {profileParseError}
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-brand-primary" /> {t.fullNameLabel}
                  </label>
                  <input 
                    type="text" 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Alex Minns"
                    className="w-full px-3 py-2 text-xs bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted uppercase mb-1 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-brand-primary" /> {t.contactInfoLinksLabel}
                  </label>
                  <input 
                    type="text" 
                    value={formContact} 
                    onChange={e => setFormContact(e.target.value)}
                    placeholder={lang === 'en' ? "Helsinki, Finland | alex.minns@email.fi | +358 40 1234567 | github.com/alex-minns" : "Helsinki, Suomi | alex.minns@email.fi | +358 40 1234567 | github.com/alex-minns"}
                    className="w-full px-3 py-2 text-xs bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted uppercase mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-brand-primary" /> {t.professionalSummaryLabel}
                  </label>
                  <textarea 
                    rows={3} 
                    value={formSummary} 
                    onChange={e => setFormSummary(e.target.value)}
                    placeholder={lang === 'en' ? "Brief overview of your career..." : "Lyhyt yhteenveto urastasi..."}
                    className="w-full px-3 py-2 text-xs bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted uppercase mb-1 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-brand-primary" /> {t.technicalSkillsLabel}
                  </label>
                  <textarea 
                    rows={4} 
                    value={formSkills} 
                    onChange={e => setFormSkills(e.target.value)}
                    placeholder={lang === 'en' ? "Languages: TypeScript, Python, SQL | Frameworks: React, Next.js | Tools: Docker, Git" : "Kielet: TypeScript, Python, SQL | Kehykset: React, Next.js | Työkalut: Docker, Git"}
                    className="w-full p-3 text-xs bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted uppercase mb-1 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-brand-primary" /> {t.workExperienceLabel}
                  </label>
                  <textarea 
                    rows={5} 
                    value={formExperience} 
                    onChange={e => setFormExperience(e.target.value)}
                    placeholder={lang === 'en' ? "Software Developer at Tech Oy (2023 - Present)\nBuilt scalable APIs and led frontend migration to React. Reduced load times by 40%." : "Ohjelmistokehittäjä, Tech Oy (2023 - nykyhetki)\nRakensin skaalautuvia API-rajapintoja ja johdin frontend-siirtymän Reactiin."}
                    className="w-full p-3 text-xs bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted uppercase mb-1 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-brand-primary" /> {t.projectsLabel}
                  </label>
                  <textarea 
                    rows={4} 
                    value={formProjects} 
                    onChange={e => setFormProjects(e.target.value)}
                    placeholder={lang === 'en' ? "Job Tracker App - Built with Next.js, TypeScript, SQLite. Automated job application tracking with AI CV tailoring." : "Työnhakusovellus - Next.js, TypeScript, SQLite. Automatisoi työnhakujen seurannan tekoälyllä."}
                    className="w-full p-3 text-xs bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted uppercase mb-1 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-brand-primary" /> {t.educationLabel}
                  </label>
                  <textarea 
                    rows={3} 
                    value={formEducation} 
                    onChange={e => setFormEducation(e.target.value)}
                    placeholder={lang === 'en' ? "B.Sc. Computer Science, Aalto University (2019-2022)" : "Tietotekniikan kandidaatti, Aalto-yliopisto (2019-2022)"}
                    className="w-full p-3 text-xs bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Bottom drawer save controls */}
            <div className="px-6 py-4 border-t border-border-warm bg-bg-base/40 flex gap-3">
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="flex-1 flex items-center justify-center py-2.5 rounded-lg border border-border-warm text-text-main bg-bg-card hover:bg-bg-base text-xs font-bold transition-all cursor-pointer"
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleSaveProfileContext}
                disabled={isSavingProfile || isParsingProfile}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isSavingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" /> {t.save}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-border-warm bg-bg-card shadow-2xl overflow-hidden animate-card-slide animate-fade-in">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border-warm bg-bg-base/40">
              <h3 className="font-bold text-text-main text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-brand-primary" /> {t.uploadDocBtn}
              </h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-text-muted hover:text-text-main cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {uploadSuccess && (
                <div className="p-3 bg-status-offer/10 border border-status-offer/20 rounded-xl text-status-offer text-xs flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-status-rejected/10 border border-status-rejected/20 rounded-xl text-status-rejected text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Upload Type selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-muted uppercase">{t.uploadDestinationLabel}</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer text-xs font-semibold transition-all ${
                    uploadType === 'tailored'
                      ? 'border-brand-primary bg-brand-primary/5 text-text-main'
                      : 'border-border-warm bg-bg-card text-text-muted hover:border-border-hover'
                  }`}>
                    <input 
                      type="radio" 
                      name="uploadType" 
                      checked={uploadType === 'tailored'}
                      onChange={() => setUploadType('tailored')}
                      className="accent-brand-primary cursor-pointer"
                    />
                    {t.tailoredDocument}
                  </label>
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer text-xs font-semibold transition-all ${
                    uploadType === 'base'
                      ? 'border-brand-primary bg-brand-primary/5 text-text-main'
                      : 'border-border-warm bg-bg-card text-text-muted hover:border-border-hover'
                  }`}>
                    <input 
                      type="radio" 
                      name="uploadType" 
                      checked={uploadType === 'base'}
                      onChange={() => setUploadType('base')}
                      className="accent-brand-primary cursor-pointer"
                    />
                    {t.replaceBaseCv}
                  </label>
                </div>
              </div>

              {/* Linked Job (only visible for tailored CV type) */}
              {uploadType === 'tailored' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-text-muted uppercase">
                    {t.associateWithJobApp}
                  </label>
                  <select
                    value={uploadJobId}
                    onChange={(e) => setUploadJobId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-bg-base border border-border-warm rounded-lg focus:outline-none focus:border-brand-primary text-text-main font-semibold"
                  >
                    <option value="none">{t.noneStandaloneDoc}</option>
                    {jobs.map(job => (
                      <option key={job.id} value={job.id}>
                        {job.title} at {job.company}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* File Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-muted uppercase">{t.selectFileLabel}</label>
                <input 
                  type="file" 
                  id="cv-file-upload-input"
                  required
                  accept={uploadType === 'base' ? '.md' : '.pdf,.md,.docx,.txt'}
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-primary/10 file:text-brand-primary file:hover:bg-brand-primary/20 file:cursor-pointer cursor-pointer border border-border-warm p-2.5 rounded-xl bg-bg-base text-text-main font-semibold"
                />
                <p className="text-[10px] text-text-muted px-1 mt-1 font-medium">
                  {uploadType === 'base' 
                    ? t.baseCvUploadInstructions 
                    : t.tailoredCvUploadInstructions}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border-warm mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-bg-base hover:bg-border-warm text-text-main text-xs font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-semibold text-xs shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t.uploadingProgress}
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" /> {t.uploadFileBtn}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
