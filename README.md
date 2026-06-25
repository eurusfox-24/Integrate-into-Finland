# Integrate into Finland 🇫🇮

A premium, state-of-the-art job application tracker, Finnish job feed aggregator, and AI-powered CV tailoring assistant. This application is designed specifically to help international and local job seekers navigate, track, and optimize their job search in the Finnish market.

## ✨ Features

- **📊 Kanban Application Tracker**: A fully interactive drag-and-drop dashboard to organize your job pipeline from Wishlist and Applied, to Interviews and Offers.
- **🔍 Finnish Job Feed Aggregator**: Real-time integration and scraping of job listings from popular Finnish platforms (e.g., Jobly, Duunitori) with automatic translation helpers.
- **🤖 AI CV Assistant & Document Explorer**: Upload, parse, edit, and tailor your CVs and cover letters for specific job descriptions using Gemini API integration.
- **📂 Document Explorer**: Keep all your job-hunting collateral (resumes, cover letters, certificates) organized in one secure place.

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS & Modern Custom Styling
- **Database**: SQLite (LibSQL / local database)
- **Scraper**: Playwright (for headless job scraping)
- **AI Engine**: Google Gemini API (`@google/generative-ai`)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.x or later)
- NPM or Yarn
- A Google Gemini API Key (Optional, for AI CV Tailoring)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/eurusfox-24/Integrate-into-Finland.git
   cd Integrate-into-Finland
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the root directory and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) (or the port specified in terminal) in your browser.

## 📂 Project Structure

- `src/app/` - Next.js page routes, layouts, and API endpoints (jobs, cvs, chatbot).
- `src/components/` - Main interface modules:
  - `KanbanBoard.tsx` - Application pipeline manager.
  - `JobFeed.tsx` - Aggregator for job feeds.
  - `DocumentExplorer.tsx` - PDF/markdown resume and cover letter helper.
- `src/lib/` - Scrapers and database configuration helpers.
- `src/utils/` - Local helper utilities.

---
*Created as part of the Integrate into Finland job hunting suite.*
