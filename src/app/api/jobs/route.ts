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

// GET all jobs
export async function GET() {
  try {
    await ensureDb();
    const result = await db.execute("SELECT * FROM jobs ORDER BY updated_at DESC");
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("GET jobs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create a job manually
export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { title, company, location, description, requirements, url, status, notes } = body;

    if (!title || !company) {
      return NextResponse.json({ error: "Title and Company are required." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const jobStatus = status || 'TO_APPLY';

    await db.execute({
      sql: `INSERT INTO jobs (id, title, company, location, description, requirements, url, status, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, title, company, location || '', description || '', requirements || '', url || '', jobStatus, notes || '']
    });

    const newJobResult = await db.execute({
      sql: "SELECT * FROM jobs WHERE id = ?",
      args: [id]
    });

    return NextResponse.json(newJobResult.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("POST job error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update a job (e.g. moving Kanban column or editing notes)
export async function PUT(request: Request) {
  try {
    await ensureDb();
    const body = await request.json();
    const { id, title, company, location, description, requirements, url, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Job ID is required." }, { status: 400 });
    }

    // Dynamic update query to support updating only partial fields
    const fields: string[] = [];
    const args: any[] = [];

    if (title !== undefined) { fields.push("title = ?"); args.push(title); }
    if (company !== undefined) { fields.push("company = ?"); args.push(company); }
    if (location !== undefined) { fields.push("location = ?"); args.push(location); }
    if (description !== undefined) { fields.push("description = ?"); args.push(description); }
    if (requirements !== undefined) { fields.push("requirements = ?"); args.push(requirements); }
    if (url !== undefined) { fields.push("url = ?"); args.push(url); }
    if (status !== undefined) { fields.push("status = ?"); args.push(status); }
    if (notes !== undefined) { fields.push("notes = ?"); args.push(notes); }
    
    // Always update the updated_at timestamp
    fields.push("updated_at = CURRENT_TIMESTAMP");

    if (fields.length === 1) {
      return NextResponse.json({ error: "No fields provided to update." }, { status: 400 });
    }

    args.push(id);
    const sql = `UPDATE jobs SET ${fields.join(", ")} WHERE id = ?`;

    await db.execute({ sql, args });

    const updatedJob = await db.execute({
      sql: "SELECT * FROM jobs WHERE id = ?",
      args: [id]
    });

    return NextResponse.json(updatedJob.rows[0]);
  } catch (error: any) {
    console.error("PUT job error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a job
export async function DELETE(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Job ID is required." }, { status: 400 });
    }

    // First delete associated documents
    await db.execute({
      sql: "DELETE FROM documents WHERE job_id = ?",
      args: [id]
    });

    // Then delete the job itself
    await db.execute({
      sql: "DELETE FROM jobs WHERE id = ?",
      args: [id]
    });

    return NextResponse.json({ success: true, message: `Job ${id} deleted.` });
  } catch (error: any) {
    console.error("DELETE job error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
