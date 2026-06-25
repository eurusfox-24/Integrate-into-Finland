import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini if the API key is present
const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Helper to clean HTML and extract text content to minimize prompt tokens
function cleanHtml(html: string): string {
  // Remove script and style tags completely
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // Replace list items, headings, and paragraphs with space/newlines
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<br[^>]*>/gi, '\n');
  text = text.replace(/<li>/gi, '\n* ');
  // Strip all other HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ');
  return text.trim().slice(0, 15000); // limit to 15k characters to prevent oversized prompts
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY=your_key to a .env.local file in the root directory.",
        missingKey: true
      }, { status: 400 });
    }

    console.log(`Fetching job listing from: ${url}`);
    
    // Fetch the URL with standard browser headers to bypass simple bot blockers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      next: { revalidate: 3600 } // cache for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch page. Status: ${response.status}` }, { status: 500 });
    }

    const html = await response.text();
    const cleanText = cleanHtml(html);

    if (cleanText.length < 100) {
      return NextResponse.json({ error: "The webpage content is too short or blocked. Please input the details manually." }, { status: 520 });
    }

    console.log(`Parsing job text with Gemini (Text length: ${cleanText.length} chars)`);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      You are a professional recruiting assistant. Extract the job listing details from the text content of the website below.
      
      Extract and format your output as a SINGLE, VALID JSON object with the following fields:
      - title: The job title (e.g. "Software Engineer").
      - company: The company name (e.g. "Nokia"). If not found, use a reasonable guess or "Unknown".
      - location: The location (e.g. "Helsinki, Finland" or "Espoo (Remote)"). Highlight if it is in Finland.
      - description: A concise summary of the job and company description (1-3 paragraphs, do not include full text, keep it neat).
      - requirements: A bulleted list or comma-separated string of the core technical requirements, skills, or programming languages (e.g. "TypeScript, Next.js, SQL").
      
      Format rules:
      - Do NOT wrap the JSON inside markdown code blocks (e.g. do not use \`\`\`json ... \`\`\`). Return ONLY the pure JSON string.
      - Make sure it is valid JSON that can be parsed with JSON.parse().
      - If any field is not found, leave it as an empty string.

      Webpage content:
      --------------------
      ${cleanText}
      --------------------
    `;

    const result = await model.generateContent(prompt);
    const resultText = result.response.text().trim();
    
    // Attempt to parse JSON. Sometimes LLMs still wrap the output in markdown blocks despite instructions, so strip them if present.
    let jsonString = resultText;
    if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/^```json\s*/, "").replace(/```$/, "").trim();
    }

    try {
      const parsedJob = JSON.parse(jsonString);
      // Ensure the URL is attached
      parsedJob.url = url;
      return NextResponse.json(parsedJob);
    } catch (parseError) {
      console.error("Gemini output was not valid JSON. Raw text:", resultText);
      return NextResponse.json({
        error: "Failed to parse the AI output. Please try again or fill in the details manually.",
        rawOutput: resultText
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("AI job import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
