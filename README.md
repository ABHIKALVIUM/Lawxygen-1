# LexCounsel AI — Legal Co-Counsel (Section 1)

A production-quality AI legal co-counsel web app built for Indian lawyers and law students. 
This repository contains **Section 1** of the assignment (Full-Stack Web App).

---

## 🏗 Architecture & Tech Stack Justification

- **Frontend**: React + Vite + Tailwind CSS. 
  *Why?* Vite provides instant HMR under time pressure. Tailwind ensures rapid, responsive styling. The UI is built to look like a premium, dark-mode SaaS product to ensure a high-quality user experience.
- **Backend**: Node.js + Express + TypeScript. 
  *Why?* Allows sharing types with the frontend and rapid API iteration.
- **Database**: PostgreSQL (Neon). 
  *Why?* Proven relational model for user profiles and draft history, with serverless scalability and instant connection pooling.
- **Embeddings (Local RAG)**: `@xenova/transformers` (`all-MiniLM-L6-v2`). 
  *Why?* Runs fully locally within the Node backend. No external API costs, no rate limits, completely private, and perfectly adequate (384-dim) for a 10-document corpus.
- **Vector Database**: Qdrant Cloud. 
  *Why?* Extremely fast and natively supports both dense and sparse vectors (for future hybrid search).
- **LLM**: Groq API (`llama-3.3-70b-versatile`). 
  *Why?* Industry-leading inference speed, making the Server-Sent Events (SSE) streaming UI feel instantaneous.

---

## 🚀 Setup & Deployment Instructions

### Deployment Strategy (Critical Note for Reviewers)
- **Frontend**: Deploy to **Vercel** or **Netlify**. (Configure build command: `npm run build`, Output dir: `dist`).
- **Backend**: Deploy to **Render**, **Railway**, or **Fly.io** as a Web Service. Do **NOT** deploy the Node backend to Vercel/Serverless platforms, because the local `@xenova` embedding model requires downloading an 80MB weights file on startup, which exceeds Vercel's 10-second serverless execution limits on the free tier.

### Local Setup Instructions

#### 1. Environment Setup
Create a `.env` file in the root directory (or copy `.env.example`) and fill in your keys:
```env
GROQ_API_KEY=your_key
DATABASE_URL=your_neon_pg_url
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key
GOOGLE_CLIENT_ID=your_google_client
GOOGLE_CLIENT_SECRET=your_google_secret
JWT_SECRET=super_secret_key
FRONTEND_URL=http://localhost:5173
PORT=3000
```
*(Note: Copy this `.env` file into the `backend/` directory as well).*

#### 2. Run the Backend
```bash
cd backend
npm install

# Run database migrations
npx tsx scripts/migrate.ts

# Ingest the 10-document legal corpus into Qdrant
npm run ingest

# Start the dev server
npm run dev
```

#### 3. Run the Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

---

## 💡 What I'd build next with more time (5-6 lines)

If I had a week instead of a day, I would upgrade the RAG pipeline to use **Hybrid Search** (combining Dense vectors with BM25 sparse vectors), as legal research often relies on exact keyword matches (e.g., "Section 43") where semantic search alone falls short. I would also build an **Agentic Memory Layer** in Postgres to store user corrections to drafts, allowing the LLM to learn a specific advocate's drafting tone over time. For the frontend, I'd implement **Inline Interactive Citations** directly in the streaming text (similar to Perplexity), where users can hover over a citation to read the exact extracted judgment clause without breaking their flow. Finally, I would add a robust **Intent Classifier** before the LLM to dynamically route procedural questions vs. drafting requests to specialized, smaller models to optimize costs and latency.
