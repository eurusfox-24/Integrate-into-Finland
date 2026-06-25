import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(request: Request) {
  try {
    const { filename, prompt, archetype, jobDescription } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: "Filename is required." }, { status: 400 });
    }

    let filePath = '';
    if (filename === 'base-cv.md') {
      filePath = path.join(process.cwd(), 'base-cv.md');
    } else {
      filePath = path.join(process.cwd(), 'public', 'cvs', path.basename(filename));
    }

    let currentContent = '';
    try {
      currentContent = await fs.readFile(filePath, 'utf-8');
    } catch (e) {
      return NextResponse.json({ error: `File not found: ${filename}` }, { status: 404 });
    }

    if (!genAI) {
      return NextResponse.json({ 
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file to use AI editing." 
      }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `
You are an expert technical resume writer and career coach, specializing in AI-driven job search pipelines. 
You are customizing or editing a candidate's resume (written in Markdown) using the skills and principles of the "career-ops" framework:

1. **ARCHETYPE ALIGNMENT**: If a target archetype is requested, frame the experience and skills to match that archetype:
   - **AI Platform / LLMOps**: focus on pipelines, evaluations, monitoring, reliability, observability.
   - **Agentic / Automation**: focus on agent orchestration, human-in-the-loop (HITL), workflows, multi-agent.
   - **Technical AI PM**: focus on PRDs, roadmaps, discovery, stakeholders, product management.
   - **AI Solutions Architect**: focus on architecture, enterprise integrations, systems design.
   - **AI Forward Deployed**: focus on client-facing delivery, prototyping, fast iteration, field deployment.
   - **AI Transformation**: focus on change management, adoption, enablement.
2. **ACTION-ORIENTED & DIRECT**: Use strong, specific action verbs (e.g., "Architected", "Engineered", "Optimized", "Designed") to start bullet points. Avoid vague passive phrasing or corporate fluff.
3. **METRIC-CENTRIC**: Emphasize concrete metrics and quantifiable achievements (such as percentage improvements, time saved, or revenue generated). Do NOT invent experience or metrics.
4. **ATS OPTIMIZATION**: Organize skills and experience clean and scan-friendly.
5. **PROFESSIONAL SUMMARY**: Keep the summary at the top concise (2-3 sentences) and highly relevant.

Here is the current CV content:
--------------------
${currentContent}
--------------------

Target Archetype: ${archetype || 'None'}
Target Job Description (if applicable):
${jobDescription || 'None'}

User Prompt / Instruction:
"${prompt}"

Please modify the CV content to satisfy the user's instructions while adhering strictly to the career-ops principles.
- Maintain the original structure of the CV (Summary, Skills, Experience, Projects, Education).
- Do NOT invent or make up fake experience, titles, or numbers. Only format, rephrase, highlight, and adjust emphasis.
- Output ONLY the modified raw Markdown content. Do NOT wrap the output in markdown code blocks like \`\`\`markdown.
- CRITICAL: Preserve the exact structural styling, formatting conventions, and decorative elements (such as HTML bullet entities like '&bull;' or special hyphens) used in the headings of the original Base CV. For example, if experience roles are styled as '### **Role** &bull; *Company* &bull; Location' and date lines are styled as '*[Start Date] – [End Date]*', you MUST retain this exact syntax and format for all entries in the tailored output. Do not replace them with plain text or standard hyphens.
`;

    const result = await model.generateContent(systemPrompt);
    let editedContent = result.response.text().trim();

    // Strip markdown code blocks if the LLM output wrapped it
    if (editedContent.startsWith("```")) {
      editedContent = editedContent.replace(/^```markdown\s*/i, "").replace(/```$/, "").trim();
    }

    // Save edited content back to file
    await fs.writeFile(filePath, editedContent, 'utf-8');

    return NextResponse.json({
      success: true,
      filename,
      content: editedContent
    });

  } catch (error: any) {
    console.error("AI CV Edit error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
