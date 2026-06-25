/**
 * Playwright-based headless browser scraper for job boards.
 * Modelled after the career-ops approach: launches a real Chromium browser,
 * navigates to the job board, waits for JS to render, then extracts jobs via DOM.
 *
 * Board-specific adapters: Duunitori, TE-palvelut, Indeed Finland, Monster Finland.
 * Unknown boards fall back to a generic DOM extractor.
 */

import { chromium, type Browser, type Page } from 'playwright';

export interface ScrapedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string;
  url: string;
  posted: string;
  category: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
}

// ─── Browser lifecycle ───────────────────────────────────────────────────────
// Re-use a single browser instance across requests to avoid cold-start penalty.
let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  return _browser;
}

async function newPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'fi-FI,fi;q=0.9,en;q=0.8',
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: {
      'Accept-Language': 'fi-FI,fi;q=0.9,en;q=0.8',
    },
  });
  return ctx.newPage();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function clean(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

/** Duunitori – server-rendered, but Playwright gives us a cleaner parse */
async function scrapeDuunitori(page: Page, boardId: string, boardName: string, boardUrl: string): Promise<ScrapedJob[]> {
  await page.goto(boardUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

  try {
    await page.waitForSelector('.job-box', { timeout: 8000 });
  } catch {
    // page may have rendered differently, continue anyway
  }

  const jobs = await page.evaluate(
    ({ boardId, boardName, boardUrl }: { boardId: string; boardName: string; boardUrl: string }) => {
      const cards = Array.from(document.querySelectorAll('.job-box'));
      return cards.slice(0, 15).map((card) => {
        const titleEl = card.querySelector('.job-box__hover') as HTMLAnchorElement | null;
        const companyEl = card.querySelector('[data-company]') as HTMLElement | null;
        const locationEl = card.querySelector('.job-box__job-location span') as HTMLElement | null;
        const postedEl = card.querySelector('.job-box__job-posted') as HTMLElement | null;
        const href = titleEl?.href || (card.querySelector('a') as HTMLAnchorElement | null)?.href || boardUrl;
        const id = (card as HTMLElement).dataset.id || href;

        return {
          id: `duu-${id}`,
          title: (titleEl?.textContent || '').trim(),
          company: (companyEl?.dataset.company || '').trim(),
          location: ((locationEl?.textContent || '') + ', Finland').trim(),
          description: `Live vacancy from ${boardName}. Click to view full details.`,
          requirements: 'Finland',
          url: href,
          posted: (postedEl?.textContent || 'Recently').trim(),
          category: 'Scraped',
          sourceId: boardId,
          sourceName: boardName,
          sourceUrl: boardUrl,
        };
      }).filter((j) => j.title && j.company);
    },
    { boardId, boardName, boardUrl }
  );

  return jobs as ScrapedJob[];
}

/** TE-palvelut (Työmarkkinatori) – React SPA */
async function scrapeTepalvelut(page: Page, boardId: string, boardName: string, boardUrl: string): Promise<ScrapedJob[]> {
  await page.goto(boardUrl, { waitUntil: 'networkidle', timeout: 25000 });

  // Wait for job listing cards
  try {
    await page.waitForSelector('[class*="JobCard"], [class*="job-card"], [data-cy="job"], article', { timeout: 10000 });
  } catch {
    // fallback
  }

  const jobs = await page.evaluate(
    ({ boardId, boardName, boardUrl }: { boardId: string; boardName: string; boardUrl: string }) => {
      // TE-palvelut uses various class patterns depending on version
      const selectors = ['[class*="JobCard"]', '[class*="job-card"]', 'article[class*="job"]', '.vacancy-item'];
      let cards: Element[] = [];
      for (const sel of selectors) {
        cards = Array.from(document.querySelectorAll(sel));
        if (cards.length > 0) break;
      }

      return cards.slice(0, 15).map((card) => {
        const titleEl = card.querySelector('h2, h3, [class*="title"]') as HTMLElement | null;
        const companyEl = card.querySelector('[class*="employer"], [class*="company"], [class*="org"]') as HTMLElement | null;
        const locationEl = card.querySelector('[class*="location"], [class*="city"]') as HTMLElement | null;
        const linkEl = card.querySelector('a') as HTMLAnchorElement | null;
        const href = linkEl?.href || boardUrl;

        return {
          id: `te-${href.split('/').pop() || Math.random().toString(36).slice(2)}`,
          title: (titleEl?.textContent || '').trim(),
          company: (companyEl?.textContent || 'Unknown').trim(),
          location: ((locationEl?.textContent || '') + ' Finland').trim(),
          description: `Live vacancy from ${boardName} (TE-palvelut). Click to view.`,
          requirements: 'Finland',
          url: href,
          posted: 'Recently',
          category: 'Scraped',
          sourceId: boardId,
          sourceName: boardName,
          sourceUrl: boardUrl,
        };
      }).filter((j) => j.title);
    },
    { boardId, boardName, boardUrl }
  );

  return jobs as ScrapedJob[];
}

/** Indeed Finland – heavy JS + anti-bot, best-effort */
async function scrapeIndeed(page: Page, boardId: string, boardName: string, boardUrl: string): Promise<ScrapedJob[]> {
  await page.goto(boardUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

  try {
    await page.waitForSelector('[class*="job_seen_beacon"], .jobsearch-ResultsList li', { timeout: 10000 });
  } catch {
    // Indeed may block or change layout
  }

  const jobs = await page.evaluate(
    ({ boardId, boardName, boardUrl }: { boardId: string; boardName: string; boardUrl: string }) => {
      const cards = Array.from(document.querySelectorAll('[class*="job_seen_beacon"], .jobsearch-ResultsList li[class]'));
      return cards.slice(0, 15).map((card) => {
        const titleEl = card.querySelector('[class*="jobTitle"] a, h2 a') as HTMLAnchorElement | null;
        const companyEl = card.querySelector('[class*="companyName"], [data-testid="company-name"]') as HTMLElement | null;
        const locationEl = card.querySelector('[class*="companyLocation"], [data-testid="text-location"]') as HTMLElement | null;
        const postedEl = card.querySelector('[class*="date"]') as HTMLElement | null;
        const href = titleEl?.href || boardUrl;

        return {
          id: `indeed-${href.split('?')[0].split('/').pop() || Math.random().toString(36).slice(2)}`,
          title: (titleEl?.textContent || '').trim(),
          company: (companyEl?.textContent || 'Unknown').trim(),
          location: ((locationEl?.textContent || '') || 'Finland').trim(),
          description: `Live vacancy from ${boardName}. Click to view.`,
          requirements: 'Finland',
          url: href,
          posted: (postedEl?.textContent || 'Recently').trim(),
          category: 'Scraped',
          sourceId: boardId,
          sourceName: boardName,
          sourceUrl: boardUrl,
        };
      }).filter((j) => j.title && j.company);
    },
    { boardId, boardName, boardUrl }
  );

  return jobs as ScrapedJob[];
}

/** Monster Finland */
async function scrapeMonster(page: Page, boardId: string, boardName: string, boardUrl: string): Promise<ScrapedJob[]> {
  await page.goto(boardUrl, { waitUntil: 'networkidle', timeout: 25000 });

  try {
    await page.waitForSelector('[class*="job-cardstyle"], .card-content, [data-testid="svx_jobCard"]', { timeout: 10000 });
  } catch {
    // fallback
  }

  const jobs = await page.evaluate(
    ({ boardId, boardName, boardUrl }: { boardId: string; boardName: string; boardUrl: string }) => {
      const selectors = ['[class*="job-cardstyle"]', '.card-content', '[data-testid="svx_jobCard"]', '.summary'];
      let cards: Element[] = [];
      for (const sel of selectors) {
        cards = Array.from(document.querySelectorAll(sel));
        if (cards.length > 3) break;
      }

      return cards.slice(0, 15).map((card) => {
        const titleEl = card.querySelector('h2, h3, [class*="title"]') as HTMLElement | null;
        const companyEl = card.querySelector('[class*="company"], [class*="employer"]') as HTMLElement | null;
        const locationEl = card.querySelector('[class*="location"]') as HTMLElement | null;
        const linkEl = card.querySelector('a') as HTMLAnchorElement | null;
        const href = linkEl?.href || boardUrl;

        return {
          id: `monster-${href.split('/').pop()?.split('?')[0] || Math.random().toString(36).slice(2)}`,
          title: (titleEl?.textContent || '').trim(),
          company: (companyEl?.textContent || 'Unknown').trim(),
          location: ((locationEl?.textContent || '') || 'Finland').trim(),
          description: `Live vacancy from ${boardName}. Click to view.`,
          requirements: 'Finland',
          url: href,
          posted: 'Recently',
          category: 'Scraped',
          sourceId: boardId,
          sourceName: boardName,
          sourceUrl: boardUrl,
        };
      }).filter((j) => j.title);
    },
    { boardId, boardName, boardUrl }
  );

  return jobs as ScrapedJob[];
}

/** Oikotie Työpaikat – server-rendered Finnish job board */
async function scrapeOikotie(page: Page, boardId: string, boardName: string, boardUrl: string): Promise<ScrapedJob[]> {
  await page.goto(boardUrl, { waitUntil: 'networkidle', timeout: 25000 });

  try {
    await page.waitForSelector('[class*="job-ad"], [class*="listing"], article', { timeout: 10000 });
  } catch { /* fallback */ }

  const jobs = await page.evaluate(
    ({ boardId, boardName, boardUrl }: { boardId: string; boardName: string; boardUrl: string }) => {
      const selectors = ['[class*="job-ad"]', '[class*="listing-item"]', 'article[class]', 'li[class*="job"]'];
      let cards: Element[] = [];
      for (const sel of selectors) {
        const found = Array.from(document.querySelectorAll(sel));
        if (found.length > 2) { cards = found; break; }
      }

      return cards.slice(0, 15).map((card) => {
        const titleEl = card.querySelector('h2, h3, [class*="title"]') as HTMLElement | null;
        const companyEl = card.querySelector('[class*="company"], [class*="employer"]') as HTMLElement | null;
        const locationEl = card.querySelector('[class*="location"], [class*="city"]') as HTMLElement | null;
        const linkEl = card.querySelector('a') as HTMLAnchorElement | null;
        const href = linkEl?.href || boardUrl;

        return {
          id: `oikotie-${href.split('/').pop()?.slice(0, 12) || Math.random().toString(36).slice(2)}`,
          title: (titleEl?.textContent || '').trim(),
          company: (companyEl?.textContent || boardName).trim(),
          location: ((locationEl?.textContent || '') || 'Finland').trim(),
          description: `Live vacancy from ${boardName} (Oikotie). Click to view full listing.`,
          requirements: 'Finland',
          url: href,
          posted: 'Recently',
          category: 'Scraped',
          sourceId: boardId,
          sourceName: boardName,
          sourceUrl: boardUrl,
        };
      }).filter((j) => j.title && j.url !== boardUrl);
    },
    { boardId, boardName, boardUrl }
  );

  return jobs as ScrapedJob[];
}

/** Jobly Finland – modern React/Next.js SPA */
async function scrapeJobly(page: Page, boardId: string, boardName: string, boardUrl: string): Promise<ScrapedJob[]> {
  await page.goto(boardUrl, { waitUntil: 'networkidle', timeout: 25000 });
  await page.waitForTimeout(1500);

  try {
    await page.waitForSelector('[class*="job"], article, li[class]', { timeout: 10000 });
  } catch { /* fallback */ }

  const jobs = await page.evaluate(
    ({ boardId, boardName, boardUrl }: { boardId: string; boardName: string; boardUrl: string }) => {
      const selectors = ['[class*="JobCard"]', '[class*="job-card"]', 'article', 'li[class*="job"]', '[class*="position"]'];
      let cards: Element[] = [];
      for (const sel of selectors) {
        const found = Array.from(document.querySelectorAll(sel));
        if (found.length > 2) { cards = found; break; }
      }

      return cards.slice(0, 15).map((card) => {
        const titleEl = card.querySelector('h2, h3, [class*="title"], [class*="name"]') as HTMLElement | null;
        const companyEl = card.querySelector('[class*="company"], [class*="employer"], [class*="org"]') as HTMLElement | null;
        const locationEl = card.querySelector('[class*="location"], [class*="city"]') as HTMLElement | null;
        const linkEl = card.querySelector('a') as HTMLAnchorElement | null;
        const href = linkEl?.href || boardUrl;

        return {
          id: `jobly-${href.split('/').pop()?.slice(0, 12) || Math.random().toString(36).slice(2)}`,
          title: (titleEl?.textContent || '').trim(),
          company: (companyEl?.textContent || boardName).trim(),
          location: ((locationEl?.textContent || '') || 'Finland').trim(),
          description: `Live vacancy from ${boardName} (Jobly). Click to view full listing.`,
          requirements: 'Finland',
          url: href,
          posted: 'Recently',
          category: 'Scraped',
          sourceId: boardId,
          sourceName: boardName,
          sourceUrl: boardUrl,
        };
      }).filter((j) => j.title && j.url !== boardUrl);
    },
    { boardId, boardName, boardUrl }
  );

  return jobs as ScrapedJob[];
}


async function scrapeGeneric(page: Page, boardId: string, boardName: string, boardUrl: string): Promise<ScrapedJob[]> {
  await page.goto(boardUrl, { waitUntil: 'networkidle', timeout: 25000 });

  // Give JS a bit more time
  await page.waitForTimeout(2000);

  const jobs = await page.evaluate(
    ({ boardId, boardName, boardUrl }: { boardId: string; boardName: string; boardUrl: string }) => {
      // Try a range of generic patterns used by job sites
      const candidateSelectors = [
        'article[class*="job"]',
        '[class*="job-card"]',
        '[class*="job-listing"]',
        '[class*="vacancy"]',
        '[class*="position"]',
        '[class*="opening"]',
        'li[class*="job"]',
        '.job',
      ];

      let cards: Element[] = [];
      for (const sel of candidateSelectors) {
        const found = Array.from(document.querySelectorAll(sel));
        if (found.length > 2) { cards = found; break; }
      }

      if (cards.length === 0) {
        // Last resort: grab all heading + anchor combos that look like job listings
        const headings = Array.from(document.querySelectorAll('h2 a, h3 a')).slice(0, 15);
        return headings.map((h) => {
          const a = h as HTMLAnchorElement;
          return {
            id: uid(`gen-${boardId}`),
            title: a.textContent?.trim() || '',
            company: boardName,
            location: 'Finland',
            description: `Found on ${boardName}. Click to view full listing.`,
            requirements: 'Finland',
            url: a.href || boardUrl,
            posted: 'Recently',
            category: 'Scraped',
            sourceId: boardId,
            sourceName: boardName,
            sourceUrl: boardUrl,
          };

          function uid(p: string) { return `${p}-${Math.random().toString(36).slice(2, 8)}`; }
        }).filter((j) => j.title && j.url !== boardUrl);
      }

      return cards.slice(0, 15).map((card) => {
        const titleEl = card.querySelector('h1, h2, h3, [class*="title"]') as HTMLElement | null;
        const companyEl = card.querySelector('[class*="company"], [class*="employer"], [class*="org"]') as HTMLElement | null;
        const locationEl = card.querySelector('[class*="location"], [class*="city"], [class*="place"]') as HTMLElement | null;
        const linkEl = card.querySelector('a') as HTMLAnchorElement | null;
        const href = linkEl?.href || boardUrl;

        return {
          id: `gen-${boardId}-${href.split('/').pop()?.slice(0, 12) || Math.random().toString(36).slice(2)}`,
          title: (titleEl?.textContent || '').trim(),
          company: (companyEl?.textContent || boardName).trim(),
          location: ((locationEl?.textContent || '') || 'Finland').trim(),
          description: `Live vacancy found on ${boardName}. Click to view.`,
          requirements: 'Finland',
          url: href,
          posted: 'Recently',
          category: 'Scraped',
          sourceId: boardId,
          sourceName: boardName,
          sourceUrl: boardUrl,
        };
      }).filter((j) => j.title);
    },
    { boardId, boardName, boardUrl }
  );

  return jobs as ScrapedJob[];
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function scrapeJobBoard(
  boardId: string,
  boardName: string,
  boardUrl: string
): Promise<ScrapedJob[]> {
  console.log(`[Playwright] Scraping "${boardName}" (${boardUrl})`);

  const browser = await getBrowser();
  const page = await newPage(browser);

  try {
    let jobs: ScrapedJob[] = [];

    const lowerUrl = boardUrl.toLowerCase();
    const lowerName = boardName.toLowerCase();

    if (lowerUrl.includes('duunitori')) {
      jobs = await scrapeDuunitori(page, boardId, boardName, boardUrl);
    } else if (lowerUrl.includes('te-palvelut') || lowerUrl.includes('tyomarkkinatori') || lowerName.includes('te-palvelut')) {
      jobs = await scrapeTepalvelut(page, boardId, boardName, boardUrl);
    } else if (lowerUrl.includes('oikotie')) {
      jobs = await scrapeOikotie(page, boardId, boardName, boardUrl);
    } else if (lowerUrl.includes('jobly')) {
      jobs = await scrapeJobly(page, boardId, boardName, boardUrl);
    } else {
      jobs = await scrapeGeneric(page, boardId, boardName, boardUrl);
    }

    console.log(`[Playwright] Found ${jobs.length} jobs from "${boardName}"`);
    return jobs;
  } catch (err) {
    console.error(`[Playwright] Error scraping "${boardName}":`, err);
    return [];
  } finally {
    await page.context().close();
  }
}
