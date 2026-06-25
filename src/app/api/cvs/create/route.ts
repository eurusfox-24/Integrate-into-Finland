import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { db } from '@/lib/db';

const cvDir = path.join(process.cwd(), 'public', 'cvs');

export async function POST(request: Request) {
  try {
    const { filename } = await request.json();
    if (!filename) {
      return NextResponse.json({ error: "Filename is required." }, { status: 400 });
    }

    // Clean and validate filename
    let cleanFilename = path.basename(filename);
    if (!cleanFilename.endsWith('.md') && !cleanFilename.endsWith('.txt')) {
      cleanFilename += '.md';
    }

    await fs.mkdir(cvDir, { recursive: true });
    const targetPath = path.join(cvDir, cleanFilename);

    // Read base-cv.md as starting template, or fall back to standard template
    let template = '';
    try {
      const baseCvPath = path.join(process.cwd(), 'base-cv.md');
      template = await fs.readFile(baseCvPath, 'utf-8');
    } catch {
      template = `# Professional Resume\n\n## Professional Summary\nMy career profile...`;
    }

    // Save file
    await fs.writeFile(targetPath, template, 'utf-8');

    // Register in database
    const docId = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO documents (id, filename, filepath, filetype) VALUES (?, ?, ?, ?)",
      args: [docId, cleanFilename, `/cvs/${cleanFilename}`, 'MD']
    });

    return NextResponse.json({
      success: true,
      filename: cleanFilename,
      message: `Successfully created ${cleanFilename} from base CV.`
    });

  } catch (error: any) {
    console.error("Create CV API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
