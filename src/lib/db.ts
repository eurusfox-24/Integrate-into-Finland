import { createClient } from '@libsql/client';
import path from 'path';

// Define the local SQLite file location
const dbPath = process.env.NODE_ENV === 'production' 
  ? 'file:prod.db' 
  : 'file:local.db';

export const db = createClient({
  url: dbPath,
});

// Helper to run database migrations/initialization
export async function initDb() {
  try {
    // Create jobs table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT,
        description TEXT,
        requirements TEXT,
        url TEXT,
        status TEXT NOT NULL CHECK(status IN ('TO_APPLY', 'APPLIED', 'IN_PROGRESS', 'OFFER', 'REJECTED')),
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create documents table (to track tailored CVs/Cover Letters associated with jobs)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        filetype TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE SET NULL
      )
    `);

    // Create job_boards table to store registered job board URLs
    await db.execute(`
      CREATE TABLE IF NOT EXISTS job_boards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: remove boards that can't be scraped with Playwright
    const unscrapableIds = ['board-indeed', 'board-monster', 'board-wolt'];
    for (const id of unscrapableIds) {
      await db.execute({ sql: `DELETE FROM job_boards WHERE id = ?`, args: [id] });
    }

    // Seed default job boards if empty (all Playwright-scrapable Finnish boards)
    const jobBoardsCount = await db.execute("SELECT COUNT(*) as count FROM job_boards");
    const boardsCount = Number(jobBoardsCount.rows[0]?.count || 0);
    
    if (boardsCount === 0) {
      console.log("Seeding default job boards...");
      const defaultBoards = [
        {
          id: 'board-duunitori',
          name: 'Duunitori',
          url: 'https://duunitori.fi/tyopaikat'
        },
        {
          id: 'board-te-palvelut',
          name: 'TE-palvelut',
          url: 'https://tyomarkkinatori.fi/etusivu/avoimet-tyopaikat'
        },
        {
          id: 'board-oikotie',
          name: 'Oikotie Työpaikat',
          url: 'https://tyopaikat.oikotie.fi'
        },
        {
          id: 'board-jobly',
          name: 'Jobly Finland',
          url: 'https://jobly.fi/en/jobs'
        },
      ];

      for (const board of defaultBoards) {
        await db.execute({
          sql: `INSERT OR IGNORE INTO job_boards (id, name, url) VALUES (?, ?, ?)`,
          args: [board.id, board.name, board.url]
        });
      }
    }


    // Seeding is disabled so the database starts completely clean without mock data.

    console.log("SQLite database initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}
