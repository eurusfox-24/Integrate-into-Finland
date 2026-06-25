import { NextResponse } from 'next/server';
import { scrapeJobBoard } from '@/lib/playwright-scraper';

/**
 * POST /api/jobs/scrape
 * Triggers a Playwright headless browser scrape for a specific job board.
 * Body: { boardId: string, boardUrl: string, boardName: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { boardId, boardUrl, boardName } = body;

    if (!boardId || !boardUrl || !boardName) {
      return NextResponse.json(
        { error: 'Missing required fields: boardId, boardUrl, boardName' },
        { status: 400 }
      );
    }

    console.log(`[/api/jobs/scrape] Triggering scrape for board: "${boardName}" (${boardId})`);

    const jobs = await scrapeJobBoard(boardId, boardUrl, boardName);

    return NextResponse.json({
      jobs,
      source: boardName,
      boardId,
      count: jobs.length,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[/api/jobs/scrape] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Scraping failed' },
      { status: 500 }
    );
  }
}
