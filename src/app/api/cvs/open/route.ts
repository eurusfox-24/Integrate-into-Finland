import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: Request) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: "Filename is required." }, { status: 400 });
    }

    // Resolve absolute path and restrict access to the public/cvs directory
    const cvDir = path.join(process.cwd(), 'public', 'cvs');
    const safeFilePath = path.join(cvDir, path.basename(filename));

    try {
      await fs.access(safeFilePath);
    } catch {
      return NextResponse.json({ error: "File not found or unauthorized access." }, { status: 404 });
    }

    console.log(`Opening file in system default viewer: ${safeFilePath}`);

    // Select the appropriate OS command
    const platform = process.platform;
    let command = '';

    if (platform === 'win32') {
      // On Windows, use 'start'
      // Note: start takes an optional title parameter as the first quoted arg, so we use start "" "path"
      command = `start "" "${safeFilePath}"`;
    } else if (platform === 'darwin') {
      // On macOS, use 'open'
      command = `open "${safeFilePath}"`;
    } else {
      // On Linux, use 'xdg-open'
      command = `xdg-open "${safeFilePath}"`;
    }

    exec(command, (error) => {
      if (error) {
        console.error(`Exec error: ${error.message}`);
      }
    });

    return NextResponse.json({ success: true, message: `System requested to open ${filename}` });

  } catch (error: any) {
    console.error("Open file error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
