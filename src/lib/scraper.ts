// Scraper helper for Duunitori Finland

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&rsquo;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

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
}

export async function scrapeDuunitoriJobs(query: string): Promise<ScrapedJob[]> {
  const url = `https://duunitori.fi/tyopaikat?haku=${encodeURIComponent(query)}`;
  console.log(`[Scraper] Scraping Duunitori for query: "${query}"`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!res.ok) {
      throw new Error(`Duunitori search returned status ${res.status}`);
    }

    const html = await res.text();
    const chunks = html.split('class="grid grid--middle job-box');
    const cardChunks = chunks.slice(1);

    const jobs: ScrapedJob[] = [];
    for (const chunk of cardChunks) {
      // Extract ID
      const idMatch = chunk.match(/data-id="([^"]+)"/);
      const id = idMatch ? idMatch[1] : `duunitori-${Math.random().toString(36).substr(2, 9)}`;

      // Extract Slug/URL path
      const hrefMatch = chunk.match(/href="([^"]+)"/);
      const urlPath = hrefMatch ? hrefMatch[1] : '';
      const jobUrl = urlPath.startsWith('http') ? urlPath : `https://duunitori.fi${urlPath}`;

      // Extract Title
      const titleMatch = chunk.match(/class="job-box__hover gtm-search-result"[^>]*>([^<]+)<\/a>/);
      const titleRaw = titleMatch ? titleMatch[1].trim() : '';
      const title = decodeHtmlEntities(titleRaw);

      // Extract Company
      const companyMatch = chunk.match(/data-company="([^"]+)"/);
      const companyRaw = companyMatch ? companyMatch[1].trim() : '';
      const company = decodeHtmlEntities(companyRaw);

      // Extract Location
      let location = 'Finland';
      const locMatch = chunk.match(/class="job-box__job-location"[\s\S]*?<span>\s*([\s\S]*?)\s*<\/span>/);
      if (locMatch) {
        location = decodeHtmlEntities(locMatch[1].replace(/–/g, '').trim()) + ', Finland';
      }

      // Extract Posted Date
      let posted = 'Recently';
      const postedMatch = chunk.match(/class="job-box__job-posted">([^<]+)<\/span>/);
      if (postedMatch) {
        posted = decodeHtmlEntities(postedMatch[1].trim());
      }

      // Extract Category
      const catMatch = chunk.match(/data-category="([^"]+)"/);
      const jobCategoryRaw = catMatch ? catMatch[1].trim() : '';
      const jobCategory = decodeHtmlEntities(jobCategoryRaw);

      const description = `Live vacancy found on Duunitori for "${query}" query. Click to view on board or save to your Kanban applications.`;
      const requirements = jobCategory ? `${jobCategory}, Finland` : 'Finland';

      if (title && company) {
        jobs.push({
          id,
          title,
          company,
          location,
          description,
          requirements,
          url: jobUrl,
          posted,
          category: 'Scraped'
        });
      }
    }

    return jobs.slice(0, 10); // Return top 10 results
  } catch (error) {
    console.error("Scraper helper error:", error);
    return [];
  }
}
