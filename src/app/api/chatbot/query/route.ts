import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { scrapeDuunitoriJobs } from '@/lib/scraper';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required." }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({
        reply: "Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file to use the career chatbot.",
        jobs: []
      });
    }

    const latestMessage = messages[messages.length - 1]?.content || "";

    const systemPrompt = `
You are Ura, a friendly and professional AI career assistant for the Finland Job Hunt application.
Your goal is to answer questions about available job vacancies in Finland, provide career advice, and help candidates find relevant developer or tech-related listings.

You have access to a real-time job scraper for Duunitori (the leading Finnish job portal).
Whenever the user asks you to:
- Find jobs (e.g. "Find me React developer jobs in Helsinki", "Are there any C++ jobs?")
- Scrape jobs (e.g. "Scrape Python roles")
- Search jobs (e.g. "Search for positions at Wolt")
You must set "triggerScrape" to true and extract the search keyword in "searchQuery" (e.g. "React developer", "C++", "Wolt", "Python").
Keep the searchQuery focused (1-3 words) to return high-quality results from the job board.

If the user is just asking general questions, looking for career advice, or explaining their background, set "triggerScrape" to false and leave "searchQuery" as an empty string.

You MUST respond ONLY with a valid JSON object in this format:
{
  "reply": "Your message text here. If triggering a scrape, explain that you are launching the search scraper.",
  "triggerScrape": true,
  "searchQuery": "python"
}
Do NOT wrap the output in markdown code blocks like \`\`\`json. Output raw JSON only.
`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const chatHistory = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: systemPrompt
    });

    const result = await chat.sendMessage(latestMessage);
    const aiText = result.response.text().trim();
    
    let parsed: { reply: string; triggerScrape: boolean; searchQuery: string };
    try {
      parsed = JSON.parse(aiText);
    } catch (e) {
      console.error("Failed to parse chatbot AI JSON response:", aiText);
      // Fallback
      parsed = {
        reply: aiText.replace(/[\{\}]/g, ""), // clean up raw bracket failures
        triggerScrape: false,
        searchQuery: ""
      };
    }

    let scrapedJobs: any[] = [];
    if (parsed.triggerScrape && parsed.searchQuery) {
      console.log(`[Chatbot Router] Triggering live scrape for: "${parsed.searchQuery}"`);
      scrapedJobs = await scrapeDuunitoriJobs(parsed.searchQuery);
      
      if (scrapedJobs.length > 0) {
        parsed.reply = `${parsed.reply}\n\nI searched Duunitori and found **${scrapedJobs.length}** live vacancies matching **"${parsed.searchQuery}"**. Here they are:`;
      } else {
        parsed.reply = `${parsed.reply}\n\nI searched Duunitori for **"${parsed.searchQuery}"** but couldn't find any new listings matching that term right now.`;
      }
    }

    return NextResponse.json({
      reply: parsed.reply,
      jobs: scrapedJobs
    });

  } catch (error: any) {
    console.error("Chatbot API query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
