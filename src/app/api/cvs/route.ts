import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

const cvDir = path.join(process.cwd(), 'public', 'cvs');

// Initialize Gemini if the API key is present
const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Ensure CV directory exists on start/request
async function ensureCvDir() {
  try {
    await fs.mkdir(cvDir, { recursive: true });
  } catch (err) {
    console.error("Error creating CV directory:", err);
  }
}

// GET all CVs and cover letters from the public folder, and include base-cv.md
// If ?filename=... is provided, return its text content directly.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filenameParam = searchParams.get('filename');

    if (filenameParam) {
      let filePath = '';
      if (filenameParam === 'base-cv.md') {
        filePath = path.join(process.cwd(), 'base-cv.md');
      } else {
        filePath = path.join(cvDir, path.basename(filenameParam));
      }
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        return new Response(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      } catch (e) {
        return NextResponse.json({ error: "File not found." }, { status: 404 });
      }
    }

    await ensureCvDir();
    const files = await fs.readdir(cvDir);
    
    const fileList = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(cvDir, filename);
        const stats = await fs.stat(filePath);
        
        // Exclude system files
        if (filename.startsWith('.')) return null;

        const ext = path.extname(filename).toLowerCase();
        let filetype = 'OTHER';
        if (ext === '.pdf') filetype = 'PDF';
        else if (ext === '.md') filetype = 'MD';
        else if (ext === '.docx') filetype = 'DOCX';
        else if (ext === '.txt') filetype = 'TXT';

        return {
          filename,
          url: `/cvs/${filename}`,
          sizeBytes: stats.size,
          updatedAt: stats.mtime.toISOString(),
          filetype,
          isBaseCv: false
        };
      })
    );

    // Add base-cv.md if it exists
    const baseCvPath = path.join(process.cwd(), 'base-cv.md');
    try {
      const baseStats = await fs.stat(baseCvPath);
      fileList.push({
        filename: 'base-cv.md',
        url: '/api/cvs?filename=base-cv.md',
        sizeBytes: baseStats.size,
        updatedAt: baseStats.mtime.toISOString(),
        filetype: 'MD',
        isBaseCv: true
      });
    } catch (e) {
      // base-cv.md doesn't exist, ignore
    }

    // Filter out nulls and sort: base-cv.md always comes first, then sort the rest by mod time descending
    const filteredFiles = fileList
      .filter((file): file is NonNullable<typeof file> => file !== null)
      .sort((a, b) => {
        if (a.isBaseCv) return -1;
        if (b.isBaseCv) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

    return NextResponse.json(filteredFiles);
  } catch (error: any) {
    console.error("GET cvs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Tailor a CV for a job using Gemini or triggering a command
export async function POST(request: Request) {
  try {
    await ensureCvDir();
    const body = await request.json();
    const { jobId, jobTitle, company, description, requirements } = body;

    if (!jobId || !jobTitle || !company) {
      return NextResponse.json({ error: "jobId, jobTitle, and company are required." }, { status: 400 });
    }

    // Attempt to read a base CV from the project.
    // If not found, we create a default base CV.
    const baseCvPath = path.join(process.cwd(), 'base-cv.md');
    let baseCvContent = '';
    
    try {
      baseCvContent = await fs.readFile(baseCvPath, 'utf-8');
    } catch (e) {
      // Create a default base CV if it doesn't exist
      baseCvContent = `# John Doe\n\nEmail: john.doe@email.fi | Helsinki, Finland\n\n## Summary\nExperienced Software Engineer specializing in modern web applications, TypeScript, and backend architectures.\n\n## Experience\n- **Software Developer** @ Tech Oy (2023 - Present): Built scalable React web apps.\n- **Frontend Developer** @ Helsinki Code (2021 - 2023): Optimized landing pages and state management.\n\n## Skills\nJavaScript, TypeScript, React, Next.js, Node.js, SQL, Git`;
      await fs.writeFile(baseCvPath, baseCvContent, 'utf-8');
    }

    if (!genAI) {
      // If no API key, generate a static tailored file as a placeholder
      const filename = `resume-${company.toLowerCase().replace(/\s+/g, '-')}.md`;
      const filePath = path.join(cvDir, filename);
      const content = `# John Doe - Tailored for ${jobTitle} at ${company}\n\nThis is a placeholder resume. Configure GEMINI_API_KEY in .env.local to run full AI-powered tailoring.`;
      
      await fs.writeFile(filePath, content, 'utf-8');
      
      // Save association in documents table
      const docId = crypto.randomUUID();
      await db.execute({
        sql: "INSERT INTO documents (id, job_id, filename, filepath, filetype) VALUES (?, ?, ?, ?, ?)",
        args: [docId, jobId, filename, `/cvs/${filename}`, 'MD']
      });

      return NextResponse.json({ 
        success: true, 
        filename, 
        message: "Gemini API key missing. Created placeholder document." 
      });
    }

    console.log(`Tailoring CV for job: ${jobTitle} at ${company}`);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an expert resume writer and career coach. Customize the following base CV (written in Markdown) to perfectly align with the target job details.
      
      Target Job:
      - Title: ${jobTitle}
      - Company: ${company}
      - Description: ${description || 'Not provided'}
      - Requirements: ${requirements || 'Not provided'}

      Base CV Content:
      --------------------
      ${baseCvContent}
      --------------------

      Instructions:
      1. Highlight relevant skills and experience from the base CV that match the job description and requirements.
      2. Rephrase bullet points to emphasize impact using strong action verbs (e.g. "Developed", "Optimized", "Architected").
      3. Maintain a highly professional tone.
      4. Output the result in clean, valid Markdown.
      5. Include a brief (2-3 sentences) tailored "Professional Summary" at the top.
      6. Do NOT include markdown wrappers (e.g. do not wrap the entire document in \`\`\`markdown ... \`\`\`). Output only the raw markdown of the resume itself.
      7. CRITICAL: Preserve the exact structural styling, formatting conventions, and decorative elements (such as HTML bullet entities like \`&bull;\` or special hyphens) used in the headings of the original Base CV. For example, if experience roles are styled as \`### **Role** &bull; *Company* &bull; Location\` and date lines are styled as \`*[Start Date] – [End Date]*\`, you MUST retain this exact syntax and format for all entries in the tailored output. Do not replace them with plain text or standard hyphens.
    `;

    const result = await model.generateContent(prompt);
    let tailoredContent = result.response.text().trim();
    
    // Strip markdown code blocks if the LLM output wrapped it
    if (tailoredContent.startsWith("```")) {
      tailoredContent = tailoredContent.replace(/^```markdown\s*/i, "").replace(/```$/, "").trim();
    }

    const safeCompanyName = company.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const safeJobTitle = jobTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `resume-${safeCompanyName}-${safeJobTitle}.md`;
    const filePath = path.join(cvDir, filename);

    await fs.writeFile(filePath, tailoredContent, 'utf-8');

    // Register file association in database
    const docId = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO documents (id, job_id, filename, filepath, filetype) VALUES (?, ?, ?, ?, ?)",
      args: [docId, jobId, filename, `/cvs/${filename}`, 'MD']
    });

    return NextResponse.json({
      success: true,
      filename,
      filepath: `/cvs/${filename}`
    });

  } catch (error: any) {
    console.error("Post CV tailoring error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
