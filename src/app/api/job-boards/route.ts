import { NextResponse } from 'next/server';
import { db, initDb } from '@/lib/db';
import crypto from 'crypto';

let dbInitialized = false;
async function ensureDb() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

// GET all job boards
export async function GET() {
  try {
    await ensureDb();
    const result = await db.execute("SELECT * FROM job_boards ORDER BY created_at DESC");
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("GET job boards error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create a new job board
export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { name, url } = body;

    if (!name || !url) {
      return NextResponse.json({ error: "Name and URL are required." }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json({ error: "Please enter a valid absolute URL (e.g. https://indeed.fi)." }, { status: 400 });
    }

    const id = `board-${crypto.randomUUID()}`;

    await db.execute({
      sql: `INSERT INTO job_boards (id, name, url) VALUES (?, ?, ?)`,
      args: [id, name, url]
    });

    const newBoard = await db.execute({
      sql: "SELECT * FROM job_boards WHERE id = ?",
      args: [id]
    });

    return NextResponse.json(newBoard.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("POST job board error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a job board
export async function DELETE(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Job Board ID is required." }, { status: 400 });
    }

    // Check if it's one of the seed boards
    if (id === 'board-indeed' || id === 'board-monster' || id === 'board-duunitori' || id === 'board-wolt') {
      return NextResponse.json({ error: "Default system job boards cannot be deleted." }, { status: 400 });
    }

    await db.execute({
      sql: "DELETE FROM job_boards WHERE id = ?",
      args: [id]
    });

    return NextResponse.json({ success: true, message: `Job Board ${id} deleted.` });
  } catch (error: any) {
    console.error("DELETE job board error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
