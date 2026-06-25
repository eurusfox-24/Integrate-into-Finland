import { NextResponse } from 'next/server';

// Map categories from UI to Duunitori search queries
const CATEGORY_MAP: Record<string, string> = {
  tech: 'developer',
  design: 'designer',
  management: 'product manager',
  marketing: 'marketing',
  operations: 'hr',
};

// Curated high-fidelity fallback vacancies in Finland (EU region) in case scraping fails
const fallbackJobs = [
  {
    id: 'feed-wolt-1',
    title: 'Software Engineer, Courier Logistics',
    company: 'Wolt',
    location: 'Helsinki, Finland (Hybrid)',
    description: 'Join the courier logistics team to design and build microservices routing millions of deliveries. You will work with Kotlin, Python, and AWS.',
    requirements: 'Kotlin or Java, Python, PostgreSQL, AWS, Microservices',
    url: 'https://wolt.com/en/jobs',
    posted: '2 days ago',
    category: 'Tech',
    sourceName: 'Wolt',
    sourceUrl: 'https://wolt.com'
  },
  {
    id: 'feed-nokia-1',
    title: 'C++ Software Engineer (5G RAN)',
    company: 'Nokia',
    location: 'Oulu, Finland (Hybrid)',
    description: 'Develop high-performance real-time software for 5G radio access networks. Optimize low-level firmware and embedded C++ systems.',
    requirements: 'C++, Real-time OS (RTOS), Embedded Systems, 5G, Linux',
    url: 'https://www.nokia.com/about-us/careers/',
    posted: '1 day ago',
    category: 'Tech',
    sourceName: 'Nokia',
    sourceUrl: 'https://nokia.com'
  },
  {
    id: 'feed-supercell-1',
    title: 'Senior Game Programmer',
    company: 'Supercell',
    location: 'Helsinki, Finland (On-site)',
    description: 'Work inside one of our game teams writing gameplay features, UI rendering, and client-server synchronization.',
    requirements: 'C++, Game Engines, Client-Server Sync, Game Design',
    url: 'https://supercell.com/en/careers/',
    posted: '3 days ago',
    category: 'Tech',
    sourceName: 'Supercell',
    sourceUrl: 'https://supercell.com'
  },
  {
    id: 'feed-iceye-1',
    title: 'DevOps / Infrastructure Engineer',
    company: 'ICEYE',
    location: 'Espoo, Finland (Hybrid)',
    description: 'Manage our satellite ground station control pipelines. Automate Terraform scripts, Kubernetes clusters, and Prometheus monitoring systems.',
    requirements: 'Kubernetes, Terraform, AWS, Docker, Python, Bash',
    url: 'https://www.iceye.com/careers',
    posted: 'Today',
    category: 'Tech',
    sourceName: 'ICEYE',
    sourceUrl: 'https://iceye.com'
  },
  {
    id: 'feed-iqm-1',
    title: 'Quantum Software Developer',
    company: 'IQM Quantum Computers',
    location: 'Espoo, Finland (On-site)',
    description: 'Develop high-level compilers and libraries that compile quantum algorithms into low-level pulse controls for quantum processors.',
    requirements: 'Python, C++, Quantum Computing basics, Rust, Git',
    url: 'https://www.meetiqm.com/careers',
    posted: '3 days ago',
    category: 'Tech',
    sourceName: 'IQM Quantum Computers',
    sourceUrl: 'https://www.meetiqm.com'
  },
  {
    id: 'feed-relex-design-1',
    title: 'Senior Product Designer (UI/UX)',
    company: 'RELEX Solutions',
    location: 'Helsinki, Finland (Hybrid)',
    description: 'Design intuitive, data-dense workflows for retail supply chain planners. Conduct user research, build high-fidelity Figma prototypes, and collaborate with frontend engineers.',
    requirements: 'UI/UX Design, Figma, User Research, Design Systems, Information Architecture',
    url: 'https://www.relexsolutions.com/careers/',
    posted: 'Yesterday',
    category: 'Design',
    sourceName: 'RELEX Solutions',
    sourceUrl: 'https://www.relexsolutions.com'
  },
  {
    id: 'feed-wolt-design-1',
    title: 'Visual / Brand Designer',
    company: 'Wolt',
    location: 'Helsinki, Finland (Hybrid)',
    description: 'Help shape Wolt\'s visual identity across digital ads, local marketing campaigns, and partner marketing assets. Create engaging vector illustrations and motion graphics.',
    requirements: 'Adobe Creative Suite, Branding, Graphic Design, Motion Graphics, Illustration',
    url: 'https://wolt.com/en/jobs',
    posted: '4 days ago',
    category: 'Design',
    sourceName: 'Wolt',
    sourceUrl: 'https://wolt.com'
  },
  {
    id: 'feed-rovio-product-1',
    title: 'Product Owner (Angry Birds Division)',
    company: 'Rovio Entertainment',
    location: 'Espoo, Finland (Hybrid)',
    description: 'Lead the feature roadmap for our core live-ops games. Work alongside game designers, analysts, and developers to optimize monetization and user retention.',
    requirements: 'Product Management, Agile, Live Ops, Game Analytics, Backlog Grooming',
    url: 'https://www.rovio.com/careers/',
    posted: '5 days ago',
    category: 'Management',
    sourceName: 'Rovio Entertainment',
    sourceUrl: 'https://rovio.com'
  },
  {
    id: 'feed-kone-pm-1',
    title: 'Technical Project Manager',
    company: 'KONE',
    location: 'Espoo, Finland (Hybrid)',
    description: 'Manage delivery of smart IoT solutions for elevator and escalator monitoring. Coordinate cross-functional software teams, manage timelines, and report to business stakeholders.',
    requirements: 'Project Management, IoT, Scrum/Agile, Jira, Software Lifecycle',
    url: 'https://www.kone.com/en/careers/',
    posted: '1 week ago',
    category: 'Management',
    sourceName: 'KONE',
    sourceUrl: 'https://kone.com'
  },
  {
    id: 'feed-smartly-mktg-1',
    title: 'Growth Marketing Manager',
    company: 'Smartly.io',
    location: 'Helsinki, Finland (Hybrid)',
    description: 'Drive acquisition campaigns for our enterprise social advertising platform. Manage SEO, PPC search campaigns, and write high-converting copy.',
    requirements: 'B2B Marketing, SEO, Google Ads, Hubspot, Copywriting, Web Analytics',
    url: 'https://www.smartly.io/careers',
    posted: '3 days ago',
    category: 'Marketing',
    sourceName: 'Smartly.io',
    sourceUrl: 'https://smartly.io'
  },
  {
    id: 'feed-elisa-hr-1',
    title: 'Tech Recruiter',
    company: 'Elisa',
    location: 'Helsinki, Finland (Remote)',
    description: 'Source and recruit top software engineering, data science, and cloud dev talent. Partner with engineering hiring managers to design inclusive hiring pipelines.',
    requirements: 'Technical Sourcing, ATS Management, Candidate Experience, Interviewing',
    url: 'https://corporate.elisa.fi/rekrytointi/',
    posted: '6 days ago',
    category: 'Operations',
    sourceName: 'Elisa',
    sourceUrl: 'https://elisa.fi'
  }
];

