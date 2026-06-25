import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({ 
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file to use AI parsing." 
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString('base64');
    const mimeType = file.type;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `
You are an expert technical recruiter and resume writer.
Your task is to extract all the professional information from the provided resume file and format it into a clean, comprehensive, professional Markdown CV.

Requirements for formatting:
1. Ensure the layout is clean, professional, and optimized for both human reading and ATS systems.
2. Group the CV into standard sections:
   - Contact Info: Name (Header 1), Contact Links (Email, Phone, Location, GitHub, LinkedIn)
   - Professional Summary: A short (2-3 sentences) impactful summary.
   - Technical Skills: Grouped clearly (e.g., Languages, Frameworks, Databases, Tools).
   - Professional Experience: Listing Company, Position, Location, Dates, and clear bullet points outlining achievements using action verbs and metrics.
   - Projects: Highlighting key projects with tech stack and description.
   - Education: Listing degree, school, location, and dates.
3. Keep it professional. Use clean Markdown elements (bullet points, bold text).
4. Output ONLY the raw markdown of the resume. Do NOT wrap the output in markdown code blocks like \`\`\`markdown.

Please extract the information from the uploaded file and format it as requested.
`;

    // Handle text files directly if needed, but Gemini handles them fine via inlineData
    // We send base64 data to Gemini. It handles PDF, Images, Text, etc.
    let targetMimeType = mimeType;
    if (!targetMimeType) {
      if (file.name.endsWith('.pdf')) targetMimeType = 'application/pdf';
      else if (file.name.endsWith('.txt')) targetMimeType = 'text/plain';
      else if (file.name.endsWith('.md')) targetMimeType = 'text/markdown';
      else targetMimeType = 'application/octet-stream';
    }

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: targetMimeType,
        }
      },
      systemPrompt
    ]);

    let parsedCv = result.response.text().trim();

    // Strip markdown code blocks if the LLM output wrapped it
    if (parsedCv.startsWith("```")) {
      parsedCv = parsedCv.replace(/^```markdown\s*/i, "").replace(/```$/, "").trim();
    }

    return NextResponse.json({
      success: true,
      content: parsedCv
    });

  } catch (error: any) {
    console.error("Resume parse error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
