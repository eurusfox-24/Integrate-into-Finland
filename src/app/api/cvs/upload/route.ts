import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { db } from '@/lib/db';

const cvDir = path.join(process.cwd(), 'public', 'cvs');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'base' or 'tailored'
    const jobId = formData.get('jobId') as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (type === 'base') {
      const baseCvPath = path.join(process.cwd(), 'base-cv.md');
      await fs.writeFile(baseCvPath, buffer);
      return NextResponse.json({ 
        success: true, 
        filename: 'base-cv.md', 
        type: 'base',
        message: "Base CV updated successfully." 
      });
    } else {
      // Ensure cvDir exists
      await fs.mkdir(cvDir, { recursive: true });
      
      const filename = file.name;
      const filePath = path.join(cvDir, filename);
      await fs.writeFile(filePath, buffer);

      const ext = path.extname(filename).toLowerCase();
      let filetype = 'OTHER';
      if (ext === '.pdf') filetype = 'PDF';
      else if (ext === '.md') filetype = 'MD';
      else if (ext === '.docx') filetype = 'DOCX';
      else if (ext === '.txt') filetype = 'TXT';

      const docId = crypto.randomUUID();
      await db.execute({
        sql: "INSERT INTO documents (id, job_id, filename, filepath, filetype) VALUES (?, ?, ?, ?, ?)",
        args: [docId, jobId && jobId !== 'none' ? jobId : null, filename, `/cvs/${filename}`, filetype]
      });

      return NextResponse.json({ 
        success: true, 
        filename, 
        type: 'tailored',
        filetype,
        message: `Document "${filename}" uploaded and registered successfully.`
      });
    }
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
