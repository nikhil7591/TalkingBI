# Talking BI

<p align="center">
	<b>Generate smart BI dashboards from plain English KPI prompts</b>
</p>

<p align="center">
	<img src="https://img.shields.io/badge/Next.js-14.2.23-0f172a?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
	<img src="https://img.shields.io/badge/FastAPI-Backend-0ea5e9?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
	<img src="https://img.shields.io/badge/Prisma-7.5.0-16a34a?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
	<img src="https://img.shields.io/badge/OpenAI%20%2B%20Groq-AI%20Routing-f97316?style=for-the-badge" alt="AI Routing" />
</p>

Talking BI is a full-stack AI-powered analytics app where users can:

- ask KPI-focused prompts,
- generate dashboard-ready chart layouts,
- chat with BI assistant for insights,
- get voice explanations,
- store account, plan usage, and conversation history.

## System Architecture

![Talking BI System Architecture](docs/images/system-architecture.svg)

## Workflow Overview

![Talking BI Workflow](docs/images/workflow.svg)

## Why This Project

- Fast KPI-to-dashboard generation using agent-style backend pipeline.
- Works with URL datasets (dynamic) and CSV fallback mode.
- Theme-aware dashboard rendering in Next.js UI.
- Usage metering and conversation persistence with Prisma.

## Tech Stack

| Layer | Main Tools |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind, Axios, NextAuth |
| Backend | FastAPI, Pydantic, Pandas, OpenAI SDK, Groq SDK |
| Data/Auth | Prisma 7.5, PostgreSQL, PrismaPg Adapter |
| Visualization | ECharts + custom dashboard renderer |

## Project Structure

```text
TalkingBI-main/
|- backend/
|  |- app/
|  |  |- main.py
|  |  |- routers/        # dashboard, agents, dataset endpoints
|  |  |- services/       # ai, voice, data, dynamic dataset, BI chat
|- frontend/
|  |- app/               # Next.js App Router pages + API routes
|  |- components/        # dashboard/chat UI blocks
|  |- lib/               # API client, auth, themes, prisma client
|  |- prisma/            # schema, migrations, seed
|- data/                 # sample local datasets
|- docs/images/          # architecture + workflow diagrams
```

## Quick Start

### 1) Backend Setup

```bash
cd backend
python -m venv venv
# Linux/macOS
source venv/bin/activate
# Windows
venv\Scripts\activate
pip install -r requirements.txt
```

Create backend env file (example):

```env
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ALLOWED_ORIGIN_REGEX=https://.*\.vercel\.app
```

Run backend:

```bash
uvicorn app.main:app --reload --port 8000
```

### 2) Frontend Setup

```bash
cd frontend
npm install
```

Create/update `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/talking_bi?schema=public
NEXTAUTH_SECRET=replace-with-random-long-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Generate Prisma client and run app:

```bash
npx prisma generate
npm run dev
```

Open: `http://localhost:3000`

## API Highlights

| Endpoint | Method | Purpose |
|---|---|---|
| `/ping` | GET | Backend liveness check |
| `/health` | GET | Dashboard router health |
| `/datasets` | GET | List available local datasets |
| `/gen-dashboard` | POST | Generate dashboard spec (URL mode or CSV fallback) |
| `/voice-explanation` | POST | Generate transcript + audio metadata |
| `/bi-chat` | POST | Ask BI assistant about current dashboard |
| `/dataset/ingest` | POST | Ingest dataset from URL into dynamic store |
| `/dataset/status/{sessionId}` | GET | Check active dataset status |
| `/dataset/cleanup/{sessionId}` | DELETE | Cleanup session dataset |

## Model Routing Behavior

Current routing is intentionally split by feature:

1. Dashboard generation and BI chatbot use OpenAI (`gpt-5.4-mini-2026-03-17`).
2. Voice explanation text uses Groq first with OpenAI fallback.
3. Dashboard generation still supports local CSV fallback logic when URL dataset mode is not active.

## Deployment Notes

- Backend can be deployed on Render via `render.yaml`.
- Frontend can be deployed on Vercel.
- Update CORS and auth callback URLs for production domains.

## Documentation

- Deep technical docs: [docs.md](docs.md)
- Prisma/Auth setup detail: [frontend/PRISMA_AUTH_SETUP.md](frontend/PRISMA_AUTH_SETUP.md)

## License

Add your preferred open-source license in this repo root.
