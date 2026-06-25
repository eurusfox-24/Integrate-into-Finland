import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const baseCvPath = path.join(process.cwd(), 'base-cv.md');

export async function GET() {
  try {
    let content = '';
    try {
      content = await fs.readFile(baseCvPath, 'utf-8');
    } catch (e) {
      // Default fallback base CV
      content = `# Alex Minns\n\nHelsinki, Finland | alex.minns@email.fi | +358 40 1234567 | [github.com/alex-minns](https://github.com) | [linkedin.com/in/alex-minns](https://linkedin.com)\n\n## Professional Summary\nResourceful and detail-oriented Full Stack Software Engineer with 3+ years of experience building modern web applications, optimizing databases, and designing scalable API architectures.\n\n## Technical Skills\n- **Languages**: JavaScript, TypeScript, Python, SQL, HTML/CSS\n- **Frameworks & Libraries**: React, Next.js, Express, Node.js, Tailwind CSS\n- **Databases**: SQLite, PostgreSQL, MongoDB`;
      await fs.writeFile(baseCvPath, content, 'utf-8');
    }
    return NextResponse.json({ content });
  } catch (error: any) {
    console.error("GET base CV error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content } = body;
    if (typeof content !== 'string') {
      return NextResponse.json({ error: "Content string is required." }, { status: 400 });
    }
    await fs.writeFile(baseCvPath, content, 'utf-8');
    return NextResponse.json({ success: true, message: "Base CV saved successfully." });
  } catch (error: any) {
    console.error("POST base CV error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