// Helper to decode basic HTML entities
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

async function fetchDuunitoriJobs(categoryKey: string): Promise<any[]> {
  const query = CATEGORY_MAP[categoryKey.toLowerCase()] || 'developer';
  const url = `https://duunitori.fi/tyopaikat?haku=${encodeURIComponent(query)}`;

  console.log(`[Scraper] Fetching live jobs from Duunitori for query: "${query}"`);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    next: { revalidate: 86400 } // cache for 24 hours (refresh the feed everyday)
  });

  if (!res.ok) {
    throw new Error(`Duunitori returned status ${res.status}`);
  }

  const html = await res.text();
  const chunks = html.split('class="grid grid--middle job-box');
  const cardChunks = chunks.slice(1);

  const jobs: any[] = [];
  for (const chunk of cardChunks) {
    // Extract ID
    const idMatch = chunk.match(/data-id="([^"]+)"/);
    const id = idMatch ? idMatch[1] : '';

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

    // Extract Category/Industry tag for fallback requirements mapping
    const catMatch = chunk.match(/data-category="([^"]+)"/);
    const jobCategoryRaw = catMatch ? catMatch[1].trim() : '';
    const jobCategory = decodeHtmlEntities(jobCategoryRaw);

    const description = `Live vacancy from Duunitori in Finland (EU region). Click the Board button to view it, or paste the link in the Smart AI URL Importer above to tailor your application with Gemini.`;
    const requirements = jobCategory ? `${jobCategory}, Finland` : 'Finland';

    if (title && company) {
      jobs.push({
        id: id || `duunitori-${Math.random().toString(36).substr(2, 9)}`,
        title,
        company,
        location,
        description,
        requirements,
        url: jobUrl,
        posted,
        category: categoryKey, // Keep client-side category tags aligned
        sourceName: 'Duunitori',
        sourceUrl: 'https://duunitori.fi'
      });
    }
  }

  // Return max 12 items to keep feed load light and UI clean
  return jobs.slice(0, 12);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterCategory = searchParams.get('category') || 'All';

    let jobs: any[] = [];
    try {
      if (filterCategory === 'All') {
        // Fetch Tech (developer jobs) as default for All
        jobs = await fetchDuunitoriJobs('Tech');
      } else {
        jobs = await fetchDuunitoriJobs(filterCategory);
      }
    } catch (scrapeError) {
      console.warn("Failed to scrape live jobs, falling back to curated list:", scrapeError);
    }

    // If scraping failed or returned nothing, fall back to curated list
    if (jobs.length === 0) {
      console.log("[Feed] Using curated fallback jobs.");
      jobs = filterCategory === 'All' 
        ? fallbackJobs 
        : fallbackJobs.filter(job => job.category.toLowerCase() === filterCategory.toLowerCase());
    }

    return NextResponse.json(jobs);
  } catch (error: any) {
    console.error("GET jobs feed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
