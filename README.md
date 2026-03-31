<div align="center">

# 📊 Talking BI

### Agentic Business Intelligence Platform

**"Type your KPI. Connect your data. Get PowerBI-grade dashboards with AI insights — in seconds."**

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-gpt--5.4--mini-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)
[![Groq](https://img.shields.io/badge/Groq-llama--3.3--70b-F55036?style=for-the-badge)](https://groq.com)
[![Prisma](https://img.shields.io/badge/Prisma-PostgreSQL-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io)
[![Mem0](https://img.shields.io/badge/Memory-Mem0-EC4899?style=for-the-badge)](https://mem0.ai)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)

🌐 **[Live Demo](https://talking-bi.vercel.app/)** &nbsp;·&nbsp; 🎥 **[Watch Demo](#)** &nbsp;·&nbsp; 💼 **[LinkedIn](https://www.linkedin.com/in/nikhil-kumar-2974292a9/)**

</div>

---

## 🚀 What is Talking BI?

Talking BI is a **4-agent autonomous AI system** that transforms any dataset into professional, PowerBI-grade dashboards — with real business insights, voice narration, and a persistent BI chatbot.

```
You type your KPI  →  SQL Agent fetches data from your database
                   →  DeepPrep cleans and prepares the data
                   →  Doc2Chart generates 4 unique dashboards
                   →  InsightEval extracts 6-type business insights
                   →  Voice narration plays your executive summary
                   →  BI Chatbot answers follow-up questions with memory
```

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 **4 AI Agents** | SQL Agent · DeepPrep · Doc2Chart · InsightEval — each with own persona |
| 📊 **24 Chart Types** | Line · Bar · Donut · Treemap · Heatmap · Sankey · Sunburst · Gauge · Radar + more |
| 🔗 **Dataset URL Connect** | Paste any CSV/JSON/API URL — data loads, dashboard generates, session clears |
| 🧠 **Mem0 Chatbot Memory** | BI chatbot remembers user preferences, past KPIs, and dashboard choices |
| 💡 **6-Type Insights** | Descriptive · Diagnostic · Predictive · Prescriptive · Evaluative · Exploratory |
| 🎙️ **Voice Narration** | AI-generated executive summary read aloud via SpeechSynthesis API |
| 🎨 **4 Dashboard Themes** | Each KPI generates 4 unique themed dashboard variants to choose from |
| ⚡ **Fallback Mode** | No data source? Hardcoded CSV datasets kick in automatically |
| 🔐 **Auth System** | NextAuth.js · Google OAuth · Email/Password · JWT 7d · 500 tokens on signup |
| 💳 **Token System** | Free + Pro + Enterprise tiers · usage tracked per metric |

---

## 🏗️ System Architecture

![System Architecture](docs/images/system-architecture.png)
---

## 🔁 4-Agent Pipeline

![Workflow](docs/images/workflow.png)

```
Step 1  →  SQL Agent       Schema grounding → KPI → SQL query → raw data fetch
Step 2  →  DeepPrep        Clean · Join · GroupBy · Pivot · Backtrack on failure
Step 3  →  Doc2Chart       Intent decompose → chart type select → 4 dashboard specs
Step 4  →  InsightEval     6 insight types → dedup → novelty → voice narration
```

---

## 🤖 Agent Breakdown

### ① SQL Agent — Data Fetch
**Persona:** Senior Data Engineer  
**Endpoint:** `POST /agent/sql`  
**Model:** `gpt-5.4-mini-2026-03-17`

- Grounds KPI against database schema (InfoAgent pattern)
- Generates accurate SQL query (GenAgent pattern)
- Executes via Prisma → fetches raw rows
- Refinement loop: auto-retries if query fails

### ② DeepPrep — Data Preparation
**Persona:** Data Preparation Specialist  
**Endpoint:** `POST /agent/deepprep`  
**Model:** `gpt-5.4-mini-2026-03-17`

- Universal connector: DB / API / CSV / URL
- Operators: Deduplicate · Join · GroupBy · Pivot · Filter · SplitColumn
- Tree-based pipeline with backtracking on failure
- Output: clean, aggregated, ≤60 rows DataFrame

### ③ Doc2Chart — Chart Generation
**Persona:** Data Visualization Expert  
**Endpoint:** `POST /agent/doc2chart`  
**Model:** `gpt-5.4-mini-2026-03-17`

- Decomposes KPI intent into visualization needs
- Heuristic chart type selection (time-series → line, parts → donut, etc.)
- Generates 4 unique dashboard specs with different themes
- Each spec: 4 chart slots + KPI cards + narrative + insight text

### ④ InsightEval — Insight Discovery
**Persona:** Senior BI Analyst  
**Endpoint:** `POST /agent/insights`  
**Model:** `gpt-5.4-mini-2026-03-17`

- 6 insight types: Descriptive · Diagnostic · Predictive · Prescriptive · Evaluative · Exploratory
- Dedup filter + novelty scoring
- Returns `top_insight`, `kpi_coverage_percent`, `voice_narration`

---

## 📁 Project Structure

```
TalkingBI/
├── backend/
│   ├── app/
│   │   ├── main.py                     ← FastAPI app + CORS
│   │   ├── routers/
│   │   │   ├── agents.py               ← /agent/sql · /agent/deepprep · /agent/doc2chart · /agent/insights
│   │   │   ├── dashboard.py            ← /gen-dashboard (legacy fallback)
│   │   │   └── dataset.py              ← /dataset/url (Dataset URL feature)
│   │   └── services/
│   │       ├── ai_service.py           ← OpenAI wrapper
│   │       ├── data_service.py         ← CSV fallback data loader
│   │       ├── kpi_service.py          ← KPI → column mapping
│   │       ├── bi_chat_service.py      ← BI chatbot + Mem0 integration
│   │       ├── dynamic_dataset_service.py ← URL dataset temp storage
│   │       └── voice_service.py        ← Voice narration helpers
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    ← Landing page
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── dashboard/page.tsx          ← Main BI dashboard
│   │   ├── chat/[id]/page.tsx          ← BI Chatbot
│   │   └── history/page.tsx
│   ├── components/
│   │   ├── KpiInput.tsx                ← Voice + text KPI input
│   │   ├── DatasetUrlInput.tsx         ← Dataset URL paste component
│   │   ├── DashboardRenderer.tsx       ← 4-theme dashboard renderer
│   │   ├── ChartRenderer.tsx           ← 24 ECharts chart types
│   │   ├── BIChatbot.tsx               ← Mem0-powered chatbot
│   │   ├── VoicePlayer.tsx             ← SpeechSynthesis narration
│   │   └── charts/                     ← Individual chart components
│   ├── prisma/
│   │   └── schema.prisma               ← User · Conversation · DynamicDataset · UsageEvent
│   ├── lib/
│   │   ├── api.ts                      ← Backend API calls
│   │   ├── auth.ts                     ← NextAuth config
│   │   └── types.ts                    ← Shared TypeScript types
│   └── .env.local.example
├── data/                               ← Fallback CSV datasets
│   ├── E-commerece/
│   ├── Power BI Sales/
│   ├── Superstore/
│   ├── Sample Sales Data/
│   ├── Geographical Info/
│   └── US Regional Sales Data/
└── docs/
    ├── system_architecture.png
    └── workflow.png
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.11+ · Node.js 18+
- API Keys: OpenAI, Groq
- PostgreSQL database
- (Optional) Mem0 API key for chatbot memory

### 1. Clone
```bash
git clone https://github.com/your-username/talking-bi.git
cd talking-bi
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env     # fill in your keys
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local    # fill in your keys
npx prisma generate
npx prisma migrate dev
npm run dev
```

---

## 🔑 Environment Variables

```env
# backend/.env
OPENAI_API_KEY=your_openai_api_key
GROQ_API_KEY=your_groq_api_key
MEM0_API_KEY=your_mem0_api_key          # optional, falls back to local
ALLOWED_ORIGINS=http://localhost:3000
DATA_FOLDER=../data
```

```env
# frontend/.env.local
DATABASE_URL=postgresql://user:pass@localhost/talkingbi
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

---

## 📡 API Endpoints

| Method | Endpoint | Agent | Description |
|---|---|---|---|
| `POST` | `/agent/sql` | SQL Agent | KPI → SQL → fetch raw data |
| `POST` | `/agent/deepprep` | DeepPrep | Clean + prepare raw data |
| `POST` | `/agent/doc2chart` | Doc2Chart | Generate 4 dashboard specs |
| `POST` | `/agent/insights` | InsightEval | Extract 6-type insights |
| `POST` | `/dataset/url` | — | Fetch + store dataset from URL |
| `POST` | `/chat` | Chatbot | BI Q&A with Mem0 memory |
| `POST` | `/gen-dashboard` | — | Legacy fallback (CSV mode) |
| `GET` | `/ping` | — | Health check |

---

## 🎨 Chart Types (24)

| Category | Charts |
|---|---|
| **Time Series** | Line · Area · Step Line · Sparkline |
| **Comparison** | Bar · Horizontal Bar · Stacked Bar · Combo |
| **Distribution** | Donut · Pie · Rose · Nightingale · Polar Bar |
| **Hierarchy** | Treemap · Sunburst · Sankey |
| **Metrics** | Gauge · Radial Bar · KPI Card |
| **Advanced** | Heatmap · Scatter · Bubble · Waterfall · Funnel · Radar · Pictorial Bar |

---

## 🔮 Future Scope

- 📅 **More Data Sources** — MongoDB · Salesforce · Google Sheets live sync
- 🔄 **Dashboard Persistence** — Save, share, and embed dashboards
- 📈 **Drill-Down** — Click any chart element for deeper analysis
- 🤝 **Team Collaboration** — Multi-user workspace with shared dashboards
- 📊 **Export** — PDF · PNG · CSV export from any dashboard

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 · TypeScript · Tailwind CSS · ECharts |
| Backend | Python · FastAPI · Uvicorn |
| AI Agents | OpenAI gpt-5.4-mini (all 4 agents) |
| Chatbot LLM | Groq llama-3.3-70b (fast responses) |
| Memory | Mem0 (BI chatbot only) |
| Database | PostgreSQL · Prisma ORM |
| Auth | NextAuth.js · Google OAuth · JWT |
| Deployment | Vercel (frontend) · Railway (backend + DB) |

---

## 👨‍💻 Author

<div align="center">

**Nikhil Kumar and Madhav Kalra **  


📧 nikhil759100@gmail.com

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/nikhil-kumar-2974292a9/)

📧 madhavkalra2005@gmail.com
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/madhav-kalra/)

*"Built to explore how autonomous AI agents can transform raw business data into executive-grade intelligence — without manual dashboarding."*

</div>

---

<div align="center">

**Talking BI** — Academic Project · Chitkara University · CSE-AI · Rabbitt.ai

⭐ Star this repo if you found it useful!

</div>