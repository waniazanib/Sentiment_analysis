# 🔍 Insights — AI-Product Analysis & Community Sentiment Engine

**Insights** is a comprehensive, full-stack product analysis and sentiment aggregation dashboard. It automatically digests across Wikipedia specifications, expert technical articles, Youtube discussions, and user reviews, utilizing the Google Gemini API to produce instant, verified community sentiment breakdowns. Instead of manually traversing forums, videos, and articles, users get structured, reliable, and side-by-side comparative buyer diagnostics in seconds.

---

## 🚀 Key Features

- **Multi-Source Web Crawling & Inflow**
  - **Factual Specifications Retrieval**: Ingests direct hardware specifications, categories, metadata, and manufacturers via the **Wikipedia API**.
  - **Multimedia Review Analytics**: Fetches community-created video feeds, sentiment transcripts, metadata, and engagements via **YouTube API integration**.
  - **Open Discussions**: Connects with **OpenReview Platform APIs** to surface multi-source expert reviews and deep-dive community feedback.

- **Generative AI Diagnostics (Powered by Gemini)**
  - **Topic Aspect Mapping**: Extracts key product features (e.g., sound quality, battery reserve, ergonomic layout).
  - **Sentiment Processing**: Visualizes overall community sentiment distributions into positive, neutral, and negative segments.
  - **Pro/Con Categorization**: Automatically filters real user friction points and wins into distinct, honest summary cards.
  - **Segmented Recommendations**: Delivers smart `BUY`/`HOLD`/`DEPENDS` buying recommendations personalized for specific consumer personas (e.g., Power Users, Budget Valuators) alongside viable direct alternatives.

- **Dynamic Contrast Comparison Matrix**
  - Save multiple analyzed products to a side-by-side comparison screen.
  - Compares detailed specs, sentiment weights, recommendations, and automatically generates an AI-led comparison summary contrast.

- **Highly Fault-Tolerant Hybrid Cache**
  - Powered by **Supabase PostgreSQL** for durable historical queries, indexing, and persistent catalog storage.
  - Seamlessly falls back to an optimized **in-memory offline cache mapper** in local or sandbox mode to ensure instantaneous response times under key constraint states.

---

## 🛠️ Technological Stack

- **Frontend Core**: React (v19) with JSX, TypeScript, and modern styling.
- **Styling & Visuals**: Tailwind CSS, Recharts (responsive custom visualizations), Framer Motion (animated entry and transitions), and Lucide React (elegant UI indicators).
- **Backend Architecture**: Node.js, Express.js API proxying server, TypeScript runner (`tsx`), and structured production compiling (`esbuild` bundler producing a self-contained CommonJS entry file).
- **Core AI Integration**: Modern `@google/genai` TypeScript SDK utilizing high-fidelity Gemini models.
- **Persistence Layer**: `@supabase/supabase-js` connector with full SQL schema triggers, relations, and table constraints.

---

## 📂 Project Directory Structure

```text
├── server.ts                       # Backend entry point (Express, Vite Dev Middleware, & Proxy Endpoints)
├── index.html                      # Single-page application template
├── tsconfig.json                   # TypeScript project ruleset
├── vite.config.ts                  # Vite build-time assets configuration
├── vitest.config.ts                # Framework configuration and test-runners
├── package.json                    # Dependents, build scripts, development tools
├── supabase/                       # Supabase migration scripts and database schemas
│   └── migrations/
│       └── 20260603000000_init_schema.sql
├── src/
│   ├── main.tsx                    # React client entry mount point
│   ├── index.css                   # Global Tailwind CSS style declarations
│   ├── App.tsx                     # Core React layouts, state models, and routes routing
│   ├── types.ts                    # Central TypeScript interfaces & entity schemas
│   ├── components/                 # Presentation-driven JSX modules
│   │   ├── SearchBar.tsx           # Search input bar with trend recommendations
│   │   ├── SummaryCard.tsx         # Ingested metadata, brand, specs, and status metrics
│   │   ├── SentimentPieChart.tsx   # Recharts sentiment balance (Pro/Con/Neutral) visualization
│   │   ├── ConfidenceCard.tsx      # Source index counts and platform citation indicators
│   │   ├── ProsConsCard.tsx        # Highlighting wins and limitations in side-by-side cards
│   │   ├── TopicAnalysisChart.tsx  # Dynamic bar dimensions mapping aspect frequency
│   │   ├── RecommendationCard.tsx  # Interactive buy recommendation summary card
│   │   └── ComparisonTable.tsx     # Parallel comparison matrix layout and AI contrasting
│   └── services/                   # Modular API, Cache, and Model interaction clients
│       ├── productAnalysisEngine.ts # Coordinating multi-service pipeline orchestrator
│       ├── geminiService.ts        # Chat, sentiment analysis, topic extraction prompts
│       ├── supabaseService.ts      # Cloud SQL (Postgre) caching client & in-memory backup
│       ├── googleSearchService.ts  # Grounding search client
│       ├── wikipediaService.ts     # Factual specifications extractor
│       ├── openReviewService.ts    # Community discussions ingestor
│       └── youtubeService.ts       # Video commentary processor
```

---

## ⚙️ Environment Configurations

The system retrieves API credentials on the server-side to guarantee client safety. Create a local `.env` configuration mapping the values:

```env
# Google Gemini Access Key (Automatically synced inside AI Studio)
GEMINI_API_KEY="your-gemini-api-key-here"

# Canonical Site Hosted Link (Used for proxy setups and endpoints)
APP_URL="http://localhost:3000"

# Optional Cloud Database URLs (Supabase backend)
VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

---

## 🏃 Run & Installation Sequence

### 1. Prerequisite Installations
Make sure to install the NPM packages configured inside the root directory manifest:
```bash
npm install
```

### 2. Launch Local Development
Fire up the Vite development middleware and Express server concurrently through `tsx`:
```bash
npm run dev
```
Open a browser tab directed to `http://localhost:3000` to interact with the service.

### 3. Build & Production Deployment
Compile and pack the React SPA client under standard optimize loaders and build a unified backend bundle for production:
```bash
npm run build
npm run start
```

### 4. Execute Tests
Validate schemas, API interactions, and React module structures:
```bash
npm run test
```

---

## 💡 Usage Walkthrough

1. **Query**: Type any modern electronics brand and product model in the search bar (e.g., `Sony WH-1000XM6` or `iPhone 15`).
2. **Analysis Ingest**: The backend concurrently polls Wikipedia, OpenReview, and YouTube APIs.
3. **Sentiment Dashboard**: Real-time charts visualize user sentiment distribution and map primary highlight topics (e.g., Performance, Comfort, Cost-utility).
4. **Contrast Comparisons**: Click **Add to Compare** on multiple models, then view side-by-side specifications, overall reviews count, and generative differences.

---

## 🔮 Future Enhancements

- **Real-Time Interactive Q&A (RAG)**: Chat directly with a product's review pool via a conversational assistant grounded on fetched review snippets.
- **Price Tracking Integration**: Stream historical price data curves to recommend the best buying periods.
- **Chrome Extension Extension**: View the analysis engine overlay panels directly when shopping on Amazon, eBay, or BestBuy.
- **Expanded Grounding**: Connect to specialized tech review publications for high-utility professional score parameters.
