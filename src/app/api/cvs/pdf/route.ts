import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { marked } from 'marked';

// Helper function to generate clean, styled HTML matching CV templates
function generateHtmlForCv(markdown: string, template: string, filename: string): string {
  // Parse markdown to HTML
  let parsedHtml = '';
  try {
    parsedHtml = marked.parse(markdown, { async: false }) as string;
  } catch (e) {
    console.error('Error parsing markdown:', e);
    parsedHtml = `<p>Error parsing CV content.</p>`;
  }

  // Define styles based on the template
  const templateClass = `template-${template}`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${filename}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,400&display=swap" rel="stylesheet">
      <style>
        /* Base page and print setup */
        body {
          margin: 0;
          padding: 0;
          font-size: 10.5pt;
          line-height: 1.6;
          color: #1e293b; /* Slate-800 */
          background-color: #ffffff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Typography spacing & defaults */
        .markdown-body {
          max-width: 100%;
        }

        .markdown-body h1 {
          margin-top: 0;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }

        .markdown-body h2 {
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }

        .markdown-body h3 {
          font-weight: 700;
          margin-top: 1.1rem;
          margin-bottom: 0.4rem;
          line-height: 1.4;
        }

        .markdown-body p {
          margin-top: 0;
          margin-bottom: 0.75rem;
        }

        .markdown-body ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-top: 0;
          margin-bottom: 0.75rem;
        }

        .markdown-body li {
          margin-bottom: 0.3rem;
        }

        .markdown-body strong {
          font-weight: 700;
        }

        .markdown-body a {
          color: inherit;
          text-decoration: none;
        }

        .markdown-body code {
          background: #f1f5f9;
          padding: 0.1rem 0.25rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
        }

        /* Avoid breaking sections inside page views if possible */
        .markdown-body h2, .markdown-body h3 {
          page-break-after: avoid;
          break-after: avoid;
        }

        .markdown-body p, .markdown-body li {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* 1. MINIMALIST TEMPLATE (Clean Sans) */
        .template-minimalist {
          font-family: 'Inter', sans-serif;
        }
        .template-minimalist h1 {
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          font-size: 2.2rem;
          text-align: left;
          border-bottom: 2px solid #0f172a; /* slate-900 */
          padding-bottom: 0.5rem;
          margin-bottom: 1.25rem;
          color: #0f172a;
        }
        .template-minimalist h2 {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 1.25rem;
          color: #0f172a;
          border-bottom: 1px solid #e2e8f0;
          margin-top: 1.5rem;
          padding-bottom: 0.25rem;
        }
        .template-minimalist h3 {
          font-family: 'Inter', sans-serif;
          font-size: 1.05rem;
          color: #1e293b;
        }

        /* 2. SERIF ELEGANCE TEMPLATE (Classic & Warm) */
        .template-serif {
          font-family: 'Lora', 'Georgia', serif;
          line-height: 1.7;
          color: #27272a; /* zinc-800 */
        }
        .template-serif h1 {
          font-family: 'Playfair Display', 'Georgia', serif;
          font-weight: 700;
          font-size: 2.4rem;
          text-align: center;
          border-bottom: none;
          margin-bottom: 0.5rem;
          color: #18181b;
        }
        .template-serif p:first-of-type {
          text-align: center;
          font-style: italic;
          margin-bottom: 1.75rem;
          font-size: 0.95rem;
          color: #52525b; /* zinc-600 */
        }
        .template-serif h2 {
          font-family: 'Playfair Display', 'Georgia', serif;
          font-weight: 600;
          font-size: 1.3rem;
          color: #7c2d12; /* Rust brown / orange-800 */
          border-bottom: 1px dashed #d4d4d8;
          text-align: center;
          margin-top: 1.6rem;
          padding-bottom: 0.25rem;
        }
        .template-serif h3 {
          font-family: 'Lora', 'Georgia', serif;
          font-weight: 700;
          font-size: 1.05rem;
          color: #18181b;
        }

        /* 3. EXECUTIVE NAVY TEMPLATE (Modern Professional) */
        .template-executive {
          font-family: 'Inter', sans-serif;
          color: #1e293b;
        }
        .template-executive h1 {
          font-family: 'Montserrat', sans-serif;
          font-weight: 800;
          font-size: 2.1rem;
          color: #1e3a8a; /* Navy-800 */
          border-bottom: 3px solid #1e3a8a;
          padding-bottom: 0.5rem;
          margin-bottom: 1.1rem;
        }
        .template-executive h2 {
          font-family: 'Montserrat', sans-serif;
          font-weight: 700;
          font-size: 1.25rem;
          color: #1e3a8a;
          border-bottom: 1px solid #cbd5e1; /* slate-300 */
          margin-top: 1.5rem;
          padding-bottom: 0.25rem;
        }
        .template-executive h3 {
          font-family: 'Montserrat', sans-serif;
          font-weight: 700;
          font-size: 1.05rem;
          color: #1e293b;
        }

        /* 4. CREATIVE TEAL TEMPLATE (Bold Accent) */
        .template-creative {
          font-family: 'Montserrat', sans-serif;
          color: #0f172a;
        }
        .template-creative h1 {
          font-family: 'Montserrat', sans-serif;
          font-weight: 900;
          font-size: 2.2rem;
          color: #0d9488; /* Teal-600 */
          border-bottom: 2px solid #0d9488;
          padding-bottom: 0.5rem;
          margin-bottom: 1.25rem;
        }
        .template-creative h2 {
          font-family: 'Montserrat', sans-serif;
          font-weight: 700;
          font-size: 1.25rem;
          color: #0d9488;
          border-left: 5px solid #0d9488;
          padding-left: 0.75rem;
          border-bottom: none;
          margin-top: 1.5rem;
        }
        .template-creative h3 {
          font-family: 'Montserrat', sans-serif;
          font-weight: 700;
          font-size: 1.05rem;
          color: #0f172a;
        }
      </style>
    </head>
    <body>
      <div class="markdown-body ${templateClass}">
        ${parsedHtml}
      </div>
    </body>
    </html>
  `;
}

/**
 * POST /api/cvs/pdf
 * Generates an A4 PDF from raw Markdown and template name using Playwright.
 */
export async function POST(request: Request) {
  let browser;
  try {
    const body = await request.json();
    const { markdown, template, filename } = body;

    if (!markdown) {
      return NextResponse.json(
        { error: 'Markdown content is required' },
        { status: 400 }
      );
    }

    const activeTemplate = template || 'minimalist';
    const activeFilename = filename || 'resume';

    console.log(`[api/cvs/pdf] Generating PDF for "${activeFilename}" using template: "${activeTemplate}"`);

    const htmlContent = generateHtmlForCv(markdown, activeTemplate, activeFilename);

    // Launch Playwright Chromium
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1200, height: 1600 }
    });
    const page = await context.newPage();

    // Set page content and wait for network/fonts to settle
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

    // Wait until all Google Fonts are fully loaded before rendering the PDF
    await page.evaluate(() => document.fonts.ready);

    // Generate high quality A4 PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '18mm',
        bottom: '18mm',
        left: '18mm',
        right: '18mm',
      },
      printBackground: true,
    });

    await browser.close();

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(activeFilename)}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('[api/cvs/pdf] PDF generation failed:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Failed to close browser:', closeError);
      }
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
